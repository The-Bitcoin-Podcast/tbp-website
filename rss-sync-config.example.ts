/**
 * RSS Sync Configuration Examples
 * 
 * This file contains example configurations for syncing various podcast RSS feeds.
 * Copy and modify these examples to create your own sync scripts.
 */

import type { SyncConfig } from './quartz/types/rss-sync.js'

// ============================================================================
// Example 1: Hashing It Out Podcast (Basic Configuration)
// ============================================================================

export const hashingItOutConfig: SyncConfig = {
  rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
  outputDirectory: 'content/episodes',
  podcastFolder: 'hio',
  podcastName: 'Hashing It Out',
  fileNamePattern: '{number}-{slug}',
  autoPublish: false,
  fullSync: false,
  includeDescription: true,
  truncateDescriptionAt: 5000,
  retryAttempts: 3,
  retryBackoff: [1000, 5000, 15000],
  performanceTimeoutMs: 30000,
  generatePlaceholders: true
}

// Example usage:
// npm run rss-sync -- --url https://anchor.fm/s/f8e7252c/podcast/rss --folder hio --name "Hashing It Out"

// ============================================================================
// Example 2: The Bitcoin Podcast (Full Sync with Custom Settings)
// ============================================================================

export const bitcoinPodcastConfig: SyncConfig = {
  rssUrl: 'https://feeds.buzzsprout.com/123456.rss', // Example URL
  outputDirectory: 'content/episodes',
  podcastFolder: 'tbp',
  podcastName: 'The Bitcoin Podcast',
  fileNamePattern: 'tbp-{number}-{slug}',
  autoPublish: true, // Auto-publish episodes
  fullSync: true, // Sync all episodes, not just new ones
  maxEpisodes: 50, // Limit to recent 50 episodes
  includeDescription: true,
  truncateDescriptionAt: 3000, // Shorter descriptions
  excludedGuids: [
    'episode-to-skip-1',
    'episode-to-skip-2'
  ],
  retryAttempts: 5, // More aggressive retry
  retryBackoff: [500, 2000, 8000, 15000, 30000],
  performanceTimeoutMs: 60000, // 60 seconds for larger syncs
  generatePlaceholders: false, // Strict mode - fail on missing metadata
  dateFilter: {
    after: new Date('2024-01-01'), // Only episodes after Jan 1, 2024
    before: new Date('2024-12-31') // Only episodes before Dec 31, 2024
  }
}

// Example usage:
// npm run rss-sync -- --url https://feeds.buzzsprout.com/123456.rss --folder tbp --name "The Bitcoin Podcast" --auto-publish --full-sync --max-episodes 50

// ============================================================================
// Example 3: Daily News Podcast (High Frequency, Conservative Settings)
// ============================================================================

export const dailyNewsConfig: SyncConfig = {
  rssUrl: 'https://example.com/daily-news/rss',
  outputDirectory: 'content/episodes',
  podcastFolder: 'daily-news',
  podcastName: 'Daily Crypto News',
  fileNamePattern: '{date}-{slug}', // Date-based naming
  autoPublish: false,
  fullSync: false,
  maxEpisodes: 10, // Only recent episodes
  includeDescription: false, // Skip descriptions for brevity
  truncateDescriptionAt: 1000,
  retryAttempts: 2, // Conservative retry
  retryBackoff: [2000, 10000],
  performanceTimeoutMs: 15000, // Fast timeout for daily sync
  generatePlaceholders: true
}

// ============================================================================
// Example 4: Weekly Interview Show (Rich Metadata)
// ============================================================================

export const interviewShowConfig: SyncConfig = {
  rssUrl: 'https://example.com/interviews/feed.xml',
  outputDirectory: 'content/episodes',
  podcastFolder: 'interviews',
  podcastName: 'Weekly Bitcoin Interviews',
  fileNamePattern: 'interview-{number}-{slug}',
  autoPublish: false,
  fullSync: false,
  includeDescription: true,
  truncateDescriptionAt: 10000, // Long descriptions for interviews
  retryAttempts: 3,
  retryBackoff: [1000, 5000, 15000],
  performanceTimeoutMs: 45000,
  generatePlaceholders: true,
  dateFilter: {
    after: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days only
  }
}

// ============================================================================
// Example 5: Testing Configuration (Dry Run Settings)
// ============================================================================

export const testingConfig: SyncConfig = {
  rssUrl: 'https://feeds.simplecast.com/54nAGcIl', // Example public feed
  outputDirectory: 'content/episodes',
  podcastFolder: 'test-podcast',
  podcastName: 'Test Podcast',
  fileNamePattern: 'test-{number}-{slug}',
  autoPublish: false,
  fullSync: false,
  maxEpisodes: 3, // Very limited for testing
  includeDescription: true,
  truncateDescriptionAt: 500,
  retryAttempts: 1, // Minimal retry for testing
  retryBackoff: [1000],
  performanceTimeoutMs: 10000,
  generatePlaceholders: true
}

