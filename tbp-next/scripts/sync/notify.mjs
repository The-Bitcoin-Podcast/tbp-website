#!/usr/bin/env node
// Words for the sync's commit and its Discord message.
//
//   node notify.mjs commit-message   print the commit message for this run
//   node notify.mjs published        tell Discord what was just published
//   node notify.mjs failed           tell Discord the run failed (RUN_URL)
//
// Discord messages need DISCORD_WEBHOOK_URL; without it they're only printed.
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./check.mjs";

const summaryFile = path.join(REPO_ROOT, "sync-summary.json");
const summary = fs.existsSync(summaryFile)
  ? JSON.parse(fs.readFileSync(summaryFile, "utf8"))
  : { published: [], shorts: [], mobile: [], waiting: [] };
const transcripts = Number(process.env.TRANSCRIPTS_ADDED || 0);
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

function commitMessage() {
  const added = summary.published.length + summary.shorts.length + summary.mobile.length;
  const lines = [];
  if (added) {
    lines.push(`Sync ${plural(added, "new video")} from YouTube`, "");
    for (const e of summary.published) lines.push(`- published: ${e.title}`);
    if (summary.shorts.length) lines.push(`- ${plural(summary.shorts.length, "short")} filed as drafts`);
    if (summary.mobile.length) lines.push(`- ${plural(summary.mobile.length, "mobile version")} filed as drafts`);
    if (transcripts) lines.push(`- ${plural(transcripts, "transcript")} added for clip search`);
  } else {
    lines.push(`Add ${plural(transcripts, "episode transcript")} for clip search`);
  }
  lines.push("", "Made by the Sync new episodes workflow.");
  return lines.join("\n");
}

async function discord(content) {
  console.log(content);
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return console.log("(DISCORD_WEBHOOK_URL is not set, so this was not posted)");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // No @mentions, whatever a video title contains.
    body: JSON.stringify({ content: content.slice(0, 1900), allowed_mentions: { parse: [] } }),
  });
  if (!response.ok) console.log(`Discord returned ${response.status}`);
}

const mode = process.argv[2];
if (mode === "commit-message") {
  console.log(commitMessage());
} else if (mode === "published") {
  if (summary.published.length) {
    const lines = summary.published.map((e) => `**${e.title}**\n${e.url}`);
    await discord(
      `New on the site (live in a few minutes):\n${lines.join("\n")}` +
        (transcripts ? "" : "\nClip search will cover it once YouTube's captions are ready.")
    );
  } else if (transcripts) {
    console.log("Only transcripts this run; nothing to announce.");
  }
} else if (mode === "failed") {
  await discord(`The episode sync failed. Nothing was published by this run.\n${process.env.RUN_URL || ""}`);
} else {
  console.error("usage: notify.mjs commit-message|published|failed");
  process.exit(2);
}
