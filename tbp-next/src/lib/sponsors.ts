import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  getAllContentSlugs,
  getAllEpisodeFrontmatter,
  processMarkdown,
  toUrlSlug,
} from "./content";
import { getShowMeta } from "./show-meta";

const CONTENT_DIR = process.env.CONTENT_DIR || path.join(process.cwd(), "content");

/**
 * Sponsors live in content/sponsors/<Name>.md. Frontmatter:
 *
 *   title:   display name (defaults to the file name)
 *   website: where the sponsor's link goes
 *   blurb:   one or two sentences about them
 *   logo:    image path or URL (optional; the name's initial is shown without one)
 *   status:  "current" marks an active sponsorship (optional)
 *
 *   placements: where the sponsor appears on the site (see SponsorPlacement)
 *
 * The body can carry extra links, and a "## Sponsored Episodes" list of
 * [[episode-file-name]] wikilinks, which is resolved to real episodes here.
 * Each of those episode pages also names the sponsor.
 */
export type SponsorSlotName =
  | "network"
  | "show"
  | "episode"
  | "newsletter"
  | "reports"
  | "section"
  | "archive";

/**
 * One entry in a sponsor's `placements` list:
 *
 *   - slot: show            # one of the PLACEMENTS ids
 *     target: hio           # which show, episode file, issue or section (see below)
 *     start: 2026-12-01     # optional; shown from this day
 *     end: 2027-02-28       # optional; shown through this day
 *     message: "Try X free for 30 days."   # optional line beside the name
 *
 * target, by slot:
 *   network     none
 *   show        the show's folder in content/episodes (required)
 *   archive     same as show
 *   episode     the episode's file name (required)
 *   section     search, people or business-tips (required)
 *   newsletter  an issue's file name, or none for the news page and every issue
 *   reports     a report's file name, or none for the reports page and every report
 *
 * The site is static, so start and end take effect at the next deploy.
 */
export interface SponsorPlacement {
  slot: SponsorSlotName;
  target?: string;
  start?: Date;
  end?: Date;
  message?: string;
}
export interface SponsoredEpisode {
  title: string;
  href: string;
  date: string;
  show: string;
}

export interface Sponsor {
  name: string;
  /** URL slug under /sponsors. */
  slug: string;
  website?: string;
  blurb?: string;
  logo?: string;
  current: boolean;
  placements: SponsorPlacement[];
  /** File names of the episodes in the "Sponsored Episodes" list, lower case. */
  episodeFiles: string[];
  episodes: SponsoredEpisode[];
  /** First and last year of the sponsored episodes, e.g. "2021" or "2019–2021". */
  years?: string;
  /** The body without the episode list, as HTML. Empty when there is nothing else. */
  bodyHtml: string;
}

/** A placement a sponsor can buy. The ids are the keys used in `rates`. */
export interface Placement {
  id: string;
  name: string;
  where: string;
  why: string;
}

export const PLACEMENTS: Placement[] = [
  {
    id: "network",
    name: "Network sponsor",
    where: "Your name on the homepage, in the footer and on every page of the site.",
    why: "The top spot. Held by one or two sponsors at a time.",
  },
  {
    id: "show",
    name: "Show sponsor",
    where: "One show's page and every episode page under it, for as long as you sponsor it.",
    why: "Pick the audience you want: the flagship, the technical show or a niche one.",
  },
  {
    id: "episode",
    name: "Episode sponsor",
    where: "A host-read mention in the episode, plus your name and link on its page for good.",
    why: "The simplest way to start, and it stays with the episode in the archive.",
  },
  {
    id: "newsletter",
    name: "Newsletter sponsor",
    where: "Named at the top of a weekly issue of Fergulati Finds.",
    why: "A recurring slot in front of readers who follow markets, regulation and DeFi.",
  },
  {
    id: "reports",
    name: "Reports sponsor",
    where: "“Presented by” on a research report and on the reports page.",
    why: "A good fit for infrastructure, security and B2B companies.",
  },
  {
    id: "section",
    name: "Section sponsor",
    where: "One part of the site: clip search, the guest directory or Business Tips.",
    why: "A low-cost way to be seen by people browsing the site.",
  },
  {
    id: "archive",
    name: "Archive sponsor",
    where: "The back catalog of a finished show, which people still find through search.",
    why: "Evergreen listening with no other sponsor beside you.",
  },
];

export interface SponsorPackage {
  name: string;
  price?: string;
  summary?: string;
  includes: string[];
  /** A hosted payment or booking page for this package. */
  bookingUrl?: string;
}

