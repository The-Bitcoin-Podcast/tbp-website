import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getAllEpisodeFrontmatter } from "./content";
import { getShowMeta } from "./show-meta";

export interface EpisodeIndexEntry {
  title: string;
  date: string;
  duration: number | string;
  slug: string;
  description?: string;
  thumbnail: string;
  channel: string;
  guestNames?: string;
  tags?: string[];
}

export function buildEpisodeIndex(): EpisodeIndexEntry[] {
  const all = getAllEpisodeFrontmatter();

  return all
    .filter((e) => e.frontmatter.thumbnail && e.frontmatter.duration !== undefined)
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
    )
    .map((e) => {
      const fm = e.frontmatter;
      const guests = fm.guests || [];
      const guestNames = guests.map((g) => g.name).join(", ");

      return {
        title: fm.title,
        date: fm.date,
        duration: fm.duration,
        slug: `/episodes/${e.slug}`,
        description: fm.description,
        thumbnail: fm.thumbnail,
        channel: e.channel,
        guestNames: guestNames || undefined,
        tags: fm.tags,
      };
    });
}

export interface ShowSummary {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  color: string;
  cover: string;
  hosts?: string;
  count: number;
  firstYear: number;
  lastYear: number;
  hours: number;
  latestSlug: string;
}

function durationSeconds(duration: number | string | undefined): number {
  if (typeof duration === "number") return duration;
  if (!duration) return 0;
  return duration
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + (Number.isFinite(part) ? part : 0), 0);
}

/** Reads content/episodes/<show>/index.md for a title, cover image and hosts line. */
function readShowIndex(slug: string): { title?: string; cover?: string; hosts?: string } {
  const file = path.join(process.env.CONTENT_DIR || "", "episodes", slug, "index.md");
  if (!fs.existsSync(file)) return {};
  const { data, content } = matter(fs.readFileSync(file, "utf-8"));
  const cover = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/)?.[1];
  const hostsLine = content.match(/^Hosted by (.+)$/m)?.[1];
  const hosts = hostsLine?.replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, "$1").trim();
  return { title: data.title as string | undefined, cover, hosts };
}

/** One summary per show that has published episodes, biggest show first. */
export function buildShowSummaries(episodes: EpisodeIndexEntry[]): ShowSummary[] {
  const byShow = new Map<string, EpisodeIndexEntry[]>();
  for (const episode of episodes) {
    if (episode.channel === "root") continue;
    const list = byShow.get(episode.channel) ?? [];
    list.push(episode);
    byShow.set(episode.channel, list);
  }

  return [...byShow.entries()]
    .map(([slug, list]) => {
      const index = readShowIndex(slug);
      const meta = getShowMeta(slug, index.title);
      const years = list.map((e) => new Date(e.date).getUTCFullYear()).filter(Number.isFinite);
      const seconds = list.reduce((sum, e) => sum + durationSeconds(e.duration), 0);
      return {
        slug,
        ...meta,
        cover: slug === "tbp" ? "/tbp-logo.png" : index.cover || list[0].thumbnail,
        hosts: index.hosts,
        count: list.length,
        firstYear: Math.min(...years),
        lastYear: Math.max(...years),
        hours: Math.round(seconds / 3600),
        latestSlug: list[0].slug,
      };
    })
    .sort((a, b) => b.count - a.count);
}
