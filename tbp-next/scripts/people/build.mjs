#!/usr/bin/env node
/**
 * Build src/data/people.json, the data behind /people and /people/<name>.
 *
 * Sources, merged by name (aliases in profiles.json map variant spellings and
 * nicknames onto one person):
 *
 *   data/people/appearances.json  – who appeared on which episode, as guest or
 *                                   host (extracted from titles + show notes,
 *                                   reviewed by hand). Edit this to fix credits.
 *   data/people/research.json     – bios and links found by web research,
 *                                   each link checked to resolve.
 *   data/people/profiles.json     – hand-curated per-person details: aliases,
 *                                   bio, affiliation, links, hosted shows.
 *                                   Wins over every other source.
 *   ../content/people/*.md        – the older hand-written people pages; their
 *                                   bios and links are folded in.
 *   src/data/ten-words.json       – In Ten Words answers, credited by speaker.
 *
 * Usage (from tbp-next/): node scripts/people/build.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONTENT_DIR =
  process.env.CONTENT_DIR ||
  [path.resolve(ROOT, "..", "content"), path.resolve(ROOT, "..", "tbp-website", "content")].find(
    (dir) => fs.existsSync(dir),
  );
if (!CONTENT_DIR) throw new Error("content directory not found; set CONTENT_DIR");
const EPISODES_DIR = path.join(CONTENT_DIR, "episodes");
const PEOPLE_DIR = path.join(CONTENT_DIR, "people");
const DATA_DIR = path.join(ROOT, "data", "people");
const OUT = path.join(ROOT, "src", "data", "people.json");

const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : fallback;

const appearances = readJson(path.join(DATA_DIR, "appearances.json"), {});
const profiles = readJson(path.join(DATA_DIR, "profiles.json"), {});
const research = readJson(path.join(DATA_DIR, "research.json"), {});
const tenWords = readJson(path.join(ROOT, "src", "data", "ten-words.json"), []);

/** Same URL form as toUrlSlug() in src/lib/content.ts. */
const toUrlSlug = (name) => name.replace(/[/?#%"]/g, "").replace(/ /g, "-");
const key = (name) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’']/g, "")
    .replace(/^dr\.?\s+/i, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

// ─── Name resolution ───────────────────────────────────────────────────────
const canonical = new Map(); // key -> display name
for (const [name, profile] of Object.entries(profiles)) {
  canonical.set(key(name), name);
  for (const alias of profile.aliases || []) canonical.set(key(alias), name);
}
const resolve = (name) => canonical.get(key(name)) || name.trim();

// ─── Episodes ──────────────────────────────────────────────────────────────
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return e.name.endsWith(".md") && e.name !== "index.md" ? [full] : [];
  });
}
const episodes = new Map();
for (const file of walk(EPISODES_DIR)) {
  const { data } = matter(fs.readFileSync(file, "utf-8"));
  if (data.draft || !data.title || !data.date) continue;
  const slug = path.relative(EPISODES_DIR, file).replace(/\.md$/, "").split(path.sep).join("/");
  episodes.set(slug, {
    slug,
    show: slug.split("/")[0],
    title: String(data.title),
    // Unquoted YAML dates arrive as Date objects.
    date: (data.date instanceof Date ? data.date.toISOString() : String(data.date)).slice(0, 10),
    thumbnail: data.thumbnail || undefined,
  });
}

// ─── People ────────────────────────────────────────────────────────────────
const people = new Map();
function person(rawName) {
  const name = resolve(rawName);
  if (!people.has(name)) {
    people.set(name, {
      name,
      slug: toUrlSlug(name),
      roles: new Set(),
      affiliation: undefined,
      bio: undefined,
      links: {},
      hosted: new Set(),
      appearances: new Map(), // episode slug -> role
      tenWords: 0,
    });
  }
  return people.get(name);
}

const LINK_KINDS = ["website", "twitter", "github", "linkedin", "nostr", "youtube", "instagram", "mastodon", "farcaster", "bluesky"];

