"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getShowMeta } from "@/lib/show-meta";

export type Question = "ten" | "hard" | "ask";

export interface TenWordsMoment {
  id: string;
  slug: string;
  show: string;
  episode: string;
  date: string;
  question: Question;
  subject: string;
  asked: string;
  answer: string;
  words: number;
  answeredBy: string;
  highlight: boolean;
  start: number;
  end: number;
  audioUrl?: string;
  youtubeId?: string;
  thumbnail?: string;
}

const QUESTIONS: { key: Question | "all"; label: string; short: string }[] = [
  { key: "ten", label: "In ten words or less…", short: "Ten words" },
  { key: "hard", label: "Is what you do hard?", short: "Is it hard?" },
  { key: "ask", label: "What didn’t we ask?", short: "Didn’t ask" },
  { key: "all", label: "All three", short: "All" },
];

const QUESTION_LABEL: Record<Question, string> = {
  ten: "In ten words or less",
  hard: "Is what you do hard?",
  ask: "What didn’t we ask?",
};

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const canPlayAudio = (m: TenWordsMoment) => Boolean(m.audioUrl);
const canPlay = (m: TenWordsMoment) => Boolean(m.audioUrl || m.youtubeId);

/** Subject chips: the most common things guests were asked to describe. */
function topSubjects(moments: TenWordsMoment[]) {
  const counts = new Map<string, number>();
  /** The spelling seen most often for each subject, e.g. "DeFi" over "defi". */
  const spellings = new Map<string, Map<string, number>>();
  for (const m of moments) {
    if (m.question !== "ten") continue;
    const key = m.subject.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const forms = spellings.get(key) ?? new Map<string, number>();
    forms.set(m.subject, (forms.get(m.subject) ?? 0) + 1);
    spellings.set(key, forms);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([subject, n]) => ({
      subject,
      label: [...spellings.get(subject)!.entries()].sort((a, b) => b[1] - a[1])[0][0],
      n,
    }));
}

