"use client";

import { useState } from "react";
import Link from "next/link";

interface LatestEpisodeProps {
  title: string;
  href: string;
  dateLabel: string;
  durationLabel: string;
  description?: string;
  thumbnail?: string;
  youtubeId?: string;
  audioUrl?: string;
}

function PlayIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function LatestEpisode({
  title,
  href,
  dateLabel,
  durationLabel,
  description,
  thumbnail,
  youtubeId,
  audioUrl,
}: LatestEpisodeProps) {
  const [playing, setPlaying] = useState(false);
  const playLabel = `Play episode${durationLabel ? ` · ${durationLabel}` : ""}`;

  return (
    <section className="bg-surface-light py-16 sm:py-[72px]">
      <div className="mx-auto flex max-w-[1160px] flex-col gap-10 px-6 sm:px-8 lg:flex-row lg:items-center lg:gap-12">
        <div className="min-w-0 lg:flex-[1.25]">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-foreground">
            {playing && youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1`}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <>
                {thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                )}
                {youtubeId && (
                  <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={`Play ${title}`}
                    className="group absolute inset-0 flex items-center justify-center"
                  >
                    <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand text-foreground transition-transform group-hover:scale-105">
                      <PlayIcon className="ml-1 h-7 w-7" />
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="min-w-0 lg:flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-accent">
            Latest episode{dateLabel ? ` · ${dateLabel}` : ""}
          </p>
          <h2 className="mt-3.5 font-display text-4xl font-extrabold leading-[1.05] sm:text-[46px]">
            {title}
          </h2>
          {description && (
            <p className="mt-3.5 text-[17px] leading-relaxed text-muted">{description}</p>
          )}

          {youtubeId ? (
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="inline-flex items-center gap-2.5 rounded-full bg-foreground px-[26px] py-[15px] text-base font-semibold text-background transition-opacity hover:opacity-85"
              >
                <PlayIcon className="h-4 w-4 text-brand" />
                {playLabel}
              </button>
              <Link
                href={href}
                className="text-sm font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                Episode page
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              {audioUrl && (
                <audio controls preload="metadata" className="w-full" aria-label={`Play ${title}`}>
                  <source src={audioUrl} type="audio/mpeg" />
                </audio>
              )}
              <Link
                href={href}
                className="mt-4 inline-block text-sm font-semibold text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                Episode page
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
