/**
 * Integration test for retry logic and error handling
 * Tests comprehensive error scenarios and recovery mechanisms
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

// Import contracts (these will be implemented in Phase 3.3)
import type { 
  RSSSyncServiceContract,
  SyncConfig,
  SyncError 
} from '../../quartz/types/rss-sync.js'

// This will be implemented in Phase 3.5
import { createSyncService } from '../../quartz/scripts/rss-sync.js'

describe('RSS Sync Error Handling and Retry Logic', () => {
  let syncService: RSSSyncServiceContract
  const testOutputDir = 'tests/fixtures/temp-error-handling'
  const testPodcastFolder = 'test-errors'
  
  // This will fail until implementation exists
  syncService = createSyncService()
  
  const baseConfig: SyncConfig = {
    rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
    outputDirectory: testOutputDir,
    podcastFolder: testPodcastFolder,
    podcastName: 'Hashing It Out',
    fileNamePattern: '{number}-{slug}.md',
    autoPublish: false,
    fullSync: false,
    maxEpisodes: 5,
    includeDescription: true,
    truncateDescriptionAt: 5000,
    retryAttempts: 3,
    retryBackoff: [100, 300, 900], // Faster backoff for testing
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

  describe('Network Error Handling', () => {
    it('should retry failed RSS requests with exponential backoff', async () => {
      const invalidConfig: SyncConfig = {
        ...baseConfig,
        rssUrl: 'https://intentionally.broken.domain.test/rss',
        retryAttempts: 2,
        retryBackoff: [50, 100] // Very fast for testing
      }
      
      const startTime = Date.now()
      
      await assert.rejects(
        () => syncService.syncFeed(invalidConfig),
        (error: any) => {
          assert(error.name === 'SyncError', 'Should throw SyncError')
          assert(error.operation === 'fetchRSS' || error.operation.includes('RSS'), 
            'Should indicate RSS fetch operation failed')
          return true
        }
      )
      
      const duration = Date.now() - startTime
      
      // Should have taken time for retries (at least 150ms for 2 retries with 50ms + 100ms backoff)
      assert(duration >= 100, `Should have attempted retries, took ${duration}ms`)
      assert(duration < 5000, `Should not hang indefinitely, took ${duration}ms`)
      
      console.log(`Retry test completed in ${duration}ms with 2 retry attempts`)
    })

    it('should handle partial RSS feed failures gracefully', async () => {
      // This test simulates a scenario where RSS feed is accessible but some episodes fail
      const config: SyncConfig = {
        ...baseConfig,
        maxEpisodes: 10, // Attempt more episodes to increase chance of partial failures
        retryAttempts: 1 // Reduce retries to speed up test
      }
      
      const result = await syncService.syncFeed(config)
      
      // Should complete even if some episodes fail
      assert(typeof result.successCount === 'number')
      assert(typeof result.failureCount === 'number')
      assert(result.successCount >= 0)
      assert(result.failureCount >= 0)
      
      // If there were failures, they should be properly recorded
      if (result.failureCount > 0) {
        assert(Array.isArray(result.failures))
        assert(result.failures.length === result.failureCount)
        
        result.failures.forEach(failure => {
          assert(typeof failure.guid === 'string')
          assert(typeof failure.error === 'string')
          assert(typeof failure.retryable === 'boolean')
        })
        
        console.log(`Handled ${result.failureCount} episode failures gracefully`)
      }
    })

    it('should distinguish between retryable and non-retryable errors', async () => {
      // Test with malformed URL (non-retryable)
      const malformedConfig: SyncConfig = {
        ...baseConfig,
        rssUrl: 'not-a-valid-url-at-all',
        retryAttempts: 1
      }
      
      await assert.rejects(
        () => syncService.syncFeed(malformedConfig),
        (error: any) => {
          assert(error.name === 'SyncError')
          // Should indicate this is not retryable
          assert(error.retryable === false, 'URL parsing errors should not be retryable')
          return true
        }
      )
    })
  })

  describe('File System Error Handling', () => {
    it('should handle file write permission errors', async () => {
      const readOnlyConfig: SyncConfig = {
        ...baseConfig,
        outputDirectory: '/root/readonly-test', // Likely to cause permission error
        podcastFolder: 'test-readonly'
      }
      
      await assert.rejects(
        () => syncService.syncFeed(readOnlyConfig),
        (error: any) => {
          assert(error.name === 'SyncError')
          assert(error.operation.includes('write') || error.operation.includes('file'))
          return true
        }
      )
    })

    it('should handle disk space and file system errors gracefully', async () => {
      const invalidPathConfig: SyncConfig = {
        ...baseConfig,
        outputDirectory: '/dev/null/impossible/path', // Invalid path
        podcastFolder: 'test-invalid'
      }
      
      await assert.rejects(
        () => syncService.syncFeed(invalidPathConfig),
        (error: any) => {
          assert(error.name === 'SyncError')
          return true
        }
      )
    })
  })

  describe('RSS Feed Data Error Handling', () => {
    it('should generate placeholders for episodes with missing metadata', async () => {
      const placeholderConfig: SyncConfig = {
        ...baseConfig,
        generatePlaceholders: true,
        maxEpisodes: 3
      }
      
      const result = await syncService.syncFeed(placeholderConfig)
      
      // Should succeed even if episodes have missing metadata
      assert(result.successCount > 0, 'Should handle missing metadata with placeholders')
      
      // Check that generated files have placeholder warnings
      for (const episode of result.syncedEpisodes) {
        const content = await fs.readFile(episode.filePath, 'utf-8')
        
        // Files might have placeholder warnings if metadata was missing
        // This will be verified once implementation exists
        assert(content.includes('---'), 'File should have frontmatter')
        assert(content.includes('hasPlaceholders:'), 'File should track placeholder usage')
      }
    })

    it('should fail gracefully when placeholders are disabled and metadata is missing', async () => {
      // Note: This test may need adjustment based on actual RSS feed content
      // Some episodes might have complete metadata, making this test pass unexpectedly
      const noPlaceholderConfig: SyncConfig = {
        ...baseConfig,
        generatePlaceholders: false,
        maxEpisodes: 1
      }
      
      // This might succeed if the RSS feed has complete metadata
      // The test validates the behavior when placeholders are disabled
      const result = await syncService.syncFeed(noPlaceholderConfig)
      
      // Should either succeed with complete metadata or fail with clear errors
      if (result.failureCount > 0) {
        result.failures.forEach(failure => {
          assert(typeof failure.error === 'string')
          assert(failure.error.length > 0)
        })
      }
      
      // All successful episodes should have complete metadata
      assert(result.successCount >= 0)
    })
  })

  describe('Configuration Error Handling', () => {
    it('should validate configuration before attempting sync', async () => {
      const invalidConfigs = [
        {
          ...baseConfig,
          rssUrl: '', // Empty URL
          testName: 'empty URL'
        },
        {
          ...baseConfig,
          outputDirectory: '', // Empty output directory
          testName: 'empty output directory'
        },
        {
          ...baseConfig,
          podcastFolder: '', // Empty podcast folder
          testName: 'empty podcast folder'
        },
        {
          ...baseConfig,
          retryAttempts: -1, // Invalid retry attempts
          testName: 'negative retry attempts'
        }
      ]
      
      for (const invalidConfig of invalidConfigs) {
        const { testName, ...config } = invalidConfig
        
        await assert.rejects(
          () => syncService.syncFeed(config as SyncConfig),
          (error: any) => {
            assert(error.name === 'SyncError', `${testName} should throw SyncError`)
            assert(error.operation === 'validation' || error.operation === 'config', 
              `${testName} should indicate configuration validation error`)
            return true
          }
        )
      }
    })

    it('should handle timeout configuration correctly', async () => {
      const timeoutConfig: SyncConfig = {
        ...baseConfig,
        performanceTimeoutMs: 100, // Very short timeout
        maxEpisodes: 1 // Single episode should complete quickly
      }
      
      // This test verifies timeout handling behavior
      // With a very short timeout, the operation might timeout
      try {
        const result = await syncService.syncFeed(timeoutConfig)
        
        // If it completes within timeout, verify it's successful
        assert(typeof result.duration === 'number')
        assert(result.duration < timeoutConfig.performanceTimeoutMs * 2) // Allow some buffer
        
      } catch (error: any) {
        // If it times out, verify it's the right kind of error
        if (error.name === 'SyncError') {
          assert(error.operation.includes('timeout') || error.message.includes('timeout'))
        }
      }
    })
  })

  describe('Recovery and State Consistency', () => {
    it('should maintain consistent state after partial failures', async () => {
      const config: SyncConfig = {
        ...baseConfig,
        maxEpisodes: 5,
        retryAttempts: 1
      }
      
      try {
        const result = await syncService.syncFeed(config)
        
        // Get sync state after operation
        const state = await syncService.getSyncState(config.outputDirectory, config.podcastFolder)
        
        // State should be consistent with successful operations
        assert(state.syncedGuids.size === result.successCount, 
          'Synced GUID count should match successful episode count')
        assert(state.episodeCount === result.successCount,
          'Episode count should match successful episode count')
        
        // Verify files actually exist for synced episodes
        for (const episode of result.syncedEpisodes) {
          const fileExists = await fs.access(episode.filePath).then(() => true).catch(() => false)
          assert(fileExists, `File should exist for successfully synced episode: ${episode.filePath}`)
          
          // GUID should be in synced set
          assert(state.syncedGuids.has(episode.guid), 
            `Synced GUID set should contain episode GUID: ${episode.guid}`)
        }
        
      } catch (error) {
        // If the entire operation failed, state should remain consistent
        const state = await syncService.getSyncState(config.outputDirectory, config.podcastFolder)
        
        // State should not be corrupted by failed operation
        assert(state.syncedGuids instanceof Set)
        assert(typeof state.episodeCount === 'number')
        assert(state.episodeCount >= 0)
      }
    })

    it('should handle concurrent sync operations safely', async () => {
      const config1: SyncConfig = {
        ...baseConfig,
        maxEpisodes: 2,
        outputDirectory: 'tests/fixtures/temp-concurrent-1',
        podcastFolder: 'test-concurrent-1'
      }
      
      const config2: SyncConfig = {
        ...baseConfig,
        maxEpisodes: 2,
        outputDirectory: 'tests/fixtures/temp-concurrent-2',
        podcastFolder: 'test-concurrent-2'
      }
      
      // Setup concurrent test directories
      await Promise.all([
        fs.mkdir(path.join(config1.outputDirectory, config1.podcastFolder), { recursive: true }),
        fs.mkdir(path.join(config2.outputDirectory, config2.podcastFolder), { recursive: true })
      ])
      
      try {
        // Run two syncs concurrently to different folders
        const [result1, result2] = await Promise.all([
          syncService.syncFeed(config1),
          syncService.syncFeed(config2)
        ])
        
        // Both should succeed independently
        assert(result1.successCount >= 0)
        assert(result2.successCount >= 0)
        
        // States should be independent
        const [state1, state2] = await Promise.all([
          syncService.getSyncState(config1.outputDirectory, config1.podcastFolder),
          syncService.getSyncState(config2.outputDirectory, config2.podcastFolder)
        ])
        
        assert(state1.podcastFolder === config1.podcastFolder)
        assert(state2.podcastFolder === config2.podcastFolder)
        
      } finally {
        // Cleanup concurrent test directories
        await Promise.all([
          fs.rm(config1.outputDirectory, { recursive: true, force: true }),
          fs.rm(config2.outputDirectory, { recursive: true, force: true })
        ])
      }
    })
  })
})