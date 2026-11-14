#!/usr/bin/env node
// Pulls new videos into content/episodes and files them the way the hosts do
// by hand. Nothing is committed here; the workflow does that.
//
//   node sync.mjs tbp,hio     run the YouTube sync for those channels, then file
//   node sync.mjs --route     only file whatever new episode files are present
//
// Filing rules (see config.json):
//   - a video that's still a scheduled premiere or live stream is left for later
//   - clips under 3 minutes go to shorts/, as drafts
//   - titles matching a sub-show pattern go to that show's folder, published
//   - 📱 mobile versions take their full episode's number and stay drafts
//   - everything else is a full episode, published, numbered after the last one
//
// Writes a summary to sync-summary.json at the repo root.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { REPO_ROOT, EPISODES_DIR, config, listEpisodes } from "./check.mjs";

const SUMMARY_FILE = path.join(REPO_ROOT, "sync-summary.json");

function git(...args) {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
}

function newestEpisodeDate(directory) {
  const prefix = path.join(REPO_ROOT, directory) + path.sep;
  const dates = listEpisodes()
    .filter((e) => e.file.startsWith(prefix) && e.youtubeId && e.date)
    .map((e) => e.date)
    .sort();
  return dates.at(-1);
}

/** Run the repo's existing youtube-sync script for one channel. */
function runYouTubeSync(channel) {
  const newest = newestEpisodeDate(channel.outputDirectory);
  const after = new Date(
    (newest ? new Date(newest).getTime() : Date.now()) - config.lookbackDays * 86_400_000
  ).toISOString();
  const configFile = path.join(os.tmpdir(), `youtube-sync-${channel.key}.json`);
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      channelId: channel.handle,
      outputDirectory: channel.outputDirectory,
      autoPublish: true,
    })
  );
  console.log(`\n=== ${channel.name}: videos published after ${after}`);
  execFileSync(
    "npx",
    ["tsx", "quartz/scripts/youtube-sync.ts", "--config", configFile, "--after", after, "--no-commit=true"],
    { cwd: REPO_ROOT, stdio: "inherit" }
  );
}

/** Episode files git doesn't have yet (untracked or freshly staged). */
function newEpisodeFiles() {
  return git("status", "--porcelain", "-z", "--untracked-files=all", "--", "content/episodes")
    .split("\0")
    .filter((line) => /^(\?\?|A.) /.test(line) && line.endsWith(".md"))
    .map((line) => path.join(REPO_ROOT, line.slice(3)));
}

function durationSeconds(duration) {
  if (typeof duration === "number") return duration;
  if (!duration) return 0;
  return String(duration)
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
}

const normalizeTitle = (title) => String(title).replace(/\s+/g, " ").trim().toLowerCase();
const isMobileTitle = (title) => / - Mobile$/.test(title);
const numberPrefix = (file) => Number(path.basename(file).match(/^(\d+)-/)?.[1] ?? 0);

function highestNumber(directory, exclude) {
  const dir = path.join(REPO_ROOT, directory);
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !exclude.has(path.join(dir, name)))
    .reduce((highest, name) => Math.max(highest, numberPrefix(name)), 0);
}

