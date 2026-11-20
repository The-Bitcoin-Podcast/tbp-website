"""Mine the transcript archive into structured "fact cards" for the faceless podcast.

Each transcript in data/transcripts/<show>/<file>.json is sent to Claude Haiku 5.5
(Message Batches API, 50% off) together with the episode's title/date/description
from content/episodes/. The model returns JSON fact cards with timestamps so later
steps can search claims by topic and cut archive clips.

Usage (from tbp-next/):
  .venv-tools/bin/python scripts/mine_factcards.py pilot [N]   # N episodes, synchronous, prints cost
  .venv-tools/bin/python scripts/mine_factcards.py submit      # one batch for everything not yet mined
  .venv-tools/bin/python scripts/mine_factcards.py status
  .venv-tools/bin/python scripts/mine_factcards.py collect     # write results + rebuild index
  .venv-tools/bin/python scripts/mine_factcards.py import DIR  # validate cards written by Claude Code
                                                               # subagents (DIR/<show>__<file>.json)

Credentials: ANTHROPIC_API_KEY from the environment or from tbp-next/.env.local
(gitignored). Output: data/factcards/<show>/<file>.json and data/factcards/index.jsonl.
"""

import glob
import json
import os
import random
import sys
from pathlib import Path

import anthropic

ROOT = Path(__file__).resolve().parent.parent          # tbp-next/
TRANSCRIPTS = ROOT / "data" / "transcripts"
EPISODES = ROOT.parent / "content" / "episodes"
OUT = ROOT / "data" / "factcards"
STATE = OUT / "_batches.json"

MODEL = "claude-haiku-5-5"
PRICE_IN, PRICE_OUT = 0.10, 0.50   # $/MTok, prompts <=100K tokens; batch halves both

CARD_TYPES = ["fact", "prediction", "opinion", "explainer", "anecdote", "debate"]

