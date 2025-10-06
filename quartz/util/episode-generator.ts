import matter from 'gray-matter'
import { join } from 'path'
import type { YouTubeVideo, SyncConfig, EpisodeFrontmatter, GenerationResult } from '../types/youtube-sync.js'
import { parseGuests } from './guest-parser.js'
import { convertDescriptionToMarkdown } from './markdown-converter.js'
import { formatDuration } from './duration-formatter.js'
import { generateFileName } from './filename-generator.js'
import { generateYouTubeEmbed } from './embed-generator.js'

/**
 * Generate complete episode markdown file from YouTube video
 *
 * Creates markdown file with YAML frontmatter and formatted body content.
 * Includes video embed, guest information, and processed description.
 *
 * @param video - YouTube video data
 * @param episodeNumber - Sequential episode number
 * @param config - Sync configuration
 * @returns Generation result with file path and content
 */
export async function generateEpisodeFile(
  video: YouTubeVideo,
  episodeNumber: number,
  config: SyncConfig
): Promise<GenerationResult> {
  // Generate filename
  const filename = generateFileName(episodeNumber, video.title)
  const filePath = join(process.cwd(), config.outputDirectory, filename)

  // Parse guests from description
  const guests = parseGuests(video.description)

  // Convert description to markdown
  const markdownDescription = convertDescriptionToMarkdown(
    video.description,
    video.videoId,
    { truncateDescriptionAt: config.truncateDescriptionAt }
  )

  // Format duration
  const formattedDuration = formatDuration(video.duration)

  // Format date as YYYY-MM-DD
  const date = new Date(video.publishedAt).toISOString().split('T')[0]

  // Build frontmatter
  const frontmatter: EpisodeFrontmatter = {
    title: video.title,
    date,
    draft: !config.autoPublish,
    episodeNumber,
    youtubeId: video.videoId,
    thumbnail: video.thumbnailUrl,
    duration: formattedDuration,
    description: markdownDescription,
    guests: guests.length > 0 ? guests : undefined,
    tags: video.tags && video.tags.length > 0 ? video.tags : undefined,
    syncedAt: new Date().toISOString(),
    status: 'available',
  }

  // Build markdown body
  let body = '## Episode Description\n\n'
  body += markdownDescription
  body += '\n\n'

  // Add video embed if enabled
  if (config.includeVideoEmbed) {
    body += '## Watch Episode\n\n'
    body += generateYouTubeEmbed(video.videoId)
    body += '\n\n'
  }

  // Add guest section if guests present
  if (guests.length > 0) {
    body += '## Guests\n\n'
    for (const guest of guests) {
      if (guest.twitter) {
        body += `- **${guest.name}** ([@${guest.twitter}](https://twitter.com/${guest.twitter}))\n`
      } else {
        body += `- **${guest.name}**\n`
      }
    }
    body += '\n'
  }

  // Serialize frontmatter + body to markdown
  const content = matter.stringify(body, frontmatter)

  return {
    filePath,
    content,
  }
}
