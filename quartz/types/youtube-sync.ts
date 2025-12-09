// YouTube Channel Sync Type Definitions

/**
 * YouTubeVideo - Source entity from YouTube Data API v3
 */
export interface YouTubeVideo {
  // YouTube API fields
  videoId: string              // Unique YouTube video identifier (e.g., "dQw4w9WgXcQ")
  channelId: string            // Channel identifier (always @thebtcpodcast)
  title: string                // Video title
  description: string          // Full video description text
  publishedAt: string          // ISO 8601 datetime (e.g., "2024-01-15T10:30:00Z")
  duration: string             // ISO 8601 duration (e.g., "PT1H23M45S")
  thumbnailUrl: string         // URL to highest quality thumbnail
  tags?: string[]              // YouTube tags/keywords (may be empty)

  // Derived fields (computed during sync)
  episodeNumber?: number       // Sequential episode number (1, 2, 3, ...)
  guests?: Guest[]             // Parsed guest objects from description
  privacyStatus?: 'public' | 'unlisted' | 'private'
}

/**
 * Guest - Parsed from YouTube video description
 */
export interface Guest {
  name: string
  twitter?: string             // If parsed from @username
  bio?: string                 // Manual addition post-sync
}

/**
 * EpisodeFrontmatter - Generated markdown file frontmatter for Quartz
 */
export interface EpisodeFrontmatter {
  // Core metadata
  title: string                // From YouTubeVideo.title
  date: string                 // From YouTubeVideo.publishedAt (YYYY-MM-DD format)
  draft: boolean               // Default: true (manual approval required)

  // Episode identification
  episodeNumber: number        // Sequential number
  youtubeId: string           // For duplicate detection & embed

  // Media
  thumbnail: string            // YouTubeVideo.thumbnailUrl
  duration: string             // Human-readable (e.g., "1:23:45")
  audioUrl?: string            // Optional podcast RSS audio URL (manual)

  // Content
  description: string          // Converted markdown from YouTubeVideo.description
  guests?: Guest[]             // Parsed guest objects
  tags?: string[]              // From YouTubeVideo.tags + manual additions

  // Status
  syncedAt: string             // ISO 8601 timestamp of sync operation
  status?: 'available' | 'unavailable' | 'private'  // Video availability
}

/**
 * SyncRecord - Individual sync history entry
 */
export interface SyncRecord {
  videoId: string
  episodePath: string          // File path in git
  syncedAt: Date               // Commit timestamp
  commitHash: string           // Git commit SHA
}

/**
 * SyncState - Derived from git commit history
 */
export interface SyncState {
  syncedVideoIds: Set<string>      // All youtubeId values from git history
  lastSyncTimestamp?: Date          // Most recent commit timestamp for episode
  episodeCount: number              // Total synced episodes
  syncHistory: SyncRecord[]         // Audit trail
}

/**
 * SyncConfig - User configuration for sync process
 */
export interface SyncConfig {
  // API Configuration
  youtubeApiKey: string            // From environment variable
  channelId: string                // Default: @thebtcpodcast

  // Output Configuration
  outputDirectory: string          // Default: "content/episodes"
  fileNamePattern: string          // Default: "{number}-{slug}.md"

  // Behavior Configuration
  autoPublish: boolean             // Default: false (draft: true)
  fullSync: boolean                // Default: false (incremental only)
  maxVideos?: number               // Limit for testing (optional)

  // Content Configuration
  includeVideoEmbed: boolean       // Default: true
  truncateDescriptionAt: number    // Default: 5000 chars
  guestParsingPatterns: RegExp[]   // Default: GUEST_PATTERNS from research

  // Exclusions
  excludedVideoIds?: string[]      // Video IDs to skip

  // Error Handling
  retryAttempts: number            // Default: 3
  retryBackoff: number[]           // Default: [60000, 300000, 900000] (1min, 5min, 15min)
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<SyncConfig> = {
  channelId: '@thebtcpodcast',
  outputDirectory: 'content/episodes',
  fileNamePattern: '{number}-{slug}.md',
  autoPublish: false,
  fullSync: false,
  includeVideoEmbed: true,
  truncateDescriptionAt: 5000,
  retryAttempts: 3,
  retryBackoff: [60000, 300000, 900000], // 1min, 5min, 15min
  guestParsingPatterns: [
    /(?:Guest|Guests):\s*([^\n]+)/i,
    /(?:Featuring|ft\.|feat\.):\s*([^\n]+)/i,
    /with\s+@(\w+)/gi,
    /Interview with\s+([^\n]+)/i
  ]
}

/**
 * Episode generation result
 */
export interface GenerationResult {
  filePath: string             // Absolute path to created file
  content: string              // Full markdown content with frontmatter
}
