import { JSX } from "preact"
import { EpisodeCard } from "./types/landingPage"

export interface HeroProps {
  title: string
  tagline: string
  latestEpisode?: EpisodeCard
  discordUrl: string
}

export function Hero({ title, tagline, latestEpisode, discordUrl }: HeroProps): JSX.Element {
  return (
    <section class="hero">
      <h1>{title}</h1>
      <p class="tagline">{tagline}</p>
      {latestEpisode && (
        <audio
          controls
          preload="metadata"
          aria-label={`Play ${latestEpisode.title}`}
        >
          <source src={latestEpisode.audioUrl} type="audio/mpeg" />
          Your browser does not support the audio element.
        </audio>
      )}
      <a
        href={discordUrl}
        class="cta-button"
        aria-label="Join our Discord community"
      >
        Join Discord
      </a>
    </section>
  )
}
