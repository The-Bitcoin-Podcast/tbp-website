"""Render the YouTube cut: a 1080p video of cards, charts, captions and a waveform.

Each visual (section card, archive-clip card, chart) is an HTML page drawn by
headless Chrome to a PNG. ffmpeg then shows each PNG for its stretch of the
timeline, overlays a live waveform of the episode audio, and burns in the
narration captions. A YouTube captions file (.srt) and chapter list are written
alongside.
"""
from __future__ import annotations

import html
import re
import subprocess
from pathlib import Path

from audio import run

W, H = 1920, 1080
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CHART_MAX = 22.0  # seconds a chart stays up before falling back to the section card

INK, PAPER, ORANGE, MUTED, LINE = "#0f0f0f", "#f5f3ee", "#f7931a", "#9b978d", "#2a2a28"
VERDICT = {"hit": ("✓", "#22c55e"), "miss": ("✗", "#ef4444"), "mixed": ("~", "#f59e0b")}

BASE_CSS = f"""
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500&display=block');
* {{ box-sizing: border-box; margin: 0; }}
html, body {{ width: {W}px; height: {H}px; overflow: hidden; }}
body {{ background: {INK}; color: {PAPER}; font-family: Inter, system-ui, sans-serif; position: relative; }}
.frame {{ position: absolute; inset: 0; padding: 150px 120px 260px; display: flex; flex-direction: column; }}
.brand {{ position: absolute; top: 56px; left: 120px; font: 500 22px 'JetBrains Mono', monospace; letter-spacing: .16em; text-transform: uppercase; color: {MUTED}; }}
.brand b {{ color: {ORANGE}; font-weight: 500; }}
.kicker {{ font: 500 26px 'JetBrains Mono', monospace; letter-spacing: .14em; text-transform: uppercase; color: {ORANGE}; }}
h1 {{ font: 800 104px/1.02 'Inter Tight', sans-serif; letter-spacing: -0.03em; }}
h2 {{ font: 800 64px/1.08 'Inter Tight', sans-serif; letter-spacing: -0.02em; }}
.muted {{ color: {MUTED}; }}
.rule {{ position: absolute; left: 120px; right: 120px; bottom: 220px; height: 2px; background: {LINE}; }}
"""


def page(body: str, extra_css: str = "", brand: str = "") -> str:
    return (f"<!doctype html><html><head><meta charset='utf-8'><style>{BASE_CSS}{extra_css}</style></head>"
            f"<body><div class='brand'>{brand}</div>{body}<div class='rule'></div></body></html>")


def e(s) -> str:
    return html.escape(str(s))


# ─── Card templates ──────────────────────────────────────────────────────────

def card_title(show: str, number: int, title: str, outro: bool = False) -> str:
    sub = "Thanks for listening" if outro else f"Episode {number}"
    body = f"""<div class='frame' style='justify-content:center;align-items:flex-start;padding-bottom:120px'>
      <div class='kicker'>{e(sub)}</div>
      <h1 style='font-size:220px;margin-top:18px'>{e(show)}</h1>
      <h2 class='muted' style='margin-top:26px;font-weight:700'>{e(title)}</h2>
      <p class='muted' style='margin-top:40px;font-size:30px'>From The Bitcoin Podcast archive</p></div>"""
    return page(body, ".rule{display:none}")


def card_section(brand: str, section: str, title: str) -> str:
    body = f"""<div class='frame' style='justify-content:center'>
      <div class='kicker'>{e(title)}</div>
      <h1 style='margin-top:22px'>{e(section)}</h1></div>"""
    return page(body, brand=brand)


def card_clip(brand: str, clip: dict) -> str:
    quote = " … ".join(clip["quotes"])
    size = 64 if len(quote) < 140 else 52 if len(quote) < 230 else 42
    body = f"""<div class='frame' style='justify-content:center'>
      <div class='kicker'>From the archive · {e(clip.get('source_title', clip['source']))}</div>
      <p style='font:700 {size}px/1.25 "Inter Tight",sans-serif;margin-top:34px;max-width:1560px'>
        <span style='color:{ORANGE}'>“</span>{e(quote)}<span style='color:{ORANGE}'>”</span></p>
      <p class='muted' style='margin-top:36px;font-size:32px'>— {e(clip['speaker'] if clip['speaker'] != 'host' else 'Host')}
        <span style='margin-left:18px;font:500 24px "JetBrains Mono",monospace'>{e(clip.get('source_date', ''))}</span></p></div>"""
    return page(body, brand=brand)


