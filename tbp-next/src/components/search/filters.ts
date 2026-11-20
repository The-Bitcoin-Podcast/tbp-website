/* Narrowing and ordering search results. Everything here runs in the browser
   over the episode headlines, so changing a filter never re-runs the search. */

import type { EpisodeHeadline } from "./pagefind";

export type Sort = "relevance" | "newest" | "oldest" | "mentions";
export type Length = "any" | "short" | "medium" | "long";

export interface Filters {
  sort: Sort;
  /** "any", a window back from today ("1y", "3y", "5y"), or one year ("2019"). */
  when: string;
  /** "all" or a show name as it appears on the episode. */
  show: string;
  length: Length;
  /** Only episodes that have a video to watch. */
  video: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  sort: "relevance",
  when: "any",
  show: "all",
  length: "any",
  video: false,
};

export const SORTS: { value: Sort; label: string }[] = [
  { value: "relevance", label: "Most relevant" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "mentions", label: "Most mentions" },
];

export const AGES: { value: string; label: string }[] = [
  { value: "1y", label: "Past year" },
  { value: "3y", label: "Past 3 years" },
  { value: "5y", label: "Past 5 years" },
];

export const LENGTHS: { value: Length; label: string }[] = [
  { value: "any", label: "Any length" },
  { value: "short", label: "Under 30 min" },
  { value: "medium", label: "30–60 min" },
  { value: "long", label: "Over an hour" },
];

const WINDOW_RE = /^(\d+)y$/;
const YEAR_RE = /^\d{4}$/;

/** How many filters are narrowing the results (the sort order is not one). */
export function activeCount(filters: Filters): number {
  return (
    Number(filters.when !== "any") +
    Number(filters.show !== "all") +
    Number(filters.length !== "any") +
    Number(filters.video)
  );
}

export function isDefault(filters: Filters): boolean {
  return filters.sort === "relevance" && activeCount(filters) === 0;
}

function isoYearsAgo(today: Date, years: number): string {
  const cutoff = new Date(today);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return cutoff.toISOString().slice(0, 10);
}

export function matches(episode: EpisodeHeadline, filters: Filters, today: Date): boolean {
  if (filters.show !== "all" && episode.show !== filters.show) return false;
  if (filters.video && !episode.youtubeId) return false;

  const window = filters.when.match(WINDOW_RE);
  if (window) {
    if (episode.date < isoYearsAgo(today, Number(window[1]))) return false;
  } else if (YEAR_RE.test(filters.when)) {
    if (!episode.date.startsWith(filters.when)) return false;
  }

  if (filters.length !== "any") {
    const minutes = episode.duration / 60;
    // An episode with no known length can't be placed in a bracket.
    if (!minutes) return false;
    if (filters.length === "short" && minutes >= 30) return false;
    if (filters.length === "medium" && (minutes < 30 || minutes > 60)) return false;
    if (filters.length === "long" && minutes <= 60) return false;
  }
  return true;
}

/**
 * Orders a result group. "relevance" keeps the order the search produced
 * (best headline match first, or most mentions first for spoken-only results).
 */
export function sortEpisodes(
  episodes: EpisodeHeadline[],
  sort: Sort,
  counts: Record<string, number>,
): EpisodeHeadline[] {
  if (sort === "relevance") return episodes;
  const byNewest = (a: EpisodeHeadline, b: EpisodeHeadline) => b.date.localeCompare(a.date);
  const sorted = [...episodes];
  if (sort === "newest") sorted.sort(byNewest);
  else if (sort === "oldest") sorted.sort((a, b) => -byNewest(a, b));
  else sorted.sort((a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0) || byNewest(a, b));
  return sorted;
}

/**
 * The values one filter can take, with how many results each would leave given
 * the other filters. Shows come most results first, years newest first.
 */
export function facet(
  episodes: EpisodeHeadline[],
  filters: Filters,
  key: "show" | "when",
  today: Date,
): [string, number][] {
  const others = { ...filters, [key]: DEFAULT_FILTERS[key] };
  const tally = new Map<string, number>();
  for (const episode of episodes) {
    if (!matches(episode, others, today)) continue;
    const value = key === "show" ? episode.show : episode.date.slice(0, 4);
    if (value) tally.set(value, (tally.get(value) ?? 0) + 1);
  }
  const entries = [...tally.entries()];
  return key === "show"
    ? entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    : entries.sort((a, b) => b[0].localeCompare(a[0]));
}

/** Filters from a shared link (?sort=&when=&show=&len=&video=). Unknown values are ignored. */
export function readFilters(params: URLSearchParams): Filters {
  const sort = params.get("sort");
  const when = params.get("when") ?? "";
  const length = params.get("len");
  return {
    sort: SORTS.some((option) => option.value === sort) ? (sort as Sort) : "relevance",
    when: WINDOW_RE.test(when) || YEAR_RE.test(when) ? when : "any",
    show: params.get("show") || "all",
    length: LENGTHS.some((option) => option.value === length) ? (length as Length) : "any",
    video: params.get("video") === "1",
  };
}

/** Adds the non-default filters to a link's query string. */
export function writeFilters(params: URLSearchParams, filters: Filters): void {
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  if (filters.when !== "any") params.set("when", filters.when);
  if (filters.show !== "all") params.set("show", filters.show);
  if (filters.length !== "any") params.set("len", filters.length);
  if (filters.video) params.set("video", "1");
}
