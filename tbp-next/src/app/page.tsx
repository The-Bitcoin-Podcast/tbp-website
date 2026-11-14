import {
  formatDate,
  formatDuration,
  getAllEpisodeFrontmatter,
  getLatestEpisodes,
} from "@/lib/content";
import { getSearchStats } from "@/lib/search-stats";
import { HeroSection } from "@/components/landing/HeroSection";
import { LatestEpisode } from "@/components/landing/LatestEpisode";
import { RecentEpisodes } from "@/components/landing/RecentEpisodes";
import { NewsletterSignup } from "@/components/shared/NewsletterSignup";

export default function HomePage() {
  const [latest, ...recent] = getLatestEpisodes(5);
  const totalEpisodes = getAllEpisodeFrontmatter().length;
  const stats = getSearchStats();

  const searchHint =
    stats.clips > 0
      ? `${stats.clips.toLocaleString()} searchable moments from ${stats.episodes.toLocaleString()} episodes${
          stats.episodes < totalEpisodes ? ", with the rest of the archive on the way" : ""
        }`
      : undefined;

  return (
    <>
      <HeroSection searchHint={searchHint} />
      {latest && (
        <LatestEpisode
          title={latest.title}
          href={latest.slug}
          dateLabel={formatDate(latest.date)}
          durationLabel={formatDuration(latest.duration)}
          description={latest.description}
          thumbnail={latest.thumbnail}
          youtubeId={latest.youtubeId}
          audioUrl={latest.audioUrl}
        />
      )}
      <RecentEpisodes episodes={recent} totalEpisodes={totalEpisodes} />
      <NewsletterSignup variant="band" />
    </>
  );
}