export function TenWordsTimeline({ moments }: { moments: TenWordsMoment[] }) {
  const [question, setQuestion] = useState<Question | "all">("ten");
  const [show, setShow] = useState<string>("all");
  const [subject, setSubject] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [highlightsOnly, setHighlightsOnly] = useState(false);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [playAll, setPlayAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipRef = useRef<TenWordsMoment | null>(null);
  const queueRef = useRef<TenWordsMoment[]>([]);
  const playAllRef = useRef(false);

  const shows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of moments) counts.set(m.show, (counts.get(m.show) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);
  }, [moments]);

  const subjects = useMemo(() => topSubjects(moments), [moments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return moments.filter(
      (m) =>
        (question === "all" || m.question === question) &&
        (show === "all" || m.show === show) &&
        (subject === "all" || (m.question === "ten" && m.subject.toLowerCase() === subject)) &&
        (!highlightsOnly || m.highlight) &&
        (!q ||
          m.answer.toLowerCase().includes(q) ||
          m.answeredBy.toLowerCase().includes(q) ||
          m.episode.toLowerCase().includes(q)),
    );
  }, [moments, question, show, subject, query, highlightsOnly]);

  const years = useMemo(() => {
    const groups = new Map<string, TenWordsMoment[]>();
    for (const m of filtered) {
      const year = m.date.slice(0, 4);
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)!.push(m);
    }
    return [...groups.entries()];
  }, [filtered]);

  const allYears = useMemo(() => {
    const first = Number(moments[0]?.date.slice(0, 4));
    const last = Number(moments.at(-1)?.date.slice(0, 4));
    const out: string[] = [];
    for (let y = first; y <= last; y++) out.push(String(y));
    return out;
  }, [moments]);
  const yearCounts = new Map(years.map(([year, list]) => [year, list.length]));
  const maxYear = Math.max(1, ...yearCounts.values());

  // ─── Playback ───────────────────────────────────────────────────────────────

  const stop = useCallback(() => {
    audioRef.current?.pause();
    clipRef.current = null;
    playAllRef.current = false;
    setPlayAll(false);
    setPlayingId(null);
    setProgress(0);
    setLoading(false);
  }, []);

  const start = useCallback((moment: TenWordsMoment) => {
    clipRef.current = moment;
    setPlayingId(moment.id);
    setProgress(0);
    if (!moment.audioUrl) {
      // Video-only episodes play in an inline YouTube embed instead.
      audioRef.current?.pause();
      setLoading(false);
      return;
    }
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.preload = "auto";
    setLoading(true);
    const seekAndPlay = () => {
      audio.currentTime = moment.start;
      void audio.play().catch(() => setLoading(false));
    };
    if (audio.src !== moment.audioUrl) {
      audio.src = moment.audioUrl;
      audio.addEventListener("loadedmetadata", seekAndPlay, { once: true });
      audio.load();
    } else {
      seekAndPlay();
    }
  }, []);

  const playNext = useCallback(() => {
    const current = clipRef.current;
    const queue = queueRef.current;
    const at = current ? queue.findIndex((m) => m.id === current.id) : -1;
    const next = queue.slice(at + 1).find(canPlayAudio);
    if (next) {
      start(next);
      document.getElementById(next.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      stop();
    }
  }, [start, stop]);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onTime = () => {
      const clip = clipRef.current;
      if (!clip || !clip.audioUrl) return;
      if (audio.currentTime >= clip.start - 1) setLoading(false);
      const span = Math.max(1, clip.end - clip.start);
      setProgress(Math.min(1, Math.max(0, (audio.currentTime - clip.start) / span)));
      if (audio.currentTime >= clip.end) {
        if (playAllRef.current) playNext();
        else {
          audio.pause();
          clipRef.current = null;
          setPlayingId(null);
          setProgress(0);
        }
      }
    };
    const onEnded = () => (playAllRef.current ? playNext() : stop());
    const onError = () => (playAllRef.current ? playNext() : setLoading(false));
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, [playNext, stop]);

  const toggle = (moment: TenWordsMoment) => {
    if (playingId === moment.id) return stop();
    playAllRef.current = false;
    setPlayAll(false);
    start(moment);
  };

  const startPlayAll = () => {
    if (playAll) return stop();
    queueRef.current = filtered;
    const first = filtered.find(canPlayAudio);
    if (!first) return;
    playAllRef.current = true;
    setPlayAll(true);
    start(first);
    document.getElementById(first.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const surprise = () => {
    const pool = filtered.filter(canPlayAudio);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    playAllRef.current = false;
    setPlayAll(false);
    start(pick);
    document.getElementById(pick.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const jumpToYear = (year: string) =>
    document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const playingMoment = playingId ? moments.find((m) => m.id === playingId) : null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mt-12">
      {/* Controls */}
      <div className="z-30 sm:sticky sm:top-[73px] -mx-6 border-b border-border bg-background/95 px-6 py-4 backdrop-blur-md sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Question">
          {QUESTIONS.map((q) => {
            const active = question === q.key;
            const count = q.key === "all" ? moments.length : moments.filter((m) => m.question === q.key).length;
            return (
              <button
                key={q.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setQuestion(q.key);
                  if (q.key !== "ten") setSubject("all");
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? "bg-foreground text-background" : "bg-surface-light text-foreground hover:bg-border"
                }`}
              >
                <span className="hidden sm:inline">{q.label}</span>
                <span className="sm:hidden">{q.short}</span>
                <span className={`ml-2 font-mono text-xs ${active ? "text-brand" : "text-muted"}`}>{count}</span>
              </button>
            );
          })}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={surprise}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-light"
            >
              Surprise me
            </button>
            <button
              type="button"
              onClick={startPlayAll}
              className="flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-foreground hover:bg-brand-hover"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {playAll ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
              {playAll ? "Stop" : "Play all"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search answers, guests, episodes"
            aria-label="Search answers"
            className="min-w-0 flex-1 basis-56 rounded-full border border-border bg-surface px-4 py-2 text-sm outline-none focus:border-foreground"
          />
          <select
            value={show}
            onChange={(e) => setShow(e.target.value)}
            aria-label="Show"
            className="rounded-full border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="all">All shows</option>
            {shows.map((slug) => (
              <option key={slug} value={slug}>
                {getShowMeta(slug).name}
              </option>
            ))}
          </select>
          {question === "ten" &&
            subjects.map(({ subject: s, label }) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(subject === s ? "all" : s)}
                aria-pressed={subject === s}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  subject === s ? "border-foreground bg-foreground text-background" : "border-border hover:bg-surface-light"
                }`}
              >
                {label}
              </button>
            ))}
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
            <input
              type="checkbox"
              checked={highlightsOnly}
              onChange={(e) => setHighlightsOnly(e.target.checked)}
              className="accent-[#f7931a]"
            />
            Standouts only
          </label>
        </div>

        {/* Year strip: how many answers fall in each year, click to jump. */}
        <div className="mt-4 flex items-end gap-1" aria-label="Answers by year">
          {allYears.map((year) => {
            const n = yearCounts.get(year) ?? 0;
            return (
              <button
                key={year}
                type="button"
                disabled={!n}
                onClick={() => jumpToYear(year)}
                title={`${year}: ${n} answer${n === 1 ? "" : "s"}`}
                className="group flex flex-1 flex-col items-center gap-1 disabled:cursor-default"
              >
                <span className="flex h-10 w-full items-end">
                  <span
                    className="w-full rounded-t-sm bg-brand transition-colors group-hover:bg-accent group-disabled:bg-border"
                    style={{ height: `${n ? Math.max(8, (n / maxYear) * 100) : 4}%` }}
                  />
                </span>
                <span className="font-mono text-[10px] text-muted">&rsquo;{year.slice(2)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <p className="py-20 text-center text-muted">No answers match those filters.</p>
      ) : (
        <ol className="relative mt-10">
          <span className="absolute bottom-0 left-[11px] top-0 w-px bg-border sm:left-1/2" aria-hidden="true" />
          {years.map(([year, list]) => (
            <li key={year} id={`year-${year}`} className="relative scroll-mt-64">
              <div className="relative z-10 mb-6 flex sm:justify-center">
                <span className="rounded-full bg-foreground px-4 py-1.5 font-display text-lg font-extrabold text-background">
                  {year}
                  <span className="ml-2 font-mono text-xs font-normal text-brand">{list.length}</span>
                </span>
              </div>
              <ol className="space-y-6 pb-12">
                {list.map((m, i) => (
                  <MomentCard
                    key={m.id}
                    moment={m}
                    side={i % 2 === 0 ? "left" : "right"}
                    playing={playingId === m.id}
                    loading={playingId === m.id && loading}
                    progress={playingId === m.id ? progress : 0}
                    onToggle={() => toggle(m)}
                  />
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}

      {/* Now playing bar */}
      {playingMoment && playingMoment.audioUrl && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-[1160px] items-center gap-4 px-6 py-3 sm:px-8">
            <button
              type="button"
              onClick={stop}
              aria-label="Stop"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-brand"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6 6h12v12H6z" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {playingMoment.answeredBy || "Guest"} · <span className="font-normal text-muted">{playingMoment.episode}</span>
              </p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
                <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
            {playAll && (
              <button
                type="button"
                onClick={playNext}
                className="flex-shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-light"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MomentCard({
  moment: m,
  side,
  playing,
  loading,
  progress,
  onToggle,
}: {
  moment: TenWordsMoment;
  side: "left" | "right";
  playing: boolean;
  loading: boolean;
  progress: number;
  onToggle: () => void;
}) {
  const showMeta = getShowMeta(m.show);
  const overLimit = m.question === "ten" && m.words > 10;
  const length = Math.round(m.end - m.start);
  const prompt =
    m.question === "ten" ? `Describe ${m.subject} in ten words or less` : QUESTION_LABEL[m.question];

  return (
    <li
      id={m.id}
      // Cards alternate sides; pulling each one up makes the two columns
      // interlock instead of leaving a card-sized gap beside every card.
      className={`relative scroll-mt-64 pl-9 sm:w-1/2 sm:pl-0 sm:[&:not(:first-child)]:-mt-16 ${
        side === "left" ? "sm:pr-10" : "sm:ml-auto sm:pl-10"
      }`}
    >
      <span
        className={`absolute left-[6px] top-6 z-10 h-3 w-3 rounded-full ring-4 ring-background ${
          side === "left" ? "sm:left-auto sm:right-[-6px]" : "sm:left-[-6px]"
        } ${playing ? "bg-brand" : m.highlight ? "bg-accent" : "bg-foreground"}`}
        aria-hidden="true"
      />
      <article
        className={`rounded-2xl border p-5 transition-shadow ${
          playing
            ? "border-brand shadow-[0_0_0_3px_var(--color-brand-tint)]"
            : m.highlight
              ? "border-brand-tint bg-[#fffaf2]"
              : "border-border"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em]">
          <span className="text-muted">{prompt}</span>
          {m.highlight && <span className="rounded-full bg-brand-tint px-2 py-0.5 text-accent-hover">Standout</span>}
        </div>

        <blockquote
          className={`mt-3 font-display font-bold leading-snug ${
            m.highlight ? "text-2xl" : m.answer.length > 140 ? "text-base" : "text-xl"
          }`}
        >
          “{m.answer}”
        </blockquote>

        {m.question === "ten" && (
          <p className={`mt-2 font-mono text-xs ${overLimit ? "text-accent" : "text-muted"}`}>
            {m.words} word{m.words === 1 ? "" : "s"}
            {overLimit ? " · over the limit" : ""}
          </p>
        )}

        <div className="mt-4 flex items-center gap-3">
          {canPlay(m) && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={playing ? "Stop clip" : `Play clip from ${m.episode}`}
              className="relative flex h-10 flex-shrink-0 items-center gap-2 overflow-hidden rounded-full bg-foreground pl-3 pr-4 font-mono text-xs text-background hover:opacity-90"
            >
              <span
                className="absolute inset-y-0 left-0 bg-white/15 transition-[width] duration-200"
                style={{ width: `${progress * 100}%` }}
                aria-hidden="true"
              />
              <svg className={`relative h-3.5 w-3.5 text-brand ${loading ? "animate-pulse" : ""}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
              </svg>
              <span className="relative">{loading ? "Loading" : `${length}s`}</span>
            </button>
          )}
          <div className="min-w-0 text-sm leading-tight">
            <p className="truncate font-semibold">{m.answeredBy || "Guest"}</p>
            <p className="truncate text-muted">
              <span
                className="mr-1.5 inline-block rounded px-1.5 py-px align-[1px] text-[10px] font-bold text-white"
                style={{ backgroundColor: showMeta.color }}
              >
                {showMeta.short}
              </span>
              <Link href={`/episodes/${m.slug}?t=${Math.floor(m.start)}`} className="hover:text-accent hover:underline">
                {m.episode}
              </Link>
            </p>
          </div>
          <time dateTime={m.date} className="ml-auto hidden flex-shrink-0 font-mono text-xs text-muted sm:block">
            {formatDate(m.date)}
          </time>
        </div>

        {playing && !m.audioUrl && m.youtubeId && (
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl bg-foreground">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${m.youtubeId}?start=${Math.floor(m.start)}&end=${Math.ceil(m.end)}&autoplay=1`}
              title={`${m.episode} at ${formatTime(m.start)}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
        )}
      </article>
    </li>
  );
}
