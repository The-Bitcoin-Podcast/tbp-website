"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  MAX_MOMENTS,
  formatDate,
  formatTimestamp,
  loadMoments,
  matchingChapters,
  type EpisodeHeadline,
  type Moment,
} from "./pagefind";

const FIRST_MOMENTS = 5;

/** Wraps the words that match the query in <mark>. */
function highlight(text: string, tokens: string[]): ReactNode {
  if (tokens.length === 0) return text;
  const escaped = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])((?:${escaped.join("|")})[\\p{L}\\p{N}]*)`, "giu");
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? <mark key={i}>{part}</mark> : <Fragment key={i}>{part}</Fragment>,
  );
}

interface EpisodeResultProps {
  episode: EpisodeHeadline;
  query: string;
  tokens: string[];
  /** How many moments in this episode match the query. */
  momentCount: number;
  /** Position in the list, used to stagger the entrance. */
  index: number;
  playingId: string | null;
  onPlay: (id: string | null) => void;
  /**
   * "card" is a collapsible list item (phones and narrow screens). "preview"
   * is the always-open pane beside the episode list on wide screens.
   */
  variant?: "card" | "preview";
}

export function EpisodeResult({
  episode,
  query,
  tokens,
  momentCount,
  index,
  playingId,
  onPlay,
  variant = "card",
}: EpisodeResultProps) {
  const isPreview = variant === "preview";
  const [open, setOpen] = useState(isPreview);
  const [everOpened, setEverOpened] = useState(isPreview);
  const [showAll, setShowAll] = useState(isPreview);
  const [moments, setMoments] = useState<Moment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [inView, setInView] = useState(isPreview);
  const cardRef = useRef<HTMLLIElement & HTMLDivElement>(null);
  const scrollTo = useRef<string | null>(null);

  // Only fetch an episode's moments once its card is near the screen.
  useEffect(() => {
    const card = cardRef.current;
    if (!card || momentCount === 0 || isPreview) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [momentCount, isPreview]);

  useEffect(() => {
    if (!inView || momentCount === 0) return;
    let current = true;
    loadMoments(query, episode.slug)
      .then((loaded) => current && setMoments(loaded))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [inView, momentCount, query, episode.slug]);

  // After a timeline tick opens the card, bring that moment into view.
  useEffect(() => {
    if (!open || !scrollTo.current) return;
    const id = scrollTo.current;
    scrollTo.current = null;
    const timer = window.setTimeout(() => {
      document.getElementById(`moment-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [open, showAll]);

  const expand = () => {
    setOpen(true);
    setEverOpened(true);
  };

  const playFromTimeline = (moment: Moment, position: number) => {
    if (position >= FIRST_MOMENTS) setShowAll(true);
    scrollTo.current = moment.id;
    expand();
    onPlay(moment.id);
  };

  const duration = Math.max(episode.duration, (moments?.at(-1)?.seconds ?? 0) + 30, 1);
  const visible = moments ? (showAll ? moments : moments.slice(0, FIRST_MOMENTS)) : [];
  const hoveredMoment = hovered !== null && moments ? moments[hovered] : null;
  const hoveredAt = hoveredMoment ? (hoveredMoment.seconds / duration) * 100 : 0;
  const href = `/episodes/${episode.slug}`;
  const chapters = matchingChapters(episode, tokens);
  const canPlay = Boolean(episode.youtubeId || episode.audioUrl);
  const Root = isPreview ? "div" : "li";

  /** The inline player shown under whichever row is playing. */
  const player = (seconds: number, stamp: string) => (
    <>
      {episode.youtubeId && (
        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-foreground">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${episode.youtubeId}?start=${seconds}&autoplay=1`}
            title={`${episode.title} at ${stamp}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      )}
      {!episode.youtubeId && episode.audioUrl && (
        <audio
          controls
          autoPlay
          preload="metadata"
          src={`${episode.audioUrl}#t=${seconds}`}
          className="mt-4 w-full"
          aria-label={`${episode.title} at ${stamp}`}
        />
      )}
    </>
  );

  const playButton = (id: string, seconds: number) => {
    const playing = playingId === id;
    const stamp = formatTimestamp(seconds);
    return (
      <button
        type="button"
        disabled={!canPlay}
        onClick={() => onPlay(playing ? null : id)}
        aria-label={playing ? `Close player at ${stamp}` : `Play from ${stamp} in ${episode.title}`}
        className="flex flex-shrink-0 items-center gap-2 rounded-full bg-foreground py-2.5 pl-3 pr-4 font-mono text-sm text-background transition-opacity hover:opacity-85 disabled:opacity-30"
      >
        <svg className="h-3.5 w-3.5 text-brand" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
        </svg>
        {stamp}
      </button>
    );
  };

  const chapterList = chapters.length > 0 && (
    <div className="mt-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
        {chapters.length === 1 ? "Chapter" : "Chapters"} on this
      </p>
      <ul>
        {chapters.map(([seconds, title], i) => {
          const id = `chapter:${episode.slug}:${seconds}`;
          return (
            <li
              key={id}
              className="moment-enter border-b border-border py-3"
              style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
            >
              <div className="flex items-center gap-4">
                {playButton(id, seconds)}
                <p className="clip-excerpt min-w-0 flex-1 font-semibold leading-snug">
                  {highlight(title, tokens)}
                </p>
              </div>
              {playingId === id && player(seconds, formatTimestamp(seconds))}
            </li>
          );
        })}
      </ul>
    </div>
  );
  const details = [episode.show, formatDate(episode.date), episode.duration ? formatTimestamp(episode.duration) : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <Root
      ref={cardRef}
      className={
        isPreview
          ? "result-enter"
          : "result-enter rounded-2xl border border-border bg-background p-4 transition-colors hover:border-foreground sm:p-5"
      }
      style={{ animationDelay: isPreview ? undefined : `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-start gap-4">
        {episode.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={episode.image}
            alt=""
            loading="lazy"
            className="hidden aspect-video w-32 flex-shrink-0 rounded-xl bg-surface-light object-cover sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{details}</p>
          <h3 className="clip-excerpt mt-1 font-display text-xl font-extrabold leading-snug">
            <Link href={href} className="transition-colors hover:text-accent">
              {highlight(episode.title, tokens)}
            </Link>
          </h3>
          {episode.guests && episode.guests.length > 0 && (
            <p className="clip-excerpt mt-1 text-sm text-muted">
              With {highlight(episode.guests.join(", "), tokens)}
            </p>
          )}
          {episode.description && (
            <p
              className={`clip-excerpt mt-2 text-[15px] leading-relaxed text-muted ${
                isPreview ? "line-clamp-5" : "line-clamp-2"
              }`}
            >
              {highlight(episode.description, tokens)}
            </p>
          )}
        </div>
      </div>

      {isPreview && chapterList}

      {momentCount === 0 ? (
        <p className="mt-4 text-sm text-muted">
          {episode.clips > 0 ? "Not said out loud in this episode." : "No transcript for this episode yet."}{" "}
          <Link href={href} className="font-semibold text-accent hover:text-accent-hover">
            Open episode
          </Link>
        </p>
      ) : (
        <>
          {/* Timeline: the whole episode, with a tick wherever the phrase was said. */}
          <div className="mt-5">
            <div className="relative h-9" onMouseLeave={() => setHovered(null)}>
              <div
                className={`absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-light ${
                  moments || failed ? "" : "timeline-loading"
                }`}
              />
              {moments?.map((moment, i) => {
                const playing = playingId === moment.id;
                return (
                  <button
                    key={moment.id}
                    type="button"
                    onClick={() => playFromTimeline(moment, i)}
                    onMouseEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    aria-label={`Play from ${formatTimestamp(moment.seconds)}`}
                    className="timeline-tick group absolute top-0 flex h-full w-3.5 -translate-x-1/2 items-center justify-center"
                    style={{
                      left: `${(moment.seconds / duration) * 100}%`,
                      animationDelay: `${Math.min(i, 40) * 14}ms`,
                    }}
                  >
                    <span
                      className={`block w-[3px] rounded-full transition-all duration-150 group-hover:h-8 group-hover:bg-foreground group-focus-visible:h-8 ${
                        playing ? "h-8 bg-foreground" : "h-4 bg-brand"
                      }`}
                    />
                  </button>
                );
              })}
              {hoveredMoment && (
                <div
                  role="tooltip"
                  className="tooltip-enter pointer-events-none absolute bottom-full z-10 mb-1 hidden w-72 rounded-xl bg-foreground p-3 text-left text-background shadow-lg sm:block"
                  style={{
                    left: `${hoveredAt}%`,
                    transform: `translateX(${hoveredAt < 22 ? "-10%" : hoveredAt > 78 ? "-90%" : "-50%"})`,
                  }}
                >
                  <span className="font-mono text-[13px] text-brand">
                    {formatTimestamp(hoveredMoment.seconds)}
                  </span>
                  <span
                    className="tooltip-excerpt mt-1 line-clamp-3 block text-[13px] leading-snug"
                    dangerouslySetInnerHTML={{ __html: `…${hoveredMoment.excerpt}…` }}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-between font-mono text-[11px] text-muted">
              <span>0:00</span>
              <span>{formatTimestamp(duration)}</span>
            </div>
          </div>

          {isPreview ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold">
                <span className="font-mono text-accent">{momentCount.toLocaleString()}</span>{" "}
                {momentCount === 1 ? "moment mentions this" : "moments mention this"}
              </p>
              <Link href={href} className="text-sm font-semibold text-accent hover:text-accent-hover">
                Open episode →
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => (open ? setOpen(false) : expand())}
              aria-expanded={open}
              className="mt-3 flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
            >
              <span className="font-mono text-accent">{momentCount.toLocaleString()}</span>
              {momentCount === 1 ? "moment mentions this" : "moments mention this"}
              <svg
                className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
            inert={!open}
          >
            <div className="overflow-hidden">
              {everOpened && (
                <div className="pt-2">
                  {!isPreview && chapterList}
                  {!moments && !failed && <p className="py-3 text-sm text-muted">Finding the moments…</p>}
                  {failed && (
                    <p className="py-3 text-sm text-muted">
                      These moments couldn’t be loaded. Please try the search again.
                    </p>
                  )}
                  <ul>
                    {visible.map((moment, i) => (
                      <li
                        key={moment.id}
                        id={`moment-${moment.id}`}
                        className="moment-enter border-t border-border py-4"
                        style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
                      >
                        <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-5">
                          {playButton(moment.id, moment.seconds)}
                          <p
                            className="clip-excerpt min-w-0 flex-1 text-base leading-relaxed text-foreground"
                            dangerouslySetInnerHTML={{ __html: `“…${moment.excerpt}…”` }}
                          />
                        </div>
                        {playingId === moment.id && player(moment.seconds, formatTimestamp(moment.seconds))}
                      </li>
                    ))}
                  </ul>
                  {moments && !showAll && moments.length > FIRST_MOMENTS && (
                    <button
                      type="button"
                      onClick={() => setShowAll(true)}
                      className="mt-1 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
                    >
                      Show all {moments.length} moments
                    </button>
                  )}
                  {moments && showAll && momentCount > MAX_MOMENTS && (
                    <p className="mt-1 text-sm text-muted">
                      Showing the {MAX_MOMENTS} strongest matches.{" "}
                      <Link href={href} className="font-semibold text-accent hover:text-accent-hover">
                        Open episode
                      </Link>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </Root>
  );
}