function classifyUrl(url) {
  const u = url.replace(/\/+$/, "");
  if (/(^|\/\/)(www\.)?(twitter|x)\.com\//i.test(u)) return "twitter";
  if (/github\.com\//i.test(u)) return "github";
  if (/linkedin\.com\//i.test(u)) return "linkedin";
  if (/youtube\.com\/|youtu\.be\//i.test(u)) return "youtube";
  if (/instagram\.com\//i.test(u)) return "instagram";
  if (/bsky\.app\//i.test(u)) return "bluesky";
  if (/warpcast\.com\//i.test(u)) return "farcaster";
  if (/(primal\.net|njump\.me|snort\.social|iris\.to)\//i.test(u) || /^npub1/.test(u)) return "nostr";
  return "website";
}

function normalizeTwitter(value) {
  const v = value.trim();
  const handle = v.startsWith("http")
    ? v.replace(/^https?:\/\/(www\.)?(twitter|x)\.com\/@?/i, "").split(/[/?#]/)[0]
    : v.replace(/^@/, "");
  return handle && /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `https://x.com/${handle}` : undefined;
}

/** Links checked and found dead (data/people/blocked-links.json). */
const blocked = new Set(readJson(path.join(DATA_DIR, "blocked-links.json"), []).map((u) => u.replace(/\/+$/, "")));

function addLink(p, kind, url, { override = false } = {}) {
  if (!url || typeof url !== "string") return;
  if (blocked.has(url.trim().replace(/\/+$/, ""))) return;
  let value = url.trim().replace(/\\_/g, "_");
  if (kind === "twitter") value = normalizeTwitter(value);
  else if (!/^https?:\/\//.test(value) && !(kind === "nostr" && value.startsWith("npub"))) value = `https://${value}`;
  if (!value) return;
  if (kind === "website" || kind === "other") {
    p.links.other = p.links.other || [];
    if (kind === "website" && (!p.links.website || override)) {
      if (p.links.website && p.links.website !== value) p.links.other.unshift(p.links.website);
      p.links.website = value;
    } else if (value !== p.links.website && !p.links.other.includes(value)) {
      p.links.other.push(value);
    }
    return;
  }
  if (!p.links[kind] || override) p.links[kind] = value;
}

const HOSTED_TAGS = {
  tbp: "tbp",
  hashingitout: "hio",
  "dee-weekly": "dee-weekly",
  onramping: "onramping-with-dee",
  announcements: "announcements",
  justtheheaders: "just-the-headers",
  flashhash: "flash-hash",
  whattheheaders: "what-the-header",
  blockchannel: "blockchannel",
  "ethereum-podcast": "an-ethereum-podcast",
};

// Older hand-written pages in content/people.
const IGNORE_LINK = /thebtcpodcast|thebitcoinpodcast|hashingitout|spotify\.com|apple\.com|anchor\.fm|wikipedia\.org\/wiki\/(?!.*_)/i;
for (const file of fs.existsSync(PEOPLE_DIR) ? fs.readdirSync(PEOPLE_DIR) : []) {
  if (!file.endsWith(".md")) continue;
  const fileName = file.replace(/\.md$/, "");
  const { data, content } = matter(fs.readFileSync(path.join(PEOPLE_DIR, file), "utf-8"));
  const p = person(fileName);
  p.slug = toUrlSlug(fileName); // keep the page's existing URL
  const tags = Array.isArray(data.tags) ? data.tags : [];
  if (tags.includes("host")) p.roles.add("host");
  if (tags.includes("guest")) p.roles.add("guest");
  // "## Hosted:" lists shows as hashtags (#TBP, #HashingItOut, …).
  const hostedBlock = content.match(/##\s*Hosted:?([\s\S]*?)(\n##|$)/i)?.[1] || "";
  for (const m of hostedBlock.matchAll(/#([\w-]+)/g)) {
    const show = HOSTED_TAGS[m[1].toLowerCase()];
    if (show) {
      p.hosted.add(show);
      p.roles.add("host");
    }
  }

  // Bio: the prose lines before the first link list / "Guest on" section.
  const bioLines = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (/^##\s*(guest on|hosted|appearances)/i.test(line)) break;
    if (!line || /^##\s*bio/i.test(line) || /^\*\*.*links:?\*\*$/i.test(line)) continue;
    if (/^-\s*(website|twitter|github|linkedin|doc|telegram|books|discord|medium|instagram|youtube)\s*:/i.test(line)) continue;
    if (/^-?\s*\t*-?\s*\[https?:/.test(line) || /^-\s*https?:/.test(line)) continue;
    bioLines.push(line.replace(/^-\s+/, "").replace(/\[\[([^\]|]+)\|?([^\]]*)\]\]/g, (_, a, b) => b || a));
  }
  const bio = bioLines.join(" ").replace(/\s+/g, " ").trim();
  if (bio && bio.length > 2) p.bio = bio;

  // Links: labelled bullets ("- Twitter: https://…") and bare URLs.
  for (const m of content.matchAll(/-\s*(Website|Twitter|Github|LinkedIn|Youtube|Instagram|Books)\s*:\s*\[?(https?:\/\/[^\s\])]+)/gi)) {
    const label = m[1].toLowerCase();
    if (IGNORE_LINK.test(m[2])) continue;
    addLink(p, label === "books" ? "other" : classifyUrl(m[2]) === "website" ? "website" : classifyUrl(m[2]), m[2]);
  }
  for (const m of content.matchAll(/https?:\/\/[^\s\])>]+/g)) {
    if (IGNORE_LINK.test(m[0])) continue;
    const kind = classifyUrl(m[0]);
    if (kind !== "website") addLink(p, kind, m[0]);
  }
}

// Episode appearances.
for (const [slug, credits] of Object.entries(appearances)) {
  if (!episodes.has(slug)) continue;
  for (const credit of credits) {
    const p = person(credit.name);
    const role = credit.role === "host" ? "host" : "guest";
    if (p.appearances.get(slug) !== "guest") p.appearances.set(slug, role);
    p.roles.add(role);
    if (role === "host") p.hosted.add(episodes.get(slug).show);
    if (credit.affiliation && !p.affiliation) p.affiliation = credit.affiliation;
    for (const [kind, value] of Object.entries(credit.links || {})) {
      if (kind === "other") (Array.isArray(value) ? value : [value]).forEach((v) => addLink(p, "other", v));
      else if (LINK_KINDS.includes(kind)) addLink(p, kind, value);
    }
  }
}

// In Ten Words answers.
for (const moment of tenWords) {
  if (!moment.answeredBy) continue;
  const p = person(moment.answeredBy);
  p.tenWords += 1;
  p.roles.add("guest");
  if (episodes.has(moment.slug) && !p.appearances.has(moment.slug)) p.appearances.set(moment.slug, "guest");
}

// Web research: bios, roles and links looked up per person (and checked).
for (const [name, found] of Object.entries(research)) {
  const p = people.get(resolve(name));
  if (!p) continue;
  if (found.bio) p.bio = found.bio;
  if (found.affiliation) p.affiliation = found.affiliation;
  for (const [kind, value] of Object.entries(found.links || {})) {
    if (kind === "other") (Array.isArray(value) ? value : [value]).forEach((v) => addLink(p, "other", v));
    else addLink(p, kind, value, { override: kind !== "website" });
  }
}

// Curated profile details win over everything extracted.
for (const [name, profile] of Object.entries(profiles)) {
  const p = person(name);
  if (profile.bio) p.bio = profile.bio;
  if (profile.affiliation) p.affiliation = profile.affiliation;
  if (profile.host) p.roles.add("host");
  for (const show of profile.hosted || []) p.hosted.add(show);
  for (const [kind, value] of Object.entries(profile.links || {})) {
    if (kind === "other") (Array.isArray(value) ? value : [value]).forEach((v) => addLink(p, "other", v));
    else addLink(p, kind, value, { override: true });
  }
  if (profile.hide) people.delete(name);
}

// ─── Output ────────────────────────────────────────────────────────────────
// Photos downloaded by fetch-avatars.mjs, served from /people/avatars/.
const AVATAR_DIR = path.join(ROOT, "public", "people", "avatars");
const avatarKey = (name) =>
  name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
const avatars = new Map(
  (fs.existsSync(AVATAR_DIR) ? fs.readdirSync(AVATAR_DIR) : []).map((f) => [
    f.replace(/\.\w+$/, ""),
    `/people/avatars/${f}`,
  ]),
);

const out = [...people.values()]
  .map((p) => {
    const eps = [...p.appearances.entries()]
      .map(([slug, role]) => ({ ...episodes.get(slug), role }))
      .sort((a, b) => b.date.localeCompare(a.date));
    const strip = (u) => u.replace(/\/+$/, "");
    if (p.links.other) {
      const primary = new Set(Object.entries(p.links).filter(([k]) => k !== "other").map(([, v]) => strip(v)));
      p.links.other = [...new Set(p.links.other.map(strip))].filter((u) => !primary.has(u));
    }
    const links = Object.fromEntries(
      Object.entries(p.links).filter(([, v]) => (Array.isArray(v) ? v.length : v)),
    );

    // Shows ordered by how often the person is on them, so the main one leads.
    const perShow = new Map();
    for (const e of eps) perShow.set(e.show, (perShow.get(e.show) || 0) + 1);
    const byCount = (a, b) => (perShow.get(b) || 0) - (perShow.get(a) || 0) || a.localeCompare(b);
    return {
      name: p.name,
      slug: p.slug,
      host: p.roles.has("host"),
      hosted: [...p.hosted].sort(byCount),
      affiliation: p.affiliation,
      bio: p.bio,
      links,
      avatar: profiles[p.name]?.avatar || avatars.get(avatarKey(p.name)),
      tenWords: p.tenWords,
      shows: [...perShow.keys()].sort(byCount),
      first: eps.at(-1)?.date,
      last: eps[0]?.date,
      episodes: eps,
    };
  })
  // A page with nothing on it (no episodes, bio or links) isn't worth listing.
  .filter((p) => p.episodes.length || p.bio || Object.keys(p.links).length || p.host)
  .sort((a, b) => a.name.localeCompare(b.name));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
const withLinks = out.filter((p) => Object.keys(p.links).length).length;
console.log(
  `${out.length} people (${out.filter((p) => p.host).length} hosts), ` +
    `${out.reduce((n, p) => n + p.episodes.length, 0)} appearances, ${withLinks} with links → ${path.relative(ROOT, OUT)}`,
);