// Example dry run usage:
// npm run rss-sync -- --dry-run --url https://feeds.simplecast.com/54nAGcIl --folder test-podcast --name "Test Podcast" --max-episodes 3

// ============================================================================
// CLI Examples for Different Scenarios
// ============================================================================

/**
 * Basic sync (most common usage):
 * npm run rss-sync -- --url "https://anchor.fm/s/f8e7252c/podcast/rss" --folder "hio" --name "Hashing It Out"
 * 
 * Dry run preview:
 * npm run rss-sync -- --dry-run --url "https://anchor.fm/s/f8e7252c/podcast/rss" --folder "hio"
 * 
 * Full sync with auto-publish:
 * npm run rss-sync -- --url "https://example.com/feed.xml" --folder "podcast" --name "My Podcast" --auto-publish --full-sync
 * 
 * Limited sync with custom pattern:
 * npm run rss-sync -- --url "https://example.com/feed.xml" --folder "news" --name "News" --max-episodes 5 --pattern "news-{number}-{date}"
 * 
 * Conservative settings for unreliable feeds:
 * npm run rss-sync -- --url "https://unreliable.com/feed.xml" --folder "unreliable" --retry-attempts 5 --timeout 60 --no-placeholders
 * 
 * Exclude descriptions for minimal files:
 * npm run rss-sync -- --url "https://example.com/feed.xml" --folder "minimal" --exclude-description --description-limit 100
 */

// ============================================================================
// Configuration Notes and Best Practices
// ============================================================================

/**
 * FOLDER NAMING GUIDELINES:
 * - Use lowercase, descriptive names
 * - Use hyphens for spaces (not underscores)
 * - Keep under 50 characters
 * - Examples: "hio", "the-bitcoin-podcast", "daily-news", "interviews"
 * 
 * FILENAME PATTERN OPTIONS:
 * - {number} - Episode number (padded to 3 digits: 001, 002, etc.)
 * - {slug} - URL-safe version of episode title
 * - {date} - Publication date (YYYY-MM-DD)
 * - {year} - Publication year (YYYY)
 * - {month} - Publication month (MM)
 * - {day} - Publication day (DD)
 * - {podcast} - Podcast folder name
 * - {guid} - Sanitized RSS GUID (first 20 chars)
 * 
 * PERFORMANCE CONSIDERATIONS:
 * - Set performanceTimeoutMs based on feed size (30s for 100 episodes)
 * - Use maxEpisodes during testing or for large feeds
 * - fullSync should be used sparingly (only for initial sync or recovery)
 * - retryAttempts: 3 is usually sufficient; increase for unreliable feeds
 * 
 * PLACEHOLDER GENERATION:
 * - Enable (generatePlaceholders: true) for feeds with inconsistent metadata
 * - Disable (generatePlaceholders: false) for strict quality control
 * - Warnings will be included in episode frontmatter when placeholders are used
 * 
 * DATE FILTERING:
 * - Use dateFilter to limit sync to specific time ranges
 * - Useful for excluding very old episodes or future-dated episodes
 * - Dates are based on episode publication date from RSS feed
 * 
 * ERROR HANDLING:
 * - Script will continue on individual episode failures
 * - Check console output for warnings and errors
 * - Use --dry-run first to preview what will be synced
 * - Failed episodes will be reported with details about retryability
 */

// ============================================================================
// Troubleshooting Common Issues
// ============================================================================

/**
 * RSS FEED ISSUES:
 * 
 * Problem: "Failed to fetch RSS feed"
 * Solutions:
 * - Check if RSS URL is correct and accessible
 * - Increase timeout with --timeout 60
 * - Increase retry attempts with --retry-attempts 5
 * - Some feeds require specific User-Agent headers (handled automatically)
 * 
 * Problem: "Episodes have missing metadata"
 * Solutions:
 * - Enable placeholder generation (default)
 * - Check episode warnings in generated frontmatter
 * - Some feeds have inconsistent episode data
 * 
 * Problem: "Sync is too slow"
 * Solutions:
 * - Use --max-episodes to limit episode count
 * - Increase --timeout for larger feeds
 * - Check network connectivity
 * - Some podcast hosts have rate limiting
 * 
 * Problem: "Invalid podcast folder name"
 * Solutions:
 * - Use only letters, numbers, and hyphens
 * - Avoid special characters: <>:"/\|?*
 * - Keep folder names under 100 characters
 * 
 * Problem: "Git commit failed"
 * Solutions:
 * - Ensure git repository is initialized
 * - Check file permissions for episode files
 * - Git failures don't stop the sync, just the commit
 * 
 * DIRECTORY STRUCTURE ISSUES:
 * 
 * Problem: "Output directory doesn't exist"
 * Solutions:
 * - Script will create missing directories automatically
 * - Check file system permissions
 * - Ensure parent directories exist and are writable
 * 
 * Problem: "Episode files not in correct location"
 * Solutions:
 * - Check --output-dir parameter (default: content/episodes)
 * - Verify --folder parameter matches desired subdirectory
 * - Files are created in: <output-dir>/<folder>/episode-files.md
 */