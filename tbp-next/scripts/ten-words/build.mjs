#!/usr/bin/env node
/**
 * Turn reviewed answers into the data behind the "In Ten Words" page.
 *
 * Reads data/ten-words/answers*.json (one entry per guest answer, with the
 * host's question and the answer copied exactly from the transcript), finds
 * both in the transcript to time an audio clip from the question to the end of
 * the answer, and joins in each episode's show, date and media.
 *
 * Whisper segments are ~25 seconds long, so a position inside a segment is
 * estimated by how far into its text the words fall.
 *
 * Output: src/data/ten-words.json
 *
 * Usage (from tbp-next/):  node scripts/ten-words/build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DATA_DIR = path.join(ROOT, "data", "ten-words");
const TRANSCRIPTS_DIR = path.join(ROOT, "data", "transcripts");
const OUT = path.join(ROOT, "src", "data", "ten-words.json");
const CONTENT_DIR =
  process.env.CONTENT_DIR ||
  [path.resolve(ROOT, "..", "content"), path.resolve(ROOT, "..", "tbp-website", "content")].find(
    (dir) => fs.existsSync(dir),
  );
if (!CONTENT_DIR) throw new Error("content directory not found; set CONTENT_DIR");
const EPISODES_DIR = path.join(CONTENT_DIR, "episodes");

/** Seconds of lead-in before the question and run-out after the answer. */
const LEAD_IN = 0.75;
const RUN_OUT = 1.5;
const MAX_CLIP = 120;