SCHEMA = {
    "type": "object",
    "properties": {
        "episode_summary": {"type": "string"},
        "guests": {"type": "array", "items": {"type": "string"}},
        "topics": {"type": "array", "items": {"type": "string"}},
        "cards": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": CARD_TYPES},
                    "claim": {"type": "string"},
                    "speaker": {"type": "string"},
                    "start": {"type": "number"},
                    "quote": {"type": "string"},
                    "tags": {"type": "array", "items": {"type": "string"}},
                    "checkable": {"type": "boolean"},
                    "clip_worthy": {"type": "boolean"},
                },
                "required": ["type", "claim", "speaker", "start", "quote", "tags",
                             "checkable", "clip_worthy"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["episode_summary", "guests", "topics", "cards"],
    "additionalProperties": False,
}

SYSTEM = """You turn crypto podcast transcripts into research "fact cards" for a show that \
compares what was said back then with what is true today.

Extract 15-40 cards per episode, favouring the substance a crypto enthusiast would find \
dense and useful:
- prediction: a forecast about price, adoption, technology, regulation or a project (most valuable)
- fact: a concrete number, date, event or technical detail stated at the time
- explainer: a clear explanation of how something works (protocol, attack, economics)
- opinion: a strong, specific stance on a contested question
- debate: hosts/guests disagreeing; summarise both sides in the claim
- anecdote: a first-hand story (exchange collapse, hack, early mining, etc.)

Rules:
- claim: one self-contained sentence in past tense that makes sense with no context, \
naming the project/person involved (e.g. "In June 2016 the hosts expected SegWit to activate \
within six months.").
- speaker: the person's name if the transcript makes it clear, else "host", "guest" or "unknown". \
The transcript has no speaker labels, so do not guess a name you cannot support.
- start: the timestamp in seconds of the segment where the statement begins (use the [s] markers).
- quote: a verbatim excerpt of at most 40 words, copied exactly from the transcript, used to \
find the audio clip later. Fix nothing.
- tags: 2-5 short lowercase tags (e.g. "lightning", "segwit", "ethereum", "regulation", "mining").
- checkable: true if today's data could confirm or refute it.
- clip_worthy: true only if the quote works as a standalone 15-45 second audio clip.
- Skip ads, intros, housekeeping, and small talk. Never invent content not in the transcript.
- topics: 3-8 tags for the whole episode. guests: names of guests, or empty."""


def load_key():
    if os.environ.get("ANTHROPIC_API_KEY"):
        return
    env = ROOT / ".env.local"
    if env.exists():
        for line in env.read_text().splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                os.environ["ANTHROPIC_API_KEY"] = line.split("=", 1)[1].strip().strip('"\'')
                return
    sys.exit("No ANTHROPIC_API_KEY. Add ANTHROPIC_API_KEY=... to tbp-next/.env.local")


def frontmatter(slug):
    md = EPISODES / f"{slug}.md"
    meta = {}
    if not md.exists():
        return meta
    text = md.read_text()
    if text.startswith("---"):
        try:
            import yaml  # optional
            meta = yaml.safe_load(text.split("---", 2)[1]) or {}
        except Exception:
            for line in text.split("---", 2)[1].splitlines():
                if ":" in line and not line.startswith(" "):
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip().strip("'\"")
    return meta


def transcripts():
    items = []
    for f in sorted(glob.glob(str(TRANSCRIPTS / "*" / "*.json"))):
        d = json.load(open(f))
        if d.get("segments"):
            items.append((Path(f), d))
    return items


def out_path(src: Path) -> Path:
    return OUT / src.parent.name / src.name


def build_prompt(d):
    meta = frontmatter(d["slug"])
    desc = str(meta.get("description", ""))[:1500]
    lines = "\n".join(f"[{int(t)}] {txt.strip()}" for t, txt in d["segments"])
    return (f"Show/slug: {d['slug']}\nTitle: {meta.get('title', '')}\n"
            f"Date: {meta.get('date', 'unknown')}\nDescription: {desc}\n\n"
            f"Transcript ([seconds] text):\n{lines}")


def params(d):
    return {
        "model": MODEL,
        "max_tokens": 16000,
        "output_config": {"effort": "low",
                          "format": {"type": "json_schema", "schema": SCHEMA}},
        "system": SYSTEM,
        "messages": [{"role": "user", "content": build_prompt(d)}],
    }


def save(src: Path, d, msg):
    text = next(b.text for b in msg.content if b.type == "text")
    data = json.loads(text)
    meta = frontmatter(d["slug"])
    data.update({"slug": d["slug"], "title": meta.get("title"), "date": str(meta.get("date", "")),
                 "audioUrl": d.get("audioUrl"), "youtubeId": d.get("youtubeId"),
                 "model": MODEL})
    p = out_path(src)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    return data


def cost(usage, batch):
    c = (usage.input_tokens * PRICE_IN + usage.output_tokens * PRICE_OUT) / 1e6
    return c / 2 if batch else c


def cmd_pilot(n):
    client = anthropic.Anthropic()
    items = transcripts()
    random.seed(7)
    picks = random.sample(items, n)
    tot_in = tot_out = 0
    for src, d in picks:
        msg = client.messages.create(**params(d))
        if msg.stop_reason != "end_turn":
            print(f"!! {d['slug']}: stop_reason={msg.stop_reason}")
            continue
        data = save(src, d, msg)
        tot_in += msg.usage.input_tokens
        tot_out += msg.usage.output_tokens
        print(f"{d['slug']}: {len(data['cards'])} cards, in={msg.usage.input_tokens} "
              f"out={msg.usage.output_tokens}")
    k = len(items) / n
    est = ((tot_in * k) * PRICE_IN + (tot_out * k) * PRICE_OUT) / 1e6 / 2
    print(f"\nPilot cost ${cost(type('u', (), {'input_tokens': tot_in, 'output_tokens': tot_out}), False):.3f}"
          f"; projected full batch for {len(items)} episodes ≈ ${est:.2f}")


def cmd_submit():
    from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
    from anthropic.types.messages.batch_create_params import Request
    client = anthropic.Anthropic()
    todo = [(s, d) for s, d in transcripts() if not out_path(s).exists()]
    if not todo:
        return print("Nothing to mine.")
    state = json.loads(STATE.read_text()) if STATE.exists() else {"batches": []}
    idmap = {f"e{i:04d}": str(s.relative_to(TRANSCRIPTS)) for i, (s, _) in enumerate(todo)}
    reqs = [Request(custom_id=cid, params=MessageCreateParamsNonStreaming(**params(d)))
            for cid, (_, d) in zip(idmap, todo)]
    batch = client.messages.batches.create(requests=reqs)
    state["batches"].append({"id": batch.id, "map": idmap, "collected": False})
    OUT.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(state, indent=1))
    print(f"Submitted batch {batch.id} with {len(reqs)} episodes.")


def cmd_status():
    client = anthropic.Anthropic()
    state = json.loads(STATE.read_text())
    for b in state["batches"]:
        r = client.messages.batches.retrieve(b["id"])
        print(b["id"], r.processing_status, r.request_counts, "collected" if b["collected"] else "")


