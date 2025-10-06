import { JSX } from "preact"
import { EpisodeCard as EpisodeCardType } from "./types/landingPage"
import { EpisodeCard } from "./EpisodeCard"

export interface EpisodeGridProps {
  episodes: EpisodeCardType[]
  archiveUrl: string
}

export function EpisodeGrid({ episodes, archiveUrl }: EpisodeGridProps): JSX.Element {
  return (
    <section class="episode-section">
      <h2>Recent Episodes</h2>
      <div class="episode-grid">
        {episodes.map((ep) => (
          <EpisodeCard key={ep.slug} episode={ep} />
        ))}
      </div>
      {episodes.length > 0 && (
        <a href={archiveUrl} class="episodes-archive-link">
          View All Episodes →
        </a>
      )}
    </section>
  )
}
