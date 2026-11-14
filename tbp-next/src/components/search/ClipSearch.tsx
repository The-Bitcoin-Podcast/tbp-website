"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EpisodeResult } from "./EpisodeResult";
import {
  formatDate,
  headlineScore,
  loadHeadlines,
  loadPagefind,
  queryTokens,
  type EpisodeHeadline,
} from "./pagefind";

/**
 * Search that goes from high to low: episodes whose headline matches come
 * first, then episodes where the phrase was only said out loud. Every episode
 * opens to the exact moments, each playable from that second.
 *
 * Wide screens get two panes, like the search on the original site: episode
 * titles on the left, a live preview of the selected one on the right, with
 * arrow keys to browse. Narrow screens get a list of expandable cards.
 */

const WIDE = "(min-width: 1024px)";
function useWideScreen(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(WIDE);
    const update = () => setWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return wide;
}

/** Wraps the words that match the query in <mark>. */
function highlightTitle(text: string, tokens: string[]) {
  if (tokens.length === 0) return text;
  const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])((?:${escaped.join("|")})[\\p{L}\\p{N}]*)`, "giu");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>,
  );
}

const PAGE_SIZE = 6;
const SUGGESTIONS = ["quantum computing", "lightning network", "DAO", "privacy", "stablecoins"];

interface Found {
  query: string;
  tokens: string[];
  /** Episodes whose title, guests or description match. */
  headline: EpisodeHeadline[];
  /** Episodes where it was only said out loud, most mentions first. */
  mentioned: EpisodeHeadline[];
  /** Matching moments per episode slug. */
  counts: Record<string, number>;
  moments: number;
}

interface ClipSearchProps {
  /** Keep the query in the URL (?q=) so searches can be shared. Use on /search only. */
  syncUrl?: boolean;
  autoFocus?: boolean;
  /** One line shown under the search box before anything is typed. */
  hint?: string;
}

export function ClipSearch({ syncUrl = false, autoFocus = false, hint }: ClipSearchProps) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "done" | "error">("idle");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [headlineShown, setHeadlineShown] = useState(PAGE_SIZE);
  const [mentionedShown, setMentionedShown] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string | null>(null);
  const latestQuery = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wide = useWideScreen();
  const router = useRouter();

  const runSearch = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      latestQuery.current = trimmed;
      if (syncUrl) {
        const url = trimmed ? `?q=${encodeURIComponent(trimmed)}` : window.location.pathname;
        window.history.replaceState(null, "", url);
      }
      if (trimmed.length < 2) {
        setFound(null);
        setPlayingId(null);
        setStatus("idle");
        return;
      }
      setStatus("searching");
      try {
        const [pagefind, episodes] = await Promise.all([loadPagefind(), loadHeadlines()]);
        const search = await pagefind.debouncedSearch(trimmed, {}, 250);
        // null means a newer keystroke superseded this search.
        if (!search || latestQuery.current !== trimmed) return;

        const counts = search.filters?.episode ?? {};
        const tokens = queryTokens(trimmed);
        const scored = episodes
          .map((episode) => ({ episode, score: headlineScore(episode, tokens) }))
          .filter((entry) => entry.score > 0)
          .sort(
            (a, b) =>
              b.score - a.score ||
              (counts[b.episode.slug] ?? 0) - (counts[a.episode.slug] ?? 0) ||
              b.episode.date.localeCompare(a.episode.date),
          );
        const inHeadline = new Set(scored.map((entry) => entry.episode.slug));
        const mentioned = episodes
          .filter((episode) => (counts[episode.slug] ?? 0) > 0 && !inHeadline.has(episode.slug))
          .sort((a, b) => counts[b.slug] - counts[a.slug] || b.date.localeCompare(a.date));

        setFound({
          query: trimmed,
          tokens,
          headline: scored.map((entry) => entry.episode),
          mentioned,
          counts,
          moments: search.results.length,
        });
        setHeadlineShown(PAGE_SIZE);
        setMentionedShown(PAGE_SIZE);
        setSelected(scored[0]?.episode.slug ?? mentioned[0]?.slug ?? null);
        setPlayingId(null);
        setStatus("done");
      } catch {
        setStatus("error");
      }
    },
    [syncUrl],
  );

  // Pick up a shared ?q= link on first load.
  useEffect(() => {
    if (!syncUrl) return;
    const initial = new URLSearchParams(window.location.search).get("q");
    if (initial) {
      setQuery(initial);
      void runSearch(initial);
    }
  }, [syncUrl, runSearch]);

  const onChange = (text: string) => {
    setQuery(text);
    void runSearch(text);
  };

  // "/" or Cmd/Ctrl+K jumps to the search box from anywhere on the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((event.target as HTMLElement)?.tagName ?? "");
      const shortcut =
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !typing);
      if (!shortcut) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const all = found ? [...found.headline, ...found.mentioned] : [];
  const selectedEpisode = all.find((episode) => episode.slug === selected) ?? all[0];

  const select = (slug: string) => {
    if (slug === selected) return;
    setSelected(slug);
    setPlayingId(null);
  };

  /** Arrow keys browse the episode list; Enter opens the selected episode. */
  const onInputKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!wide || all.length === 0 || !selectedEpisode) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const at = all.indexOf(selectedEpisode);
      const next = all[Math.min(all.length - 1, Math.max(0, at + (event.key === "ArrowDown" ? 1 : -1)))];
      select(next.slug);
      listRef.current
        ?.querySelector(`[data-slug="${CSS.escape(next.slug)}"]`)
        ?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && found?.query === query.trim()) {
      event.preventDefault();
      router.push(`/episodes/${selectedEpisode.slug}`);
    }
  };

  const listGroup = (title: string, episodes: EpisodeHeadline[]) =>
    found &&
    episodes.length > 0 && (
      <>
        <p className="sticky top-0 z-10 border-b border-border bg-surface-light px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
          {title} · {episodes.length.toLocaleString()}
        </p>
        {episodes.map((episode) => {
          const current = episode.slug === selectedEpisode?.slug;
          const count = found.counts[episode.slug] ?? 0;
          return (
            <button
              key={episode.slug}
              type="button"
              data-slug={episode.slug}
              aria-current={current}
              onClick={() => select(episode.slug)}
              onMouseEnter={() => select(episode.slug)}
              onFocus={() => select(episode.slug)}
              className={`relative block w-full border-b border-border px-4 py-3 text-left transition-colors ${
                current ? "bg-background" : "hover:bg-background/60"
              }`}
            >
              <span
                className={`absolute inset-y-0 left-0 w-1 origin-center bg-brand transition-transform duration-200 ${
                  current ? "scale-y-100" : "scale-y-0"
                }`}
              />
              <span className="clip-excerpt block font-display text-[15px] font-bold leading-snug">
                {highlightTitle(episode.title, found.tokens)}
              </span>
              <span className="mt-1 flex items-center justify-between gap-3 text-[12px] text-muted">
                <span className="truncate">
                  {episode.show} · {formatDate(episode.date)}
                </span>
                {count > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-brand-tint px-2 py-0.5 font-mono text-[11px] text-foreground">
                    {count.toLocaleString()}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </>
    );

  const episodeCount = found ? found.headline.length + found.mentioned.length : 0;
  const group = (
    title: string,
    note: string,
    episodes: EpisodeHeadline[],
    shown: number,
    showMore: () => void,
  ) =>
    found &&
    episodes.length > 0 && (
      <section className="mt-9">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className="font-display text-2xl font-extrabold">{title}</h2>
          <p className="text-[13px] text-muted">{note}</p>
        </div>
        <ul className="mt-4 space-y-4">
          {episodes.slice(0, shown).map((episode, i) => (
            <EpisodeResult
              key={`${found.query}:${episode.slug}`}
              episode={episode}
              query={found.query}
              tokens={found.tokens}
              momentCount={found.counts[episode.slug] ?? 0}
              index={i % PAGE_SIZE}
              playingId={playingId}
              onPlay={setPlayingId}
            />
          ))}
        </ul>
        {shown < episodes.length && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={showMore}
              className="rounded-full border-2 border-foreground px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              Show more episodes ({(episodes.length - shown).toLocaleString()} left)
            </button>
          </div>
        )}
      </section>
    );

  return (
    <div className="w-full">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void runSearch(query);
        }}
        className="flex items-center gap-3 rounded-full border-2 border-foreground bg-background py-2 pl-5 pr-2 sm:pl-7"
      >
        <svg
          className="h-5 w-5 flex-shrink-0 text-foreground"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.2}
          stroke="currentColor"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          ref={inputRef}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onInputKey}
          onFocus={() => void loadPagefind().catch(() => {})}
          autoFocus={autoFocus}
          placeholder="Search episodes and what was said"
          aria-label="Search episodes and transcripts"
          className="min-w-0 flex-1 bg-transparent py-3 text-lg text-foreground placeholder:text-muted focus:outline-none sm:text-xl"
        />
        <button
          type="submit"
          className="flex-shrink-0 rounded-full bg-brand px-5 py-3.5 text-base font-semibold text-foreground transition-colors hover:bg-brand-hover sm:px-7"
        >
          Search
        </button>
      </form>

      {status === "idle" && (
        <div className="mt-5 flex flex-col items-center gap-4">
          {hint && <p className="text-[13px] text-muted">{hint}</p>}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[13px] text-muted">Try</span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => onChange(suggestion)}
                className="rounded-full border border-border px-3.5 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:border-foreground"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div aria-live="polite" className="mt-10 text-left">
        {status === "searching" && !found && <p className="text-center text-sm text-muted">Searching…</p>}
        {status === "error" && (
          <p className="text-center text-sm text-muted">
            Search isn’t available right now. Please try again in a moment.
          </p>
        )}
        {status !== "error" && found && episodeCount === 0 && (
          <p className="text-center text-sm text-muted">
            Nothing found for “{found.query}”. Try a different word or phrase.
          </p>
        )}
        {status !== "error" && found && episodeCount > 0 && (
          <div className={`transition-opacity duration-200 ${status === "searching" ? "opacity-50" : ""}`}>
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
              {episodeCount.toLocaleString()} episode{episodeCount === 1 ? "" : "s"} ·{" "}
              {found.moments.toLocaleString()} moment{found.moments === 1 ? "" : "s"} for “{found.query}”
            </p>
            {wide && selectedEpisode ? (
              <>
                <div className="result-enter relative left-1/2 mt-5 grid h-[min(680px,78vh)] w-[min(1120px,calc(100vw-3rem))] -translate-x-1/2 grid-cols-[340px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border bg-background shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)]">
                  <div ref={listRef} className="overflow-y-auto border-r border-border bg-surface-light">
                    {listGroup("Episodes", found.headline)}
                    {listGroup(found.headline.length > 0 ? "Also mentioned in" : "Mentioned in", found.mentioned)}
                  </div>
                  <div className="overflow-y-auto p-6">
                    <EpisodeResult
                      key={`${found.query}:${selectedEpisode.slug}`}
                      variant="preview"
                      episode={selectedEpisode}
                      query={found.query}
                      tokens={found.tokens}
                      momentCount={found.counts[selectedEpisode.slug] ?? 0}
                      index={0}
                      playingId={playingId}
                      onPlay={setPlayingId}
                    />
                  </div>
                </div>
                <p className="mt-4 text-center text-[13px] text-muted">
                  <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px]">↑</kbd>{" "}
                  <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px]">↓</kbd> to browse ·{" "}
                  <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px]">Enter</kbd> to open the
                  episode · click a tick to play from there
                </p>
              </>
            ) : (
              <>
                {group(
                  "Episodes",
                  "It’s in the title, guests or description",
                  found.headline,
                  headlineShown,
                  () => setHeadlineShown((n) => n + PAGE_SIZE),
                )}
                {group(
                  found.headline.length > 0 ? "Also mentioned in" : "Mentioned in",
                  "Said out loud, most mentions first",
                  found.mentioned,
                  mentionedShown,
                  () => setMentionedShown((n) => n + PAGE_SIZE),
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
