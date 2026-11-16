import type { Metadata } from "next";
import { buildEpisodeIndex, buildShowSummaries } from "@/lib/episode-index";
import { EpisodeArchive } from "@/components/archive/EpisodeArchive";

export const metadata: Metadata = {
  title: "Episodes",
  description: "Browse every show and episode on The Bitcoin Podcast Network",
};

export default function EpisodesPage() {
  const episodes = buildEpisodeIndex();
  const shows = buildShowSummaries(episodes);

  return (
    <div className="mx-auto max-w-[1160px] px-6 py-12 sm:px-8 sm:py-16">
      <EpisodeArchive episodes={episodes} shows={shows} />
    </div>
  );
}
