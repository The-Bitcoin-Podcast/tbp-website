import { QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { Hero } from "../LandingPageHero"
import { EpisodeGrid } from "../EpisodeGrid"
import { SocialLinks } from "../SocialLinks"
import { Navigation } from "../LandingPageNav"
import {
  getLatestEpisodes,
  parseLandingConfig,
  buildSocialLinks,
  buildNavLinks,
} from "../utils/landingPageUtils"
import style from "../styles/landingPage.scss"

export default (() => {
  function LandingPage({ fileData, allFiles }: QuartzComponentProps) {
    // Parse configuration from frontmatter
    const config = parseLandingConfig(fileData.frontmatter)

    // Get latest episodes
    const episodes = getLatestEpisodes(allFiles, 5)

    // Build social and navigation links
    const socialLinks = buildSocialLinks(config)
    const navLinks = buildNavLinks(config)

    // Get the latest episode for the hero player
    const latestEpisode = episodes[0]

    return (
      <div class="landing-page">
        <Navigation links={navLinks} currentSlug="/" />
        <Hero
          title={config.title}
          tagline={config.tagline}
          latestEpisode={latestEpisode}
          discordUrl={config.discordUrl}
        />
        <EpisodeGrid episodes={episodes} archiveUrl={config.episodesArchiveUrl} />
        <SocialLinks links={socialLinks} />
      </div>
    )
  }

  LandingPage.css = style

  return LandingPage
}) satisfies QuartzComponentConstructor
