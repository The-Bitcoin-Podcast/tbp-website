/* Browser-side access to the static search files in /public/pagefind. */

export interface PagefindResultData {
  url: string;
  excerpt: string;
  meta: Record<string, string>;
}
interface PagefindSearch {
  results: { id: string; data: () => Promise<PagefindResultData> }[];
  /** Matches per filter value for this search, e.g. filters.episode[slug]. */
  filters?: Record<string, Record<string, number>>;
}
export interface PagefindApi {
  init: () => Promise<void>;
  filters: () => Promise<unknown>;
  search: (query: string, options?: Record<string, unknown>) => Promise<PagefindSearch>;
  debouncedSearch: (
    query: string,
    options?: Record<string, unknown>,
    debounceMs?: number,
  ) => Promise<PagefindSearch | null>;
}

/** One episode's headline, from episodes.json (written by build-search-index.mjs). */
export interface EpisodeHeadline {
  slug: string;
  title: string;
  date: string;
  show: string;
  duration: number;
  clips: number;
  description?: string;
  guests?: string[];
  youtubeId?: string;
  audioUrl?: string;
  image?: string;
  /** Chapter list from the show notes: [startSeconds, title]. */
  chapters?: [number, string][];
}

/** A moment inside an episode where the search phrase was said. */
export interface Moment {
  id: string;
  seconds: number;
  excerpt: string;
}

let pagefindPromise: Promise<PagefindApi> | null = null;
export function loadPagefind(): Promise<PagefindApi> {
  if (!pagefindPromise) {
    const path = "/pagefind/pagefind.js";
    pagefindPromise = import(/* webpackIgnore: true */ path).then(async (mod: PagefindApi) => {
      await mod.init();
      // Loads the filter data so every search reports matches per episode.
      await mod.filters();
      return mod;
    });
    pagefindPromise.catch(() => {
      pagefindPromise = null;
    });
  }
  return pagefindPromise;
}

let headlinesPromise: Promise<EpisodeHeadline[]> | null = null;
export function loadHeadlines(): Promise<EpisodeHeadline[]> {
  if (!headlinesPromise) {
    headlinesPromise = fetch("/pagefind/episodes.json").then((response) => {
      if (!response.ok) throw new Error("episode list unavailable");
      return response.json() as Promise<EpisodeHeadline[]>;
    });
    headlinesPromise.catch(() => {
      headlinesPromise = null;
    });
  }
  return headlinesPromise;
}

/** The most moments loaded for one episode's timeline. */
export const MAX_MOMENTS = 80;

const momentCache = new Map<string, Promise<Moment[]>>();
/** The moments in one episode that match the query, in playing order. */
export function loadMoments(query: string, slug: string): Promise<Moment[]> {
  const key = `${query}\n${slug}`;
  let cached = momentCache.get(key);
  if (!cached) {
    cached = (async () => {
      const pagefind = await loadPagefind();
      const search = await pagefind.search(query, { filters: { episode: slug } });
      const results = search.results.slice(0, MAX_MOMENTS);
      const loaded = await Promise.all(results.map((result) => result.data()));
      return loaded
        .map((data, i) => ({
          id: results[i].id,
          seconds: Number(data.meta.t ?? 0),
          excerpt: data.excerpt,
        }))
        .sort((a, b) => a.seconds - b.seconds);
    })();
    cached.catch(() => momentCache.delete(key));
    momentCache.set(key, cached);
  }
  return cached;
}

/** Words of the query used to match and highlight episode headlines. */
export function queryTokens(query: string): string[] {
  return [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 2))];
}

function words(text: string | undefined): string[] {
  return text ? text.toLowerCase().split(/[^\p{L}\p{N}]+/u) : [];
}

/**
 * How well an episode's headline matches: 0 unless every query word starts a
 * word in the title, guests, description or chapter list. Title matches count most.
 */
export function headlineScore(episode: EpisodeHeadline, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const title = words(episode.title);
  const guests = words(episode.guests?.join(" "));
  const description = words(episode.description);
  const chapters = words(episode.chapters?.map((chapter) => chapter[1]).join(" "));
  let score = 0;
  for (const token of tokens) {
    const hit = (list: string[]) => list.some((word) => word.startsWith(token));
    if (hit(title)) score += 5;
    else if (hit(guests)) score += 3;
    else if (hit(description) || hit(chapters)) score += 1;
    else return 0;
  }
  return score;
}

export function formatTimestamp(totalSeconds: number): string {
  const whole = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Chapters whose title contains a query word. */
export function matchingChapters(episode: EpisodeHeadline, tokens: string[]): [number, string][] {
  if (!episode.chapters || tokens.length === 0) return [];
  return episode.chapters.filter(([, title]) =>
    words(title).some((word) => tokens.some((token) => word.startsWith(token))),
  );
}