const answers = fs
  .readdirSync(DATA_DIR)
  .filter((name) => /^answers.*\.json$/.test(name))
  .sort()
  .flatMap((name) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf-8")));

const transcripts = new Map();
function transcript(slug) {
  if (!transcripts.has(slug)) {
    const file = path.join(TRANSCRIPTS_DIR, `${slug}.json`);
    transcripts.set(slug, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : null);
  }
  return transcripts.get(slug);
}

const episodes = new Map();
function episode(slug) {
  if (!episodes.has(slug)) {
    const { data: fm } = matter(fs.readFileSync(path.join(EPISODES_DIR, `${slug}.md`), "utf-8"));
    episodes.set(slug, fm);
  }
  return episodes.get(slug);
}

const normalize = (text) => text.replace(/\s+/g, " ").trim();

/**
 * Find `needle` in the transcript at or after segment `from`, returning the
 * segment index and character offsets of the match.
 */
function locate(segments, needle, from = 0) {
  const want = normalize(needle);
  if (!want) return null;
  for (let i = Math.max(0, from); i < segments.length; i++) {
    const text = normalize(segments[i][1]);
    const at = text.indexOf(want);
    if (at >= 0) return { i, start: at, end: at + want.length, length: text.length };
  }
  return null;
}

/** Estimated time of a character offset inside segment i. */
function timeAt(segments, i, offset, length) {
  const start = segments[i][0];
  const next = segments[i + 1]?.[0] ?? start + 25;
  return start + (next - start) * (length ? offset / length : 0);
}

const countWords = (text) =>
  normalize(text)
    .replace(/[^\p{L}\p{N}'\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean).length;

const moments = [];
const problems = [];
const seen = new Set();

for (const answer of answers) {
  const data = transcript(answer.slug);
  if (!data) {
    problems.push(`${answer.id}: no transcript`);
    continue;
  }
  const segments = data.segments;
  const windowStart = Number(answer.id.split("@").pop());
  const fromSegment = Math.max(0, segments.findIndex(([start]) => start >= windowStart - 1));

  const asked = locate(segments, answer.asked, fromSegment);
  const said = locate(segments, answer.answer, asked ? asked.i : fromSegment);
  if (!said) {
    problems.push(`${answer.id}: answer not found in transcript`);
    continue;
  }
  let endPos = { i: said.i, offset: said.end, length: said.length };
  let text = normalize(answer.answer);
  if (answer.answerContinued) {
    const more = locate(segments, answer.answerContinued, said.i + 1);
    if (more && more.i === said.i + 1) {
      endPos = { i: more.i, offset: more.end, length: more.length };
      text = `${text} ${normalize(answer.answerContinued)}`;
    }
  }

  const answerStart = timeAt(segments, said.i, said.start, said.length);
  const questionStart = asked ? timeAt(segments, asked.i, asked.start, asked.length) : answerStart;
  let start = Math.max(0, Math.min(questionStart, answerStart) - LEAD_IN);
  const end = timeAt(segments, endPos.i, endPos.offset, endPos.length) + RUN_OUT;
  if (end - start > MAX_CLIP) start = Math.max(0, answerStart - LEAD_IN);

  // Some interviews were published twice (e.g. a re-release under a new slug);
  // keep the first copy of an answer.
  const key = `${answer.question}|${text.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 80)}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const fm = episode(answer.slug);
  const parts = answer.slug.split("/");
  const audioUrl = String(fm.audioUrl || data.audioUrl || "").trim();
  moments.push({
    id: `${answer.slug}@${Math.round(answerStart)}`,
    slug: answer.slug,
    show: parts.length > 1 ? parts[0] : "tbp",
    episode: String(fm.title),
    date: new Date(fm.date).toISOString().slice(0, 10),
    question: answer.question,
    subject: answer.question === "ten" ? normalize(answer.subject || "Bitcoin") : "",
    asked: asked ? normalize(answer.asked) : "",
    answer: text,
    words: countWords(text),
    answeredBy: normalize(answer.answeredBy || ""),
    highlight: Boolean(answer.highlight),
    start: Math.round(start * 10) / 10,
    end: Math.round(Math.min(end, start + MAX_CLIP) * 10) / 10,
    ...(audioUrl ? { audioUrl } : {}),
    ...(fm.youtubeId ? { youtubeId: String(fm.youtubeId) } : {}),
    ...(fm.thumbnail ? { thumbnail: String(fm.thumbnail) } : {}),
  });
}

// ─── Re-published interviews ─────────────────────────────────────────────────
// Many interviews went out more than once: "Interview #344" and "The Bitcoin
// Podcast #344" on the same day, or a "Flashback" re-release years later. Each
// copy was transcribed on its own, so the same answer reads slightly
// differently and an exact-text match misses it. Short answers are no help
// either: plenty of different guests said "Bitcoin is money for the internet".
// What does give a copy away is the conversation leading up to the question,
// so compare the 90 seconds before each answer, as overlapping three-word runs.
// Real copies score 0.5 to 1.0; different interviews stay under about 0.12.
const SAME_INTERVIEW = 0.3;
const CONTEXT_BEFORE = 90;

function trigrams(moment) {
  const words = transcript(moment.slug)
    .segments.filter(([start]) => start >= moment.start - CONTEXT_BEFORE && start <= moment.end)
    .map(([, text]) => text)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const grams = new Set();
  for (let i = 0; i + 2 < words.length; i++) grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return grams;
}

function overlap(a, b) {
  let shared = 0;
  for (const gram of a) if (b.has(gram)) shared++;
  return shared / Math.max(1, Math.min(a.size, b.size));
}

/** Which copy of an interview to keep: playable audio, then the original airing, then the full episode over an "Interview #" cut. */
function preference(m) {
  return [m.audioUrl ? 0 : 1, m.date, /^\s*inte?r?view\b/i.test(m.episode) ? 1 : 0, m.slug];
}
function prefer(a, b) {
  const [pa, pb] = [preference(a), preference(b)];
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

const grams = moments.map(trigrams);
// Copies can chain (original, "Interview #", "Flashback"), so join matching
// answers into groups. When co-guests answer back to back, both of their
// answers share the same lead-up and land in one group; keeping every answer
// from the preferred episode in the group keeps both guests, once each.
const parent = moments.map((_, i) => i);
const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
for (let i = 0; i < moments.length; i++) {
  for (let j = i + 1; j < moments.length; j++) {
    const [a, b] = [moments[i], moments[j]];
    if (a.question !== b.question || a.slug === b.slug) continue;
    if (overlap(grams[i], grams[j]) >= SAME_INTERVIEW) parent[find(j)] = find(i);
  }
}
/** The preferred answer in each group; its episode is the copy that is kept. */
const keeper = new Map();
moments.forEach((m, i) => {
  const root = find(i);
  const current = keeper.get(root);
  if (!current || prefer(m, current) < 0) keeper.set(root, m);
});
const removed = [];
const unique = moments.filter((m, i) => {
  const kept = keeper.get(find(i));
  if (m.slug === kept.slug) return true;
  removed.push(`${m.answeredBy || "Guest"} (${m.question}) in "${m.episode}", kept "${kept.episode}"`);
  return false;
});
moments.length = 0;
moments.push(...unique);

moments.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(moments));

const byQuestion = {};
for (const m of moments) byQuestion[m.question] = (byQuestion[m.question] ?? 0) + 1;
console.log(`${moments.length} moments`, byQuestion, `-> ${path.relative(ROOT, OUT)}`);
if (removed.length) console.log(`${removed.length} re-published copies removed:\n  ${removed.join("\n  ")}`);
if (problems.length) console.warn(`${problems.length} skipped:\n  ${problems.join("\n  ")}`);
