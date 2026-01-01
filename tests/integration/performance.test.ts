/**
 * Integration test for performance requirements
 * Tests that RSS sync meets the 30-second requirement for 100 episodes
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'

// Import contracts (these will be implemented in Phase 3.3)
import type { 
  RSSSyncServiceContract,
  SyncConfig 
} from '../../quartz/types/rss-sync.js'

// This will be implemented in Phase 3.5
import { createSyncService } from '../../quartz/scripts/rss-sync.js'

describe('RSS Sync Performance Requirements', () => {
  let syncService: RSSSyncServiceContract
  const testOutputDir = 'tests/fixtures/temp-performance'
  const testPodcastFolder = 'test-performance'
  
  // This will fail until implementation exists
  syncService = createSyncService()
  
  const performanceConfig: SyncConfig = {
    rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
    outputDirectory: testOutputDir,
    podcastFolder: testPodcastFolder,
    podcastName: 'Hashing It Out',
    fileNamePattern: '{number}-{slug}.md',
    autoPublish: false,
    fullSync: false,
    maxEpisodes: undefined, // No limit for performance testing
    includeDescription: true,
    truncateDescriptionAt: 5000,
    retryAttempts: 3,
    retryBackoff: [1000, 5000, 15000],
    performanceTimeoutMs: 30000, // 30 seconds as per requirements
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

  describe('Sync Performance', () => {
    it('should complete incremental sync within 30 seconds for up to 100 episodes', async () => {
      const startTime = Date.now()
      
      // Perform sync with no episode limit to test real-world performance
      const result = await syncService.syncFeed(performanceConfig)
      
      const duration = Date.now() - startTime
      const durationSeconds = duration / 1000
      
      // Must complete within 30 seconds
      assert(duration < 30000, 
        `Sync took ${durationSeconds.toFixed(1)}s, must be under 30s. ` +
        `Processed ${result.successCount} episodes.`)
      
      // Log performance metrics for analysis
      console.log(`Performance test results:`)
      console.log(`- Episodes synced: ${result.successCount}`)
      console.log(`- Duration: ${durationSeconds.toFixed(1)}s`)
      console.log(`- Episodes per second: ${(result.successCount / durationSeconds).toFixed(1)}`)
      console.log(`- Average time per episode: ${(duration / result.successCount).toFixed(0)}ms`)
      
      // Verify operation completed successfully
      assert(result.successCount > 0, 'Should have successfully synced some episodes')
      assert(result.failureCount === 0 || result.failureCount < result.successCount, 
        'Should have minimal failures relative to successes')
    })

    it('should complete full sync within 30 seconds for reasonable episode counts', async () => {
      const limitedConfig: SyncConfig = {
        ...performanceConfig,
        maxEpisodes: 50, // Limit for full sync performance test
        outputDirectory: 'tests/fixtures/temp-full-performance',
        podcastFolder: 'test-full-performance'
      }
      
      // Setup limited test directory
      await fs.mkdir(path.join(limitedConfig.outputDirectory, limitedConfig.podcastFolder), 
        { recursive: true })
      
      try {
        const startTime = Date.now()
        
        const result = await syncService.fullSync(limitedConfig)
        
        const duration = Date.now() - startTime
        const durationSeconds = duration / 1000
        
        // Full sync should also complete within 30 seconds for 50 episodes
        assert(duration < 30000, 
          `Full sync took ${durationSeconds.toFixed(1)}s, must be under 30s. ` +
          `Processed ${result.successCount} episodes.`)
        
        console.log(`Full sync performance results:`)
        console.log(`- Episodes synced: ${result.successCount}`)
        console.log(`- Duration: ${durationSeconds.toFixed(1)}s`)
        
      } finally {
        // Cleanup limited test directory
        await fs.rm(limitedConfig.outputDirectory, { recursive: true, force: true })
      }
    })

    it('should handle performance timeout configuration correctly', async () => {
      const shortTimeoutConfig: SyncConfig = {
        ...performanceConfig,
        maxEpisodes: 1, // Single episode to ensure it completes
        performanceTimeoutMs: 5000, // 5 second timeout
        outputDirectory: 'tests/fixtures/temp-timeout',
        podcastFolder: 'test-timeout'
      }
      
      // Setup timeout test directory
      await fs.mkdir(path.join(shortTimeoutConfig.outputDirectory, shortTimeoutConfig.podcastFolder), 
        { recursive: true })
      
      try {
        const startTime = Date.now()
        
        const result = await syncService.syncFeed(shortTimeoutConfig)
        
        const duration = Date.now() - startTime
        
        // Should complete within the configured timeout for single episode
        assert(duration < shortTimeoutConfig.performanceTimeoutMs, 
          `Sync should complete within configured timeout of ${shortTimeoutConfig.performanceTimeoutMs}ms`)
        
        // Should successfully sync the single episode
        assert(result.successCount > 0, 'Should have synced the limited episode')
        
      } finally {
        // Cleanup timeout test directory
        await fs.rm(shortTimeoutConfig.outputDirectory, { recursive: true, force: true })
      }
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not consume excessive memory during large syncs', async () => {
      const initialMemory = process.memoryUsage()
      
      // Perform sync
      const result = await syncService.syncFeed(performanceConfig)
      
      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024)
      
      // Memory increase should be reasonable (less than 100MB for RSS sync)
      assert(memoryIncreaseMB < 100, 
        `Memory usage increased by ${memoryIncreaseMB.toFixed(1)}MB, should be under 100MB`)
      
      console.log(`Memory usage test results:`)
      console.log(`- Episodes processed: ${result.successCount}`)
      console.log(`- Memory increase: ${memoryIncreaseMB.toFixed(1)}MB`)
      console.log(`- Memory per episode: ${(memoryIncrease / result.successCount / 1024).toFixed(1)}KB`)
    })
  })

  describe('Concurrent Operation Performance', () => {
    it('should handle dry run performance efficiently', async () => {
      const startTime = Date.now()
      
      // Dry run should be very fast since it doesn't write files
      const preview = await syncService.dryRun(performanceConfig)
      
      const duration = Date.now() - startTime
      const durationSeconds = duration / 1000
      
      // Dry run should be much faster than actual sync (under 10 seconds)
      assert(duration < 10000, 
        `Dry run took ${durationSeconds.toFixed(1)}s, should be under 10s`)
      
      console.log(`Dry run performance results:`)
      console.log(`- Episodes analyzed: ${preview.totalCount}`)
      console.log(`- Duration: ${durationSeconds.toFixed(1)}s`)
      
      // Verify preview returned reasonable data
      assert(preview.totalCount >= 0, 'Should return valid episode count')
      assert(Array.isArray(preview.newEpisodes), 'Should return episodes array')
      assert(Array.isArray(preview.estimatedFiles), 'Should return file paths array')
    })

    it('should handle sync state retrieval efficiently', async () => {
      // First ensure we have some state to retrieve
      await syncService.syncFeed({
        ...performanceConfig,
        maxEpisodes: 5 // Small sync to establish state
      })
      
      const startTime = Date.now()
      
      const state = await syncService.getSyncState(
        performanceConfig.outputDirectory, 
        performanceConfig.podcastFolder
      )
      
      const duration = Date.now() - startTime
      
      // State retrieval should be very fast (under 1 second)
      assert(duration < 1000, 
        `State retrieval took ${duration}ms, should be under 1000ms`)
      
      console.log(`State retrieval performance: ${duration}ms`)
      
      // Verify state data is valid
      assert(state.syncedGuids instanceof Set)
      assert(typeof state.episodeCount === 'number')
      assert(Array.isArray(state.syncHistory))
    })
  })
})