#!/usr/bin/env node
/**
 * Build the clip-search index.
 *
 * Reads every transcript in data/transcripts/ (written by fetch_captions.py and
 * transcribe_audio.py) and indexes each ~25 second segment as its own search
 * record, so a search hit is a moment in an episode rather than a whole episode.
 *
 * Each record is filterable by episode, so one search also returns how many
 * moments matched in every episode without loading the moments themselves.
 *
 * Also writes public/pagefind/episodes.json: the headline of every published
 * episode (title, description, guests, chapters, length), searched in the browser so
 * results can show matching episodes first and the moments inside them second.
 *
 * Output: public/pagefind/ (static files, loaded in the browser on demand).
 *
 * Usage (from tbp-next/):  node scripts/build-search-index.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import * as pagefind from "pagefind";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRANSCRIPTS_DIR = path.join(ROOT, "data", "transcripts");
// Content sits beside this app in the repo (../content); a standalone checkout
// keeps it in a sibling tbp-website folder.
const CONTENT_DIR =
  process.env.CONTENT_DIR ||
  [path.resolve(ROOT, "..", "content"), path.resolve(ROOT, "..", "tbp-website", "content")].find(
    (dir) => fs.existsSync(dir),
  );
if (!CONTENT_DIR) throw new Error("content directory not found; set CONTENT_DIR");
const EPISODES_DIR = path.join(CONTENT_DIR, "episodes");
const OUTPUT_DIR = path.join(ROOT, "public", "pagefind");

function walkJson(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkJson(full));
    else if (entry.name.endsWith(".json") && !entry.name.startsWith("_")) out.push(full);
  }
  return out;
}

function toIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function walkMarkdown(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith(".md") && entry.name !== "index.md") out.push(full);
  }
  return out;
}

/** Frontmatter duration is either seconds or "H:MM:SS". */
function toSeconds(duration) {
  if (typeof duration === "number") return Math.round(duration);
  if (typeof duration !== "string") return 0;
  const parts = duration.split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return Math.round(parts.reduce((total, part) => total * 60 + part, 0));
}

const showNames = new Map();
function showName(channel) {
  if (!showNames.has(channel)) {
    let name = channel.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const indexPath = path.join(EPISODES_DIR, channel, "index.md");
    if (fs.existsSync(indexPath)) {
      const title = matter(fs.readFileSync(indexPath, "utf-8")).data.title;
      if (title) name = String(title);
    }
    showNames.set(channel, name);
  }
  return showNames.get(channel);
}

const files = walkJson(TRANSCRIPTS_DIR);
/** slug -> { clips, lastStart } for episodes that have a transcript. */
const transcribed = new Map();
const { index, errors } = await pagefind.createIndex();
if (!index) throw new Error(`pagefind failed to start: ${errors.join("; ")}`);

let episodes = 0;
let clips = 0;
let skipped = 0;

for (const file of files) {
  const transcript = JSON.parse(fs.readFileSync(file, "utf-8"));
  const mdPath = path.join(EPISODES_DIR, `${transcript.slug}.md`);
  if (!fs.existsSync(mdPath)) {
    skipped++;
    continue;
  }
  const { data: fm } = matter(fs.readFileSync(mdPath, "utf-8"));
  if (fm.draft || !fm.title) {
    skipped++;
    continue;
  }

  const parts = transcript.slug.split("/");
  const channel = parts.length > 1 ? parts[0] : "tbp";
  // Pagefind also searches a record's metadata, so anything put there (title,
  // slug) would make every moment of an episode match a word that only appears
  // in its name. Records carry just their timestamp; the episode comes from the
  // "episode" filter and its details from episodes.json.

  for (const [start, text] of transcript.segments) {
    const seconds = Math.max(0, Math.floor(start));
    const result = await index.addCustomRecord({
      url: `/episodes/${transcript.slug}?t=${seconds}`,
      content: text,
      language: "en",
      meta: { t: String(seconds) },
      filters: { channel: [channel], episode: [transcript.slug] },
      sort: { date: toIsoDate(fm.date) },
    });
    if (result.errors.length) throw new Error(result.errors.join("; "));
    clips++;
  }
  transcribed.set(transcript.slug, {
    clips: transcript.segments.length,
    lastStart: transcript.segments.at(-1)?.[0] ?? 0,
  });
  episodes++;
}

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
const written = await index.writeFiles({ outputPath: OUTPUT_DIR });
if (written.errors.length) throw new Error(written.errors.join("; "));
await pagefind.close();

/** Chapter lines in the show notes, e.g. "00:05:51 Who Really Created the Lightning Network?" */
const CHAPTER_RE = /^\s*[-*]?\s*\(?((?:\d{1,2}:)?\d{1,2}:\d{2})\)?\s+[-–—]?\s*(\S.*?)\s*$/;
function readChapters(body) {
  const chapters = [];
  for (const line of body.split("\n")) {
    const match = line.match(CHAPTER_RE);
    if (match) chapters.push([toSeconds(match[1]), match[2].replace(/[*_`]/g, "").slice(0, 160)]);
  }
  // A single stray timestamp is not a chapter list.
  return chapters.length >= 3 ? chapters : [];
}

const headlines = [];
for (const file of walkMarkdown(EPISODES_DIR)) {
  const { data: fm, content: body } = matter(fs.readFileSync(file, "utf-8"));
  if (fm.draft || !fm.title || !fm.date) continue;
  const slug = path.relative(EPISODES_DIR, file).replace(/\.md$/, "").split(path.sep).join("/");
  const parts = slug.split("/");
  const transcript = transcribed.get(slug);
  const headline = {
    slug,
    title: String(fm.title),
    date: toIsoDate(fm.date),
    show: parts.length > 1 ? showName(parts[0]) : "The Bitcoin Podcast",
    // The timeline needs a length; fall back to where the transcript ends.
    duration: toSeconds(fm.duration) || (transcript ? Math.ceil(transcript.lastStart) + 30 : 0),
    clips: transcript?.clips ?? 0,
  };
  const description = String(fm.description ?? "").replace(/\s+/g, " ").trim();
  if (description) headline.description = description.slice(0, 320);
  const guests = (Array.isArray(fm.guests) ? fm.guests : []).map((g) => g?.name).filter(Boolean);
  if (guests.length) headline.guests = guests.map(String);
  if (fm.youtubeId) headline.youtubeId = String(fm.youtubeId);
  if (fm.audioUrl) headline.audioUrl = String(fm.audioUrl).trim();
  if (fm.thumbnail) headline.image = String(fm.thumbnail);
  const chapters = readChapters(body);
  if (chapters.length) headline.chapters = chapters;
  headlines.push(headline);
}
headlines.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(path.join(OUTPUT_DIR, "episodes.json"), JSON.stringify(headlines));

console.log(
  `Indexed ${clips} clips from ${episodes} episodes (${skipped} skipped) and ${headlines.length} episode headlines -> ${path.relative(ROOT, OUTPUT_DIR)}`,
);
