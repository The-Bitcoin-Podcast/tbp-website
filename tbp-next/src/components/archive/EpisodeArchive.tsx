"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { EpisodeIndexEntry, ShowSummary } from "@/lib/episode-index";

const PAGE_SIZE = 24;
const SHELF_SIZE = 12;

type Sort = "newest" | "oldest";

interface EpisodeArchiveProps {
  episodes: EpisodeIndexEntry[];
  shows: ShowSummary[];
  /** Set on /episodes/<show>: the archive is scoped to that one show. */
  activeShow?: string;
  /** Heading for a show that has no published episodes yet. */
  title?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDuration(duration: string | number | undefined): string {
  if (!duration) return "";
  if (typeof duration === "string") return duration;
  const total = Math.round(duration);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function yearOf(episode: EpisodeIndexEntry): number {
  return new Date(episode.date).getUTCFullYear();
}

function yearRange(show: ShowSummary): string {
  return show.firstYear === show.lastYear
    ? String(show.firstYear)
    : `${show.firstYear}–${show.lastYear}`;
}

/* ─── Small pieces ─────────────────────────────────────────────────────── */

function ShowBadge({ show }: { show?: ShowSummary }) {
  if (!show) return null;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm"
      style={{ backgroundColor: show.color }}
    >
      {show.short}
    </span>
  );
}

function PlayGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.05-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function EpisodeCard({
  episode,
  show,
  showBadge,
  className = "",
}: {
  episode: EpisodeIndexEntry;
  show?: ShowSummary;
  showBadge: boolean;
  className?: string;
}) {
  const duration = formatDuration(episode.duration);
  return (
    <Link href={episode.slug} className={`group flex flex-col ${className}`}>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface-light">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer */}
        <img
          src={episode.thumbnail}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30">
          <span className="flex h-12 w-12 scale-75 items-center justify-center rounded-full bg-white/95 text-foreground opacity-0 shadow-lg transition-all duration-300 group-hover:scale-100 group-hover:opacity-100">
            <PlayGlyph className="ml-0.5 h-5 w-5" />
          </span>
        </div>
        {showBadge && (
          <span className="absolute left-2 top-2">
            <ShowBadge show={show} />
          </span>
        )}
        {duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white">
            {duration}
          </span>
        )}
      </div>
      <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-accent">
        {episode.title}
      </h3>
      <p className="mt-1 text-xs text-muted">
        {formatDate(episode.date)}
        {episode.guestNames && <> · {episode.guestNames}</>}
      </p>
    </Link>
  );
}

/* ─── Show switcher ────────────────────────────────────────────────────── */

