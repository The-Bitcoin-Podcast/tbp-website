#!/usr/bin/env node
/**
 * Find every transcript moment where a host asks one of the show's signature
 * questions, for the "In Ten Words" page:
 *
 *   ten  – "In ten words or less, can you describe Bitcoin / blockchain / …?"
 *   hard – "Is what you do hard?"
 *   ask  – "Is there anything you wanted us to ask that we didn't?"
 *
 * The regexes are deliberately loose (the questions were asked many ways over
 * the years and Whisper spells "ten" as "10"), so the output is a list of
 * candidates to review, not answers. Each candidate is a window of transcript
 * segments around the match, with the episode's title, date and guests.
 *
 * Usage (from tbp-next/):
 *   node scripts/ten-words/find-candidates.mjs [--out data/ten-words/candidates.json] [--since 2026-01-01]
 *
 * --since keeps only episodes published on or after a date, for adding new
 * episodes to an existing data/ten-words/answers.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRANSCRIPTS_DIR = path.join(ROOT, "data", "transcripts");
const CONTENT_DIR =
  process.env.CONTENT_DIR ||
  [path.resolve(ROOT, "..", "content"), path.resolve(ROOT, "..", "tbp-website", "content")].find(
    (dir) => fs.existsSync(dir),
  );
if (!CONTENT_DIR) throw new Error("content directory not found; set CONTENT_DIR");
const EPISODES_DIR = path.join(CONTENT_DIR, "episodes");

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const OUT = path.resolve(ROOT, argValue("--out", "data/ten-words/candidates.json"));
const SINCE = argValue("--since", "");

export const QUESTIONS = {
  ten: /\b(ten|10)\s+words\b/i,
  hard: /\b(do|job|work|doing)\s+(is\s+)?hard\b/i,
  ask: new RegExp(
    [
      String.raw`(didn't|did not|forgot to|failed to|haven't|have not|never got to) ask`,
      String.raw`(wanted|want|hoped|wish(ed)?) (us|me) to ask`,
      String.raw`(should|would) (have|'ve) (asked|liked (us|me) to ask)`,
      String.raw`hoped we( would)? ask`,
      String.raw`you wish we('d| had)? asked`,
      String.raw`(didn't|did not) (get|get around) to`,
    ].join("|"),
    "i",
  ),
};

/** Segments before and after the matching one, so the full answer is included. */
const BEFORE = 1;
const AFTER = 3;

function walkJson(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJson(full));
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) out.push(full);
  }
  return out;
}

const candidates = [];
for (const file of walkJson(TRANSCRIPTS_DIR)) {
  const transcript = JSON.parse(fs.readFileSync(file, "utf-8"));
  const mdPath = path.join(EPISODES_DIR, `${transcript.slug}.md`);
  if (!fs.existsSync(mdPath)) continue;
  const { data: fm } = matter(fs.readFileSync(mdPath, "utf-8"));
  if (fm.draft || !fm.title || !fm.date) continue;
  const date = new Date(fm.date).toISOString().slice(0, 10);
  if (SINCE && date < SINCE) continue;

  const segments = transcript.segments;
  /** Matching segment indexes, by question. */
  const hits = [];
  segments.forEach(([, text], i) => {
    for (const [question, re] of Object.entries(QUESTIONS)) {
      if (re.test(text)) hits.push({ question, i });
    }
  });
  if (!hits.length) continue;

  // Merge overlapping windows so one exchange is reviewed once.
  hits.sort((a, b) => a.i - b.i);
  const windows = [];
  for (const hit of hits) {
    const from = Math.max(0, hit.i - BEFORE);
    const to = Math.min(segments.length - 1, hit.i + AFTER);
    const last = windows.at(-1);
    if (last && from <= last.to) {
      last.to = Math.max(last.to, to);
      if (!last.questions.includes(hit.question)) last.questions.push(hit.question);
    } else {
      windows.push({ from, to, questions: [hit.question] });
    }
  }

  const guests = (Array.isArray(fm.guests) ? fm.guests : []).map((g) => g?.name).filter(Boolean);
  for (const window of windows) {
    candidates.push({
      id: `${transcript.slug}@${Math.floor(segments[window.from][0])}`,
      slug: transcript.slug,
      title: String(fm.title),
      date,
      guests: guests.map(String),
      questions: window.questions,
      segments: segments.slice(window.from, window.to + 2).map(([start, text], k) => ({
        start,
        text,
        // The segment after the window only marks where the last one ends.
        ...(window.from + k > window.to ? { endMarker: true } : {}),
      })),
    });
  }
}

candidates.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(candidates, null, 1));
const byQuestion = {};
for (const c of candidates) for (const q of c.questions) byQuestion[q] = (byQuestion[q] ?? 0) + 1;
console.log(
  `${candidates.length} candidate windows from ${new Set(candidates.map((c) => c.slug)).size} episodes`,
  byQuestion,
  `-> ${path.relative(ROOT, OUT)}`,
);
