"""Turn a raw narration recording into clean per-block audio.

Record the narration top to bottom in one go (or several files, named so they
sort in order). Flubbed a line? Just pause and say the sentence again: the
pipeline keeps the LAST complete take of every sentence and drops the rest,
along with long pauses and anything said between sentences.

Every narration sentence in the script is searched for in the recording's
Whisper transcript, in script order. Sentences that can't be found are
reported so you can record just those as a pickup file.
"""
from __future__ import annotations

from pathlib import Path

from audio import (SAMPLE_RATE, cut, find_matches, run, silence, tokens, transcribe_words,
                   word_tokens)

MATCH_THRESHOLD = 0.62
LEAD = 0.10        # seconds kept before a sentence's first word
TAIL = 0.22        # and after its last
JOIN_GAP = 1.0     # sentences closer than this in the recording stay joined as recorded
PAUSE = 0.38       # pause inserted where a retake or a gap was cut out
LONG_PAUSE = 0.9   # pauses longer than this inside kept audio are shortened...
SHORT_PAUSE = 0.55  # ...to this

VOCAB = ("Ethereum, ether, DAO, Slock.it, Emin Gün Sirer, Solidity, reentrancy, Carbonvote, "
         "Parity, Chainalysis, Immunefi, Vyper, Curve, Bybit, DefiSafety, Rex Hygate, Lido, "
         "OpenZeppelin, ReentrancyGuard, Hoenisch, TenX, Then / Now.")


def prepare(recordings: list[Path], work: Path) -> Path:
    """Join the recording files into one 48 kHz mono WAV."""
    work.mkdir(parents=True, exist_ok=True)
    raw = work / "raw.wav"
    inputs: list[str] = []
    for r in recordings:
        inputs += ["-i", str(r)]
    n = len(recordings)
    run(["ffmpeg", "-y", "-v", "error", *inputs,
         "-filter_complex", "".join(f"[{i}:a]" for i in range(n)) + f"concat=n={n}:v=0:a=1,aformat=channel_layouts=mono[a]",
         "-map", "[a]", "-ar", str(SAMPLE_RATE), str(raw)])
    return raw


def align(sentences: list[str], words: list[dict]) -> tuple[list[tuple[float, float] | None], list[str]]:
    """Find each sentence's last complete take. Returns (span per sentence, notes)."""
    hay = word_tokens(words)
    spans: list[tuple[float, float] | None] = [None] * len(sentences)
    notes: list[str] = []
    cursor = 0
    toks = [tokens(s) for s in sentences]

    def candidates(i: int, lo: int) -> list[tuple[int, int, float]]:
        n = len(toks[i])
        return find_matches(toks[i], hay, lo=lo, hi=lo + max(500, n * 8), threshold=MATCH_THRESHOLD)

    for i in range(len(sentences)):
        mine = candidates(i, cursor)
        if not mine:
            spans[i] = None
            notes.append(f"MISSING  #{i + 1}: {sentences[i][:90]}")
            continue
        # Where does the next sentence first appear? Takes of this sentence
        # after that point belong to some later passage, not to retakes.
        nxt = None
        for j in range(i + 1, min(i + 3, len(sentences))):
            c = candidates(j, mine[0][0] + 1)
            if c:
                nxt = c[0][0]
                break
        takes = [m for m in mine if nxt is None or m[0] < nxt]
        if not takes:
            takes = mine[:1]
        # Prefer the last take that is (nearly) complete; fall back to the best one.
        good = [m for m in takes if m[2] >= max(0.8, max(t[2] for t in takes) - 0.08)]
        a0, a1, score = (good or takes)[-1]
        if len(takes) > 1:
            notes.append(f"RETAKE   #{i + 1}: kept take {takes.index((a0, a1, score)) + 1} of {len(takes)}: {sentences[i][:70]}")
        if score < 0.8:
            notes.append(f"CHECK    #{i + 1} (match {score:.2f}): {sentences[i][:80]}")
        w_first, w_last = hay[a0][1], hay[a1][1]
        start = words[w_first]["start"] - LEAD
        end = words[w_last]["end"] + TAIL
        if w_first > 0:
            start = max(start, words[w_first - 1]["end"] + 0.02)
        if w_last + 1 < len(words):
            end = min(end, words[w_last + 1]["start"] - 0.02)
        spans[i] = (max(0.0, start), end)
        cursor = a1 + 1
    return spans, notes


