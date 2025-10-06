#!/usr/bin/env node

import { promises as fs } from 'fs'
import { join } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import simpleGit from 'simple-git'
import type { SyncConfig, YouTubeVideo, SyncState, GenerationResult } from '../types/youtube-sync.js'
import { DEFAULT_CONFIG } from '../types/youtube-sync.js'
import { searchChannelVideos, getVideoDetails } from '../util/youtube.js'
import { buildSyncState, isVideoSynced } from '../util/git.js'
import { generateEpisodeFile } from '../util/episode-generator.js'

/**
 * CLI argument parser for youtube-sync script
 *
 * Supports flags:
 * - --full: Perform full sync (ignore last sync timestamp)
 * - --dry-run: Preview changes without writing files
 * - --no-commit: Skip git commit step
 * - --max: Limit number of videos to sync
 * - --after: Only sync videos published after this date
 * - --before: Only sync videos published before this date
 * - --config: Path to custom config file
 */
const argv = yargs(hideBin(process.argv))
  .option('full', {
    type: 'boolean',
    description: 'Perform full sync (ignore last sync timestamp)',
    default: false,
  })
  .option('dry-run', {
    type: 'boolean',
    description: 'Preview changes without writing files or committing',
    default: false,
  })
  .option('no-commit', {
    type: 'boolean',
    description: 'Skip git commit step',
    default: false,
  })
  .option('max', {
    type: 'number',
    description: 'Maximum number of videos to sync',
  })
  .option('after', {
    type: 'string',
    description: 'Only sync videos published after this date (ISO 8601)',
  })
  .option('before', {
    type: 'string',
    description: 'Only sync videos published before this date (ISO 8601)',
  })
  .option('config', {
    type: 'string',
    description: 'Path to custom configuration file',
  })
  .help()
  .alias('help', 'h')
  .parseSync()

/**
 * Load configuration from file or use defaults
 */
async function loadConfig(configPath?: string): Promise<SyncConfig> {
  let userConfig: Partial<SyncConfig> = {}

  if (configPath) {
    try {
      const configFile = await fs.readFile(configPath, 'utf-8')
      userConfig = JSON.parse(configFile)
      console.log(`✓ Loaded configuration from ${configPath}`)
    } catch (error: any) {
      console.error(`✗ Failed to load config from ${configPath}: ${error.message}`)
      process.exit(1)
    }
  }

  // Validate required environment variable
  const youtubeApiKey = process.env.YOUTUBE_API_KEY
  if (!youtubeApiKey) {
    console.error('✗ YOUTUBE_API_KEY environment variable is required')
    console.error('  Set it with: export YOUTUBE_API_KEY=your_api_key')
    process.exit(1)
  }

  // Merge user config with defaults
  const config: SyncConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    youtubeApiKey,
  } as SyncConfig

  return config
}

/**
 * Fetch videos from YouTube channel
 */
