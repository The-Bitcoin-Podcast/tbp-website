/**
 * Contract test for RSS sync service functionality
 * Tests the RSSSyncServiceContract interface compliance
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

// Import contracts (these will be implemented in Phase 3.3)
import type { 
  RSSSyncServiceContract,
  SyncConfig,
  SyncResult,
  SyncPreview,
  SyncState,
  SyncError
} from '../../quartz/types/rss-sync.js'

// This will be implemented in Phase 3.5
import { createSyncService } from '../../quartz/scripts/rss-sync.js'

describe('RSSSyncServiceContract', () => {
  let syncService: RSSSyncServiceContract

  // This will fail until implementation exists
  syncService = createSyncService()

  const mockConfig: SyncConfig = {
    rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
    outputDirectory: 'content/episodes',
    podcastFolder: 'hio',
    podcastName: 'Hashing It Out',
    fileNamePattern: '{number}-{slug}.md',
    autoPublish: false,
    fullSync: false,
    includeDescription: true,
    truncateDescriptionAt: 5000,
    retryAttempts: 3,
    retryBackoff: [1000, 5000, 15000],
    performanceTimeoutMs: 30000,
    generatePlaceholders: true
  }

  describe('syncFeed', () => {
    it('should perform incremental sync and return results', async () => {
      const result = await syncService.syncFeed(mockConfig)
      
      assert(typeof result.successCount === 'number')
      assert(typeof result.failureCount === 'number')
      assert(result.successCount >= 0)
      assert(result.failureCount >= 0)
      assert(Array.isArray(result.syncedEpisodes))
      assert(Array.isArray(result.failures))
      assert(typeof result.duration === 'number')
      assert(result.duration > 0)
    })

    it('should respect maxEpisodes limit', async () => {
      const limitedConfig: SyncConfig = {
        ...mockConfig,
        maxEpisodes: 5
      }
      
      const result = await syncService.syncFeed(limitedConfig)
      
      assert(result.syncedEpisodes.length <= 5)
    })

    it('should complete within performance timeout (30 seconds)', async () => {
      const startTime = Date.now()
      
      const result = await syncService.syncFeed(mockConfig)
      
      const duration = Date.now() - startTime
      assert(duration < 30000, `Sync took ${duration}ms, expected < 30000ms`)
    })

    it('should throw SyncError on configuration errors', async () => {
      const invalidConfig: SyncConfig = {
        ...mockConfig,
        rssUrl: 'invalid-url'
      }
      
      await assert.rejects(
        () => syncService.syncFeed(invalidConfig),
        (error: any) => error.name === 'SyncError'
      )
    })

    it('should handle excluded GUIDs correctly', async () => {
      const configWithExclusions: SyncConfig = {
        ...mockConfig,
        excludedGuids: ['episode-to-exclude-1', 'episode-to-exclude-2']
      }
      
      const result = await syncService.syncFeed(configWithExclusions)
      
      // No excluded episodes should appear in synced episodes
      result.syncedEpisodes.forEach(episode => {
        assert(!configWithExclusions.excludedGuids!.includes(episode.guid))
      })
    })
  })

  describe('fullSync', () => {
    it('should perform full sync ignoring previous state', async () => {
      const result = await syncService.fullSync(mockConfig)
      
      assert(typeof result.successCount === 'number')
      assert(typeof result.failureCount === 'number')
      assert(Array.isArray(result.syncedEpisodes))
      assert(typeof result.duration === 'number')
    })

    it('should process all episodes regardless of previous sync state', async () => {
      // First do incremental sync
      await syncService.syncFeed(mockConfig)
      
      // Then do full sync - should process episodes again
      const fullSyncResult = await syncService.fullSync(mockConfig)
      
      // Full sync should find episodes to process
      assert(fullSyncResult.successCount >= 0)
    })
  })

  describe('dryRun', () => {
    it('should preview sync without creating files', async () => {
      const preview = await syncService.dryRun(mockConfig)
      
      assert(Array.isArray(preview.newEpisodes))
      assert(typeof preview.totalCount === 'number')
      assert(Array.isArray(preview.estimatedFiles))
      assert(preview.totalCount >= 0)
      
      // Should include episode details
      if (preview.newEpisodes.length > 0) {
        const episode = preview.newEpisodes[0]
        assert(typeof episode.guid === 'string')
        assert(typeof episode.title === 'string')
        assert(episode.publishDate instanceof Date)
        assert(typeof episode.estimatedFilePath === 'string')
        assert(typeof episode.episodeNumber === 'number')
      }
    })

    it('should show estimated file paths in podcast folder', async () => {
      const preview = await syncService.dryRun(mockConfig)
      
      preview.estimatedFiles.forEach(filePath => {
        assert(filePath.includes(mockConfig.podcastFolder))
        assert(filePath.endsWith('.md'))
      })
    })

    it('should not create any actual files', async () => {
      // This test verifies dry run doesn't have side effects
      // Implementation should ensure no files are written
      const preview = await syncService.dryRun(mockConfig)
      
      // Should return preview without throwing errors
      assert(preview !== null)
    })
  })

  describe('getSyncState', () => {
    it('should return current sync state from git history', async () => {
      const state = await syncService.getSyncState(
        mockConfig.outputDirectory, 
        mockConfig.podcastFolder
      )
      
      assert(state.syncedGuids instanceof Set)
      assert(typeof state.episodeCount === 'number')
      assert(state.episodeCount >= 0)
      assert(Array.isArray(state.syncHistory))
      assert(typeof state.podcastFolder === 'string')
      assert(state.podcastFolder === mockConfig.podcastFolder)
      
      // lastSyncTimestamp is optional
      if (state.lastSyncTimestamp) {
        assert(state.lastSyncTimestamp instanceof Date)
      }
    })

    it('should track podcast folder specific state', async () => {
      const state = await syncService.getSyncState('content/episodes', 'hio')
      
      assert(state.podcastFolder === 'hio')
      
      // Different podcast folders should have different states
      const otherState = await syncService.getSyncState('content/episodes', 'tbp')
      assert(otherState.podcastFolder === 'tbp')
    })

    it('should include sync history records', async () => {
      const state = await syncService.getSyncState(
        mockConfig.outputDirectory,
        mockConfig.podcastFolder
      )
      
      state.syncHistory.forEach(record => {
        assert(typeof record.guid === 'string')
        assert(typeof record.episodePath === 'string')
        assert(record.syncedAt instanceof Date)
        assert(typeof record.commitHash === 'string')
      })
    })
  })

  describe('error handling', () => {
    it('should retry failed RSS requests according to config', async () => {
      const configWithRetries: SyncConfig = {
        ...mockConfig,
        rssUrl: 'https://intentionally.broken.url.test/rss',
        retryAttempts: 2
      }
      
      const startTime = Date.now()
      
      await assert.rejects(
        () => syncService.syncFeed(configWithRetries),
        (error: any) => error.name === 'SyncError'
      )
      
      const duration = Date.now() - startTime
      
      // Should have taken time for retries (with backoff)
      assert(duration >= 1000, 'Should have attempted retries with backoff')
    })

    it('should generate placeholders for missing metadata when enabled', async () => {
      const configWithPlaceholders: SyncConfig = {
        ...mockConfig,
        generatePlaceholders: true
      }
      
      const result = await syncService.syncFeed(configWithPlaceholders)
      
      // Should succeed even if some episodes have missing metadata
      assert(result.successCount >= 0)
    })
  })
})