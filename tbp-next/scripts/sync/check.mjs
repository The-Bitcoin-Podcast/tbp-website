#!/usr/bin/env node
// Cheap checks that decide whether the hourly episode sync has anything to do.
// No npm packages, and 1 unit of YouTube API quota per channel.
//
//   node check.mjs feeds      which channels have videos the site doesn't know
//   node check.mjs captions   which recent episodes still lack a transcript
//
// Results go to stdout and, inside GitHub Actions, to $GITHUB_OUTPUT.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, "../../..");
export const EPISODES_DIR = path.join(REPO_ROOT, "content", "episodes");
export const TRANSCRIPTS_DIR = path.join(REPO_ROOT, "tbp-next", "data", "transcripts");
export const config = JSON.parse(fs.readFileSync(path.join(HERE, "config.json"), "utf8"));

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".md") && entry.name !== "index.md" ? [full] : [];
  });
}

/** Every episode file with the few frontmatter fields the sync cares about. */
export function listEpisodes() {
  return walk(EPISODES_DIR).map((file) => {
    const head = fs.readFileSync(file, "utf8").slice(0, 4000);
    return {
      file,
      slug: path.relative(EPISODES_DIR, file).replace(/\.md$/, "").split(path.sep).join("/"),
      youtubeId: head.match(/^youtubeId:\s*['"]?([A-Za-z0-9_-]{11})['"]?\s*$/m)?.[1],
      draft: /^draft:\s*true\s*$/m.test(head),
      date: head.match(/^date:\s*['"]?(\d{4}-\d{2}-\d{2})/m)?.[1],
    };
  });
}

function setOutput(name, value) {
  console.log(`${name}=${value}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

/** The channel's most recent uploads. Costs 1 unit of YouTube API quota. */
async function latestVideoIds(channel) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "contentDetails");
  // A channel's uploads playlist has the channel's ID with "UU" for "UC".
  url.searchParams.set("playlistId", "UU" + channel.channelId.slice(2));
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || `YouTube API returned ${response.status}`);
  return body.items.map((item) => item.contentDetails.videoId);
}

async function checkFeeds() {
  if (!process.env.YOUTUBE_API_KEY) {
    console.log("YOUTUBE_API_KEY is not set, so YouTube can't be checked.");
    setOutput("has_key", "false");
    setOutput("channels", "");
    return;
  }
  setOutput("has_key", "true");
  const known = new Set(listEpisodes().map((e) => e.youtubeId).filter(Boolean));
  const stale = [];
  for (const channel of config.channels) {
    const ids = await latestVideoIds(channel);
    const unknown = ids.filter((id) => !known.has(id));
    console.log(`${channel.name}: ${unknown.length} of the latest ${ids.length} videos are not on the site`);
    if (unknown.length) stale.push(channel.key);
  }
  setOutput("channels", stale.join(","));
}

/** Published YouTube episodes from the last few weeks with no transcript file. */
export function episodesMissingCaptions() {
  const cutoff = new Date(Date.now() - config.captionRetryDays * 86_400_000).toISOString().slice(0, 10);
  return listEpisodes().filter(
    (e) =>
      e.youtubeId &&
      !e.draft &&
      e.date >= cutoff &&
      !fs.existsSync(path.join(TRANSCRIPTS_DIR, `${e.slug}.json`))
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (mode === "feeds") await checkFeeds();
  else if (mode === "captions") {
    const missing = episodesMissingCaptions();
    for (const e of missing) console.log(`no transcript yet: ${e.slug}`);
    setOutput("slugs", missing.map((e) => e.slug).join(","));
  } else {
    console.error("usage: check.mjs feeds|captions");
    process.exit(2);
  }
}
