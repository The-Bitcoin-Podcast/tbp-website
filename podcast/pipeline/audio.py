"""Audio helpers: ffmpeg wrappers, Whisper word timestamps, fuzzy text matching."""
from __future__ import annotations

import json
import re
import subprocess
import urllib.request
from difflib import SequenceMatcher
from pathlib import Path

WHISPER_MODEL = "mlx-community/whisper-large-v3-turbo"
SAMPLE_RATE = 48000


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"command failed: {' '.join(cmd[:6])}...\n{r.stderr[-2000:]}")


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def download(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (podcast-pipeline)"})
    tmp = dest.with_suffix(dest.suffix + ".part")
    with urllib.request.urlopen(req, timeout=120) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 16):
            f.write(chunk)
    tmp.rename(dest)
    return dest


def cut(src: Path, dest: Path, start: float, end: float, fade: float = 0.04) -> Path:
    """Cut [start, end] to a 48 kHz mono WAV with short fades so cuts don't click."""
    length = max(0.05, end - start)
    fade = min(fade, length / 3)
    run([
        "ffmpeg", "-y", "-v", "error", "-ss", f"{max(0, start):.3f}", "-t", f"{length:.3f}", "-i", str(src),
        "-af", f"afade=t=in:d={fade:.3f},afade=t=out:st={length - fade:.3f}:d={fade:.3f}",
        "-ac", "1", "-ar", str(SAMPLE_RATE), str(dest),
    ])
    return dest


def silence(dest: Path, seconds: float) -> Path:
    run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"anullsrc=r={SAMPLE_RATE}:cl=mono",
         "-t", f"{seconds:.3f}", str(dest)])
    return dest


def transcribe_words(path: Path, cache: Path | None = None, prompt: str | None = None) -> list[dict]:
    """Word-level timestamps: [{"word", "start", "end"}], cached as JSON next to the build."""
    if cache and cache.exists():
        return json.loads(cache.read_text())
    import mlx_whisper  # imported late: slow to load, only needed when transcribing

    result = mlx_whisper.transcribe(
        str(path), path_or_hf_repo=WHISPER_MODEL, word_timestamps=True,
        initial_prompt=prompt, condition_on_previous_text=False, language="en",
    )
    words = [
        {"word": w["word"].strip(), "start": round(w["start"], 3), "end": round(w["end"], 3)}
        for seg in result["segments"] for w in seg.get("words", []) if w["word"].strip()
    ]
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps(words))
    return words


# ─── Fuzzy matching of script text against transcribed words ────────────────

_NUM = {"zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6",
        "seven": "7", "eight": "8", "nine": "9", "ten": "10"}


def tokens(text: str) -> list[str]:
    text = text.lower().replace("’", "'").replace("—", " ").replace("–", " ")
    text = re.sub(r"(\d),(\d)", r"\1\2", text)
    out = []
    for t in re.findall(r"[a-z0-9']+", text):
        t = t.strip("'")
        if t:
            out.append(_NUM.get(t, t))
    return out


def word_tokens(words: list[dict]) -> list[tuple[str, int]]:
    """Flatten Whisper words into (token, word_index) pairs."""
    out = []
    for i, w in enumerate(words):
        for t in tokens(w["word"]):
            out.append((t, i))
    return out


def find_matches(needle: list[str], hay: list[tuple[str, int]], lo: int = 0, hi: int | None = None,
                 threshold: float = 0.6) -> list[tuple[int, int, float]]:
    """Non-overlapping windows in hay[lo:hi] that match needle.

    Returns (first_token, last_token, score) by position in `hay`, best-scoring
    window per region, in order.
    """
    hi = len(hay) if hi is None else min(hi, len(hay))
    n = len(needle)
    if n == 0 or hi - lo < max(1, n // 2):
        return []
    hay_t = [t for t, _ in hay]
    first = needle[0]
    scored = []
    step = 1 if n < 40 else 2
    for s in range(lo, max(lo + 1, hi - max(1, int(n * 0.6)) + 1), step):
        window = hay_t[s:s + n]
        # cheap prefilter: share at least a third of the words
        if len(set(window) & set(needle)) < max(1, n // 3):
            continue
        sm = SequenceMatcher(None, needle, window, autojunk=False)
        r = sm.ratio()
        if r >= threshold:
            scored.append((r, s, sm))
    # keep the best window per overlapping cluster
    scored.sort(key=lambda x: -x[0])
    taken: list[tuple[int, int, float]] = []
    for r, s, sm in scored:
        blocks = [b for b in sm.get_matching_blocks() if b.size]
        a0 = s + blocks[0].b
        a1 = s + blocks[-1].b + blocks[-1].size - 1
        if any(not (a1 < t0 or a0 > t1) for t0, t1, _ in taken):
            continue
        # don't accept a match whose opening words are missing entirely
        if blocks[0].a > max(2, n // 4):
            continue
        taken.append((a0, a1, r))
    taken.sort()
    return taken
