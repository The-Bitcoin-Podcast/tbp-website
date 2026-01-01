/**
 * Integration test for RSS sync full workflow
 * Tests end-to-end RSS synchronization functionality
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

// Import contracts (these will be implemented in Phase 3.3)
import type { 
  RSSSyncServiceContract,
  SyncConfig,
  SyncResult 
} from '../../quartz/types/rss-sync.js'

// This will be implemented in Phase 3.5
import { createSyncService } from '../../quartz/scripts/rss-sync.js'

describe('RSS Sync Full Workflow Integration', () => {
  let syncService: RSSSyncServiceContract
  const testOutputDir = 'tests/fixtures/temp-episodes'
  const testPodcastFolder = 'test-hio'
  
  // This will fail until implementation exists
  syncService = createSyncService()
  
  const testConfig: SyncConfig = {
    rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
    outputDirectory: testOutputDir,
    podcastFolder: testPodcastFolder,
    podcastName: 'Hashing It Out',
    fileNamePattern: '{number}-{slug}.md',
    autoPublish: false,
    fullSync: false,
    maxEpisodes: 3, // Limit for integration test
    includeDescription: true,
    truncateDescriptionAt: 1000,
    retryAttempts: 2,
    retryBackoff: [100, 500],
    performanceTimeoutMs: 10000,
    generatePlaceholders: true
  }

  before(async () => {
    // Setup test directory
    try {
      await fs.mkdir(path.join(testOutputDir, testPodcastFolder), { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  })

  after(async () => {
    // Cleanup test files
    try {
      await fs.rm(testOutputDir, { recursive: true, force: true })
    } catch (error) {
      // Directory might not exist
    }
  })

  describe('Incremental Sync Workflow', () => {
    it('should perform complete incremental sync from RSS feed', async () => {
      const result = await syncService.syncFeed(testConfig)
      
      // Verify basic result structure
      assert(typeof result.successCount === 'number')
      assert(typeof result.failureCount === 'number')
      assert(typeof result.duration === 'number')
      assert(Array.isArray(result.syncedEpisodes))
      assert(Array.isArray(result.failures))
      
      // Should have synced some episodes
      assert(result.successCount > 0, 'Should have synced at least one episode')
      assert(result.syncedEpisodes.length === result.successCount)
      
      // Verify files were actually created
      for (const episode of result.syncedEpisodes) {
        const fileExists = await fs.access(episode.filePath).then(() => true).catch(() => false)
        assert(fileExists, `Episode file should exist: ${episode.filePath}`)
        
        // Verify file is in correct podcast folder
        assert(episode.filePath.includes(testPodcastFolder), 
          `Episode should be in podcast folder: ${episode.filePath}`)
        
        // Verify file content structure
        const content = await fs.readFile(episode.filePath, 'utf-8')
        assert(content.includes('---'), 'File should have frontmatter')
        assert(content.includes('title:'), 'File should have title in frontmatter')
        assert(content.includes('episodeNumber:'), 'File should have episode number')
        assert(content.includes('rssGuid:'), 'File should have RSS GUID')
        assert(content.includes('audioUrl:'), 'File should have audio URL')
      }
    })

    it('should handle subsequent sync without duplicating episodes', async () => {
      // First sync
      const firstResult = await syncService.syncFeed(testConfig)
      const firstCount = firstResult.successCount
      
      // Second sync immediately after
      const secondResult = await syncService.syncFeed(testConfig)
      
      // Second sync should find no new episodes to sync
      assert(secondResult.successCount === 0, 
        'Second sync should find no new episodes')
      
      // Total files should remain the same
      const files = await fs.readdir(path.join(testOutputDir, testPodcastFolder))
      const markdownFiles = files.filter(f => f.endsWith('.md'))
      assert(markdownFiles.length === firstCount, 
        'File count should remain the same after second sync')
    })

    it('should respect maxEpisodes limit', async () => {
      const limitedConfig: SyncConfig = {
        ...testConfig,
        maxEpisodes: 2,
        outputDirectory: 'tests/fixtures/temp-episodes-limited',
        podcastFolder: 'test-limited'
      }
      
      // Setup limited test directory
      await fs.mkdir(path.join(limitedConfig.outputDirectory, limitedConfig.podcastFolder), 
        { recursive: true })
      
      try {
        const result = await syncService.syncFeed(limitedConfig)
        
        assert(result.successCount <= 2, 'Should respect maxEpisodes limit')
        assert(result.syncedEpisodes.length <= 2, 'Should not sync more than maxEpisodes')
        
        // Verify actual file count
        const files = await fs.readdir(path.join(limitedConfig.outputDirectory, limitedConfig.podcastFolder))
        const markdownFiles = files.filter(f => f.endsWith('.md'))
        assert(markdownFiles.length <= 2, 'Should not create more files than maxEpisodes')
        
      } finally {
        // Cleanup limited test directory
        await fs.rm(limitedConfig.outputDirectory, { recursive: true, force: true })
      }
    })
  })

  describe('Full Sync Workflow', () => {
    it('should perform full sync ignoring previous state', async () => {
      // First do incremental sync to establish state
      await syncService.syncFeed(testConfig)
      
      // Then do full sync
      const fullSyncResult = await syncService.fullSync(testConfig)
      
      assert(typeof fullSyncResult.successCount === 'number')
      assert(typeof fullSyncResult.failureCount === 'number')
      assert(Array.isArray(fullSyncResult.syncedEpisodes))
      
      // Full sync should process episodes even if they were previously synced
      assert(fullSyncResult.successCount > 0, 'Full sync should process episodes')
    })
  })

  describe('Dry Run Workflow', () => {
    it('should preview sync without creating files', async () => {
      const previewConfig: SyncConfig = {
        ...testConfig,
        outputDirectory: 'tests/fixtures/temp-episodes-preview',
        podcastFolder: 'test-preview'
      }
      
      const preview = await syncService.dryRun(previewConfig)
      
      assert(Array.isArray(preview.newEpisodes), 'Should return array of new episodes')
      assert(typeof preview.totalCount === 'number', 'Should return total count')
      assert(Array.isArray(preview.estimatedFiles), 'Should return estimated file paths')
      
      // Verify no files were actually created
      const directoryExists = await fs.access(previewConfig.outputDirectory)
        .then(() => true)
        .catch(() => false)
      
      assert(!directoryExists, 'Dry run should not create any directories or files')
      
      // Verify preview data structure
      if (preview.newEpisodes.length > 0) {
        const episode = preview.newEpisodes[0]
        assert(typeof episode.guid === 'string')
        assert(typeof episode.title === 'string')
        assert(episode.publishDate instanceof Date)
        assert(typeof episode.estimatedFilePath === 'string')
        assert(typeof episode.episodeNumber === 'number')
        
        // Estimated path should include podcast folder
        assert(episode.estimatedFilePath.includes(previewConfig.podcastFolder))
      }
    })
  })

  describe('Sync State Management', () => {
    it('should track sync state correctly', async () => {
      // Perform sync
      await syncService.syncFeed(testConfig)
      
      // Get sync state
      const state = await syncService.getSyncState(testConfig.outputDirectory, testConfig.podcastFolder)
      
      assert(state.syncedGuids instanceof Set, 'Should track synced GUIDs as Set')
      assert(typeof state.episodeCount === 'number', 'Should track episode count')
      assert(state.episodeCount > 0, 'Should have tracked some episodes')
      assert(Array.isArray(state.syncHistory), 'Should maintain sync history')
      assert(state.podcastFolder === testConfig.podcastFolder, 'Should track correct podcast folder')
      
      // Verify sync history records
      if (state.syncHistory.length > 0) {
        const record = state.syncHistory[0]
        assert(typeof record.guid === 'string')
        assert(typeof record.episodePath === 'string')
        assert(record.syncedAt instanceof Date)
        assert(typeof record.commitHash === 'string')
      }
    })

    it('should maintain separate state for different podcast folders', async () => {
      const altConfig: SyncConfig = {
        ...testConfig,
        podcastFolder: 'test-alt-podcast',
        maxEpisodes: 1
      }
      
      // Setup alternate directory
      await fs.mkdir(path.join(testConfig.outputDirectory, altConfig.podcastFolder), 
        { recursive: true })
      
      try {
        // Sync to alternate folder
        await syncService.syncFeed(altConfig)
        
        // Get states for both folders
        const mainState = await syncService.getSyncState(
          testConfig.outputDirectory, 
          testConfig.podcastFolder
        )
        const altState = await syncService.getSyncState(
          testConfig.outputDirectory, 
          altConfig.podcastFolder
        )
        
        assert(mainState.podcastFolder === testConfig.podcastFolder)
        assert(altState.podcastFolder === altConfig.podcastFolder)
        
        // States should be independent
        assert(mainState.syncedGuids.size !== altState.syncedGuids.size || 
               mainState.episodeCount !== altState.episodeCount,
               'Different podcast folders should have independent state')
        
      } finally {
        // Cleanup alternate directory
        await fs.rm(path.join(testConfig.outputDirectory, altConfig.podcastFolder), 
          { recursive: true, force: true })
      }
    })
  })
})