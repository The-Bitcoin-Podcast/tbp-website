"""Put narration, archive clips and stings in script order, level them, and master.

Every element is first brought to the same loudness (so a quiet 2016 Skype
call sits level with the studio narration), then the whole episode gets a
two-pass EBU R128 normalisation to the podcast standard.
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

from audio import SAMPLE_RATE, duration, run, silence

ELEMENT_LUFS = -18.0
EPISODE_LUFS = -16.0   # Spotify / Apple podcast target (stereo)
TRUE_PEAK = -1.5

GAP_AROUND_CLIP = 0.45
GAP_BETWEEN_BLOCKS = 0.6
GAP_AFTER_STING = 0.35


def measure(path: Path, extra_filter: str = "") -> dict:
    af = (extra_filter + "," if extra_filter else "") + f"loudnorm=I={EPISODE_LUFS}:TP={TRUE_PEAK}:LRA=11:print_format=json"
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af", af, "-f", "null", "-"],
                       capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr, re.S)
    if not m:
        raise RuntimeError(f"loudness measurement failed for {path}")
    return json.loads(m.group(0))


def level(src: Path, dest: Path, target: float = ELEMENT_LUFS) -> Path:
    """Gain an element to `target` LUFS, with a limiter so loud ones can't clip."""
    m = measure(src)
    gain = target - float(m["input_i"]) if m["input_i"] not in ("-inf", "inf") else 0.0
    gain = max(-20.0, min(20.0, gain))
    run(["ffmpeg", "-y", "-v", "error", "-i", str(src),
         "-af", f"highpass=f=70,volume={gain:.2f}dB,alimiter=limit=0.89:level=false",
         "-ac", "1", "-ar", str(SAMPLE_RATE), str(dest)])
    return dest


def sting(assets: Path, name: str, work: Path) -> Path:
    """Use assets/sting.wav / outro.wav if present, else a placeholder chime."""
    wanted = assets / ("outro.wav" if "OUTRO" in name else "sting.wav")
    if wanted.exists():
        return wanted
    dest = work / f"placeholder_{'outro' if 'OUTRO' in name else 'sting'}.wav"
    if "OUTRO" in name:
        expr = ("0.22*sin(2*PI*523.25*t)*exp(-1.6*t)+0.18*sin(2*PI*659.25*(t-0.18))*exp(-1.6*(t-0.18))*gte(t,0.18)"
                "+0.18*sin(2*PI*783.99*(t-0.36))*exp(-1.2*(t-0.36))*gte(t,0.36)")
        d = 2.6
    else:
        expr = "0.25*sin(2*PI*659.25*t)*exp(-3*t)+0.2*sin(2*PI*987.77*(t-0.12))*exp(-3.5*(t-0.12))*gte(t,0.12)"
        d = 1.3
    run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"aevalsrc='{expr}':s={SAMPLE_RATE}:d={d}",
         "-af", f"afade=t=out:st={d - 0.3}:d=0.3", "-ac", "1", str(dest)])
    return dest


def assemble(items: list[dict], narration_blocks: list[dict | None], clip_wavs: dict[str, Path],
             assets: Path, work: Path, out_mp3: Path) -> list[dict]:
    """Build the episode. Returns the timeline: [{kind, start, end, ...}]."""
    work.mkdir(parents=True, exist_ok=True)
    seq: list[Path] = []
    timeline: list[dict] = []
    t = 0.0
    gaps: dict[float, Path] = {}

    def gap(seconds: float):
        nonlocal t
        if seconds <= 0:
            return
        if seconds not in gaps:
            gaps[seconds] = silence(work / f"gap_{seconds}.wav", seconds)
        seq.append(gaps[seconds]); t += seconds

    def add(path: Path, entry: dict):
        nonlocal t
        d = duration(path)
        seq.append(path)
        timeline.append({**entry, "start": round(t, 3), "end": round(t + d, 3)})
        t += d

    block_i = 0
    prev = None
    for it in items:
        kind = it["kind"]
        if kind == "section":
            timeline.append({"kind": "section", "title": it["title"], "start": round(t, 3), "end": round(t, 3)})
            continue
        if kind == "sting":
            if prev:
                gap(0.25)
            add(level(sting(assets, it["name"], work), work / f"lvl_{it['name'].replace(' ', '_')}.wav"),
                {"kind": "sting", "name": it["name"]})
            gap(GAP_AFTER_STING)
        elif kind == "clip":
            wav = clip_wavs.get(it["n"])
            if not wav:
                continue
            gap(GAP_AROUND_CLIP if prev == "narration" else 0.25)
            add(level(wav, work / f"lvl_clip{it['n']}.wav"),
                {"kind": "clip", "n": it["n"], "source": it["source"], "speaker": it["speaker"], "quotes": it["quotes"],
                 "source_title": it.get("source_title", it["source"]), "source_date": it.get("source_date", "")})
            gap(GAP_AROUND_CLIP)
        elif kind == "narration":
            blk = narration_blocks[block_i]
            block_i += 1
            if not blk:
                continue
            if prev == "narration":
                gap(GAP_BETWEEN_BLOCKS)
            start = t
            add(level(blk["wav"], work / f"lvl_block{block_i - 1:02d}.wav"),
                {"kind": "narration", "block": block_i - 1})
            for idx, s0, s1 in blk["sentences"]:
                timeline.append({"kind": "sentence", "idx": idx, "start": round(start + s0, 3), "end": round(start + s1, 3)})
            for local, chart in it["charts"].items():
                local = int(local)
                hit = [s0 for idx, s0, _ in blk["sentences"] if idx - blk["first"] >= local]
                timeline.append({"kind": "chart", "chart": int(chart), "start": round(start + (hit[0] if hit else 0), 3)})
        prev = kind

    # Join, then master: two-pass loudnorm to the episode target, stereo MP3.
    joined = work / "joined.wav"
    lst = work / "joined.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in seq))
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(joined)])
    m = measure(joined)
    norm = (f"loudnorm=I={EPISODE_LUFS}:TP={TRUE_PEAK}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    master = work / "master.wav"
    run(["ffmpeg", "-y", "-v", "error", "-i", str(joined), "-af", norm, "-ar", str(SAMPLE_RATE), "-ac", "2", str(master)])
    out_mp3.parent.mkdir(parents=True, exist_ok=True)
    run(["ffmpeg", "-y", "-v", "error", "-i", str(master), "-c:a", "libmp3lame", "-b:a", "160k", str(out_mp3)])
    timeline.sort(key=lambda e: (e["start"], 0 if e["kind"] == "section" else 1))
    return timeline
