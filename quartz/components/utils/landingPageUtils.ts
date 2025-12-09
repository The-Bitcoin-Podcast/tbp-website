/**
 * Utility functions for Landing Page component
 */

import { QuartzPluginData } from "../../plugins/vfile"
import { GlobalConfiguration } from "../../cfg"
import {
  EpisodeCard,
  EpisodeFrontmatter,
  Guest,
  LandingPageFrontmatter,
  NavLink,
  SocialLink,
} from "../types/landingPage"

/**
 * Extract the base path from the baseUrl configuration
 * e.g., "example.com/subpath" -> "/subpath"
 */
export function getBasePath(cfg: GlobalConfiguration): string {
  if (!cfg.baseUrl) return ""

  try {
    const url = new URL(`https://${cfg.baseUrl}`)
    return url.pathname === "/" ? "" : url.pathname
  } catch {
    return ""
  }
}

/**
 * Prepend base path to a URL if it's a relative path
 */
export function prependBasePath(url: string, basePath: string): string {
  // Don't modify external URLs or anchor-only links
  if (!url || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("#")) {
    return url
  }

  // If basePath is empty or url already starts with basePath, return as-is
  if (!basePath || url.startsWith(basePath)) {
    return url
  }

  // Prepend basePath to relative URLs
  return `${basePath}${url}`
}

/**
 * Get latest episodes from all files
 *
 * Filters, validates, sorts, and returns the latest N episodes
 */
export function getLatestEpisodes(
  allFiles: QuartzPluginData[],
  limit: number = 5,
  cfg?: GlobalConfiguration,
): EpisodeCard[] {
  const basePath = cfg ? getBasePath(cfg) : ""
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
        slug: prependBasePath(`/${file.slug!}`, basePath),
        description: fm.description,
        thumbnail: fm.thumbnail,
        audioUrl: fm.audioUrl,
        youtubeId: fm.youtubeId,
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
 * Filters out empty URLs and prepends base path to internal URLs
 */
export function buildSocialLinks(
  config: LandingPageFrontmatter,
  cfg: GlobalConfiguration,
): SocialLink[] {
  const basePath = getBasePath(cfg)

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
      url: prependBasePath(config.rssUrl, basePath),
      ariaLabel: "Subscribe via RSS feed",
    },
  ]

  // Filter out placeholder URLs
  return links.filter((link) => link.url && link.url !== "#")
}

/**
 * Build navigation links from config with base path prepended
 */
export function buildNavLinks(config: LandingPageFrontmatter, cfg: GlobalConfiguration): NavLink[] {
  const basePath = getBasePath(cfg)

  return [
    {
      label: "Episodes",
      url: prependBasePath(config.episodesArchiveUrl, basePath),
    },
    {
      label: "About",
      url: prependBasePath(config.aboutUrl, basePath),
    },
    {
      label: "Sponsors",
      url: prependBasePath(config.sponsorsUrl, basePath),
    },
    {
      label: "Contact",
      url: prependBasePath(config.contactUrl, basePath),
    },
    {
      label: "Guests",
      url: prependBasePath(config.guestsUrl, basePath),
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
