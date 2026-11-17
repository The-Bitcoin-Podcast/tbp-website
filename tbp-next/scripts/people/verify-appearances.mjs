#!/usr/bin/env node
/**
 * Drop credits in data/people/appearances.json that the episode itself doesn't
 * back up: a guest is kept only if their name (or surname, or a profile alias)
 * appears in the episode's title or notes; a host only if their name or a
 * known nickname does. Prints what it removed.
 *
 * Usage (from tbp-next/): node scripts/people/verify-appearances.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR =
  process.env.CONTENT_DIR ||
  [path.resolve(ROOT, "..", "content"), path.resolve(ROOT, "..", "tbp-website", "content")].find((d) => fs.existsSync(d));
const FILE = path.join(ROOT, "data", "people", "appearances.json");
const profiles = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "people", "profiles.json"), "utf-8"));
const appearances = JSON.parse(fs.readFileSync(FILE, "utf-8"));
const DRY = process.argv.includes("--dry-run");

const fold = (s) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "").toLowerCase();

const NICKNAMES = {
  "Demetrick Ferguson": ["dee", "demetrick"],
  "Jessie Santiago": ["cello", "jessie", "jesse"],
  "Corey Petty": ["corey", "petty"],
  "Collin Cusce": ["collin"],
  "Dean Eigenmann": ["dean"],
  "John Mardlin": ["john", "maurelian"],
  "Jarrad Hope": ["jarrad"],
  "Evan Van Ness": ["evan"],
};

function tokens(name) {
  const aliases = [name];
  for (const [canon, p] of Object.entries(profiles)) {
    if (canon === name || (p.aliases || []).includes(name)) aliases.push(canon, ...(p.aliases || []));
  }
  const out = new Set();
  for (const a of aliases) {
    const clean = fold(a).replace(/\(.*?\)/g, "").replace(/[^a-z0-9 ]+/g, " ").trim();
    if (!clean) continue;
    out.add(clean);
    const parts = clean.split(/\s+/);
    if (parts.length > 1 && parts.at(-1).length > 2) out.add(parts.at(-1)); // surname
    if (parts.length === 1) out.add(parts[0]);
  }
  return [...out];
}

let removed = 0;
for (const [slug, credits] of Object.entries(appearances)) {
  const file = path.join(CONTENT_DIR, "episodes", `${slug}.md`);
  if (!fs.existsSync(file)) continue;
  const { data, content } = matter(fs.readFileSync(file, "utf-8"));
  const text = " " + fold(`${data.title} ${data.description || ""} ${content}`).replace(/[^a-z0-9]+/g, " ") + " ";
  appearances[slug] = credits.filter((c) => {
    const words = [...tokens(c.name), ...(c.role === "host" ? NICKNAMES[c.name] || [] : [])];
    const ok = words.some((w) => text.includes(` ${w} `));
    if (!ok) {
      removed++;
      console.log(`✗ ${c.name} (${c.role}) ← ${slug}`);
    }
    return ok;
  });
  if (!appearances[slug].length) delete appearances[slug];
}
if (!DRY) fs.writeFileSync(FILE, JSON.stringify(appearances, null, 1) + "\n");
console.log(`${removed} unsupported credits ${DRY ? "found" : "removed"}`);
