#!/usr/bin/env python3
"""Transcribe audio-only episodes locally with Whisper (MLX, Apple Silicon).

Covers every published episode that has an audioUrl and no transcript file yet
(so episodes already covered by YouTube captions are skipped). Output matches
scripts/fetch_captions.py:

    {"slug": "...", "audioUrl": "...", "source": "whisper",
     "segments": [[startSeconds, "text"], ...]}

Resumable and safe to stop at any time; newest episodes are done first.

Usage (from tbp-next/):
    .venv-tools/bin/python scripts/transcribe_audio.py [--limit N] [--only SLUG]
"""
import argparse
import json
import os
import re
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
# Content sits beside this app in the repo (../content); a standalone checkout
# keeps it in a sibling tbp-website folder.
_CONTENT_DIRS = [ROOT.parent / "content", ROOT.parent / "tbp-website" / "content"]
CONTENT_DIR = next((d for d in _CONTENT_DIRS if d.is_dir()), _CONTENT_DIRS[0])
EPISODES_DIR = CONTENT_DIR / "episodes"
OUT_DIR = ROOT / "data" / "transcripts"
FAILED_FILE = OUT_DIR / "_whisper_failed.json"

MODEL = "mlx-community/whisper-large-v3-turbo"
SEGMENT_SECONDS = 25
FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)

# mlx-whisper shells out to ffmpeg to decode audio.
os.environ["PATH"] = "/usr/local/bin:/opt/homebrew/bin:" + os.environ.get("PATH", "")


def find_episodes():
    episodes = []
    for path in EPISODES_DIR.rglob("*.md"):
        if path.name == "index.md":
            continue
        match = FRONTMATTER_RE.match(path.read_text(encoding="utf-8", errors="replace"))
        if not match:
            continue
        try:
            fm = yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError:
            continue
        audio_url = fm.get("audioUrl")
        if fm.get("draft") or not fm.get("title") or not audio_url:
            continue
        slug = path.relative_to(EPISODES_DIR).with_suffix("").as_posix()
        episodes.append({"slug": slug, "audioUrl": str(audio_url).strip(),
                         "date": str(fm.get("date", ""))})
    episodes.sort(key=lambda e: e["date"], reverse=True)
    return episodes


def download(url, dest, attempts=5):
    """Download with retries, so a network drop (e.g. just after the Mac wakes
    from sleep) doesn't cost an episode."""
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (podcast-transcriber)"})
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(request, timeout=120) as response, open(dest, "wb") as out:
                while True:
                    chunk = response.read(1 << 20)
                    if not chunk:
                        break
                    out.write(chunk)
            return
        except OSError:
            if attempt == attempts:
                raise
            time.sleep(30 * attempt)


def merge_segments(whisper_segments):
    """Merge Whisper's short segments into ~25 second searchable clips."""
    merged, current, seg_start = [], [], None
    for seg in whisper_segments:
        text = seg["text"].strip()
        if not text:
            continue
        if seg_start is None:
            seg_start = seg["start"]
        current.append(text)
        if seg["end"] - seg_start >= SEGMENT_SECONDS:
            merged.append([round(seg_start, 1), " ".join(current)])
            current, seg_start = [], None
    if current:
        merged.append([round(seg_start, 1), " ".join(current)])
    return merged


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--only", help="transcribe a single episode slug")
    args = parser.parse_args()

    import mlx_whisper  # imported late so --help is instant

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failed = json.loads(FAILED_FILE.read_text()) if FAILED_FILE.exists() else {}

    episodes = find_episodes()
    todo = [e for e in episodes
            if not (OUT_DIR / f"{e['slug']}.json").exists()
            and (not args.only or e["slug"] == args.only)]
    if args.limit:
        todo = todo[:args.limit]
    print(f"{len(episodes)} published episodes with audio; {len(todo)} to transcribe",
          flush=True)

    for index, episode in enumerate(todo, 1):
        slug = episode["slug"]
        started = time.time()
        try:
            with tempfile.TemporaryDirectory() as workdir:
                audio_path = os.path.join(workdir, "episode.mp3")
                download(episode["audioUrl"], audio_path)
                result = mlx_whisper.transcribe(
                    audio_path,
                    path_or_hf_repo=MODEL,
                    language="en",
                    condition_on_previous_text=False,  # avoids runaway repetition
                    verbose=None,
                )
            segments = merge_segments(result.get("segments", []))
            if not segments:
                raise RuntimeError("no speech detected")
            audio_seconds = result["segments"][-1]["end"]
            out_path = OUT_DIR / f"{slug}.json"
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(json.dumps({
                "slug": slug,
                "audioUrl": episode["audioUrl"],
                "source": "whisper",
                "segments": segments,
            }, ensure_ascii=False))
            failed.pop(slug, None)
            elapsed = time.time() - started
            print(f"[{index}/{len(todo)}] ok {slug}: {len(segments)} segments, "
                  f"{audio_seconds / 60:.0f} min audio in {elapsed / 60:.1f} min "
                  f"({audio_seconds / elapsed:.0f}x realtime)", flush=True)
        except KeyboardInterrupt:
            raise
        except Exception as exc:
            failed[slug] = str(exc)[:300]
            print(f"[{index}/{len(todo)}] FAILED {slug}: {exc}", flush=True)
        FAILED_FILE.write_text(json.dumps(failed, indent=2, sort_keys=True))

    print(f"finished; {len(failed)} failures recorded in {FAILED_FILE.name}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
