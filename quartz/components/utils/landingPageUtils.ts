/**
 * Utility functions for Landing Page component
 */

import { QuartzPluginData } from "../../plugins/vfile"
import {
  EpisodeCard,
  EpisodeFrontmatter,
  Guest,
  LandingPageFrontmatter,
  NavLink,
  SocialLink,
} from "../types/landingPage"

/**
 * Get latest episodes from all files
 *
 * Filters, validates, sorts, and returns the latest N episodes
 */
export function getLatestEpisodes(
  allFiles: QuartzPluginData[],
  limit: number = 5,
): EpisodeCard[] {
  const episodes = allFiles
    // Filter for episode files
    .filter((file) => file.slug?.startsWith("episodes/"))
    // Filter out drafts
    .filter((file) => !file.frontmatter?.draft)
    // Validate required fields
    .filter((file) => {
      const fm = file.frontmatter as EpisodeFrontmatter | undefined
      return (
        fm?.title &&
        fm?.date &&
        fm?.episodeNumber !== undefined &&
        fm?.audioUrl &&
        fm?.description &&
        fm?.thumbnail &&
        fm?.duration !== undefined
      )
    })
    // Sort by date descending (newest first)
    .sort((a, b) => {
      const dateA = new Date(a.frontmatter!.date as string).getTime()
      const dateB = new Date(b.frontmatter!.date as string).getTime()
      return dateB - dateA
    })
    // Take first N episodes
    .slice(0, limit)
    // Map to EpisodeCard format
    .map((file) => {
      const fm = file.frontmatter as EpisodeFrontmatter
      const guests = fm.guests || []
      const guestNames = guests.map((g: Guest) => g.name).join(", ")

      return {
        title: fm.title,
        date: fm.date,
        duration: fm.duration,
        slug: file.slug!,
        description: fm.description,
        thumbnail: fm.thumbnail,
        audioUrl: fm.audioUrl,
        guestNames: guestNames || undefined,
      }
    })

  return episodes
}

/**
 * Parse landing page config from frontmatter
 *
 * Applies defaults for missing optional fields
 */
export function parseLandingConfig(
  frontmatter: Record<string, any> | undefined,
): LandingPageFrontmatter {
  return {
    title: frontmatter?.title || "Podcast Title",
    tagline: frontmatter?.tagline || "",
    discordUrl: frontmatter?.discordUrl || "#",
    twitterUrl: frontmatter?.twitterUrl || "#",
    youtubeUrl: frontmatter?.youtubeUrl || "#",
    rssUrl: frontmatter?.rssUrl || "/index.xml",
    aboutUrl: frontmatter?.aboutUrl || "/about",
    sponsorsUrl: frontmatter?.sponsorsUrl || "/sponsors",
    contactUrl: frontmatter?.contactUrl || "/contact",
    guestsUrl: frontmatter?.guestsUrl || "/guests",
    episodesArchiveUrl: frontmatter?.episodesArchiveUrl || "/episodes",
  }
}

/**
 * Build social links array from config
 *
 * Filters out empty URLs
 */
export function buildSocialLinks(config: LandingPageFrontmatter): SocialLink[] {
  const links: SocialLink[] = [
    {
      platform: "discord",
      url: config.discordUrl,
      ariaLabel: "Visit our Discord community",
    },
    {
      platform: "twitter",
      url: config.twitterUrl,
      ariaLabel: "Visit our Twitter profile",
    },
    {
      platform: "youtube",
      url: config.youtubeUrl,
      ariaLabel: "Visit our YouTube channel",
    },
    {
      platform: "rss",
      url: config.rssUrl,
      ariaLabel: "Subscribe via RSS feed",
    },
  ]

  // Filter out placeholder URLs
  return links.filter((link) => link.url && link.url !== "#")
}

/**
 * Build navigation links from config
 */
export function buildNavLinks(config: LandingPageFrontmatter): NavLink[] {
  return [
    {
      label: "About",
      url: config.aboutUrl,
    },
    {
      label: "Sponsors",
      url: config.sponsorsUrl,
    },
    {
      label: "Contact",
      url: config.contactUrl,
    },
    {
      label: "Guests",
      url: config.guestsUrl,
    },
  ]
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