async function fetchVideos(
  config: SyncConfig,
  lastSyncTimestamp?: Date
): Promise<YouTubeVideo[]> {
  console.log(`\nFetching videos from channel: ${config.channelId}`)

  const allVideos: YouTubeVideo[] = []
  let pageToken: string | undefined = undefined
  let hasMore = true

  // Determine publishedAfter parameter
  let publishedAfter: string | undefined
  if (!argv.full && lastSyncTimestamp) {
    publishedAfter = lastSyncTimestamp.toISOString()
    console.log(`  Incremental sync from: ${publishedAfter}`)
  }
  if (argv.after) {
    publishedAfter = new Date(argv.after).toISOString()
    console.log(`  Filtering videos after: ${publishedAfter}`)
  }

  // Paginate through YouTube search results
  while (hasMore) {
    const searchResponse = await searchChannelVideos(config.channelId, {
      apiKey: config.youtubeApiKey,
      maxResults: 50,
      pageToken,
      publishedAfter,
    })

    const videoIds = (searchResponse.items || [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => !!id)

    if (videoIds.length === 0) break

    // Get full video details
    const videoDetailsResponse = await getVideoDetails(videoIds, config.youtubeApiKey)

    for (const video of videoDetailsResponse.items || []) {
      if (!video.id || !video.snippet || !video.contentDetails) continue

      // Apply before filter if specified
      if (argv.before) {
        const publishedAt = new Date(video.snippet.publishedAt || '')
        const beforeDate = new Date(argv.before)
        if (publishedAt > beforeDate) continue
      }

      allVideos.push({
        videoId: video.id,
        channelId: video.snippet.channelId || config.channelId,
        title: video.snippet.title || 'Untitled',
        description: video.snippet.description || '',
        publishedAt: video.snippet.publishedAt || new Date().toISOString(),
        duration: video.contentDetails.duration || 'PT0S',
        thumbnailUrl: video.snippet.thumbnails?.maxres?.url ||
                     video.snippet.thumbnails?.high?.url ||
                     video.snippet.thumbnails?.default?.url || '',
        tags: video.snippet.tags,
        privacyStatus: video.status?.privacyStatus as 'public' | 'unlisted' | 'private',
      })
    }

    // Check for more pages
    pageToken = searchResponse.nextPageToken || undefined
    hasMore = !!pageToken

    // Stop if we've reached max videos
    if (config.maxVideos && allVideos.length >= config.maxVideos) {
      hasMore = false
    }
  }

  console.log(`  Found ${allVideos.length} video(s)`)
  return allVideos
}

/**
 * Main sync orchestration function
 */
async function main() {
  console.log('YouTube Channel Sync Script')
  console.log('=' .repeat(50))

  // 1. Load configuration
  const config = await loadConfig(argv.config)
  console.log(`\n✓ Configuration loaded`)
  console.log(`  Channel: ${config.channelId}`)
  console.log(`  Output: ${config.outputDirectory}`)
  console.log(`  Mode: ${argv.full ? 'Full sync' : 'Incremental sync'}`)
  if (argv.dryRun) console.log(`  [DRY RUN MODE]`)

  // 2. Build sync state from git history
  console.log(`\nScanning git history for synced episodes...`)
  const repoPath = process.cwd()
  const syncState: SyncState = await buildSyncState(repoPath, config.outputDirectory)
  console.log(`  Found ${syncState.episodeCount} existing episode(s)`)
  if (syncState.lastSyncTimestamp) {
    console.log(`  Last sync: ${syncState.lastSyncTimestamp.toISOString()}`)
  }

  // 3. Fetch videos from YouTube
  let videos: YouTubeVideo[]
  try {
    videos = await fetchVideos(
      config,
      argv.full ? undefined : syncState.lastSyncTimestamp
    )
  } catch (error: any) {
    console.error(`\n✗ Failed to fetch videos: ${error.message}`)
    process.exit(1)
  }

  // 4. Filter already-synced videos
  const unsyncedVideos = videos.filter((video) => !isVideoSynced(video.videoId, syncState))
  console.log(`\nFiltering: ${unsyncedVideos.length} new video(s) to sync`)

  // 5. Apply exclusions from config
  const filteredVideos = unsyncedVideos.filter((video) => {
    if (config.excludedVideoIds?.includes(video.videoId)) {
      console.log(`  Skipping excluded video: ${video.videoId}`)
      return false
    }
    return true
  })

  if (filteredVideos.length === 0) {
    console.log(`\n✓ No new videos to sync. All up to date!`)
    return
  }

  // 6. Sort by publishedAt ascending
  filteredVideos.sort((a, b) => {
    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  })

  // Apply --max limit
  const videosToSync = argv.max
    ? filteredVideos.slice(0, argv.max)
    : filteredVideos

  console.log(`\nSyncing ${videosToSync.length} video(s)...`)

  // 7. Assign episode numbers sequentially
  const nextEpisodeNumber = syncState.episodeCount + 1
  videosToSync.forEach((video, index) => {
    video.episodeNumber = nextEpisodeNumber + index
  })

  // 8. Process each video
  const successfulSyncs: string[] = []
  const failedSyncs: Array<{ id: string; error: string }> = []

  for (const video of videosToSync) {
    try {
      // Generate episode file
      const result: GenerationResult = await generateEpisodeFile(
        video,
        video.episodeNumber!,
        config
      )

      if (!argv.dryRun) {
        // Ensure output directory exists
        await fs.mkdir(config.outputDirectory, { recursive: true })

        // Write file to disk
        await fs.writeFile(result.filePath, result.content, 'utf-8')
      }

      console.log(`  ✓ Episode ${video.episodeNumber}: ${video.title}`)
      if (argv.dryRun) {
        console.log(`    Would write to: ${result.filePath}`)
      }

      successfulSyncs.push(video.videoId)
    } catch (error: any) {
      console.error(`  ✗ Episode ${video.episodeNumber}: ${video.title}`)
      console.error(`    Error: ${error.message}`)
      failedSyncs.push({ id: video.videoId, error: error.message })
    }
  }

  // 9. Git commit
  if (!argv.dryRun && !argv.noCommit && successfulSyncs.length > 0) {
    try {
      await createGitCommit(videosToSync, config)
    } catch (error: any) {
      console.error(`\n✗ Git commit failed: ${error.message}`)
      console.log(`  Files were created but not committed. Run git commit manually.`)
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`)
  console.log(`Sync Complete!`)
  console.log(`  ✓ Success: ${successfulSyncs.length} episode(s)`)
  if (failedSyncs.length > 0) {
    console.log(`  ✗ Failed: ${failedSyncs.length} episode(s)`)
    for (const failure of failedSyncs) {
      console.log(`    - ${failure.id}: ${failure.error}`)
    }
  }

  if (argv.dryRun) {
    console.log(`\n[DRY RUN] No files were written or committed.`)
  }
}

/**
 * Create git commit for synced episodes
 */
async function createGitCommit(videos: YouTubeVideo[], config: SyncConfig): Promise<void> {
  console.log(`\nCreating git commit...`)

  const git = simpleGit(process.cwd())

  // Generate commit message
  const episodeNumbers = videos.map((v) => v.episodeNumber).join(', ')
  let commitMessage = `Sync ${videos.length} episode(s): ${episodeNumbers}\n\n`

  for (const video of videos) {
    commitMessage += `- Episode ${video.episodeNumber}: ${video.title} (YouTube: ${video.videoId})\n`
  }

  commitMessage += `\nGenerated by youtube-sync script`

  // Add files
  await git.add(`${config.outputDirectory}/*.md`)

  // Commit
  await git.commit(commitMessage)

  // Get commit hash
  const commitHash = await git.revparse(['HEAD'])

  console.log(`  ✓ Committed: ${commitHash.slice(0, 7)}`)
}

// Run main function
main().catch((error) => {
  console.error(`\n✗ Fatal error: ${error.message}`)
  console.error(error.stack)
  process.exit(1)
})
