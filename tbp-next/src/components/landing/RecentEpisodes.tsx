import Link from "next/link";
import type { EpisodeCard } from "@/lib/types";
import { formatDuration } from "@/lib/content";

interface RecentEpisodesProps {
  episodes: EpisodeCard[];
  totalEpisodes: number;
}

function shortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function RecentEpisodes({ episodes, totalEpisodes }: RecentEpisodesProps) {
  if (episodes.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1160px] px-6 py-16 sm:px-8 sm:py-[72px]">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-3xl font-extrabold">Recent episodes</h2>
        <Link
          href="/episodes"
          className="text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          All {totalEpisodes.toLocaleString()} episodes
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {episodes.map((episode) => {
          const meta = [shortDate(episode.date), formatDuration(episode.duration)]
            .filter(Boolean)
            .join(" · ");
          return (
            <Link
              key={episode.slug}
              href={episode.slug}
              className="card flex min-h-[150px] flex-col justify-between gap-7 p-6"
            >
              <span className="font-display text-xl font-bold leading-tight">{episode.title}</span>
              <span className="text-[13px] text-muted">{meta}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