def cmd_collect():
    client = anthropic.Anthropic()
    state = json.loads(STATE.read_text())
    total = 0.0
    for b in state["batches"]:
        if b["collected"]:
            continue
        if client.messages.batches.retrieve(b["id"]).processing_status != "ended":
            print(f"{b['id']} still processing")
            continue
        ok = bad = 0
        for res in client.messages.batches.results(b["id"]):
            src = TRANSCRIPTS / b["map"][res.custom_id]
            if res.result.type != "succeeded":
                bad += 1
                print(f"!! {src.name}: {res.result.type}")
                continue
            msg = res.result.message
            try:
                if msg.stop_reason != "end_turn":
                    raise ValueError(msg.stop_reason)
                save(src, json.load(open(src)), msg)
                ok += 1
            except Exception as e:
                bad += 1
                print(f"!! {src.name}: {e}")
            total += cost(msg.usage, True)
        b["collected"] = True
        print(f"{b['id']}: {ok} saved, {bad} failed (rerun submit to retry failures)")
    STATE.write_text(json.dumps(state, indent=1))
    print(f"Batch cost ≈ ${total:.2f}")
    build_index()


def _norm(s):
    return " ".join("".join(ch.lower() if ch.isalnum() else " " for ch in s).split())


def locate_quote(quote, segments):
    """Return (segment_start, exact) for the segment containing the quote, or (None, False).

    Whisper segments split mid-sentence, so match against each segment joined with the next.
    Falls back to the segment sharing the longest run of the quote's first words.
    """
    q = _norm(quote)
    if not q:
        return None, False
    normed = [_norm(t) for _, t in segments]

    def starts_in(i, needle):
        # True only if needle begins inside segment i (it may run on into segment i+1)
        window = normed[i] + " " + (normed[i + 1] if i + 1 < len(normed) else "")
        pos = window.find(needle)
        return 0 <= pos < len(normed[i])

    for i in range(len(normed)):
        if starts_in(i, q):
            return segments[i][0], True
    words = q.split()
    for n in (8, 5):
        if len(words) >= n:
            head = " ".join(words[:n])
            for i in range(len(normed)):
                if starts_in(i, head):
                    return segments[i][0], False
    return None, False


def cmd_import(src_dir):
    """Import agent-written card files (<show>__<file>.json) after validating them."""
    keys = set(SCHEMA["required"])
    card_keys = set(SCHEMA["properties"]["cards"]["items"]["required"])
    for f in sorted(glob.glob(os.path.join(src_dir, "*__*.json"))):
        name = Path(f).stem
        show, fname = name.split("__", 1)
        tpath = TRANSCRIPTS / show / f"{fname}.json"
        d = json.load(open(tpath))
        try:
            data = json.load(open(f))
        except json.JSONDecodeError as e:
            print(f"!! {name}: invalid JSON ({e})")
            continue
        if set(data) != keys:
            print(f"!! {name}: top-level keys {sorted(data)}")
            continue
        kept, exact, fixed, dropped = [], 0, 0, 0
        for c in data["cards"]:
            if set(c) != card_keys or c["type"] not in CARD_TYPES:
                dropped += 1
                continue
            start, is_exact = locate_quote(c["quote"], d["segments"])
            if start is None:
                dropped += 1          # quote not in transcript: likely paraphrased/invented
                continue
            if abs(start - c["start"]) > 1:
                fixed += 1
            c["start"] = start
            c["quote_exact"] = is_exact
            exact += is_exact
            kept.append(c)
        data["cards"] = kept
        meta = frontmatter(d["slug"])
        data.update({"slug": d["slug"], "title": meta.get("title"), "date": str(meta.get("date", "")),
                     "audioUrl": d.get("audioUrl"), "youtubeId": d.get("youtubeId"),
                     "model": "claude-code-subagent-haiku"})
        p = TRANSCRIPTS.parent / "factcards" / show / f"{fname}.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data, indent=1, ensure_ascii=False))
        print(f"{name}: kept {len(kept)} ({exact} exact quotes, {fixed} timestamps corrected), "
              f"dropped {dropped}")
    build_index()


def build_index():
    n = 0
    with open(OUT / "index.jsonl", "w") as fh:
        for f in sorted(glob.glob(str(OUT / "*" / "*.json"))):
            d = json.load(open(f))
            for c in d["cards"]:
                fh.write(json.dumps({**c, "slug": d["slug"], "title": d.get("title"),
                                     "date": d.get("date"), "audioUrl": d.get("audioUrl")},
                                    ensure_ascii=False) + "\n")
                n += 1
    print(f"index.jsonl: {n} cards")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "import":     # cards written by Claude Code subagents; no API key needed
        sys.exit(cmd_import(sys.argv[2]))
    if cmd == "index":
        sys.exit(build_index())
    load_key()
    {"pilot": lambda: cmd_pilot(int(sys.argv[2]) if len(sys.argv) > 2 else 3),
     "submit": cmd_submit, "status": cmd_status, "collect": cmd_collect,
     "index": build_index}[cmd]()
