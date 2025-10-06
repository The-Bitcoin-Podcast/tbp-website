import { JSX } from "preact"
import { EpisodeCard as EpisodeCardType } from "./types/landingPage"
import { formatDate } from "./utils/landingPageUtils"

export interface EpisodeCardProps {
  episode: EpisodeCardType
}

export function EpisodeCard({ episode }: EpisodeCardProps): JSX.Element {
  const formattedDate = formatDate(episode.date)

  return (
    <article class="episode-card">
      <img src={episode.thumbnail} alt={episode.title} loading="lazy" />
      <div class="episode-meta">
        <h3>{episode.title}</h3>
        <time datetime={episode.date}>{formattedDate}</time>
        <span> • {episode.duration} min</span>
      </div>
      <p>{episode.description}</p>
      {episode.guestNames && (
        <p class="guests">With {episode.guestNames}</p>
      )}
      <a href={`/${episode.slug}`}>Listen →</a>
    </article>
  )
}
