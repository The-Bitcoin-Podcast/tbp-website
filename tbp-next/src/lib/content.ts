import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import { remarkWikilinks } from "./remark-wikilinks";
import {
  EpisodeFrontmatter,
  EpisodeCard,
  LandingPageFrontmatter,
  Guest,
  ContentPage,
} from "./types";

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(process.cwd(), "content");

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkWikilinks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeStringify);

async function processMarkdown(raw: string): Promise<string> {
  const result = await markdownProcessor.process(raw);
  return String(result);
}

export async function getPageContent(
  relativePath: string
): Promise<ContentPage | null> {
  const filePath = path.join(CONTENT_DIR, relativePath);
  if (!fs.existsSync(filePath)) {
    // A full HTML document (e.g. an exported email newsletter) can stand in
    // for a markdown page: news/my-issue.html is served at /news/my-issue.
    return getHtmlDocument(relativePath.replace(/\.md$/, ".html"));
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content: md } = matter(raw);
  const content = await processMarkdown(md);

  return {
    frontmatter: data,
    content,
    slug: relativePath.replace(/\.md$/, ""),
  };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&nbsp;/g, " ");
}

function readMetaTag(html: string, name: string): string | undefined {
  const tag = html.match(
    new RegExp(`<meta[^>]*name=["']${name}["'][^>]*>`, "i")
  )?.[0];
  const value = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return value ? decodeEntities(value).trim() : undefined;
}

function getHtmlDocument(relativePath: string): ContentPage | null {
  const filePath = path.join(CONTENT_DIR, relativePath);
  if (!relativePath.endsWith(".html") || !fs.existsSync(filePath)) return null;

  const html = fs.readFileSync(filePath, "utf-8");
  const slug = relativePath.replace(/\.html$/, "");
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const frontmatter: Record<string, unknown> = {};

  const title = titleTag ? decodeEntities(titleTag).trim() : "";
  if (title) frontmatter.title = title;
  // Date comes from <meta name="date" content="2026-03-05"> or the file name.
  const date =
    readMetaTag(html, "date") ?? path.basename(slug).match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (date && !Number.isNaN(new Date(date).getTime())) frontmatter.date = date;
  const description = readMetaTag(html, "description");
  if (description) frontmatter.description = description;

  return { frontmatter, content: html, slug, isHtmlDocument: true };
}

export function getLandingConfig(): LandingPageFrontmatter {
  const filePath = path.join(CONTENT_DIR, "index.md");
  const raw = fs.readFileSync(filePath, "utf-8");
  const { data } = matter(raw);

  return {
    title: data.title || "Podcast Title",
    tagline: data.tagline || "",
    discordUrl: data.discordUrl || "#",
    twitterUrl: data.twitterUrl || "#",
    youtubeUrl: data.youtubeUrl || "#",
    rssUrl: data.rssUrl || "/index.xml",
    aboutUrl: data.aboutUrl || "/about",
    sponsorsUrl: data.sponsorsUrl || "/sponsors",
    contactUrl: data.contactUrl || "/contact",
    guestsUrl: data.guestsUrl || "/people",
    episodesArchiveUrl: data.episodesArchiveUrl || "/episodes",
    reportsUrl: data.reportsUrl || "/reports",
    newsUrl: data.newsUrl || "/news",
    businessTipsUrl: data.businessTipsUrl || "/business-tips",
  };
}

