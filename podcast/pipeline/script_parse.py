"""Read an episode script (script.md) into an ordered list of production items.

The script format is the one in plans/episodes/*/script.md:

    ## SECTION NAME (0:00–0:40)          -> {"kind": "section"}
    **NARRATOR:** + paragraphs           -> {"kind": "narration"} (split into sentences)
    **[CLIP n | SRC @ mm:ss | who | ~Ns]** + "> quote" lines -> {"kind": "clip"}
    **[CHART: ...]**                     -> a chart cue on the next narration sentence
    **[STING]** / **[OUTRO STING]**      -> {"kind": "sting"}
    `[DATA: ...]`                        -> production note, never read aloud
"""
from __future__ import annotations

import re

HEADING = re.compile(r"^##\s+(.+?)\s*(?:\(([^)]*)\))?\s*$")
CLIP = re.compile(r"^\*\*\[CLIP\s+([^|\]]+)\|\s*([^@|]+?)\s*@\s*([^|]+)\|\s*([^|]+)\|\s*([^\]]*)\]\*\*\s*$")
CHART = re.compile(r"^\*\*\[CHART:?\s*(.*?)\]\*\*\s*$")
STING = re.compile(r"^\*\*\[((?:OUTRO\s+)?STING)\]\*\*\s*$")
NARRATOR = re.compile(r"^\*\*NARRATOR:\*\*\s*(.*)$")
TIME = re.compile(r"\b(?:(\d+):)?(\d{1,2}):(\d{2})\b")
SENTENCE_END = re.compile(r"[.!?…][\"”’)]*(?=\s+[\"“'(A-Z0-9$])")
SMALL_WORDS = {"a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "vs", "vs."}


def title_case(text: str) -> str:
    words = text.lower().split()
    return " ".join(
        w if i and w in SMALL_WORDS else w[:1].upper() + w[1:] for i, w in enumerate(words)
    )


def _seconds(text: str) -> list[float]:
    return [int(h or 0) * 3600 + int(m) * 60 + int(s) for h, m, s in TIME.findall(text)]


def clean_spoken(text: str) -> str:
    """Narration text as it should be read: no markdown, no production notes."""
    text = re.sub(r"`[^`]*`", " ", text)          # [DATA: ...] and code
    text = re.sub(r"\[(?:DATA|VERIFY)[^\]]*\]", " ", text)
    text = text.replace("**", "").replace("*", "")
    for mark, word in (("✅", "Right"), ("❌", "Wrong"), ("〰️", "Mixed"), ("〰", "Mixed")):
        text = text.replace(f"Mostly {mark}", f"Mostly {word.lower()}").replace(mark, word)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"\s+([.,;:!?])", r"\1", text)
    return re.sub(r"([.!?])[.\s]*\.(?=\s|$)", r"\1", text)


def split_sentences(text: str, min_words: int = 4) -> list[str]:
    parts, last = [], 0
    for m in SENTENCE_END.finditer(text):
        parts.append(text[last:m.end()].strip())
        last = m.end()
    parts.append(text[last:].strip())
    parts = [p for p in parts if p]
    # Very short fragments ("One.", "Rapid fire.") are hard to find in a
    # recording on their own, so ride along with the next sentence.
    out: list[str] = []
    carry = ""
    for p in parts:
        p = f"{carry} {p}".strip() if carry else p
        if len(p.split()) < min_words:
            carry = p
            continue
        out.append(p)
        carry = ""
    if carry:
        if out:
            out[-1] = f"{out[-1]} {carry}"
        else:
            out.append(carry)
    return out


def _clean_quote(line: str) -> str:
    q = line.lstrip(">").strip()
    q = q.strip('"“”').strip()
    q = q.strip("…").strip()
    q = q.strip('"“”').strip()
    return q


def parse_script(md: str) -> list[dict]:
    items: list[dict] = []
    started = False
    narr: dict | None = None
    pending_chart: int | None = None
    chart_count = 0
    clip: dict | None = None

    def flush_narration():
        nonlocal narr
        if narr and narr["paragraphs"]:
            sentences: list[str] = []
            cues: dict[int, int] = {}
            for kind, value in narr["paragraphs"]:
                if kind == "chart":
                    cues[len(sentences)] = value
                else:
                    sentences.extend(split_sentences(clean_spoken(value)))
            # A chart cue after the last sentence belongs to the end of the block.
            cues = {min(k, max(len(sentences) - 1, 0)): v for k, v in cues.items()}
            if sentences:
                items.append({"kind": "narration", "sentences": sentences, "charts": cues})
        narr = None

    def flush_clip():
        nonlocal clip
        if clip:
            items.append(clip)
        clip = None

    for raw in md.splitlines():
        line = raw.strip()
        h = HEADING.match(line)
        if h:
            flush_narration(); flush_clip()
            started = True
            title = h.group(1).strip()
            items.append({"kind": "section", "title": title_case(title) if title.isupper() else title})
            continue
        if not started or line == "---":
            continue

        c = CLIP.match(line)
        if c:
            flush_narration(); flush_clip()
            clip = {
                "kind": "clip",
                "n": c.group(1).strip(),
                "source": c.group(2).strip(),
                "times": _seconds(c.group(3)),
                "speaker": c.group(4).strip(),
                "quotes": [],
            }
            continue
        if clip is not None:
            if line.startswith(">"):
                clip["quotes"].append(_clean_quote(line))
                continue
            if not line:
                continue
            flush_clip()

        s = STING.match(line)
        if s:
            flush_narration()
            items.append({"kind": "sting", "name": s.group(1).upper()})
            continue

        ch = CHART.match(line)
        if ch:
            if narr is None:
                narr = {"paragraphs": []}
            narr["paragraphs"].append(("chart", chart_count))
            chart_count += 1
            continue

        n = NARRATOR.match(line)
        if n:
            flush_narration()
            narr = {"paragraphs": []}
            if n.group(1).strip():
                narr["paragraphs"].append(("text", n.group(1)))
            continue

        if narr is not None and line and not (line.startswith("`") and line.endswith("`")):
            narr["paragraphs"].append(("text", line))

    flush_narration(); flush_clip()
    return items


if __name__ == "__main__":
    import json, sys
    print(json.dumps(parse_script(open(sys.argv[1]).read()), indent=1, ensure_ascii=False))