def card_chart(brand: str, c: dict) -> str:
    t = c["type"]
    kick = c.get('asof') or (f"Source: {c['source']}" if c.get('source') else '')
    head = f"<div class='kicker'>{e(kick)}</div><h2 style='margin-top:14px'>{e(c['title'])}</h2>"
    css = ""
    if t == "tiles":
        tiles = "".join(
            f"<div class='tile'><div class='v'>{e(x['value'])}</div><div class='l'>{e(x['label'])}</div><div class='n'>{e(x.get('note', ''))}</div></div>"
            for x in c["tiles"])
        inner = f"<div class='row'>{tiles}</div>"
        css = f""".row{{display:flex;gap:40px;margin-top:70px}} .tile{{flex:1;border-top:6px solid {ORANGE};padding-top:30px}}
          .v{{font:800 92px 'Inter Tight';letter-spacing:-.03em}} .l{{font:600 32px Inter;margin-top:16px}} .n{{font:500 28px Inter;color:{MUTED};margin-top:10px}}"""
    elif t == "steps":
        steps = "".join(f"<div class='s'><span>{i + 1}</span>{e(x)}</div>" for i, x in enumerate(c["steps"]))
        inner = f"<div class='steps'>{steps}</div><p class='foot'>{e(c.get('footnote', ''))}</p>"
        css = f""".steps{{margin-top:56px;display:grid;gap:22px}} .s{{font:600 40px Inter;display:flex;gap:28px;align-items:center}}
          .s span{{flex:none;width:64px;height:64px;border-radius:50%;background:{ORANGE};color:{INK};display:grid;place-items:center;font:800 32px 'Inter Tight'}}
          .s:last-child{{color:{ORANGE}}} .foot{{margin-top:48px;font:500 32px Inter;color:{MUTED}}}"""
    elif t == "fork":
        inner = f"""<div class='fork'><div class='trunk'>{e(c['block'])}</div>
          <div class='branches'><div class='b'><div class='name'>{e(c['left']['name'])}</div><div class='note'>{e(c['left']['note'])}</div></div>
          <div class='b alt'><div class='name'>{e(c['right']['name'])}</div><div class='note'>{e(c['right']['note'])}</div></div></div></div>"""
        css = f""".fork{{margin-top:60px}} .trunk{{font:500 30px 'JetBrains Mono';color:{ORANGE};border-left:6px solid {ORANGE};padding:10px 0 10px 28px}}
          .branches{{display:flex;gap:48px;margin-top:40px}} .b{{flex:1;border:2px solid {ORANGE};border-radius:24px;padding:36px}}
          .b.alt{{border-color:{MUTED}}} .name{{font:800 52px 'Inter Tight'}} .note{{font:500 30px Inter;color:{MUTED};margin-top:14px}}"""
    elif t == "compare":
        side = lambda x, cls: f"<div class='side {cls}'><div class='name'>{e(x['name'])}</div><div class='val'>{e(x['value'])}</div><div class='note'>{e(x.get('note', ''))}</div></div>"
        inner = f"<div class='cmp'>{side(c['left'], 'a')}<div class='x'>{e(c.get('callout', 'vs'))}</div>{side(c['right'], 'b')}</div>"
        css = f""".cmp{{display:flex;align-items:center;gap:56px;margin-top:70px}} .side{{flex:1}} .name{{font:500 30px 'JetBrains Mono';color:{MUTED}}}
          .val{{font:800 140px 'Inter Tight';letter-spacing:-.04em}} .a .val{{color:{ORANGE}}} .note{{font:500 30px Inter;color:{MUTED}}}
          .x{{font:800 64px 'Inter Tight';color:{PAPER};background:{LINE};border-radius:999px;padding:18px 34px}}"""
    elif t == "bars":
        top = max(b["value"] for b in c["bars"]) or 1
        bars = "".join(
            f"<div class='bar'><div class='val'>${b['value']:.1f}B</div><div class='fill' style='height:{b['value'] / top * 260:.0f}px'></div><div class='lab'>{e(b['label'])}</div></div>"
            for b in c["bars"])
        inner = f"<div class='bars'>{bars}</div>"
        css = f""".bars{{display:flex;align-items:flex-end;gap:56px;margin-top:36px;height:400px}} .bar{{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end}}
          .fill{{width:100%;background:{ORANGE};border-radius:12px 12px 0 0}} .val{{font:800 40px 'Inter Tight';margin-bottom:14px}} .lab{{font:500 28px 'JetBrains Mono';color:{MUTED};margin-top:16px}}"""
    elif t == "scorecard":
        rows = "".join(
            f"<div class='r'><span class='m' style='background:{VERDICT[x['mark']][1]}'>{VERDICT[x['mark']][0]}</span><div><div class='then'>{e(x['then'])}</div><div class='now'>{e(x['now'])}</div></div></div>"
            for x in c["rows"])
        inner = f"<div class='rows'>{rows}</div>"
        css = f""".rows{{margin-top:40px;display:grid;gap:22px}} .r{{display:flex;gap:28px;align-items:center}}
          .m{{flex:none;width:58px;height:58px;border-radius:14px;display:grid;place-items:center;font:800 34px 'Inter Tight';color:{INK}}}
          .then{{font:700 34px 'Inter Tight'}} .now{{font:500 26px Inter;color:{MUTED};margin-top:4px}}"""
    else:
        inner = ""
    return page(f"<div class='frame'>{head}{inner}</div>", css, brand=brand)