function ShowTiles({
  shows,
  activeShow,
  total,
}: {
  shows: ShowSummary[];
  activeShow?: string;
  total: number;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  // Bring the current show's tile into view without moving the page.
  useEffect(() => {
    const el = activeRef.current;
    const row = el?.closest("nav");
    if (!activeShow || !el || !row) return;
    row.scrollLeft = el.offsetLeft - (row.clientWidth - el.clientWidth) / 2;
  }, [activeShow]);

  const tile =
    "flex shrink-0 snap-start items-center gap-3 rounded-2xl border py-2.5 pl-2.5 pr-5 transition-all";

  return (
    <nav aria-label="Shows" className="-mx-6 overflow-x-auto px-6 pb-2 no-scrollbar sm:-mx-8 sm:px-8">
      <div className="flex snap-x gap-3">
        <Link
          href="/episodes"
          ref={!activeShow ? activeRef : undefined}
          aria-current={!activeShow ? "page" : undefined}
          className={`${tile} ${
            !activeShow
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-surface hover:border-foreground"
          }`}
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-extrabold ${
              !activeShow ? "bg-background/15" : "bg-surface-light"
            }`}
          >
            ∞
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-bold">All shows</span>
            <span className={`text-xs ${!activeShow ? "text-background/70" : "text-muted"}`}>
              {total.toLocaleString()} episodes
            </span>
          </span>
        </Link>
        {shows.map((show) => {
          const active = show.slug === activeShow;
          return (
            <Link
              key={show.slug}
              href={`/episodes/${show.slug}`}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={`${tile} bg-surface ${active ? "shadow-md" : "border-border hover:-translate-y-0.5 hover:shadow-md"}`}
              style={active ? { borderColor: show.color, boxShadow: `0 0 0 1px ${show.color}` } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={show.cover}
                alt=""
                loading="lazy"
                className="h-12 w-12 rounded-xl object-cover"
                style={{ backgroundColor: `${show.color}22` }}
              />
              <span className="flex flex-col">
                <span className="whitespace-nowrap text-sm font-bold">{show.name}</span>
                <span className="whitespace-nowrap text-xs text-muted">
                  {show.count} ep{show.count === 1 ? "" : "s"} · {yearRange(show)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Show banner (on /episodes/<show>) ─────────────────────────────────── */

function ShowBanner({ show, onSurprise }: { show: ShowSummary; onSurprise: () => void }) {
  const stats = [
    { label: "Episodes", value: show.count.toLocaleString() },
    { label: "Hours", value: show.hours.toLocaleString() },
    { label: "On air", value: yearRange(show) },
  ];
  return (
    <section
      className="relative mt-8 overflow-hidden rounded-3xl border border-border p-6 sm:p-8"
      style={{ background: `linear-gradient(135deg, ${show.color}1f 0%, ${show.color}08 55%, transparent 100%)` }}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: show.color }}
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={show.cover}
          alt=""
          className="h-28 w-28 shrink-0 rounded-2xl bg-surface object-cover shadow-lg sm:h-36 sm:w-36"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold sm:text-5xl">{show.name}</h1>
          {show.tagline && <p className="mt-2 text-base text-foreground/80">{show.tagline}</p>}
          {show.hosts && <p className="mt-1 text-sm text-muted">Hosted by {show.hosts}</p>}
          <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{stat.label}</dt>
                <dd className="font-display text-2xl font-extrabold">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={show.latestSlug}
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
            >
              <PlayGlyph className="h-4 w-4" />
              Play latest
            </Link>
            <SurpriseButton onClick={onSurprise} />
          </div>
        </div>
      </div>
    </section>
  );
}

function SurpriseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition-colors hover:border-foreground"
    >
      <span className="inline-block transition-transform duration-300 group-hover:rotate-180">🎲</span>
      Surprise me
    </button>
  );
}

/* ─── Overview: featured episode + one shelf per show ──────────────────── */

function FeaturedEpisode({ episode, show }: { episode: EpisodeIndexEntry; show?: ShowSummary }) {
  return (
    <Link
      href={episode.slug}
      className="group relative mt-8 grid overflow-hidden rounded-3xl border border-border bg-foreground text-background md:grid-cols-[1.4fr_1fr]"
    >
      <div className="relative aspect-video overflow-hidden md:aspect-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={episode.thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent md:bg-gradient-to-r md:from-transparent md:to-foreground/40" />
      </div>
      <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-brand">Latest episode</span>
          <ShowBadge show={show} />
        </div>
        <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{episode.title}</h2>
        {episode.description && (
          <p className="line-clamp-3 text-sm text-background/70">{episode.description}</p>
        )}
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-foreground transition-transform group-hover:scale-110">
            <PlayGlyph className="ml-0.5 h-5 w-5" />
          </span>
          <span className="text-sm text-background/70">
            {formatDate(episode.date)} · {formatDuration(episode.duration)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ShowShelf({ show, episodes }: { show: ShowSummary; episodes: EpisodeIndexEntry[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const scroll = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };
  const arrow =
    "hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:border-foreground sm:flex";

  return (
    <section className="mt-14">
      <div className="mb-4 flex items-end justify-between gap-4">
        <Link href={`/episodes/${show.slug}`} className="group flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={show.cover} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-xl font-extrabold sm:text-2xl">
              <span className="truncate group-hover:underline">{show.name}</span>
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: show.color }} />
            </h2>
            <p className="truncate text-xs text-muted">
              {show.count} episodes · {yearRange(show)}
              {show.tagline && <span className="hidden sm:inline"> · {show.tagline}</span>}
            </p>
          </div>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {episodes.length > 3 && (
            <>
              <button type="button" aria-label={`Scroll ${show.name} back`} onClick={() => scroll(-1)} className={arrow}>
                ‹
              </button>
              <button type="button" aria-label={`Scroll ${show.name} forward`} onClick={() => scroll(1)} className={arrow}>
                ›
              </button>
            </>
          )}
          <Link
            href={`/episodes/${show.slug}`}
            className="whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            See all →
          </Link>
        </div>
      </div>
      <div
        ref={scroller}
        className="-mx-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-6 px-6 pb-2 no-scrollbar sm:-mx-8 sm:scroll-px-8 sm:px-8"
      >
        {episodes.map((episode) => (
          <EpisodeCard
            key={episode.slug}
            episode={episode}
            show={show}
            showBadge={false}
            className="w-64 shrink-0 snap-start sm:w-72"
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────────── */

export function EpisodeArchive({ episodes, shows, activeShow, title }: EpisodeArchiveProps) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [year, setYear] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const showsBySlug = useMemo(() => new Map(shows.map((s) => [s.slug, s])), [shows]);
  const currentShow = activeShow ? showsBySlug.get(activeShow) : undefined;

  const scoped = useMemo(
    () => (activeShow ? episodes.filter((e) => e.channel === activeShow) : episodes.filter((e) => showsBySlug.has(e.channel))),
    [episodes, activeShow, showsBySlug],
  );

  const years = useMemo(() => {
    const counts = new Map<number, number>();
    for (const e of scoped) counts.set(yearOf(e), (counts.get(yearOf(e)) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[0] - a[0]);
  }, [scoped]);

  const query = search.trim().toLowerCase();
  const browsing = Boolean(activeShow || query || year);

  const filtered = useMemo(() => {
    let result = scoped;
    if (year) result = result.filter((e) => yearOf(e) === year);
    if (query) {
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.description?.toLowerCase().includes(query) ||
          e.guestNames?.toLowerCase().includes(query),
      );
    }
    return sort === "oldest" ? [...result].reverse() : result;
  }, [scoped, year, query, sort]);

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(target.tagName)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const surprise = () => {
    const pool = filtered.length ? filtered : scoped;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick) router.push(pick.slug);
  };

  const reset = () => {
    setSearch("");
    setYear(null);
    setVisible(PAGE_SIZE);
  };

  return (
    <div>
      {!activeShow && (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Episodes</h1>
            <p className="mt-2 text-sm text-muted">
              {scoped.length.toLocaleString()} episodes across {shows.length} shows on the Bitcoin Podcast Network
            </p>
          </div>
          <SurpriseButton onClick={surprise} />
        </div>
      )}

      <ShowTiles shows={shows} activeShow={activeShow} total={episodes.filter((e) => showsBySlug.has(e.channel)).length} />

      {currentShow && <ShowBanner show={currentShow} onSurprise={surprise} />}
      {activeShow && !currentShow && (
        <h1 className="mt-8 font-display text-4xl font-extrabold capitalize sm:text-5xl">{title || activeShow}</h1>
      )}

      {/* Toolbar */}
      <div className="sticky top-[73px] z-30 -mx-6 mt-8 border-b border-border bg-background/90 px-6 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search episodes</span>
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              ref={searchRef}
              type="search"
              placeholder={`Search ${currentShow ? currentShow.name : "all shows"}: titles, topics, guests`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisible(PAGE_SIZE);
              }}
              className="w-full rounded-full border border-border bg-surface py-2.5 pl-10 pr-12 text-sm text-foreground placeholder:text-muted focus:border-foreground focus:outline-none"
            />
            {!search && (
              <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 font-mono text-[11px] text-muted sm:block">
                /
              </kbd>
            )}
          </label>
          {browsing && (
            <div className="flex rounded-full border border-border bg-surface p-1 text-sm" role="group" aria-label="Sort">
              {(["newest", "oldest"] as Sort[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={sort === option}
                  onClick={() => setSort(option)}
                  className={`rounded-full px-4 py-1.5 font-medium capitalize transition-colors ${
                    sort === option ? "bg-foreground text-background" : "text-muted hover:text-foreground"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        {years.length > 1 && (
          <div className="-mx-6 mt-3 overflow-x-auto px-6 no-scrollbar sm:-mx-8 sm:px-8">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setYear(null);
                  setVisible(PAGE_SIZE);
                }}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  year === null ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                }`}
              >
                All years
              </button>
              {years.map(([y, count]) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setYear(year === y ? null : y);
                    setVisible(PAGE_SIZE);
                  }}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    year === y ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"
                  }`}
                >
                  {y} <span className={year === y ? "text-background/60" : "text-muted"}>{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!browsing ? (
        <>
          {scoped[0] && <FeaturedEpisode episode={scoped[0]} show={showsBySlug.get(scoped[0].channel)} />}
          {shows.map((show) => (
            <ShowShelf
              key={show.slug}
              show={show}
              episodes={scoped.filter((e) => e.channel === show.slug).slice(0, SHELF_SIZE)}
            />
          ))}
        </>
      ) : (
        <section className="mt-6">
          <p className="mb-5 text-xs text-muted" aria-live="polite">
            {filtered.length.toLocaleString()} episode{filtered.length !== 1 ? "s" : ""}
            {year && <> from {year}</>}
            {query && <> matching “{search.trim()}”</>}
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border py-16 text-center">
              <p className="font-display text-xl font-bold">Nothing matches that yet.</p>
              <p className="mt-1 text-sm text-muted">Try a guest&apos;s name, a topic, or another show.</p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 text-sm font-semibold text-accent hover:text-accent-hover"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.slice(0, visible).map((episode, i) => (
                  <div key={episode.slug} className="result-enter" style={{ animationDelay: `${(i % PAGE_SIZE) * 20}ms` }}>
                    <EpisodeCard
                      episode={episode}
                      show={showsBySlug.get(episode.channel)}
                      showBadge={!activeShow}
                    />
                  </div>
                ))}
              </div>
              {visible < filtered.length && (
                <div className="mt-12 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-semibold transition-colors hover:border-foreground"
                  >
                    Show more episodes
                  </button>
                  <span className="text-xs text-muted">
                    Showing {visible} of {filtered.length.toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
