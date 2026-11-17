#!/usr/bin/env node
/**
 * Download a profile photo for each person with a GitHub or X link into
 * public/people/avatars/<key>.<ext>, so the site serves them itself instead
 * of hot-linking (unavatar.io rate-limits visitors).
 *
 * Existing files are kept; delete one to refetch it. Run after
 * people:build, then run people:build again so it picks up the new files.
 *
 * Usage (from tbp-next/): node scripts/people/fetch-avatars.mjs [--limit 50]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT_DIR = path.join(ROOT, "public", "people", "avatars");
const people = JSON.parse(fs.readFileSync(path.join(ROOT, "src", "data", "people.json"), "utf-8"));
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Infinity;

export const avatarKey = (name) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

async function download(url) {
  const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "tbp-website avatar fetch" } });
  if (res.status === 429) throw new Error("rate limited");
  const type = (res.headers.get("content-type") || "").split(";")[0];
  if (!res.ok || !EXT[type]) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > 500 ? { buf, ext: EXT[type] } : null;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const existing = new Set(fs.readdirSync(OUT_DIR).map((f) => f.replace(/\.\w+$/, "")));
let fetched = 0;
let xLimited = false;
let missed = 0;
for (const p of people) {
  if (fetched >= LIMIT) break;
  const key = avatarKey(p.name);
  if (existing.has(key)) continue;
  const github = p.links.github?.match(/github\.com\/([^/?#]+)/)?.[1];
  const x = p.links.twitter?.replace("https://x.com/", "");
  const sources = [
    github && `https://github.com/${github}.png?size=192`,
    x && !xLimited && `https://unavatar.io/x/${x}?fallback=false`,
  ].filter(Boolean);
  if (!sources.length) continue;
  let got = null;
  for (const url of sources) {
    try {
      got = await download(url);
    } catch (err) {
      // unavatar.io allows a few dozen lookups a day; keep going with GitHub only.
      if (!xLimited) console.warn(`X photos ${err.message} at ${p.name}; run again later for the rest`);
      xLimited = true;
      continue;
    }
    if (got) break;
  }
  if (got) {
    fs.writeFileSync(path.join(OUT_DIR, `${key}.${got.ext}`), got.buf);
    fetched++;
    console.log(`✓ ${p.name}`);
  } else {
    missed++;
  }
}
console.log(`${fetched} avatars saved, ${missed} without a photo → ${path.relative(ROOT, OUT_DIR)}`);
