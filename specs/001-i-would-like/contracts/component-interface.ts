/**
 * Component Interface Contracts
 *
 * Defines the expected interfaces for the LandingPage component
 * and its sub-components, following Quartz component patterns.
 */

import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../../../quartz/components/types"
import { EpisodeCard, LandingPageFrontmatter, NavLink, SocialLink } from "./types"

/**
 * LandingPage Component Props
 *
 * Extends standard QuartzComponentProps with landing page-specific data.
 */
export interface LandingPageProps extends QuartzComponentProps {
  /** Landing page configuration from index.md frontmatter */
  config: LandingPageFrontmatter

  /** Latest 5 episodes for display */
  episodes: EpisodeCard[]

  /** Social media links derived from config */
  socialLinks: SocialLink[]

  /** Navigation links to main sections */
  navLinks: NavLink[]
}

/**
 * LandingPage Component Constructor
 *
 * Main landing page component signature.
 * Follows Quartz QuartzComponentConstructor pattern.
 */
export interface LandingPageComponent extends QuartzComponent {
  /**
   * Render the landing page
   * @param props - LandingPageProps with config and episode data
   * @returns JSX.Element representing the landing page
   */
  (props: LandingPageProps): JSX.Element
}

/**
 * Hero Section Component Props
 */
export interface HeroProps {
  /** Podcast title */
  title: string

  /** Tagline/subtitle */
  tagline: string

  /** Latest episode for featured player */
  latestEpisode?: EpisodeCard

  /** Discord CTA URL */
  discordUrl: string
}

/**
 * Hero Section Component
 *
 * Renders the hero section with title, tagline, player, and CTA.
 */
export type HeroComponent = (props: HeroProps) => JSX.Element

/**
 * Episode Grid Component Props
 */
export interface EpisodeGridProps {
  /** Array of episodes to display (max 5) */
  episodes: EpisodeCard[]

  /** URL to full episode archive */
  archiveUrl: string
}

/**
 * Episode Grid Component
 *
 * Renders a responsive grid of episode cards.
 */
export type EpisodeGridComponent = (props: EpisodeGridProps) => JSX.Element

/**
 * Episode Card Component Props
 */
export interface EpisodeCardProps {
  /** Episode data to display */
  episode: EpisodeCard
}

/**
 * Episode Card Component
 *
 * Renders a single episode card with thumbnail, metadata, and link.
 */
export type EpisodeCardComponent = (props: EpisodeCardProps) => JSX.Element

/**
 * Audio Player Component Props
 */
export interface AudioPlayerProps {
  /** Episode title for ARIA label */
  episodeTitle: string

  /** Audio file URL */
  audioUrl: string
}

/**
 * Audio Player Component
 *
 * Renders HTML5 audio player for episode.
 */
export type AudioPlayerComponent = (props: AudioPlayerProps) => JSX.Element

/**
 * Social Links Component Props
 */
export interface SocialLinksProps {
  /** Array of social media links */
  links: SocialLink[]
}

/**
 * Social Links Component
 *
 * Renders social media icons with links.
 */
export type SocialLinksComponent = (props: SocialLinksProps) => JSX.Element

/**
 * Navigation Component Props
 */
export interface NavigationProps {
  /** Array of navigation links */
  links: NavLink[]

  /** Current page slug (for active state) */
  currentSlug?: string
}

/**
 * Navigation Component
 *
 * Renders navigation menu (desktop and mobile).
 */
export type NavigationComponent = (props: NavigationProps) => JSX.Element

/**
 * Expected Component Exports
 *
 * The LandingPage.tsx file should export these items:
 */
export interface LandingPageExports {
  /** Main component constructor (default export) */
  default: QuartzComponentConstructor

  /** Named export for direct component access */
  LandingPage: LandingPageComponent
}

/**
 * Utility function contracts
 */

/**
 * Get latest episodes from all files
 *
 * @param allFiles - All content files from Quartz
 * @param limit - Maximum number of episodes to return (default 5)
 * @returns Array of EpisodeCard objects, sorted by date descending
 */
export type GetLatestEpisodes = (
  allFiles: QuartzComponentProps["allFiles"],
  limit?: number
) => EpisodeCard[]

/**
 * Parse landing page config from frontmatter
 *
 * @param frontmatter - Frontmatter object from index.md
 * @returns LandingPageFrontmatter with defaults applied
 */
export type ParseLandingConfig = (
  frontmatter: Record<string, any> | undefined
) => LandingPageFrontmatter

/**
 * Build social links array from config
 *
 * @param config - Landing page configuration
 * @returns Array of SocialLink objects (excludes empty URLs)
 */
export type BuildSocialLinks = (config: LandingPageFrontmatter) => SocialLink[]

/**
 * Build navigation links from config
 *
 * @param config - Landing page configuration
 * @returns Array of NavLink objects
 */
export type BuildNavLinks = (config: LandingPageFrontmatter) => NavLink[]