export interface SponsorPageConfig {
  inquiryFormAction?: string;
  contactEmail?: string;
  audience: { value: string; label: string }[];
  rates: Record<string, string>;
  /** Hosted payment or booking pages, by placement id. */
  booking: Record<string, string>;
  packages: SponsorPackage[];
}

function text(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** A link we are willing to send a buyer to: https only. */
function httpsUrl(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  try {
    return new URL(raw).protocol === "https:" ? raw : undefined;
  } catch {
    return undefined;
  }
}

/** Settings for the sales page, from the frontmatter of content/sponsors/index.md. */
export function getSponsorPageConfig(): SponsorPageConfig {
  const file = path.join(CONTENT_DIR, "sponsors", "index.md");
  const data = fs.existsSync(file) ? matter(fs.readFileSync(file, "utf-8")).data : {};

  const audience = (Array.isArray(data.audience) ? data.audience : []).flatMap(
    (row: Record<string, unknown>) => {
      const value = text(row?.value);
      const label = text(row?.label);
      return value && label ? [{ value, label }] : [];
    }
  );

  const rates: Record<string, string> = {};
  if (data.rates && typeof data.rates === "object") {
    for (const [id, rate] of Object.entries(data.rates)) {
      const value = text(rate);
      if (value) rates[id] = value;
    }
  }

  const booking: Record<string, string> = {};
  if (data.booking && typeof data.booking === "object") {
    for (const [id, link] of Object.entries(data.booking)) {
      const url = httpsUrl(link);
      if (url) booking[id] = url;
    }
  }

  const packages: SponsorPackage[] = (Array.isArray(data.packages) ? data.packages : []).flatMap(
    (row: Record<string, unknown>) => {
      const name = text(row?.name);
      if (!name) return [];
      const includes = (Array.isArray(row.includes) ? row.includes : []).flatMap(
        (item: unknown) => text(item) ?? []
      );
      return [
        {
          name,
          price: text(row.price),
          summary: text(row.summary),
          includes,
          bookingUrl: httpsUrl(row.bookingUrl),
        },
      ];
    }
  );

  return {
    inquiryFormAction: text(data.inquiryFormAction),
    contactEmail: text(data.contactEmail),
    audience,
    rates,
    booking,
    packages,
  };
}

// Content is read once per production build. In dev it is re-read on every
// request so edits to content files show up without a restart.
const CACHE = process.env.NODE_ENV === "production";

const SLOTS_NEEDING_TARGET = new Set(["show", "archive", "episode", "section"]);
const DAY_MS = 24 * 60 * 60 * 1000;

function day(value: unknown): Date | undefined {
  const date = value instanceof Date ? value : new Date(text(value) ?? "");
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeTarget(value: unknown): string | undefined {
  return text(value)?.replace(/\.(md|html)$/, "").toLowerCase();
}

/** Reads a sponsor's `placements`. An entry that can't be understood is dropped, never guessed at. */
function readPlacements(raw: unknown): SponsorPlacement[] {
  return (Array.isArray(raw) ? raw : []).flatMap((row: Record<string, unknown>) => {
    const slot = text(row?.slot)?.toLowerCase();
    if (!slot || !PLACEMENTS.some((placement) => placement.id === slot)) return [];
    const target = normalizeTarget(row.target);
    if (SLOTS_NEEDING_TARGET.has(slot) && !target) return [];
    const start = day(row.start);
    const end = day(row.end);
    // A date that is written but unreadable must not turn into "no limit".
    if ((row.start != null && !start) || (row.end != null && !end)) return [];
    return [{ slot: slot as SponsorSlotName, target, start, end, message: text(row.message) }];
  });
}

function isActive(placement: SponsorPlacement, now: Date): boolean {
  if (placement.start && now < placement.start) return false;
  if (placement.end && now.getTime() >= placement.end.getTime() + DAY_MS) return false;
  return true;
}

/** Episodes by file name, which is what the [[wikilinks]] in sponsor files use. */
let episodesByFileName: Map<string, SponsoredEpisode> | undefined;

function getEpisodesByFileName(): Map<string, SponsoredEpisode> {
  if (CACHE && episodesByFileName) return episodesByFileName;
  episodesByFileName = new Map();
  for (const episode of getAllEpisodeFrontmatter()) {
    const fileName = episode.slug.split(path.sep).pop()!;
    if (episodesByFileName.has(fileName)) continue;
    episodesByFileName.set(fileName, {
      title: episode.frontmatter.title,
      href: `/episodes/${episode.slug.split(path.sep).join("/")}`,
      date: String(episode.frontmatter.date),
      show: getShowMeta(episode.channel).short,
    });
  }
  return episodesByFileName;
}

const EPISODES_HEADING = /^#+\s*Sponsored Episodes:?\s*$/im;

async function readSponsor(fileSlug: string): Promise<Sponsor | null> {
  const file = path.join(CONTENT_DIR, "sponsors", `${fileSlug}.md`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf-8"));

  const [body, episodeList = ""] = content.split(EPISODES_HEADING);
  const known = getEpisodesByFileName();
  const episodeFiles = [...episodeList.matchAll(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map(
    (match) => match[1].trim()
  );
  const episodes = episodeFiles
    .map((fileName) => known.get(fileName))
    .filter((episode): episode is SponsoredEpisode => Boolean(episode))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const yearList = episodes
    .map((episode) => new Date(episode.date).getUTCFullYear())
    .filter(Number.isFinite);
  const first = Math.min(...yearList);
  const last = Math.max(...yearList);

  return {
    name: text(data.title) ?? fileSlug,
    slug: toUrlSlug(fileSlug),
    website: text(data.website),
    blurb: text(data.blurb),
    logo: text(data.logo),
    current: data.status === "current",
    placements: readPlacements(data.placements),
    episodeFiles: episodeFiles.map((fileName) => fileName.toLowerCase()),
    episodes,
    years: yearList.length ? (first === last ? `${first}` : `${first}–${last}`) : undefined,
    bodyHtml: body.trim() ? await processMarkdown(body) : "",
  };
}

let allSponsors: Promise<Sponsor[]> | undefined;

async function loadSponsors(): Promise<Sponsor[]> {
  const sponsors = await Promise.all(getAllContentSlugs("sponsors").map(readSponsor));
  return sponsors
    .filter((sponsor): sponsor is Sponsor => Boolean(sponsor))
    .sort(
      (a, b) =>
        Number(b.current) - Number(a.current) ||
        b.episodes.length - a.episodes.length ||
        a.name.localeCompare(b.name)
    );
}

/** Every sponsor: current ones first, then by how many episodes they sponsored. */
export function getAllSponsors(): Promise<Sponsor[]> {
  if (!CACHE) return loadSponsors();
  return (allSponsors ??= loadSponsors());
}

export interface SlotSponsor {
  sponsor: Sponsor;
  message?: string;
}

/**
 * The sponsors to show in one slot right now, e.g. getSponsorsFor("show", "hio").
 * A placement without a target covers every page of its slot; one with a
 * target covers only that page. An archive placement shows wherever a show
 * placement would. Episodes in a sponsor's "Sponsored Episodes" list count as
 * episode placements with no end date.
 */
export async function getSponsorsFor(
  slot: SponsorSlotName,
  target?: string,
  now: Date = new Date()
): Promise<SlotSponsor[]> {
  const wanted = normalizeTarget(target);
  const found: SlotSponsor[] = [];
  for (const sponsor of await getAllSponsors()) {
    const placement = sponsor.placements.find(
      (candidate) =>
        (candidate.slot === slot || (slot === "show" && candidate.slot === "archive")) &&
        (candidate.target === undefined || candidate.target === wanted) &&
        isActive(candidate, now)
    );
    if (placement) {
      found.push({ sponsor, message: placement.message });
    } else if (slot === "episode" && wanted && sponsor.episodeFiles.includes(wanted)) {
      found.push({ sponsor });
    }
  }
  return found;
}

export async function getSponsor(urlSlug: string): Promise<Sponsor | undefined> {
  return (await getAllSponsors()).find((sponsor) => sponsor.slug === urlSlug);
}

/**
 * A sponsor's link, tagged so they can see our traffic in their own analytics:
 * the placement becomes the campaign, and the show, episode or section the content.
 */
export function sponsorHref(url: string, slot?: string, target?: string): string {
  try {
    const tagged = new URL(url);
    if (!tagged.searchParams.has("utm_source")) {
      tagged.searchParams.set("utm_source", "thebitcoinpodcast");
      tagged.searchParams.set("utm_medium", "sponsorship");
      if (slot) tagged.searchParams.set("utm_campaign", slot);
      if (target) tagged.searchParams.set("utm_content", target);
    }
    return tagged.toString();
  } catch {
    return url;
  }
}