def screenshot(html_text: str, png: Path) -> Path:
    src = png.with_suffix(".html")
    src.write_text(html_text)
    run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
         f"--window-size={W},{H}", "--virtual-time-budget=4000", f"--screenshot={png}", src.as_uri()])
    return png


# ─── Captions ────────────────────────────────────────────────────────────────

def caption_chunks(text: str, start: float, end: float, max_words: int = 8, max_chars: int = 46):
    words = text.split()
    chunks, cur = [], []
    for w in words:
        if cur and (len(cur) >= max_words or len(" ".join(cur + [w])) > max_chars):
            chunks.append(cur); cur = []
        cur.append(w)
    if cur:
        chunks.append(cur)
    total = sum(len(" ".join(c)) for c in chunks) or 1
    t, out = start, []
    for c in chunks:
        d = (end - start) * len(" ".join(c)) / total
        out.append((t, t + d, " ".join(c)))
        t += d
    return out


def _ts(t: float, sep: str) -> str:
    h, rem = divmod(max(t, 0), 3600)
    m, s = divmod(rem, 60)
    if sep == ".":  # ASS: h:mm:ss.cc
        return f"{int(h)}:{int(m):02d}:{s:05.2f}"
    return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s % 1) * 1000):03d}"


def write_captions(timeline: list[dict], sentences: list[str], srt: Path, ass: Path) -> None:
    lines = []  # (start, end, text, burn)
    for ev in timeline:
        if ev["kind"] == "sentence":
            for s, e_, txt in caption_chunks(sentences[ev["idx"]], ev["start"], ev["end"]):
                lines.append((s, e_, txt, True))
        elif ev["kind"] == "clip":
            quote = " … ".join(ev["quotes"])
            for s, e_, txt in caption_chunks(quote, ev["start"], ev["end"]):
                lines.append((s, e_, txt, False))
    lines.sort()
    srt.write_text("\n".join(f"{i + 1}\n{_ts(s, ',')} --> {_ts(e_, ',')}\n{t}\n" for i, (s, e_, t, _) in enumerate(lines)))
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Inter,52,&H00EEF3F5,&H00EEF3F5,&H00000000,&H99000000,0,0,0,0,100,100,0,0,3,14,0,2,160,160,250,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ev_lines = [f"Dialogue: 0,{_ts(s, '.')},{_ts(e_, '.')},Cap,,0,0,0,,{t.replace('{', '(').replace('}', ')')}"
                for s, e_, t, burn in lines if burn]
    ass.write_text(head + "\n".join(ev_lines) + "\n")


