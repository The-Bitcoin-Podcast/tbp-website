"""Cut archive clips at the exact quoted words.

Script timestamps come from ~25-second Whisper segments, so each one only says
roughly where a quote is. For each quote we pull a window of the source
episode's audio around that time, transcribe it with word timestamps, find the
quoted words, and cut from just before the first word to just after the last.
"""
from __future__ import annotations

import re
from pathlib import Path

import yaml

from audio import cut, download, find_matches, run, silence, tokens, transcribe_words, word_tokens

PRE_ROLL = 0.25   # seconds kept before the first quoted word
POST_ROLL = 0.45  # and after the last
# Search windows around the script timestamp, (before, after) in seconds; the
# wider one is only tried if the quote isn't in the first.
WINDOWS = [(20, 60), (75, 90)]


def episode_meta(content_dir: Path, slug: str) -> dict:
    text = (content_dir / "episodes" / f"{slug}.md").read_text()
    m = re.match(r"\A---\s*\n(.*?)\n---", text, re.S)
    return yaml.safe_load(m.group(1)) if m else {}


def cut_clip(clip: dict, slug: str, meta: dict, work: Path, log: list[str]) -> Path:
    url = str(meta.get("audioUrl") or "").strip()
    if not url:
        raise RuntimeError(f"CLIP {clip['n']}: {slug} has no audioUrl")
    source = download(url, work / "sources" / (slug.replace("/", "__") + ".mp3"))

    pieces: list[Path] = []
    times = clip["times"] or [0]
    for k, quote in enumerate(clip["quotes"]):
        t = times[min(k, len(times) - 1)]
        for attempt, (before, after) in enumerate(WINDOWS):
            w0 = max(0.0, t - before)
            length = before + after + len(quote.split()) * 0.5
            window = work / "clips" / f"clip{clip['n']}_{k}_window{attempt}.wav"
            window.parent.mkdir(parents=True, exist_ok=True)
            run(["ffmpeg", "-y", "-v", "error", "-ss", f"{w0:.2f}", "-t", f"{length:.2f}", "-i", str(source),
                 "-ac", "1", "-ar", "16000", str(window)])
            words = transcribe_words(window, cache=window.with_suffix(".words.json"), prompt=quote)
            hay = word_tokens(words)
            matches = find_matches(tokens(quote), hay, threshold=0.55)
            if matches:
                break
        if not matches:
            raise RuntimeError(
                f"CLIP {clip['n']} quote {k + 1}: couldn't find the words near {t // 60:.0f}:{t % 60:02.0f} in {slug}: “{quote[:60]}…”"
            )
        a0, a1, score = max(matches, key=lambda m: m[2])
        first, last = words[hay[a0][1]], words[hay[a1][1]]
        start, end = w0 + first["start"] - PRE_ROLL, w0 + last["end"] + POST_ROLL
        piece = cut(source, work / "clips" / f"clip{clip['n']}_{k}.wav", start, end, fade=0.08)
        pieces.append(piece)
        log.append(
            f"CLIP {clip['n']:>3} part {k + 1}: {slug} {start // 60:.0f}:{start % 60:05.2f}–{end // 60:.0f}:{end % 60:05.2f}"
            f" ({end - start:.1f}s, match {score:.2f})"
        )

    out = work / "clips" / f"clip{clip['n']}.wav"
    if len(pieces) == 1:
        pieces[0].rename(out)
        return out
    # Two cuts from the same answer: join with a short breath.
    gap = silence(work / "clips" / "gap_0.35.wav", 0.35)
    seq = [p for piece in pieces for p in (piece, gap)][:-1]
    concat(seq, out)
    return out


def concat(paths: list[Path], dest: Path) -> Path:
    lst = dest.with_suffix(".txt")
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in paths))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(dest)])
    lst.unlink()
    return dest
