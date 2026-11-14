import type { Metadata } from "next";
import { buildEpisodeIndex } from "@/lib/episode-index";
import { getChannels } from "@/lib/content";
import { EpisodeArchive } from "@/components/archive/EpisodeArchive";

export const metadata: Metadata = {
  title: "Episodes",
  description: "Browse all episodes of The Bitcoin Podcast Network",
};

export default function EpisodesPage() {
  const episodes = buildEpisodeIndex();
  const channels = getChannels();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
          All Episodes
        </h1>
        <p className="mt-2 text-sm text-muted">
          {episodes.length} episodes across the Bitcoin Podcast Network
        </p>
      </div>
      <EpisodeArchive episodes={episodes} channels={channels} />
    </div>
  );
}
