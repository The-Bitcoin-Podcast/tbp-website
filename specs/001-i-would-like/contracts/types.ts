/**
 * Type Contracts for Podcast Landing Page
 *
 * These TypeScript interfaces define the data contracts for the landing page feature.
 * All types extend or integrate with Quartz's built-in types.
 */

import { QuartzPluginData } from "../../../quartz/plugins/vfile"

/**
 * Episode frontmatter schema
 *
 * Represents metadata for a podcast episode stored in markdown frontmatter.
 * Episodes are stored in content/episodes/*.md files.
 */
export interface EpisodeFrontmatter extends QuartzPluginData {
  /** Episode title (max 150 chars recommended for display) */
  title: string

  /** Publication date in ISO 8601 format (YYYY-MM-DD) */
  date: string

  /** Sequential episode number (positive integer) */
  episodeNumber: number

  /** Duration in minutes (positive integer) */
  duration: number

  /** Direct URL or path to audio file (MP3/M4A) */
  audioUrl: string

  /** Brief description (2-3 sentences, max 300 chars) */
  description: string

  /** URL or path to episode cover art (16:9 or 1:1 aspect ratio) */
  thumbnail: string

  /** Optional array of guest information */
  guests?: Guest[]

  /** Optional topic tags */
  tags?: string[]

  /** If true, episode is excluded from published list */
  draft?: boolean
}

/**
 * Guest information (embedded in Episode)
 *
 * Represents a podcast guest with social media links.
 */
export interface Guest {
  /** Guest full name */
  name: string

  /** Optional Twitter handle (with @) or profile URL */
  twitter?: string

  /** Optional LinkedIn profile URL */
  linkedin?: string
}

/**
 * Landing page configuration frontmatter
 *
 * Stored in content/index.md frontmatter.
 * Defines hero section content and navigation links.
 */
export interface LandingPageFrontmatter extends QuartzPluginData {
  /** Podcast/site title displayed in hero */
  title: string

  /** Hero tagline/subtitle */
  tagline: string

  /** Discord community invite URL */
  discordUrl: string

  /** Twitter profile URL */
  twitterUrl: string

  /** YouTube channel URL */
  youtubeUrl: string

  /** RSS feed URL */
  rssUrl: string

  /** Path to about page */
  aboutUrl: string

  /** Path to sponsors page */
  sponsorsUrl: string

  /** Path to contact page */
  contactUrl: string

  /** Path to guests page */
  guestsUrl: string

  /** Path to full episode archive */
  episodesArchiveUrl: string
}

/**
 * Social media link (runtime representation)
 *
 * Derived from LandingPageFrontmatter at render time.
 */
export interface SocialLink {
  /** Platform identifier */
  platform: 'discord' | 'twitter' | 'youtube' | 'rss'

  /** Platform URL */
  url: string

  /** Accessibility label for screen readers */
  ariaLabel: string
}

/**
 * Episode card display data (runtime representation)
 *
 * Simplified episode data for card rendering on landing page.
 * Derived from EpisodeFrontmatter.
 */
export interface EpisodeCard {
  /** Episode title */
  title: string

  /** Publication date (formatted for display) */
  date: string

  /** Duration in minutes */
  duration: number

  /** Episode slug/URL */
  slug: string

  /** Brief description */
  description: string

  /** Thumbnail image URL/path */
  thumbnail: string

  /** Comma-separated guest names (if any) */
  guestNames?: string
}

/**
 * Navigation link (runtime representation)
 *
 * Represents a navigation menu item.
 */
export interface NavLink {
  /** Link label */
  label: string

  /** Link destination URL/path */
  url: string

  /** Optional icon identifier */
  icon?: string
}