def chapters(timeline: list[dict]) -> str:
    out = []
    for ev in timeline:
        if ev["kind"] == "section":
            m, s = divmod(int(ev["start"]), 60)
            out.append(f"{m}:{s:02d} {ev['title']}")
    if out and not out[0].startswith("0:00"):
        out[0] = "0:00 " + out[0].split(" ", 1)[1]
    return "\n".join(out)


# ─── Composition ─────────────────────────────────────────────────────────────

def render(timeline: list[dict], sentences: list[str], cfg: dict, audio: Path, work: Path, out_mp4: Path,
           out_srt: Path, total: float) -> None:
    work.mkdir(parents=True, exist_ok=True)
    show, number, title = cfg.get("show", "Then / Now"), cfg.get("number", 1), cfg["title"]
    brand = f"<b>{e(show)}</b> &nbsp;·&nbsp; Ep {number} &nbsp;·&nbsp; {e(title)}"
    cache: dict[str, Path] = {}

    def png(key: str, make) -> Path:
        if key not in cache:
            cache[key] = screenshot(make(), work / f"{re.sub(r'[^a-z0-9]+', '_', key.lower())}.png")
        return cache[key]

    # Visual changes as (time, png, fallback_from): fallback cuts return to the
    # section card after a clip or chart, and are dropped if something else
    # took the screen in the meantime.
    cuts: list[tuple[float, Path, float | None]] = []
    section = "Cold Open"

    def section_card() -> Path:
        return png(f"section {section}", lambda: card_section(brand, section, title))

    for ev in timeline:
        k = ev["kind"]
        if k == "section":
            section = ev["title"]
            cuts.append((ev["start"], section_card(), None))
        elif k == "sting":
            outro = "OUTRO" in ev["name"]
            cuts.append((ev["start"], png("outro" if outro else "intro", lambda: card_title(show, number, title, outro)), None))
            if not outro:
                cuts.append((ev["end"] + 0.3, section_card(), ev["start"]))
        elif k == "clip":
            cuts.append((ev["start"] - 0.2, png(f"clip {ev['n']}", lambda: card_clip(brand, ev)), None))
            cuts.append((ev["end"] + 0.2, section_card(), ev["start"] - 0.2))
        elif k == "chart":
            c = cfg["charts"][ev["chart"]]
            cuts.append((ev["start"], png(f"chart {ev['chart']}", lambda: card_chart(brand, c)), None))
            cuts.append((ev["start"] + CHART_MAX, section_card(), ev["start"]))
    cuts.sort(key=lambda x: x[0])
    firm = [t for t, _, f in cuts if f is None]
    kept = [(t, p) for t, p, f in cuts if f is None or not any(f < x < t for x in firm)]
    cleaned: list[tuple[float, Path]] = []
    for t, p in kept:
        if cleaned and t - cleaned[-1][0] < 0.25:
            cleaned[-1] = (cleaned[-1][0], p)
        else:
            cleaned.append((t, p))
    if not cleaned or cleaned[0][0] > 0:
        cleaned.insert(0, (0.0, png("intro", lambda: card_title(show, number, title))))

    lst = work / "slides.txt"
    rows = []
    for i, (t, p) in enumerate(cleaned):
        nxt = cleaned[i + 1][0] if i + 1 < len(cleaned) else total
        rows.append(f"file '{p.resolve()}'\nduration {max(0.04, nxt - t):.3f}\n")
    rows.append(f"file '{cleaned[-1][1].resolve()}'\n")
    lst.write_text("".join(rows))

    ass = work / "captions.ass"
    write_captions(timeline, sentences, out_srt, ass)
    filt = (f"[1:a]aformat=channel_layouts=mono,showwaves=s={W - 240}x110:mode=cline:rate=30:colors=0xF7931A:scale=sqrt:draw=full,"
            f"format=rgba,colorchannelmixer=aa=0.9[w];"
            f"[0:v]fps=30,scale={W}:{H},format=yuv420p[bg];[bg][w]overlay=120:{H - 190}:shortest=1,"
            f"ass='{ass.as_posix()}'[v]")
    run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-i", str(audio),
         "-filter_complex", filt, "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "veryfast",
         "-tune", "stillimage", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", "-shortest", str(out_mp4)])
