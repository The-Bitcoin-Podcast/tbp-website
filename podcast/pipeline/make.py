#!/usr/bin/env python3
"""Build a finished episode from the script and your narration recording.

Usage (from the repo root):

    tbp-next/.venv-tools/bin/python podcast/pipeline/make.py plans/episodes/01-the-dao-hack \\
        --narration ~/Desktop/ep01-take1.wav [~/Desktop/ep01-pickups.wav ...]

Writes podcast/build/<episode>/:
    episode.mp3     the podcast cut (-16 LUFS stereo MP3) for Spotify / the RSS host
    episode.mp4     the YouTube cut (1080p, cards, charts, captions, waveform)
    captions.srt    full captions to upload to YouTube
    chapters.txt    YouTube chapter list for the description
    report.txt      what the pipeline did: retakes kept, lines it couldn't find, clip cuts
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from assemble import assemble  # noqa: E402
from audio import duration  # noqa: E402
from clips import cut_clip, episode_meta  # noqa: E402
from narration import process  # noqa: E402
from script_parse import parse_script  # noqa: E402
from video import chapters, render  # noqa: E402

REPO = Path(__file__).resolve().parents[2]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode", type=Path, help="episode folder holding script.md and episode.yaml")
    ap.add_argument("--narration", type=Path, nargs="+", required=True,
                    help="narration recording(s), in reading order")
    ap.add_argument("--out", type=Path, help="output folder (default podcast/build/<episode>)")
    ap.add_argument("--assets", type=Path, default=REPO / "podcast" / "assets",
                    help="folder with optional sting.wav / outro.wav")
    ap.add_argument("--no-video", action="store_true", help="only build the audio")
    args = ap.parse_args()

    ep = args.episode.resolve()
    out = (args.out or REPO / "podcast" / "build" / ep.name).resolve()
    work = out / "work"
    cfg = yaml.safe_load((ep / "episode.yaml").read_text())
    items = parse_script((ep / "script.md").read_text())
    content = REPO / "content"
    report: list[str] = [f"{cfg['show']} #{cfg['number']}: {cfg['title']}", ""]
    t0 = time.time()

    # Narration: sentences in script order, grouped by NARRATOR block.
    sentences, blocks = [], []
    for it in items:
        if it["kind"] == "narration":
            blocks.append(list(range(len(sentences), len(sentences) + len(it["sentences"]))))
            sentences += it["sentences"]
    print(f"Narration: aligning {len(sentences)} sentences with your recording…", flush=True)
    narr, notes, spans = process([p.expanduser().resolve() for p in args.narration], sentences, blocks, work / "narration")
    for b, blk in zip(blocks, narr):
        if blk:
            blk["first"] = b[0]
    found = sum(1 for s in spans if s)
    report += [f"NARRATION: found {found} of {len(sentences)} sentences", *[f"  {n}" for n in notes], ""]

    # Archive clips.
    print("Clips: finding and cutting the archive quotes…", flush=True)
    clip_wavs, clip_log, metas = {}, [], {}
    for it in items:
        if it["kind"] != "clip":
            continue
        slug = cfg["sources"].get(it["source"])
        if not slug:
            clip_log.append(f"ERROR CLIP {it['n']}: no source mapping for '{it['source']}' in episode.yaml")
            continue
        meta = metas.setdefault(slug, episode_meta(content, slug))
        it["source_title"] = str(meta.get("title", it["source"]))
        it["source_date"] = str(meta.get("date", ""))[:10]
        try:
            clip_wavs[it["n"]] = cut_clip(it, slug, meta, work, clip_log)
        except Exception as exc:  # keep going; the report says what's missing
            clip_log.append(f"ERROR {exc}")
    report += ["CLIPS", *[f"  {c}" for c in clip_log], ""]

    print("Assembling and mastering…", flush=True)
    mp3 = out / "episode.mp3"
    timeline = assemble(items, narr, clip_wavs, args.assets, work / "assemble", mp3)
    total = duration(mp3)
    (out / "timeline.json").write_text(json.dumps(timeline, indent=1, ensure_ascii=False))
    (out / "chapters.txt").write_text(chapters(timeline) + "\n")
    m, s = divmod(int(total), 60)
    report += [f"RUNTIME {m}:{s:02d}", "", "CHAPTERS", chapters(timeline), ""]

    if not args.no_video:
        print("Rendering video…", flush=True)
        render(timeline, sentences, cfg, mp3, work / "video", out / "episode.mp4", out / "captions.srt", total)

    missing = [n for n in notes if n.startswith("MISSING")]
    if missing or any(c.startswith("ERROR") for c in clip_log):
        report.insert(2, "⚠  Needs attention: see MISSING / ERROR lines below.\n")
    (out / "report.txt").write_text("\n".join(report) + "\n")
    print("\n".join(report))
    print(f"Done in {time.time() - t0:.0f}s → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
