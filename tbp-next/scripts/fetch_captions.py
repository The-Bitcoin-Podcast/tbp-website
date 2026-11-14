#!/usr/bin/env python3
"""Fetch timestamped YouTube captions for every episode that has a youtubeId.

Writes one JSON file per episode to data/transcripts/<episode slug>.json:

    {"slug": "...", "youtubeId": "...", "source": "youtube-captions",
     "segments": [[startSeconds, "text"], ...]}

Resumable: episodes that already have a transcript file are skipped.
Videos without captions are recorded in data/transcripts/_missing.json.

Usage (from tbp-next/):
    .venv-tools/bin/python scripts/fetch_captions.py [--limit N] [--retry-missing]
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Content sits beside this app in the repo (../content); a standalone checkout
# keeps it in a sibling tbp-website folder.
_CONTENT_DIRS = [ROOT.parent / "content", ROOT.parent / "tbp-website" / "content"]
CONTENT_DIR = next((d for d in _CONTENT_DIRS if d.is_dir()), _CONTENT_DIRS[0])
EPISODES_DIR = CONTENT_DIR / "episodes"
OUT_DIR = ROOT / "data" / "transcripts"
MISSING_FILE = OUT_DIR / "_missing.json"
YT_DLP = ROOT / ".venv-tools" / "bin" / "yt-dlp"

SEGMENT_SECONDS = 25  # target length of one searchable clip
SEGMENT_MAX_WORDS = 80

YOUTUBE_ID_RE = re.compile(r"^youtubeId:\s*['\"]?([A-Za-z0-9_-]{11})['\"]?\s*$", re.M)
DRAFT_RE = re.compile(r"^draft:\s*true\s*$", re.M)


def find_episodes():
    episodes = []
    for path in sorted(EPISODES_DIR.rglob("*.md")):
        if path.name == "index.md":
            continue
        head = path.read_text(encoding="utf-8", errors="replace")[:4000]
        match = YOUTUBE_ID_RE.search(head)
        if not match or DRAFT_RE.search(head):
            continue
        slug = path.relative_to(EPISODES_DIR).with_suffix("").as_posix()
        episodes.append((slug, match.group(1)))
    return episodes


def download_json3(video_id, workdir):
    """Return parsed json3 captions, or None when the video has none."""
    for langs in ("en", "en.*"):
        subprocess.run(
            [
                str(YT_DLP), "--skip-download", "--write-subs", "--write-auto-subs",
                "--sub-langs", langs, "--sub-format", "json3",
                "--no-warnings", "--quiet",
                "-o", f"{workdir}/%(id)s.%(ext)s",
                f"https://www.youtube.com/watch?v={video_id}",
            ],
            capture_output=True, text=True, timeout=180,
        )
        files = sorted(Path(workdir).glob(f"{video_id}*.json3"))
        if files:
            return json.loads(files[0].read_text(encoding="utf-8"))
    return None


def to_words(json3):
    """Flatten json3 events into (seconds, word) pairs."""
    words = []
    for event in json3.get("events", []):
        start = event.get("tStartMs")
        if start is None:
            continue
        for seg in event.get("segs", []) or []:
            text = seg.get("utf8", "")
            t = (start + seg.get("tOffsetMs", 0)) / 1000.0
            text = re.sub(r"\[[^\]]*\]", " ", text)  # [Music], [Applause]
            text = text.replace(">>", " ")           # speaker-change marker
            for word in text.split():
                words.append((t, word))
    return words


def to_segments(words):
    segments = []
    current, seg_start = [], None
    for t, word in words:
        if seg_start is None:
            seg_start = t
        current.append(word)
        long_enough = t - seg_start >= SEGMENT_SECONDS
        sentence_end = word[-1:] in ".?!"
        if (long_enough and sentence_end) or t - seg_start >= SEGMENT_SECONDS * 1.6 \
                or len(current) >= SEGMENT_MAX_WORDS:
            segments.append([round(seg_start, 1), " ".join(current)])
            current, seg_start = [], None
    if current:
        segments.append([round(seg_start, 1), " ".join(current)])
    return segments


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--retry-missing", action="store_true")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    missing = {}
    if MISSING_FILE.exists():
        missing = json.loads(MISSING_FILE.read_text())

    episodes = find_episodes()
    print(f"{len(episodes)} episodes with a youtubeId", flush=True)

    done = skipped = failed = 0
    for slug, video_id in episodes:
        out_path = OUT_DIR / f"{slug}.json"
        if out_path.exists():
            skipped += 1
            continue
        if slug in missing and not args.retry_missing:
            skipped += 1
            continue
        if args.limit and done + failed >= args.limit:
            break

        try:
            with tempfile.TemporaryDirectory() as workdir:
                json3 = download_json3(video_id, workdir)
            segments = to_segments(to_words(json3)) if json3 else []
        except Exception as exc:  # network hiccup, timeout, bad JSON
            print(f"  ERROR {slug} ({video_id}): {exc}", flush=True)
            failed += 1
            time.sleep(5)
            continue

        if not segments:
            missing[slug] = video_id
            MISSING_FILE.write_text(json.dumps(missing, indent=2, sort_keys=True))
            print(f"  no captions: {slug} ({video_id})", flush=True)
            failed += 1
        else:
            missing.pop(slug, None)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps({
                "slug": slug,
                "youtubeId": video_id,
                "source": "youtube-captions",
                "segments": segments,
            }, ensure_ascii=False))
            done += 1
            print(f"  ok {slug}: {len(segments)} segments", flush=True)
        time.sleep(1.5)  # stay polite to YouTube

    MISSING_FILE.write_text(json.dumps(missing, indent=2, sort_keys=True))
    print(f"done: {done} fetched, {skipped} skipped, {failed} without captions/failed",
          flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
