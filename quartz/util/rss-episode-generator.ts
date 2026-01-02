/**
 * RSS Episode Generator Implementation
 * Generates markdown files for RSS podcast episodes with proper folder structure
 */

import matter from "gray-matter"
import { join } from "path"
import type {
  RSSEpisodeGeneratorContract,
  RSSEpisodeData,
  GenerationConfig,
  GenerationResult,
  RSSEpisodeFrontmatter,
} from "../types/rss-sync.js"
import { GenerationError } from "../types/rss-sync.js"
import { formatDuration } from "./duration-formatter.js"
import { generateEpisodeFilePath } from "./rss.js"

/**
 * RSS Episode Generator implementation
 */
export class RSSEpisodeGenerator implements RSSEpisodeGeneratorContract {
  async generateEpisodeFile(
    episode: RSSEpisodeData,
    episodeNumber: number,
    config: GenerationConfig,
  ): Promise<GenerationResult> {
    try {
      // Generate filename using the same logic as YouTube episodes
      const filename = this.generateFilename(episode, episodeNumber, config.fileNamePattern)

      // Generate proper file path including podcast folder
      const filePath = generateEpisodeFilePath(
        config.outputDirectory,
        config.podcastFolder,
        filename,
      )

      // Generate frontmatter
      const frontmatter = this.generateFrontmatter(episode, episodeNumber, config)

      // Build content sections
      const contentSections: string[] = []

      // Episode description
      if (config.includeDescription && episode.description?.trim()) {
        contentSections.push("## Episode Description")
        contentSections.push("")

        let description = episode.description
        if (config.truncateDescriptionAt && description.length > config.truncateDescriptionAt) {
          description = description.substring(0, config.truncateDescriptionAt).trim()
          // Find the last complete sentence
          const lastSentence = description.lastIndexOf(".")
          if (lastSentence > description.length * 0.8) {
            description = description.substring(0, lastSentence + 1)
          }
          description += "..."
        }

        contentSections.push(description)
        contentSections.push("")
      }

      // Audio player section
      if (config.includeAudioEmbed && episode.enclosureUrl) {
        contentSections.push("## Listen to Episode")
        contentSections.push("")
        contentSections.push('<audio controls style="width: 100%;">')
        contentSections.push(
          `  <source src="${episode.enclosureUrl}" type="${episode.enclosureType}">`,
        )
        contentSections.push("  Your browser does not support the audio element.")
        contentSections.push("</audio>")
        contentSections.push("")
      }

      // Podcast platform links section
      contentSections.push("## Listen on Other Platforms")
      contentSections.push("")
      contentSections.push("- [Spotify](https://open.spotify.com/show/3WkYBYaZ4W1Z8gzBlOvr7y)")
      contentSections.push(
        "- [Apple Podcasts](https://podcasts.apple.com/us/podcast/hashing-it-out/id1631179152)",
      )
      contentSections.push("- [RSS Feed](https://anchor.fm/s/f8e7252c/podcast/rss)")
      contentSections.push("")

      // Build full content
      const frontmatterYaml = matter.stringify("", frontmatter).trim()
      const bodyContent = contentSections.join("\n")
      const content = frontmatterYaml + "\n" + bodyContent

      return {
        filePath,
        content,
        frontmatter,
        filename,
      }
    } catch (error) {
      throw new GenerationError(
        `Failed to generate episode file: ${error instanceof Error ? error.message : String(error)}`,
        episode,
        "generateEpisodeFile",
      )
    }
  }

  generateFrontmatter(
    episode: RSSEpisodeData,
    episodeNumber: number,
    config: GenerationConfig,
  ): RSSEpisodeFrontmatter {
    const warnings: string[] = []
    let hasPlaceholders = false

    // Handle missing title
    let title = episode.title?.trim()
    if (!title) {
      title = `Episode ${episodeNumber}`
      warnings.push("Missing episode title - using placeholder")
      hasPlaceholders = true
    }

    // Handle missing description
    let description = episode.description?.trim()
    if (!description) {
      description = `Episode ${episodeNumber} of ${config.podcastName}`
      warnings.push("Missing episode description - using placeholder")
      hasPlaceholders = true
    }

    // Format date
    const date = episode.pubDate.toISOString().split("T")[0]

    // Format duration (episode.duration is in seconds)
    const duration = episode.duration ? this.formatDurationFromSeconds(episode.duration) : "0:00"

    // Determine status
    const status = episode.enclosureUrl ? "available" : "unavailable"
    if (!episode.enclosureUrl) {
      warnings.push("Missing audio URL - episode marked as unavailable")
    }

    const frontmatter: any = {
      title,
      date,
      draft: !config.autoPublish,
      episodeNumber,
      rssGuid: episode.guid,
      audioUrl: episode.enclosureUrl || "",
      duration,
      description: description.substring(0, config.truncateDescriptionAt),
      explicit: episode.explicit,
      syncedAt: new Date().toISOString(),
      status,
      hasPlaceholders,
    }

    // Only add optional fields if they have values
    if (episode.author?.trim()) {
      frontmatter.author = episode.author.trim()
    }

    if (episode.image?.trim()) {
      frontmatter.thumbnail = episode.image.trim()
    }

    if (warnings.length > 0) {
      frontmatter.warnings = warnings
    }

    return frontmatter
  }

  generateFilename(episode: RSSEpisodeData, episodeNumber: number, pattern: string): string {
    // Create URL-safe slug from title
    const slug = this.createSlug(episode.title, episodeNumber)

    // Zero-pad episode number
    const paddedNumber = episodeNumber.toString().padStart(3, "0")

    // Replace pattern variables
    const filename = pattern.replace("{number}", paddedNumber).replace("{slug}", slug)

    // Ensure .md extension
    return filename.endsWith(".md") ? filename : filename + ".md"
  }

  private createSlug(title: string, episodeNumber: number): string {
    if (!title?.trim()) {
      return `episode-${episodeNumber}`
    }

    // Clean and convert title to URL-safe slug
    let slug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters except spaces and hyphens
      .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/-+/g, "-") // Collapse multiple hyphens
      .replace(/^-|-$/g, "") // Remove leading/trailing hyphens

    // Limit length to reasonable filename size
    if (slug.length > 50) {
      slug = slug.substring(0, 50).replace(/-[^-]*$/, "") // Cut at word boundary
    }

    // Ensure we have something
    if (!slug) {
      slug = `episode-${episodeNumber}`
    }

    return slug
  }

  private formatDurationFromSeconds(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
    }
  }
}

/**
 * Create RSS episode generator instance
 */
export function createRSSEpisodeGenerator(): RSSEpisodeGeneratorContract {
  return new RSSEpisodeGenerator()
}
