#!/usr/bin/env node

/**
 * RSS Podcast Sync Script
 * 
 * Syncs podcast episodes from RSS feeds to markdown files in the Quartz website.
 * Supports podcast folder organization, retry logic, and missing metadata handling.
 * 
 * Usage:
 *   npm run rss-sync -- --help
 *   npm run rss-sync -- --url https://anchor.fm/s/f8e7252c/podcast/rss --folder hio
 *   npm run rss-sync -- --dry-run --url https://anchor.fm/s/f8e7252c/podcast/rss --folder hio
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'

// Import utilities
import { RSSParser, generatePlaceholders, determineEpisodeStatus, validatePodcastFolder, generateEpisodeFilePath, ensurePodcastFolder } from '../util/rss.js'
import { createRSSEpisodeGenerator } from '../util/rss-episode-generator.js'

// Import types
import type {
  RSSSyncServiceContract,
  SyncConfig,
  SyncResult,
  SyncPreview,
  SyncState,
  SyncRecord,
  SyncedEpisode,
  SyncFailure,
  PreviewEpisode,
  SyncError,
  RSSEpisodeData,
  GenerationConfig
} from '../types/rss-sync.js'

// ============================================================================
// RSS Sync Service Implementation
// ============================================================================

class RSSSyncService implements RSSSyncServiceContract {
  private parser: RSSParser
  private episodeGenerator: ReturnType<typeof createRSSEpisodeGenerator>

  constructor() {
    this.parser = new RSSParser()
    this.episodeGenerator = createRSSEpisodeGenerator()
  }

  /**
   * Perform incremental sync of RSS feed
   */
  async syncFeed(config: SyncConfig): Promise<SyncResult> {
    const startTime = Date.now()
    console.log(`Starting RSS sync for ${config.podcastName}`)
    console.log(`RSS URL: ${config.rssUrl}`)
    console.log(`Output Directory: ${config.outputDirectory}/${config.podcastFolder}`)

    try {
      // Validate configuration
      await this.validateConfig(config)

      // Ensure podcast folder exists
      await ensurePodcastFolder(config.outputDirectory, config.podcastFolder)

      // Get current sync state
      const syncState = await this.getSyncState(config.outputDirectory, config.podcastFolder)
      console.log(`Current sync state: ${syncState.episodeCount} episodes, ${syncState.syncedGuids.size} GUIDs tracked`)

      // Fetch and parse RSS feed
      const feed = await this.parser.fetchAndParseRSS(config.rssUrl, {
        timeout: config.performanceTimeoutMs,
        retryAttempts: config.retryAttempts,
        retryBackoff: config.retryBackoff
      })

      console.log(`Fetched RSS feed: ${feed.title} with ${feed.episodes.length} episodes`)

      // Filter episodes for incremental sync
      let episodesToSync = feed.episodes.filter(episode => {
        // Skip if already synced (unless doing full sync)
        if (!config.fullSync && syncState.syncedGuids.has(episode.guid)) {
          return false
        }

        // Skip if in excluded list
        if (config.excludedGuids?.includes(episode.guid)) {
          return false
        }

        // Apply date filter if specified
        if (config.dateFilter) {
          const pubDate = new Date(episode.pubDate)
          
          if (config.dateFilter.after && pubDate <= config.dateFilter.after) {
            return false
          }
          
          if (config.dateFilter.before && pubDate >= config.dateFilter.before) {
            return false
          }
        }

        return true
      })

      // Apply maxEpisodes limit
      if (config.maxEpisodes && episodesToSync.length > config.maxEpisodes) {
        episodesToSync = episodesToSync.slice(0, config.maxEpisodes)
        console.log(`Limited to ${config.maxEpisodes} episodes for this sync`)
      }

      console.log(`${episodesToSync.length} new episodes to sync`)

      const syncedEpisodes: SyncedEpisode[] = []
      const failures: SyncFailure[] = []

      // Process each episode (reverse numbering for RSS feeds - oldest gets lowest number)
      for (let i = 0; i < episodesToSync.length; i++) {
        const episode = episodesToSync[i]
        // For RSS feeds, reverse the numbering so oldest episode gets number 1
        const episodeNumber = syncState.episodeCount + (episodesToSync.length - i)

        try {
          console.log(`Processing episode ${i + 1}/${episodesToSync.length}: ${episode.title}`)

          // Convert RSS episode to generator format
          const rssEpisodeData = this.convertToRSSEpisodeData(episode, config)

          // Note: RSS episodes already have complete data from the feed, no placeholders needed
          let finalEpisodeData = rssEpisodeData
          let warnings: string[] = []

          // Generate episode file
          const generationConfig: GenerationConfig = {
            outputDirectory: config.outputDirectory,
            podcastFolder: config.podcastFolder,
            podcastName: config.podcastName,
            fileNamePattern: config.fileNamePattern,
            autoPublish: config.autoPublish,
            includeDescription: config.includeDescription,
            truncateDescriptionAt: config.truncateDescriptionAt,
            includeAudioEmbed: true // Always include audio embed for RSS episodes
          }

          const generated = await this.episodeGenerator.generateEpisodeFile(
            finalEpisodeData,
            episodeNumber,
            generationConfig
          )

          // Write episode file
          await fs.writeFile(generated.filePath, generated.content, 'utf-8')
          console.log(`Written episode file: ${generated.filePath}`)

          syncedEpisodes.push({
            guid: episode.guid,
            episodeNumber,
            title: episode.title,
            filePath: generated.filePath,
            publishDate: new Date(episode.pubDate)
          })

          // Add warnings to episode if any
          if (warnings.length > 0) {
            console.warn(`Episode ${episodeNumber} has warnings:`, warnings)
          }

        } catch (error) {
          console.error(`Failed to process episode: ${episode.title}`, error)
          
          failures.push({
            guid: episode.guid,
            title: episode.title,
            error: error instanceof Error ? error.message : String(error),
            retryable: this.isRetryableError(error)
          })
        }
      }

      const duration = Date.now() - startTime
      console.log(`Sync completed in ${duration}ms`)
      console.log(`Success: ${syncedEpisodes.length}, Failures: ${failures.length}`)

      // Create git commit for synced episodes
      let commitHash: string | undefined
      if (syncedEpisodes.length > 0) {
        try {
          commitHash = await this.createGitCommit(syncedEpisodes, config.podcastName)
          console.log(`Created git commit: ${commitHash}`)
        } catch (error) {
          console.warn('Failed to create git commit:', error)
          // Don't fail the entire sync for git errors
        }
      }

      return {
        successCount: syncedEpisodes.length,
        failureCount: failures.length,
        syncedEpisodes,
        failures,
        commitHash,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Sync failed:', error)
      
      throw new SyncError(
        `RSS sync failed: ${error instanceof Error ? error.message : String(error)}`,
        'syncFeed',
        this.isRetryableError(error)
      )
    }
  }

  /**
   * Perform full sync of RSS feed (ignores sync state)
   */
  async fullSync(config: SyncConfig): Promise<SyncResult> {
    console.log('Performing full sync (ignoring previous state)')
    return this.syncFeed({ ...config, fullSync: true })
  }

  /**
   * Preview sync operation without writing files
   */
  async dryRun(config: SyncConfig): Promise<SyncPreview> {
    console.log('Performing dry run (no files will be written)')

    try {
      // Validate configuration
      await this.validateConfig(config)

      // Get current sync state
      const syncState = await this.getSyncState(config.outputDirectory, config.podcastFolder)

      // Fetch and parse RSS feed
      const feed = await this.parser.fetchAndParseRSS(config.rssUrl, {
        timeout: config.performanceTimeoutMs,
        retryAttempts: config.retryAttempts,
        retryBackoff: config.retryBackoff
      })

      // Filter episodes that would be synced
      let episodesToSync = feed.episodes.filter(episode => {
        if (!config.fullSync && syncState.syncedGuids.has(episode.guid)) {
          return false
        }

        if (config.excludedGuids?.includes(episode.guid)) {
          return false
        }

        if (config.dateFilter) {
          const pubDate = new Date(episode.pubDate)
          
          if (config.dateFilter.after && pubDate <= config.dateFilter.after) {
            return false
          }
          
          if (config.dateFilter.before && pubDate >= config.dateFilter.before) {
            return false
          }
        }

        return true
      })

      // Apply maxEpisodes limit
      if (config.maxEpisodes && episodesToSync.length > config.maxEpisodes) {
        episodesToSync = episodesToSync.slice(0, config.maxEpisodes)
      }

      // Generate preview episodes (reverse numbering for RSS feeds - oldest gets lowest number)
      const newEpisodes: PreviewEpisode[] = episodesToSync.map((episode, index) => {
        // For RSS feeds, reverse the numbering so oldest episode gets number 1
        const episodeNumber = syncState.episodeCount + (episodesToSync.length - index)
        const filename = this.generatePreviewFilename(episode, episodeNumber, config.fileNamePattern)
        
        return {
          guid: episode.guid,
          title: episode.title,
          publishDate: new Date(episode.pubDate),
          estimatedFilePath: generateEpisodeFilePath(config.outputDirectory, config.podcastFolder, filename),
          episodeNumber
        }
      })

      const estimatedFiles = newEpisodes.map(e => e.estimatedFilePath)

      console.log(`Dry run complete: ${newEpisodes.length} episodes would be synced`)

      return {
        newEpisodes,
        totalCount: newEpisodes.length,
        estimatedFiles
      }

    } catch (error) {
      throw new SyncError(
        `Dry run failed: ${error instanceof Error ? error.message : String(error)}`,
        'dryRun',
        false
      )
    }
  }

  /**
   * Get current sync state from git history
   */
  async getSyncState(outputDirectory: string, podcastFolder: string): Promise<SyncState> {
    console.log(`Getting sync state for podcast folder: ${podcastFolder}`)

    const syncedGuids = new Set<string>()
    const syncHistory: SyncRecord[] = []
    let episodeCount = 0

    try {
      const podcastDir = path.join(outputDirectory, podcastFolder)
      
      // Check if directory exists
      try {
        await fs.access(podcastDir)
      } catch {
        // Directory doesn't exist yet - return empty state
        console.log('Podcast folder does not exist yet, returning empty sync state')
        return {
          syncedGuids,
          episodeCount: 0,
          syncHistory: [],
          podcastFolder
        }
      }

      // Read existing episode files to get sync state
      const files = await fs.readdir(podcastDir)
      const markdownFiles = files.filter(f => f.endsWith('.md'))

      for (const file of markdownFiles) {
        try {
          const filePath = path.join(podcastDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          
          // Extract RSS GUID from frontmatter
          const guidMatch = content.match(/rssGuid:\s*["']([^"']+)["']/)
          const episodeNumMatch = content.match(/episodeNumber:\s*(\d+)/)
          
          if (guidMatch && episodeNumMatch) {
            const guid = guidMatch[1]
            const episodeNumber = parseInt(episodeNumMatch[1], 10)
            
            syncedGuids.add(guid)
            episodeCount = Math.max(episodeCount, episodeNumber)
            
            // Try to get git info for this file
            try {
              const gitLog = execSync(
                `git log --format="%H|%ai" -n 1 -- "${filePath}"`, 
                { encoding: 'utf-8', cwd: process.cwd() }
              ).trim()
              
              if (gitLog) {
                const [commitHash, dateStr] = gitLog.split('|')
                
                syncHistory.push({
                  guid,
                  episodePath: filePath,
                  syncedAt: new Date(dateStr),
                  commitHash
                })
              }
            } catch {
              // Git info not available, use file mtime
              const stats = await fs.stat(filePath)
              
              syncHistory.push({
                guid,
                episodePath: filePath,
                syncedAt: stats.mtime,
                commitHash: 'unknown'
              })
            }
          }
        } catch (error) {
          console.warn(`Failed to read episode file ${file}:`, error)
        }
      }

      // Sort sync history by date (most recent first)
      syncHistory.sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime())

      console.log(`Found ${syncedGuids.size} synced episodes, latest episode number: ${episodeCount}`)

      return {
        syncedGuids,
        lastSyncTimestamp: syncHistory.length > 0 ? syncHistory[0].syncedAt : undefined,
        episodeCount,
        syncHistory,
        podcastFolder
      }

    } catch (error) {
      console.error('Error getting sync state:', error)
      
      // Return empty state on error
      return {
        syncedGuids,
        episodeCount: 0,
        syncHistory: [],
        podcastFolder
      }
    }
  }

  // ========================================================================
  // Private Helper Methods
  // ========================================================================

  private async validateConfig(config: SyncConfig): Promise<void> {
    if (!config.rssUrl?.trim()) {
      throw new SyncError('RSS URL is required', 'validation', false)
    }

    try {
      new URL(config.rssUrl)
    } catch {
      throw new SyncError('RSS URL must be a valid URL', 'validation', false)
    }

    if (!config.outputDirectory?.trim()) {
      throw new SyncError('Output directory is required', 'validation', false)
    }

    if (!config.podcastFolder?.trim()) {
      throw new SyncError('Podcast folder is required', 'validation', false)
    }

    const folderValidation = validatePodcastFolder(config.podcastFolder)
    if (!folderValidation.valid) {
      throw new SyncError(`Invalid podcast folder: ${folderValidation.error}`, 'validation', false)
    }

    if (config.retryAttempts < 0) {
      throw new SyncError('Retry attempts cannot be negative', 'validation', false)
    }

    if (config.performanceTimeoutMs <= 0) {
      throw new SyncError('Performance timeout must be positive', 'validation', false)
    }
  }

  private convertToRSSEpisodeData(episode: any, config: SyncConfig): RSSEpisodeData {
    return {
      guid: episode.guid,
      title: episode.title,
      description: episode.description,
      pubDate: new Date(episode.pubDate),
      duration: episode.duration || 0,
      enclosureUrl: episode.enclosure?.url || '',
      enclosureType: episode.enclosure?.type || 'audio/mpeg',
      enclosureLength: episode.enclosure?.length || 0,
      author: episode.author,
      explicit: episode.explicit,
      image: episode.image
    }
  }

  private generatePreviewFilename(episode: any, episodeNumber: number, pattern: string): string {
    // Simple filename generation for preview (without full slug logic)
    const paddedNumber = episodeNumber.toString().padStart(3, '0')
    const slug = episode.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .substring(0, 50)

    return pattern
      .replace('{number}', paddedNumber)
      .replace('{slug}', slug) + '.md'
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      // Network errors are usually retryable
      if (message.includes('timeout') || 
          message.includes('network') || 
          message.includes('connect') ||
          message.includes('fetch') ||
          message.includes('enotfound')) {
        return true
      }

      // Server errors (5xx) are retryable
      if (message.includes('500') || 
          message.includes('502') || 
          message.includes('503') || 
          message.includes('504')) {
        return true
      }

      // Rate limiting is retryable
      if (message.includes('rate limit') || message.includes('429')) {
        return true
      }
    }

    return false
  }

  private async createGitCommit(syncedEpisodes: SyncedEpisode[], podcastName: string): Promise<string> {
    try {
      // Check if we're in a git repository
      execSync('git status', { cwd: process.cwd(), stdio: 'ignore' })

      // Stage all new episode files
      for (const episode of syncedEpisodes) {
        try {
          execSync(`git add "${episode.filePath}"`, { 
            cwd: process.cwd(), 
            stdio: 'ignore' 
          })
        } catch (error) {
          console.warn(`Failed to stage ${episode.filePath}:`, error)
        }
      }

      // Create commit message
      const episodeCount = syncedEpisodes.length
      let commitMessage: string
      
      if (episodeCount === 1) {
        const episode = syncedEpisodes[0]
        commitMessage = `Add ${podcastName} episode ${episode.episodeNumber}: ${episode.title}

RSS sync added episode:
- Episode ${episode.episodeNumber}: ${episode.title}
- Published: ${episode.publishDate.toISOString().split('T')[0]}
- File: ${path.relative(process.cwd(), episode.filePath)}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`
      } else {
        const episodeNumbers = syncedEpisodes.map(e => e.episodeNumber).sort((a, b) => a - b)
        const firstEpisode = Math.min(...episodeNumbers)
        const lastEpisode = Math.max(...episodeNumbers)

        commitMessage = `Add ${episodeCount} ${podcastName} episodes (${firstEpisode}-${lastEpisode})

RSS sync added ${episodeCount} episodes:
${syncedEpisodes.map(e => 
  `- Episode ${e.episodeNumber}: ${e.title}`
).join('\n')}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`
      }

      // Create the commit
      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
        cwd: process.cwd(),
        stdio: 'ignore'
      })

      // Get the commit hash
      const commitHash = execSync('git rev-parse HEAD', {
        cwd: process.cwd(),
        encoding: 'utf-8'
      }).trim()

      return commitHash

    } catch (error) {
      throw new Error(`Git commit failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

// ============================================================================
// CLI Application
// ============================================================================

/**
 * Create sync service instance
 */
export function createSyncService(): RSSSyncServiceContract {
  return new RSSSyncService()
}

/**
 * Main CLI application
 */
async function main() {
  const argv = await yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .options({
      'url': {
        alias: 'u',
        describe: 'RSS feed URL',
        type: 'string',
        demandOption: true
      },
      'folder': {
        alias: 'f',
        describe: 'Podcast folder name (e.g., "hio", "tbp")',
        type: 'string',
        demandOption: true
      },
      'name': {
        alias: 'n',
        describe: 'Podcast display name',
        type: 'string',
        default: 'Podcast'
      },
      'output-dir': {
        alias: 'o',
        describe: 'Output directory for episodes',
        type: 'string',
        default: 'content/episodes'
      },
      'pattern': {
        alias: 'p',
        describe: 'Filename pattern',
        type: 'string',
        default: '{number}-{slug}'
      },
      'auto-publish': {
        describe: 'Auto-publish episodes (set draft: false)',
        type: 'boolean',
        default: false
      },
      'full-sync': {
        describe: 'Perform full sync (ignore sync state)',
        type: 'boolean',
        default: false
      },
      'max-episodes': {
        describe: 'Maximum episodes to sync',
        type: 'number'
      },
      'exclude-description': {
        describe: 'Exclude description from episode files',
        type: 'boolean',
        default: false
      },
      'description-limit': {
        describe: 'Character limit for descriptions',
        type: 'number',
        default: 5000
      },
      'excluded-guids': {
        describe: 'Episode GUIDs to exclude (comma-separated)',
        type: 'string'
      },
      'retry-attempts': {
        describe: 'Number of retry attempts',
        type: 'number',
        default: 3
      },
      'timeout': {
        describe: 'Timeout in seconds',
        type: 'number',
        default: 30
      },
      'no-placeholders': {
        describe: 'Disable placeholder generation for missing metadata',
        type: 'boolean',
        default: false
      },
      'dry-run': {
        describe: 'Preview sync without writing files',
        type: 'boolean',
        default: false
      }
    })
    .example('$0 --url https://anchor.fm/s/f8e7252c/podcast/rss --folder hio --name "Hashing It Out"', 'Sync Hashing It Out podcast')
    .example('$0 --dry-run --url https://example.com/feed.xml --folder podcast', 'Preview sync without writing files')
    .help()
    .parse()

  try {
    // Build configuration from CLI arguments
    const config: SyncConfig = {
      rssUrl: argv.url,
      outputDirectory: argv['output-dir'],
      podcastFolder: argv.folder,
      podcastName: argv.name,
      fileNamePattern: argv.pattern,
      autoPublish: argv['auto-publish'],
      fullSync: argv['full-sync'],
      maxEpisodes: argv['max-episodes'],
      includeDescription: !argv['exclude-description'],
      truncateDescriptionAt: argv['description-limit'],
      excludedGuids: argv['excluded-guids'] ? argv['excluded-guids'].split(',').map(g => g.trim()) : undefined,
      retryAttempts: argv['retry-attempts'],
      retryBackoff: [1000, 5000, 15000], // Fixed exponential backoff
      performanceTimeoutMs: argv.timeout * 1000,
      generatePlaceholders: !argv['no-placeholders']
    }

    console.log('RSS Podcast Sync Starting...')
    console.log('Configuration:', {
      rssUrl: config.rssUrl,
      podcastFolder: config.podcastFolder,
      podcastName: config.podcastName,
      outputDirectory: config.outputDirectory,
      dryRun: argv['dry-run'],
      fullSync: config.fullSync,
      maxEpisodes: config.maxEpisodes || 'unlimited'
    })

    const syncService = createSyncService()

    if (argv['dry-run']) {
      // Dry run mode
      const preview = await syncService.dryRun(config)
      
      console.log('\n=== DRY RUN RESULTS ===')
      console.log(`Total episodes that would be synced: ${preview.totalCount}`)
      
      if (preview.newEpisodes.length > 0) {
        console.log('\nEpisodes to sync:')
        preview.newEpisodes.forEach(episode => {
          console.log(`  ${episode.episodeNumber}. ${episode.title}`)
          console.log(`     GUID: ${episode.guid}`)
          console.log(`     File: ${episode.estimatedFilePath}`)
          console.log(`     Date: ${episode.publishDate.toISOString().split('T')[0]}`)
        })
      }
      
      console.log('\nNo files were written (dry run mode)')
      
    } else {
      // Actual sync
      const result = await syncService.syncFeed(config)
      
      console.log('\n=== SYNC RESULTS ===')
      console.log(`Successful episodes: ${result.successCount}`)
      console.log(`Failed episodes: ${result.failureCount}`)
      console.log(`Duration: ${(result.duration / 1000).toFixed(1)}s`)
      
      if (result.syncedEpisodes.length > 0) {
        console.log('\nSynced episodes:')
        result.syncedEpisodes.forEach(episode => {
          console.log(`  ${episode.episodeNumber}. ${episode.title}`)
          console.log(`     File: ${episode.filePath}`)
        })
      }
      
      if (result.failures.length > 0) {
        console.log('\nFailed episodes:')
        result.failures.forEach(failure => {
          console.log(`  ${failure.title || failure.guid}`)
          console.log(`     Error: ${failure.error}`)
          console.log(`     Retryable: ${failure.retryable}`)
        })
      }
    }

    console.log('\nRSS sync completed successfully!')

  } catch (error) {
    console.error('\nRSS sync failed:')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}