/** Move a new file into place with its final number and draft flag. */
function place(item, directory, number, draft) {
  const raw = fs
    .readFileSync(item.file, "utf8")
    .replace(/^episodeNumber:.*$/m, `episodeNumber: ${number}`)
    .replace(/^draft:.*$/m, `draft: ${draft}`);
  const name = path.basename(item.file).replace(/^\d+-/, `${String(number).padStart(2, "0")}-`);
  const target = path.join(REPO_ROOT, directory, name);
  if (target !== item.file && fs.existsSync(target)) {
    throw new Error(`${path.relative(REPO_ROOT, target)} already exists`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(item.file);
  fs.writeFileSync(target, raw);
  return path.relative(EPISODES_DIR, target).replace(/\.md$/, "").split(path.sep).join("/");
}

function route() {
  const files = newEpisodeFiles();
  const fresh = new Set(files);
  const existing = listEpisodes().filter((e) => !fresh.has(e.file));
  const knownIds = new Set(existing.map((e) => e.youtubeId).filter(Boolean));
  const summary = { published: [], shorts: [], mobile: [], waiting: [], duplicates: 0 };

  const items = files
    .map((file) => ({ file, data: matter(fs.readFileSync(file, "utf8")).data }))
    // youtube-sync numbered them oldest first; keep that order.
    .sort((a, b) => numberPrefix(a.file) - numberPrefix(b.file));

  const fulls = [];
  const mobiles = [];
  for (const item of items) {
    const { title, youtubeId, duration } = item.data;
    const seconds = durationSeconds(duration);
    if (knownIds.has(youtubeId)) {
      // Already on the site under another folder or number.
      fs.rmSync(item.file);
      summary.duplicates++;
    } else if (seconds === 0) {
      // A premiere or live stream that hasn't aired. Picked up on a later run.
      fs.rmSync(item.file);
      summary.waiting.push({ title, reason: "not aired yet" });
    } else if (seconds < config.shortsMaxSeconds) {
      item.kind = "short";
      fulls.push(item);
    } else if (isMobileTitle(title)) {
      mobiles.push(item);
    } else {
      item.kind = "full";
      fulls.push(item);
    }
  }

  // Full episodes and shorts: next free number in the folder they belong to.
  const nextNumber = new Map();
  const placedFulls = [];
  for (const item of fulls) {
    const { title } = item.data;
    const subShow = config.subShows.find((show) => new RegExp(show.titlePattern, "i").test(title));
    const directory =
      item.kind === "short"
        ? config.shortsDirectory
        : subShow?.directory ?? path.relative(REPO_ROOT, path.dirname(item.file));
    if (!nextNumber.has(directory)) nextNumber.set(directory, highestNumber(directory, fresh) + 1);
    const number = nextNumber.get(directory);
    nextNumber.set(directory, number + 1);
    const slug = place(item, directory, number, item.kind === "short");
    if (item.kind === "short") summary.shorts.push({ title, slug });
    else {
      placedFulls.push({ title, directory, number });
      summary.published.push({ title, slug, url: `${config.siteUrl}/episodes/${slug}` });
    }
  }

  // Mobile versions: same folder and number as the episode they mirror.
  for (const item of mobiles) {
    const base = normalizeTitle(item.data.title.replace(/ - Mobile$/, ""));
    let parent = placedFulls.find((full) => normalizeTitle(full.title) === base);
    if (!parent) {
      const match = existing
        .filter((e) => e.youtubeId && !e.draft)
        .find((e) => normalizeTitle(matter(fs.readFileSync(e.file, "utf8")).data.title) === base);
      if (match) {
        parent = {
          directory: path.relative(REPO_ROOT, path.dirname(match.file)),
          number: numberPrefix(match.file),
        };
      }
    }
    if (!parent) {
      // Its full episode isn't on the site yet. Picked up on a later run.
      fs.rmSync(item.file);
      summary.waiting.push({ title: item.data.title, reason: "full episode not found yet" });
      continue;
    }
    const slug = place(item, parent.directory, parent.number, true);
    summary.mobile.push({ title: item.data.title, slug });
  }

  fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  console.log(
    `\nFiled: ${summary.published.length} published, ${summary.shorts.length} shorts (draft), ` +
      `${summary.mobile.length} mobile versions (draft), ${summary.waiting.length} left for later, ` +
      `${summary.duplicates} duplicates dropped`
  );
  for (const episode of summary.published) console.log(`  published: ${episode.title} -> ${episode.url}`);
  for (const item of summary.waiting) console.log(`  later: ${item.title} (${item.reason})`);
}

const arg = process.argv[2] ?? "";
if (arg !== "--route") {
  const keys = arg.split(",").filter(Boolean);
  for (const channel of config.channels.filter((c) => keys.includes(c.key))) runYouTubeSync(channel);
}
route();
