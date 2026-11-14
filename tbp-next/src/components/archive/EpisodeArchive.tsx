"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { EpisodeIndexEntry } from "@/lib/episode-index";

const EPISODES_PER_PAGE = 24;

interface EpisodeArchiveProps {
  episodes: EpisodeIndexEntry[];
  channels: string[];
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
  const totalSeconds = Math.round(duration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function EpisodeArchive({ episodes, channels }: EpisodeArchiveProps) {
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = episodes;
    if (channel !== "all") {
      result = result.filter((e) => e.channel === channel);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.guestNames?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [episodes, channel, search]);

  const totalPages = Math.ceil(filtered.length / EPISODES_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * EPISODES_PER_PAGE,
    page * EPISODES_PER_PAGE
  );

  return (
    <div>
      {/* Filters */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Search episodes..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-md border border-border bg-surface px-4 py-2.5 pl-10 text-sm text-foreground placeholder:text-muted focus:border-accent/50 focus:outline-none"
          />
        </div>
        {channels.length > 0 && (
          <select
            value={channel}
            onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:border-accent/50 focus:outline-none"
          >
            <option value="all">All Channels</option>
            {channels.map((ch) => (
              <option key={ch} value={ch}>{ch.toUpperCase()}</option>
            ))}
          </select>
        )}
      </div>

      <p className="mb-5 text-xs text-muted">
        {filtered.length} episode{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* List */}
      {paginated.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted">No episodes match your search.</p>
          <button
            onClick={() => { setSearch(""); setChannel("all"); setPage(1); }}
            className="mt-3 text-sm font-semibold text-accent hover:text-accent-hover"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((ep) => (
            <Link
              key={ep.slug}
              href={ep.slug}
              className="group flex items-center gap-4 rounded-md border border-border bg-surface/50 p-3 transition-all hover:border-accent/20 hover:bg-surface"
            >
              <img
                src={ep.thumbnail}
                alt=""
                loading="lazy"
                className="h-14 w-24 flex-shrink-0 rounded object-cover sm:h-16 sm:w-28"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                  {ep.title}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(ep.date)}
                  <span className="mx-1.5">&middot;</span>
                  {formatDuration(ep.duration)}
                  {ep.channel !== "root" && (
                    <>
                      <span className="mx-1.5">&middot;</span>
                      <span className="uppercase">{ep.channel}</span>
                    </>
                  )}
                </p>
              </div>
              <svg
                className="h-4 w-4 flex-shrink-0 text-muted group-hover:text-accent transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-muted disabled:opacity-25 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-muted disabled:opacity-25 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
