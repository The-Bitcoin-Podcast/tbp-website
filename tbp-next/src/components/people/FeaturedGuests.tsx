"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getShowMeta } from "@/lib/show-meta";
import { Avatar } from "./Avatar";

export interface FeaturedQuote {
  subject: string;
  answer: string;
  words: number;
  episode: string;
  slug: string;
  start: number;
  end: number;
  audioUrl?: string;
}

export interface FeaturedGuest {
  name: string;
  slug: string;
  avatar: string;
  affiliation?: string;
  count: number;
  years?: string;
  /** Their answer to "describe it in ten words or less", when they gave one. */
  quote?: FeaturedQuote;
  latest?: { title: string; slug: string; show: string };
}

const VISIBLE = 9;
const SWAP_EVERY_MS = 2600;
const SWAP_OUT_MS = 260;
const WORD_STAGGER_MS = 85;
const WORD_DELAY_MS = 320;

function clipLength(q: FeaturedQuote) {
  const s = Math.max(1, Math.round(q.end - q.start));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Pick someone who isn't on screen. Guests with a quote come up three times as often. */
function pickHidden(pool: FeaturedGuest[], visible: string[]): FeaturedGuest | undefined {
  const hidden = pool.filter((g) => !visible.includes(g.slug));
  if (hidden.length === 0) return undefined;
  const weighted = hidden.flatMap((g) => (g.quote ? [g, g, g] : [g]));
  return weighted[Math.floor(Math.random() * weighted.length)];
}

/* ─── The quote, revealed a word at a time against a ten-word meter ────── */

function TenWordQuote({ quote }: { quote: FeaturedQuote }) {
  const text = quote.answer.charAt(0).toUpperCase() + quote.answer.slice(1);
  const words = text.split(/\s+/).filter(Boolean);
  const pips = Math.max(10, quote.words);
  const over = quote.words - 10;
  return (
    <>
      <p className="spot-rise font-mono text-[11px] uppercase tracking-[0.14em] text-accent" style={{ animationDelay: "180ms" }}>
        {quote.subject ? `${quote.subject} · in ten words` : "In ten words"}
      </p>
      <blockquote className="mt-2 font-display text-2xl font-extrabold leading-tight sm:text-[1.75rem]">
        <span aria-hidden="true" className="spot-pop mr-1 inline-block text-brand" style={{ animationDelay: "240ms" }}>
          &ldquo;
        </span>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {words.map((w, i) => (
            <span
              key={i}
              className="word-in inline-block whitespace-pre"
              style={{ animationDelay: `${WORD_DELAY_MS + i * WORD_STAGGER_MS}ms` }}
            >
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          ))}
        </span>
      </blockquote>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {Array.from({ length: pips }, (_, i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              {i < quote.words && (
                <span
                  className={`pip-fill block h-full w-full rounded-full ${i < 10 ? "bg-brand" : "bg-foreground"}`}
                  style={{ animationDelay: `${WORD_DELAY_MS + i * WORD_STAGGER_MS}ms` }}
                />
              )}
            </span>
          ))}
        </div>
        <span className="whitespace-nowrap font-mono text-[11px] text-muted">
          {over > 0 ? `${quote.words} words · ${over} over` : `${quote.words} of 10 words`}
        </span>
      </div>
    </>
  );
}

/* ─── Strip of faces + the spotlight that opens under it ───────────────── */

export function FeaturedGuests({ pool }: { pool: FeaturedGuest[] }) {
  // Server and first client render agree on the first nine; shuffling starts after mount.
  const [slots, setSlots] = useState<string[]>(() => pool.slice(0, VISIBLE).map((g) => g.slug));
  const [leaving, setLeaving] = useState<number | null>(null);
  const [intro, setIntro] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  /** Stays set while the panel closes, so its contents don't vanish mid-animation. */
  const [shown, setShown] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const bySlug = useRef(new Map(pool.map((g) => [g.slug, g])));
  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const pausedRef = useRef(false);
  const hoverRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const clipRef = useRef<FeaturedQuote | null>(null);

  pausedRef.current = selected !== null;

  /* Rotation: every few seconds one face bows out and another takes its place. */
  useEffect(() => {
    if (pool.length <= VISIBLE) return;
    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    const tick = setInterval(() => {
      if (pausedRef.current || hoverRef.current || document.hidden) return;
      const current = slotsRef.current;
      const next = pickHidden(pool, current);
      if (!next) return;
      const index = Math.floor(Math.random() * current.length);
      setIntro(false);
      setLeaving(index);
      swapTimer = setTimeout(() => {
        setSlots((s) => s.map((slug, i) => (i === index ? next.slug : slug)));
        setLeaving(null);
      }, SWAP_OUT_MS);
    }, SWAP_EVERY_MS);
    return () => {
      clearInterval(tick);
      clearTimeout(swapTimer);
    };
  }, [pool]);

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    clipRef.current = null;
    setPlaying(false);
    setProgress(0);
  }, []);

  useEffect(() => () => audioRef.current?.pause(), []);

  const select = useCallback(
    (slug: string | null) => {
      stopAudio();
      setSelected(slug);
      if (slug) setShown(slug);
    },
    [stopAudio],
  );

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, select]);

  const togglePlay = (quote: FeaturedQuote) => {
    if (playing) return stopAudio();
    if (!quote.audioUrl) return;
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audio.preload = "auto";
      audio.addEventListener("timeupdate", () => {
        const clip = clipRef.current;
        const a = audioRef.current;
        if (!clip || !a) return;
        setProgress(Math.min(1, Math.max(0, (a.currentTime - clip.start) / Math.max(1, clip.end - clip.start))));
        if (a.currentTime >= clip.end) stopAudio();
      });
      audio.addEventListener("ended", stopAudio);
      audio.addEventListener("error", stopAudio);
      audioRef.current = audio;
    }
    clipRef.current = quote;
    setPlaying(true);
    const a = audio;
    const seekAndPlay = () => {
      a.currentTime = quote.start;
      void a.play().catch(stopAudio);
    };
    if (a.src !== quote.audioUrl) {
      a.src = quote.audioUrl;
      a.addEventListener("loadedmetadata", seekAndPlay, { once: true });
      a.load();
    } else {
      seekAndPlay();
    }
  };

  const open = selected !== null;
  const guest = shown ? bySlug.current.get(shown) : undefined;
  const selectedIndex = selected ? slots.indexOf(selected) : -1;
  // Faces sit 32px apart (44px wide, 12px overlap); the notch tracks the chosen one.
  const notchOffset = selectedIndex >= 0 ? (selectedIndex - (slots.length - 1) / 2) * 32 : 0;

  return (
    <div className="mt-8">
      <div
        className="flex justify-center -space-x-3"
        onPointerEnter={() => (hoverRef.current = true)}
        onPointerLeave={() => (hoverRef.current = false)}
        onFocus={() => (hoverRef.current = true)}
        onBlur={() => (hoverRef.current = false)}
      >
        {slots.map((slug, i) => {
          const g = bySlug.current.get(slug);
          if (!g) return null;
          const isSelected = slug === selected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => select(isSelected ? null : slug)}
              aria-expanded={isSelected}
              aria-controls="guest-spotlight"
              aria-label={g.quote ? `${g.name}: hear their answer in ten words` : `${g.name}: about this guest`}
              title={g.name}
              className={`group relative rounded-full transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1.4)] hover:z-10 focus-visible:z-10 ${
                isSelected
                  ? "z-10 -translate-y-2 scale-125"
                  : open
                    ? "scale-95 opacity-60 saturate-50 hover:-translate-y-1 hover:scale-105 hover:opacity-100 hover:saturate-100"
                    : "hover:-translate-y-1.5 hover:scale-110"
              }`}
            >
              {isSelected && (
                <>
                  <span className="spot-ring absolute inset-0 rounded-full border-2 border-brand" />
                  <span className="spot-ring absolute inset-0 rounded-full border-2 border-brand" style={{ animationDelay: "0.7s" }} />
                </>
              )}
              <span
                key={slug}
                className={`relative block ${leaving === i ? "face-out" : "face-in"}`}
                style={intro ? { animationDelay: `${i * 55}ms` } : undefined}
              >
                <Avatar
                  name={g.name}
                  src={g.avatar}
                  size={44}
                  className={`ring-4 transition-shadow duration-300 ${isSelected ? "ring-brand" : "ring-background"}`}
                />
                {g.quote && !isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand font-display text-[13px] font-extrabold leading-none text-black ring-2 ring-background"
                  >
                    <span className="translate-y-[2px]">&rdquo;</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p
        className={`mt-3 font-mono text-[11px] text-muted transition-opacity duration-300 ${open ? "opacity-0" : "opacity-100"}`}
        aria-hidden={open}
      >
        Tap a face to hear them out
      </p>

      <div
        id="guest-spotlight"
        role="region"
        aria-live="polite"
        aria-label="Featured guest"
        className={`-mt-6 grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden" inert={!open}>
          <div className="relative mx-auto max-w-xl px-1 pb-6 pt-4">
            {/* Orange pointer back at the chosen face; the card covers its lower half */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-[5px] h-4 w-4 rounded-[3px] bg-brand transition-transform duration-500 ease-[cubic-bezier(0.2,0.9,0.3,1.2)]"
              style={{ transform: `translateX(calc(-50% + ${notchOffset}px)) rotate(45deg)` }}
            />
            {guest && (
              <div
                key={guest.slug}
                className="spot-card relative overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left shadow-xl shadow-brand/10 sm:p-6"
              >
                <button
                  type="button"
                  onClick={() => select(null)}
                  aria-label="Close"
                  className="absolute right-3 top-3 rounded-full p-1.5 text-muted transition-colors hover:bg-surface-light hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>

                <div className="spot-rise flex items-center gap-3.5 pr-8">
                  <span className="spot-pop inline-block" style={{ animationDelay: "60ms" }}>
                    <Avatar name={guest.name} src={guest.avatar} size={56} className="ring-2 ring-brand-tint" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-bold leading-tight">{guest.name}</p>
                    {guest.affiliation && <p className="truncate text-sm text-muted">{guest.affiliation}</p>}
                    <p className="mt-0.5 font-mono text-[11px] text-muted">
                      {guest.count} episode{guest.count === 1 ? "" : "s"}
                      {guest.years && ` · ${guest.years}`}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  {guest.quote ? (
                    <TenWordQuote quote={guest.quote} />
                  ) : (
                    guest.latest && (
                      <div className="spot-rise" style={{ animationDelay: "180ms" }}>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
                          Latest on {getShowMeta(guest.latest.show).name}
                        </p>
                        <Link
                          href={`/episodes/${guest.latest.slug}`}
                          className="mt-2 block font-display text-xl font-extrabold leading-snug hover:text-accent"
                        >
                          {guest.latest.title}
                        </Link>
                      </div>
                    )
                  )}
                </div>

                <div className="spot-rise mt-5 flex flex-wrap items-center gap-x-4 gap-y-2" style={{ animationDelay: "420ms" }}>
                  {guest.quote?.audioUrl && (
                    <button
                      type="button"
                      onClick={() => togglePlay(guest.quote!)}
                      className="flex items-center gap-2 rounded-full bg-brand py-2 pl-3 pr-4 text-sm font-semibold text-black transition-all hover:bg-brand-hover active:scale-95"
                    >
                      {playing ? (
                        <span className="flex h-4 w-4 items-end justify-center gap-[2px]" aria-hidden="true">
                          {[0, 1, 2].map((b) => (
                            <span key={b} className="eq-bar w-[3px] rounded-sm bg-black" style={{ animationDelay: `${b * 0.15}s` }} />
                          ))}
                        </span>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                          <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                        </svg>
                      )}
                      {playing ? "Stop" : `Hear it · ${clipLength(guest.quote)}`}
                    </button>
                  )}
                  {guest.quote && (
                    <Link
                      href={`/episodes/${guest.quote.slug}?t=${Math.floor(guest.quote.start)}`}
                      className="min-w-0 max-w-[14rem] truncate text-sm text-muted hover:text-accent"
                      title={guest.quote.episode}
                    >
                      from {guest.quote.episode}
                    </Link>
                  )}
                  <Link
                    href={`/people/${encodeURIComponent(guest.slug)}`}
                    className="ml-auto whitespace-nowrap text-sm font-semibold text-accent hover:text-accent-hover"
                  >
                    Full profile →
                  </Link>
                </div>

                {/* Clip progress along the bottom edge */}
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-brand transition-transform duration-200 ease-linear"
                  style={{ transform: `scaleX(${playing ? progress : 0})` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