def build_blocks(raw: Path, blocks: list[list[int]], spans, work: Path) -> list[dict]:
    """Cut each narration block from the recording.

    Returns per block: {"wav": Path, "duration": s, "sentences": [(idx, start, end)]}
    with sentence times relative to the block audio.
    """
    gap = silence(work / f"pause_{PAUSE}.wav", PAUSE)
    out = []
    for b, idxs in enumerate(blocks):
        kept = [(i, spans[i]) for i in idxs if spans[i]]
        if not kept:
            out.append(None)
            continue
        # Merge sentences recorded back to back into one continuous run.
        runs: list[list[tuple[int, tuple[float, float]]]] = []
        for i, sp in kept:
            if runs and 0 <= sp[0] - runs[-1][-1][1][1] < JOIN_GAP and i == runs[-1][-1][0] + 1:
                runs[-1].append((i, sp))
            else:
                runs.append([(i, sp)])
        pieces, timing, t = [], [], 0.0
        for r_i, run_ in enumerate(runs):
            r_start, r_end = run_[0][1][0], run_[-1][1][1]
            piece = cut(raw, work / f"block{b:02d}_run{r_i:02d}.wav", r_start, r_end, fade=0.02)
            # Shorten long pauses inside a run; track how much time each sentence moves.
            piece, shift = _tighten(piece, [(sp[0] - r_start, sp[1] - r_start) for _, sp in run_])
            for (i, _), (s0, s1) in zip(run_, shift):
                timing.append((i, t + s0, t + s1))
            dur = _duration(piece)
            pieces += [piece, gap]
            t += dur + PAUSE
        pieces = pieces[:-1]
        t -= PAUSE
        wav = work / f"block{b:02d}.wav"
        _concat(pieces, wav)
        out.append({"wav": wav, "duration": _duration(wav), "sentences": timing})
    return out


def _tighten(piece: Path, sentence_spans: list[tuple[float, float]]):
    """Shorten silences longer than LONG_PAUSE between sentences in a run."""
    cuts = []  # (at, remove)
    for (a0, a1), (b0, _) in zip(sentence_spans, sentence_spans[1:]):
        gap = b0 - a1
        if gap > LONG_PAUSE:
            cuts.append((a1 + SHORT_PAUSE / 2, gap - SHORT_PAUSE))
    if not cuts:
        return piece, sentence_spans
    keep, last = [], 0.0
    for at, remove in cuts:
        keep.append((last, at))
        last = at + remove
    keep.append((last, None))
    parts = []
    for k, (s, e) in enumerate(keep):
        p = piece.with_name(f"{piece.stem}_k{k}.wav")
        end = e if e is not None else _duration(piece)
        cut(piece, p, s, end, fade=0.01)
        parts.append(p)
    tight = piece.with_name(piece.stem + "_tight.wav")
    _concat(parts, tight)

    def moved(x: float) -> float:
        return x - sum(r for at, r in cuts if at < x)
    return tight, [(moved(s), moved(e)) for s, e in sentence_spans]


def _duration(p: Path) -> float:
    from audio import duration
    return duration(p)


def _concat(paths: list[Path], dest: Path) -> None:
    lst = dest.with_suffix(".txt")
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in paths))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(dest)])
    lst.unlink()


def process(recordings: list[Path], sentences: list[str], blocks: list[list[int]], work: Path):
    work.mkdir(parents=True, exist_ok=True)
    raw = prepare(recordings, work)
    import hashlib
    key = hashlib.sha1("|".join(f"{r.name}:{r.stat().st_size}:{r.stat().st_mtime_ns}" for r in recordings).encode()).hexdigest()[:10]
    words = transcribe_words(raw, cache=work / f"raw.{key}.words.json", prompt=VOCAB)
    spans, notes = align(sentences, words)
    return build_blocks(raw, blocks, spans, work), notes, spans