function walkMdFiles(dir: string, extensions: string[] = [".md"]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMdFiles(fullPath, extensions));
    } else if (
      extensions.some((ext) => entry.name.endsWith(ext)) &&
      entry.name !== "index.md"
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

export function getAllEpisodeFrontmatter(
  channel?: string
): { frontmatter: EpisodeFrontmatter; slug: string; channel: string }[] {
  const episodesDir = path.join(CONTENT_DIR, "episodes");
  const searchDir = channel
    ? path.join(episodesDir, channel)
    : episodesDir;

  const files = walkMdFiles(searchDir);

  return files
    .map((filePath) => {
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(raw);
      const fm = data as EpisodeFrontmatter;

      if (!fm.title || !fm.date || fm.draft) return null;

      const relativePath = path.relative(episodesDir, filePath);
      const slug = relativePath.replace(/\.md$/, "");
      const parts = slug.split(path.sep);
      const ch = parts.length > 1 ? parts[0] : "root";

      return { frontmatter: fm, slug, channel: ch };
    })
    .filter(Boolean) as {
    frontmatter: EpisodeFrontmatter;
    slug: string;
    channel: string;
  }[];
}

export function getLatestEpisodes(limit: number = 6): EpisodeCard[] {
  const all = getAllEpisodeFrontmatter();

  return all
    .filter(
      (e) =>
        e.frontmatter.thumbnail &&
        e.frontmatter.duration !== undefined &&
        e.frontmatter.episodeNumber !== undefined
    )
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
    )
    .slice(0, limit)
    .map((e) => {
      const fm = e.frontmatter;
      const guests = fm.guests || [];
      const guestNames = guests.map((g: Guest) => g.name).join(", ");

      return {
        title: fm.title,
        date: fm.date,
        duration: fm.duration,
        slug: `/episodes/${e.slug}`,
        description: fm.description,
        thumbnail: fm.thumbnail,
        audioUrl: fm.audioUrl,
        youtubeId: fm.youtubeId,
        guestNames: guestNames || undefined,
        channel: e.channel,
      };
    });
}

export async function getEpisodeBySlug(
  slugParts: string[]
): Promise<{
  frontmatter: EpisodeFrontmatter;
  content: string;
  slug: string;
} | null> {
  const relativePath = path.join("episodes", ...slugParts) + ".md";
  const filePath = path.join(CONTENT_DIR, relativePath);

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content: rawMd } = matter(raw);

  // The episode page renders its own player from the frontmatter, so drop the
  // "Watch Episode" / "Listen to Episode" embed the Markdown body also carries.
  // Only when the frontmatter has the matching field, so no episode is left
  // without a player.
  let md = rawMd;
  if (data.youtubeId) {
    md = md.replace(/^## Watch Episode\s*\n\s*<div[^>]*>\s*<iframe[\s\S]*?<\/iframe>\s*<\/div>[ \t]*\n?/m, "");
  }
  if (data.audioUrl) {
    md = md.replace(/^## Listen to Episode\s*\n\s*<audio[\s\S]*?<\/audio>[ \t]*\n?/m, "");
  }
  const content = await processMarkdown(md);

  return {
    frontmatter: data as EpisodeFrontmatter,
    content,
    slug: slugParts.join("/"),
  };
}

export function getAllEpisodeSlugs(): string[][] {
  const episodesDir = path.join(CONTENT_DIR, "episodes");
  const files = walkMdFiles(episodesDir);

  return files.map((filePath) => {
    const relativePath = path.relative(episodesDir, filePath);
    const slug = relativePath.replace(/\.md$/, "");
    return slug.split(path.sep);
  });
}

export function getAllContentSlugs(section: string): string[] {
  const sectionDir = path.join(CONTENT_DIR, section);
  const files = walkMdFiles(sectionDir, [".md", ".html"]);

  const slugs = files.map((filePath) => {
    const relativePath = path.relative(sectionDir, filePath);
    return relativePath.replace(/\.(md|html)$/, "");
  });
  return [...new Set(slugs)];
}

/** URL form of a content file name. Matches the previous site: spaces become hyphens. */
export function toUrlSlug(fileSlug: string): string {
  return fileSlug.replace(/ /g, "-");
}

/** The file slug in a section that a URL slug (e.g. "Erik-Voorhees") points at. */
export function resolveContentSlug(section: string, urlSlug: string): string {
  return (
    getAllContentSlugs(section).find(
      (slug) => slug === urlSlug || toUrlSlug(slug) === urlSlug
    ) ?? urlSlug
  );
}

export function getAllPeopleSlugs(): string[] {
  return getAllContentSlugs("people");
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDuration(duration: string | number | undefined): string {
  if (!duration) return "";
  if (typeof duration === "string") return duration;
  const totalSeconds = Math.round(duration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function getChannels(): string[] {
  const episodesDir = path.join(CONTENT_DIR, "episodes");
  if (!fs.existsSync(episodesDir)) return [];

  return fs
    .readdirSync(episodesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}
