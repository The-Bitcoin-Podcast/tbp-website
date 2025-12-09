import { SyncConfig } from './types/youtube-sync'

/**
 * YouTube Channel Sync Configuration Example
 *
 * Copy this file to sync-config.ts and customize for your needs.
 * Alternatively, pass configuration programmatically when calling the sync script.
 */

export const syncConfig: SyncConfig = {
  // ============================================================================
  // API Configuration
  // ============================================================================

  /**
   * YouTube Data API v3 Key
   * Get from: https://console.cloud.google.com/
   * IMPORTANT: Store in environment variable YOUTUBE_API_KEY, not here
   */
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',

  /**
   * YouTube Channel Identifier
   * Can be channel ID or @username format
   * Default: @thebtcpodcast
   */
  channelId: '@thebtcpodcast',

  // ============================================================================
  // Output Configuration
  // ============================================================================

  /**
   * Directory where episode markdown files will be created
   * Relative to project root
   * Default: content/episodes
   */
  outputDirectory: 'content/episodes',

  /**
   * File naming pattern
   * Variables: {number} = episode number, {slug} = slugified title
   * Default: {number}-{slug}.md
   */
  fileNamePattern: '{number}-{slug}.md',

  // ============================================================================
  // Behavior Configuration
  // ============================================================================

  /**
   * Auto-publish episodes (draft: false) or require manual approval (draft: true)
   * Default: false (episodes created with draft: true)
   */
  autoPublish: false,

  /**
   * Sync mode: full (all videos) or incremental (new videos since last sync)
   * Default: false (incremental mode)
   */
  fullSync: false,

  /**
   * Maximum number of videos to sync (for testing)
   * Default: undefined (no limit)
   */
  maxVideos: undefined,

  // ============================================================================
  // Content Configuration
  // ============================================================================

  /**
   * Include YouTube video embed iframe in episode pages
   * Default: true
   */
  includeVideoEmbed: true,

  /**
   * Truncate video descriptions longer than this many characters
   * Default: 5000
   */
  truncateDescriptionAt: 5000,

  /**
   * Regex patterns for parsing guest names from video descriptions
   * Patterns tried in order, first match wins
   * Default patterns:
   * 1. "Guest:" or "Guests:" followed by names
   * 2. "Featuring:" or "ft." or "feat." followed by names
   * 3. "with @username" (Twitter mentions)
   * 4. "Interview with" followed by names
   */
  guestParsingPatterns: [
    /(?:Guest|Guests):\s*([^\n]+)/i,
    /(?:Featuring|ft\.|feat\.):\s*([^\n]+)/i,
    /with\s+@(\w+)/gi,
    /Interview with\s+([^\n]+)/i
  ],

  // ============================================================================
  // Exclusions
  // ============================================================================

  /**
   * Video IDs to exclude from sync
   * Useful for test videos, unlisted content, etc.
   * Default: [] (no exclusions)
   */
  excludedVideoIds: [
    // Example: 'dQw4w9WgXcQ',
  ],

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Number of retry attempts for failed operations
   * Default: 3
   */
  retryAttempts: 3,

  /**
   * Retry backoff delays in milliseconds
   * Default: [60000, 300000, 900000] (1min, 5min, 15min)
   */
  retryBackoff: [60000, 300000, 900000],
}
