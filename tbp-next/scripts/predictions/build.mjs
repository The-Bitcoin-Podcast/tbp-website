#!/usr/bin/env node
/**
 * Turn graded predictions into the data behind the "Prediction Scorecard" page.
 *
 * Reads data/predictions/graded.json (one entry per on-air forecast: the
 * verbatim quote, its transcript timestamp, and a sourced verdict), joins in
 * each episode's show, title and media, and drops forecasts that were only
 * relayed from someone outside the show, plus anything listed in
 * data/predictions/exclude.json (off-topic or duplicate calls).
 *
 * Output: src/data/predictions.json
 *
 * Usage (from tbp-next/):  node scripts/predictions/build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const IN = path.join(ROOT, "data", "predictions", "graded.json");
const OUT = path.join(ROOT, "src", "data", "predictions.json");
const CONTENT_DIR =
  process.env.CONTENT_DIR ||
  [path.resolve(ROOT, "..", "content"), path.resolve(ROOT, "..", "tbp-website", "content")].find(
    (dir) => fs.existsSync(dir),
  );
if (!CONTENT_DIR) throw new Error("content directory not found; set CONTENT_DIR");
const EPISODES_DIR = path.join(CONTENT_DIR, "episodes");

/** Seconds of lead-in before the quoted line. */
const LEAD_IN = 2;
const VERDICTS = new Set(["hit", "partial", "miss", "pending"]);

const graded = JSON.parse(fs.readFileSync(IN, "utf-8"));
const EXCLUDE = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "predictions", "exclude.json"), "utf-8"));
const skipped = { excluded: 0, relayed: 0, ungradeable: 0, missing: 0 };
const out = [];

for (const p of graded) {
  if (EXCLUDE[p.id]) { skipped.excluded++; continue; }
  if (p.relayed) { skipped.relayed++; continue; }
  if (!VERDICTS.has(p.verdict)) { skipped.ungradeable++; continue; }
  const file = path.join(EPISODES_DIR, `${p.slug}.md`);
  if (!fs.existsSync(file)) { skipped.missing++; continue; }
  const { data: fm } = matter(fs.readFileSync(file, "utf-8"));
  const parts = p.slug.split("/");
  const audioUrl = String(fm.audioUrl || "").trim();
  out.push({
    id: p.id,
    slug: p.slug,
    show: parts.length > 1 ? parts[0] : "tbp",
    episode: String(fm.title ?? p.slug),
    date: p.date,
    start: Math.max(0, Math.round((p.start - LEAD_IN) * 10) / 10),
    quote: p.quote.trim(),
    claim: p.claim,
    headline: p.headline,
    speaker: p.speaker && !/^(host|guest|unknown|hosts|guests|speaker)$/i.test(p.speaker.trim()) ? p.speaker : "",
    role: /^guest$/i.test(p.speaker ?? "") ? "guest" : /^host$/i.test(p.speaker ?? "") ? "host" : "",
    subject: p.subject || "other",
    horizon: p.horizon ?? null,
    boldness: p.boldness ?? null,
    verdict: p.verdict,
    confidence: p.confidence,
    outcome: p.outcome,
    resolved: p.resolved ?? null,
    sources: (p.sources ?? []).filter((s) => /^https?:\/\//.test(s.url)).slice(0, 2),
    ...(audioUrl ? { audioUrl } : {}),
    ...(fm.youtubeId ? { youtubeId: String(fm.youtubeId) } : {}),
  });
}

out.sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));

const counts = {};
for (const p of out) counts[p.verdict] = (counts[p.verdict] ?? 0) + 1;
console.log(`${out.length} predictions`, counts, "skipped", skipped, `-> ${path.relative(ROOT, OUT)}`);
