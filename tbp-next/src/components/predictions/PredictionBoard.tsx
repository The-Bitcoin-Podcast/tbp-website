"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getShowMeta } from "@/lib/show-meta";
import { SUBJECT_LABEL, VERDICT_META, VERDICT_ORDER, type Prediction, type Verdict } from "./types";

/** How long a clip plays from the quoted line before stopping. */
const CLIP_SECONDS = 40;

type Sort = "newest" | "oldest" | "boldest";

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatResolved(ym: string) {
  return new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]"
      style={{ background: m.tint, color: m.ink }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.fill }} aria-hidden />
      {m.label}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-surface text-foreground hover:border-foreground/40"
      }`}
    >
      {dot ? <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden /> : null}
      {children}
    </button>
  );
}

export function PredictionBoard({ predictions }: { predictions: Prediction[] }) {
  const [verdict, setVerdict] = useState<Verdict | "all">("all");
  const [subject, setSubject] = useState<string>("all");
  const [show, setShow] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [limit, setLimit] = useState(30);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopAtRef = useRef(0);

  useEffect(() => () => audioRef.current?.pause(), []);

  const subjects = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of predictions) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }, [predictions]);

  const shows = useMemo(() => [...new Set(predictions.map((p) => p.show))], [predictions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = predictions.filter(
      (p) =>
        (verdict === "all" || p.verdict === verdict) &&
        (subject === "all" || p.subject === subject) &&
        (show === "all" || p.show === show) &&
        (!q ||
          p.quote.toLowerCase().includes(q) ||
          p.claim.toLowerCase().includes(q) ||
          p.headline.toLowerCase().includes(q) ||
          p.outcome.toLowerCase().includes(q) ||
          p.speaker.toLowerCase().includes(q)),
    );
    if (sort === "oldest") return list;
    if (sort === "newest") return [...list].reverse();
    return [...list].sort((a, b) => (b.boldness ?? 0) - (a.boldness ?? 0) || b.date.localeCompare(a.date));
  }, [predictions, verdict, subject, show, query, sort]);

  useEffect(() => setLimit(30), [verdict, subject, show, query, sort]);

  function toggle(p: Prediction) {
    const audio = audioRef.current ?? new Audio();
    if (!audioRef.current) {
      audioRef.current = audio;
      audio.preload = "auto";
      audio.addEventListener("timeupdate", () => {
        if (audio.currentTime >= stopAtRef.current) {
          audio.pause();
          setPlayingId(null);
        }
      });
      audio.addEventListener("ended", () => setPlayingId(null));
      audio.addEventListener("error", () => setPlayingId(null));
    }
    if (playingId === p.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    if (!p.audioUrl) return;
    stopAtRef.current = p.start + CLIP_SECONDS;
    const seekAndPlay = () => {
      audio.currentTime = p.start;
      void audio.play().catch(() => setPlayingId(null));
    };
    if (audio.src !== p.audioUrl) {
      audio.src = p.audioUrl;
      audio.addEventListener("loadedmetadata", seekAndPlay, { once: true });
      audio.load();
    } else {
      seekAndPlay();
    }
    setPlayingId(p.id);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: predictions.length };
    for (const p of predictions) c[p.verdict] = (c[p.verdict] ?? 0) + 1;
    return c;
  }, [predictions]);

  return (
    <section id="every-call" className="mt-20 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">The receipts</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Every call, graded</h2>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-foreground"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="boldest">Boldest first</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Chip active={verdict === "all"} onClick={() => setVerdict("all")}>
          All <span className="opacity-60">{counts.all}</span>
        </Chip>
        {VERDICT_ORDER.map((v) => (
          <Chip key={v} active={verdict === v} onClick={() => setVerdict(v)} dot={VERDICT_META[v].fill}>
            {VERDICT_META[v].label} <span className="opacity-60">{counts[v] ?? 0}</span>
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search calls: ETF, Lightning, $100k…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:max-w-sm"
        />
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Topic"
          className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
        >
          <option value="all">All topics</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {SUBJECT_LABEL[s] ?? s}
            </option>
          ))}
        </select>
        {shows.length > 1 ? (
          <select
            value={show}
            onChange={(e) => setShow(e.target.value)}
            aria-label="Show"
            className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
          >
            <option value="all">All shows</option>
            {shows.map((s) => (
              <option key={s} value={s}>
                {getShowMeta(s).name}
              </option>
            ))}
          </select>
        ) : null}
        <p className="font-mono text-xs text-muted sm:ml-auto">{filtered.length} shown</p>
      </div>

      <ol className="mt-8 grid gap-4 md:grid-cols-2">
        {filtered.slice(0, limit).map((p) => {
          const meta = getShowMeta(p.show);
          const who = p.speaker || (p.role === "guest" ? "A guest" : "A host");
          return (
            <li
              key={p.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5"
              style={{ borderTop: `3px solid ${VERDICT_META[p.verdict].fill}` }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <VerdictBadge verdict={p.verdict} />
                <span className="font-mono text-xs text-muted">
                  {formatDate(p.date)} · <span style={{ color: meta.color === "#f7931a" ? "#b45309" : meta.color }}>{meta.short}</span>
                </span>
              </div>
              <h3 className="mt-3 font-display text-lg font-bold leading-snug">{p.headline}</h3>
              <blockquote className="mt-3 border-l-2 border-brand pl-3 text-[15px] leading-relaxed text-foreground">
                “{p.quote}”
                <footer className="mt-1 text-xs text-muted">{who}</footer>
              </blockquote>
              <div className="mt-4 rounded-xl bg-surface-light p-3 text-sm leading-relaxed">
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  What happened{p.resolved ? ` · ${formatResolved(p.resolved)}` : ""}
                </p>
                <p className="mt-1 text-foreground">{p.outcome}</p>
                {p.sources.length ? (
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {p.sources.map((s) => (
                      <a
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-current"
                      >
                        {s.title || new URL(s.url).hostname}
                      </a>
                    ))}
                  </p>
                ) : null}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-sm">
                {p.audioUrl ? (
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/85"
                  >
                    {playingId === p.id ? "■ Stop" : "▶ Hear it"}
                  </button>
                ) : null}
                <Link
                  href={`/episodes/${p.slug}?t=${Math.floor(p.start)}`}
                  className="min-w-0 truncate text-muted hover:text-accent hover:underline"
                >
                  {p.episode}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>

      {filtered.length > limit ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + 30)}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold hover:border-foreground/40"
          >
            Show more ({filtered.length - limit} left)
          </button>
        </div>
      ) : null}
      {!filtered.length ? <p className="mt-10 text-center text-muted">No calls match those filters.</p> : null}
    </section>
  );
}
