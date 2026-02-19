import matter from "gray-matter"
import { join } from "path"
import type {
  YouTubeVideo,
  SyncConfig,
  EpisodeFrontmatter,
  GenerationResult,
} from "../types/youtube-sync.js"
import { parseGuests } from "./guest-parser.js"
import { convertDescriptionToMarkdown } from "./markdown-converter.js"
import { formatDuration } from "./duration-formatter.js"
import { generateFileName } from "./filename-generator.js"
import { generateYouTubeEmbed } from "./embed-generator.js"

/** Unicode codepoint for the 📱 mobile phone emoji */
const MOBILE_EMOJI = "\u{1F4F1}"

/**
 * Check whether a video title indicates a mobile/short variant.
 * Mobile variants contain the 📱 emoji in their title.
 */
export function isMobileVariant(title: string): boolean {
  return title.includes(MOBILE_EMOJI)
}

/**
 * Strip the 📱 emoji (and surrounding whitespace) from a title to produce
 * the base title that should match the main episode.
 */
export function getMobileBaseTitle(title: string): string {
  return title.replace(MOBILE_EMOJI, "").replace(/\s+/g, " ").trim()
}

/**
 * Generate complete episode markdown file from YouTube video
 *
 * Creates markdown file with YAML frontmatter and formatted body content.
 * Includes video embed, guest information, and processed description.
 *
 * @param video - YouTube video data
 * @param episodeNumber - Sequential episode number
 * @param config - Sync configuration
 * @param options - Optional generation flags
 * @param options.isMobile - If true, treats this as a mobile variant
 * @returns Generation result with file path and content
 */
export async function generateEpisodeFile(
  video: YouTubeVideo,
  episodeNumber: number,
  config: SyncConfig,
  options?: { isMobile?: boolean },
): Promise<GenerationResult> {
  const isMobile = options?.isMobile ?? false

  // For mobile variants: clean the title (strip 📱, append ' - Mobile')
  const displayTitle = isMobile
    ? `${getMobileBaseTitle(video.title)} - Mobile`
    : video.title

  // For filename generation, use the base title (without ' - Mobile' suffix)
  // so the slug matches the main episode
  const filenameTitle = isMobile ? getMobileBaseTitle(video.title) : video.title

  // Generate filename
  const filename = generateFileName(episodeNumber, filenameTitle, { isMobile })
  const filePath = join(process.cwd(), config.outputDirectory, filename)

  // Parse guests from description
  const guests = parseGuests(video.description)

  // Convert description to markdown
  const markdownDescription = convertDescriptionToMarkdown(video.description, video.videoId, {
    truncateDescriptionAt: config.truncateDescriptionAt,
  })

  // Format duration
  const formattedDuration = formatDuration(video.duration)

  // Format date as YYYY-MM-DD
  const date = new Date(video.publishedAt).toISOString().split("T")[0]

  // Build frontmatter (NO description, NO undefined values)
  const frontmatter: Record<string, any> = {
    title: displayTitle,
    date,
    draft: isMobile ? true : !config.autoPublish,
    episodeNumber,
    youtubeId: video.videoId,
    thumbnail: video.thumbnailUrl,
    duration: formattedDuration,
    syncedAt: new Date().toISOString(),
    status: "available",
  }

  // Only add optional fields if they have values
  if (guests.length > 0) {
    frontmatter.guests = guests
  }
  if (video.tags && video.tags.length > 0) {
    frontmatter.tags = video.tags
  }

  // Build markdown body - Video embed first, then description, then guests
  let body = ""

  // Add video embed if enabled (FIRST)
  if (config.includeVideoEmbed) {
    body += "## Watch Episode\n\n"
    body += generateYouTubeEmbed(video.videoId)
    body += "\n\n"
  }

  // Add episode description (SECOND)
  body += "## Episode Description\n\n"
  body += markdownDescription
  body += "\n\n"

  // Add guest section if guests present (THIRD)
  if (guests.length > 0) {
    body += "## Guests\n\n"
    for (const guest of guests) {
      if (guest.twitter) {
        body += `- **${guest.name}** ([@${guest.twitter}](https://twitter.com/${guest.twitter}))\n`
      } else {
        body += `- **${guest.name}**\n`
      }
    }
    body += "\n"
  }

  // Serialize frontmatter + body to markdown
  const content = matter.stringify(body, frontmatter)

  return {
    filePath,
    content,
  }
}
