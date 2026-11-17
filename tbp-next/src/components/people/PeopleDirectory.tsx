"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { getShowMeta } from "@/lib/show-meta";
import { Avatar, SocialIconRow, type PersonLinks } from "./PersonBits";

export interface PersonSummary {
  name: string;
  slug: string;
  host: boolean;
  hosted: string[];
  affiliation?: string;
  bio?: string;
  links: PersonLinks;
  avatar?: string;
  tenWords: number;
  shows: string[];
  first?: string;
  last?: string;
  count: number;
}

type Sort = "az" | "most" | "recent" | "earliest";

const SORTS: { value: Sort; label: string }[] = [
  { value: "most", label: "Most episodes" },
  { value: "recent", label: "Most recent" },
  { value: "earliest", label: "Earliest" },
  { value: "az", label: "A–Z" },
];

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function years(p: PersonSummary): string {
  if (!p.first) return "";
  const a = p.first.slice(0, 4);
  const b = p.last?.slice(0, 4) || a;
  return a === b ? a : `${a}–${b}`;
}

function ShowDot({ show }: { show: string }) {
  const meta = getShowMeta(show);
  return (
    <span
      title={meta.name}
      className="rounded-full px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ backgroundColor: meta.color }}
    >
      {meta.short}
    </span>
  );
}

/* ─── Hosts: the people behind the mics ────────────────────────────────── */

function HostCard({ person }: { person: PersonSummary }) {
  const shows = person.hosted.length ? person.hosted : person.shows;
  return (
    <div className="group relative flex flex-col items-center rounded-2xl border border-border bg-surface p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg hover:shadow-brand/5">
      <Avatar name={person.name} src={person.avatar} size={72} className="ring-4 ring-brand-tint" />
      <Link
        href={`/people/${encodeURIComponent(person.slug)}`}
        className="mt-3 font-display text-lg font-bold leading-tight after:absolute after:inset-0 group-hover:text-accent"
      >
        {person.name}
      </Link>
      <p className="mt-1 font-mono text-xs text-muted">
        {person.count} episode{person.count === 1 ? "" : "s"}
        {years(person) && ` · ${years(person)}`}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-1">
        {shows.slice(0, 4).map((s) => (
          <ShowDot key={s} show={s} />
        ))}
      </div>
      <div className="mt-3">
        <SocialIconRow links={person.links} name={person.name} />
      </div>
    </div>
  );
}

/* ─── Guest card ───────────────────────────────────────────────────────── */

function PersonCard({ person }: { person: PersonSummary }) {
  return (
    <div className="group relative flex min-w-0 gap-3.5 rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/50 hover:shadow-md hover:shadow-brand/5">
      <Avatar name={person.name} src={person.avatar} size={48} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/people/${encodeURIComponent(person.slug)}`}
            className="truncate font-semibold leading-snug text-foreground after:absolute after:inset-0 group-hover:text-accent"
          >
            {person.name}
          </Link>
          {person.host && (
            <span className="flex-shrink-0 rounded-full bg-brand-tint px-2 py-px text-[10px] font-bold uppercase tracking-wide text-accent-hover">
              Host
            </span>
          )}
        </div>
        {(person.affiliation || person.bio) && (
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
            {person.affiliation || person.bio}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[11px] text-muted">
            {person.count > 0 ? `${person.count} ep${person.count === 1 ? "" : "s"}` : "Profile"}
            {years(person) && ` · ${years(person)}`}
          </span>
          {person.shows.slice(0, 3).map((s) => (
            <ShowDot key={s} show={s} />
          ))}
          {person.tenWords > 0 && (
            <span
              title="Answered the In Ten Words question"
              className="rounded-full border border-brand/40 px-1.5 py-px text-[10px] font-semibold text-accent"
            >
              10 words
            </span>
          )}
        </div>
        <div className="-ml-1.5 mt-1">
          <SocialIconRow links={person.links} name={person.name} />
        </div>
      </div>
    </div>
  );
}

/* ─── Directory ────────────────────────────────────────────────────────── */

export function PeopleDirectory({ people }: { people: PersonSummary[] }) {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("most");
  const [linkedOnly, setLinkedOnly] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const hosts = useMemo(
    () => people.filter((p) => p.host).sort((a, b) => b.count - a.count),
    [people],
  );

  const showOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of people) for (const s of p.shows) counts.set(s, (counts.get(s) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [people]);

  const filtered = useMemo(() => {
    const q = fold(deferredQuery.trim());
    const list = people.filter((p) => {
      if (show !== "all" && !p.shows.includes(show)) return false;
      if (linkedOnly && Object.keys(p.links).length === 0) return false;
      if (!q) return true;
      return fold(`${p.name} ${p.affiliation || ""} ${p.bio || ""}`).includes(q);
    });
    const byName = (a: PersonSummary, b: PersonSummary) => a.name.localeCompare(b.name);
    return list.sort((a, b) => {
      switch (sort) {
        case "most":
          return b.count - a.count || byName(a, b);
        case "recent":
          return (b.last || "").localeCompare(a.last || "") || byName(a, b);
        case "earliest":
          return (a.first || "9999").localeCompare(b.first || "9999") || byName(a, b);
        default:
          return byName(a, b);
      }
    });
  }, [people, deferredQuery, show, sort, linkedOnly]);

  const showingAll = !deferredQuery && show === "all" && !linkedOnly;

  return (
    <>
      {showingAll && hosts.length > 0 && (
        <section className="mt-14" aria-labelledby="hosts-heading">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 id="hosts-heading" className="font-display text-2xl font-extrabold">
              Hosts
            </h2>
            <span className="font-mono text-xs text-muted">{hosts.length} voices behind the mic</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {hosts.map((p) => (
              <HostCard key={p.slug} person={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-14" aria-labelledby="guests-heading">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="guests-heading" className="font-display text-2xl font-extrabold">
            {showingAll ? "Everyone" : "Results"}
          </h2>
          <span className="font-mono text-xs text-muted" aria-live="polite">
            {filtered.length.toLocaleString()} {filtered.length === 1 ? "person" : "people"}
          </span>
        </div>

        {/* Toolbar */}
        <div className="sticky top-[73px] z-20 -mx-6 mb-5 border-b border-border bg-background/90 px-6 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search people</span>
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, project or company…"
                className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="people-show">
                Show
              </label>
              <select
                id="people-show"
                value={show}
                onChange={(e) => setShow(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand md:flex-none"
              >
                <option value="all">All shows</option>
                {showOptions.map(([s, n]) => (
                  <option key={s} value={s}>
                    {getShowMeta(s).name} ({n})
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="people-sort">
                Sort
              </label>
              <select
                id="people-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand md:flex-none"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer select-none items-center gap-2 whitespace-nowrap text-sm text-muted">
              <input
                type="checkbox"
                checked={linkedOnly}
                onChange={(e) => setLinkedOnly(e.target.checked)}
                className="h-4 w-4 accent-[#f7931a]"
              />
              Has links
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
            <p className="font-semibold">No one matches that.</p>
            <p className="mt-1 text-sm text-muted">Try a different spelling, or clear the filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setShow("all");
                setLinkedOnly(false);
              }}
              className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-hover"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PersonCard key={p.slug} person={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
