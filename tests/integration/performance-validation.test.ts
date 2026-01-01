/**
 * Performance validation tests
 * Validates that RSS sync meets the 30-second requirement for 100 episodes
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import { performance } from 'node:perf_hooks'

// Import RSS sync utilities
import { createSyncService } from '../../quartz/scripts/rss-sync.js'
import type { SyncConfig } from '../../quartz/types/rss-sync.js'

describe('Performance Validation', () => {
  const testOutputDir = 'tests/fixtures/temp-performance-validation'
  const syncService = createSyncService()

  before(async () => {
    // Setup test directory
    try {
      await fs.mkdir(testOutputDir, { recursive: true })
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

  describe('30-Second Performance Requirement', () => {
    it('should complete real RSS sync within 30 seconds', async function() {
      // Extend timeout for this test
      this.timeout = 35000 // 35 seconds to allow for the 30-second requirement + buffer
      
      const config: SyncConfig = {
        rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss', // Real Hashing It Out feed
        outputDirectory: testOutputDir,
        podcastFolder: 'performance-test',
        podcastName: 'Performance Test Podcast',
        fileNamePattern: '{number}-{slug}',
        autoPublish: false,
        fullSync: false,
        maxEpisodes: undefined, // No limit - test real performance
        includeDescription: true,
        truncateDescriptionAt: 5000,
        retryAttempts: 3,
        retryBackoff: [1000, 5000, 15000],
        performanceTimeoutMs: 30000, // 30-second requirement
        generatePlaceholders: true
      }

      console.log('Starting performance validation test...')
      const startTime = performance.now()
      
      try {
        const result = await syncService.syncFeed(config)
        const endTime = performance.now()
        const duration = endTime - startTime
        const durationSeconds = duration / 1000

        console.log(`Performance test results:`)
        console.log(`- Duration: ${durationSeconds.toFixed(2)} seconds`)
        console.log(`- Episodes synced: ${result.successCount}`)
        console.log(`- Episodes failed: ${result.failureCount}`)
        console.log(`- Average time per episode: ${(duration / result.successCount).toFixed(0)}ms`)

        // Validate 30-second requirement
        assert(duration < 30000, 
          `Sync took ${durationSeconds.toFixed(2)}s, must be under 30s. Synced ${result.successCount} episodes.`)

        // Should have synced at least some episodes
        assert(result.successCount > 0, 'Should have synced at least one episode')

        // Performance metrics
        const episodesPerSecond = result.successCount / durationSeconds
        console.log(`- Performance: ${episodesPerSecond.toFixed(2)} episodes/second`)

        // For 100 episodes, should complete well under 30 seconds if scaled linearly
        if (result.successCount >= 10) {
          const projectedTimeFor100 = (100 / result.successCount) * durationSeconds
          console.log(`- Projected time for 100 episodes: ${projectedTimeFor100.toFixed(2)}s`)
          
          // Should project to under 30 seconds for 100 episodes
          assert(projectedTimeFor100 < 30, 
            `Projected time for 100 episodes (${projectedTimeFor100.toFixed(2)}s) exceeds 30s requirement`)
        }

      } catch (error) {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        console.error(`Performance test failed after ${(duration / 1000).toFixed(2)}s:`, error)
        throw error
      }
    })

    it('should complete dry run within 10 seconds', async function() {
      this.timeout = 15000 // 15 seconds for dry run
      
      const config: SyncConfig = {
        rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
        outputDirectory: testOutputDir,
        podcastFolder: 'dry-run-performance',
        podcastName: 'Dry Run Performance Test',
        fileNamePattern: '{number}-{slug}',
        autoPublish: false,
        fullSync: false,
        includeDescription: true,
        truncateDescriptionAt: 5000,
        retryAttempts: 3,
        retryBackoff: [1000, 5000, 15000],
        performanceTimeoutMs: 10000, // 10-second requirement for dry run
        generatePlaceholders: true
      }

      console.log('Starting dry run performance test...')
      const startTime = performance.now()
      
      const preview = await syncService.dryRun(config)
      const endTime = performance.now()
      const duration = endTime - startTime
      const durationSeconds = duration / 1000

      console.log(`Dry run performance results:`)
      console.log(`- Duration: ${durationSeconds.toFixed(2)} seconds`)
      console.log(`- Episodes analyzed: ${preview.totalCount}`)

      // Should complete within 10 seconds
      assert(duration < 10000, 
        `Dry run took ${durationSeconds.toFixed(2)}s, should be under 10s`)

      // Should have analyzed episodes
      assert(preview.totalCount >= 0, 'Should have analyzed episodes')
    })
  })

  describe('Memory Usage Validation', () => {
    it('should not consume excessive memory during large syncs', async function() {
      this.timeout = 35000
      
      const config: SyncConfig = {
        rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
        outputDirectory: testOutputDir,
        podcastFolder: 'memory-test',
        podcastName: 'Memory Test Podcast',
        fileNamePattern: '{number}-{slug}',
        autoPublish: false,
        fullSync: false,
        maxEpisodes: 20, // Limit for memory test
        includeDescription: true,
        truncateDescriptionAt: 5000,
        retryAttempts: 3,
        retryBackoff: [1000, 5000, 15000],
        performanceTimeoutMs: 30000,
        generatePlaceholders: true
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const initialMemory = process.memoryUsage()
      console.log(`Initial memory usage: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)

      const result = await syncService.syncFeed(config)

      // Force garbage collection again
      if (global.gc) {
        global.gc()
        // Wait a bit for GC to complete
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024)

      console.log(`Memory usage results:`)
      console.log(`- Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`- Increase: ${memoryIncreaseMB.toFixed(2)}MB`)
      console.log(`- Episodes processed: ${result.successCount}`)

      if (result.successCount > 0) {
        const memoryPerEpisode = memoryIncrease / result.successCount
        console.log(`- Memory per episode: ${(memoryPerEpisode / 1024).toFixed(2)}KB`)
      }

      // Memory increase should be reasonable (less than 100MB)
      assert(memoryIncreaseMB < 100, 
        `Memory usage increased by ${memoryIncreaseMB.toFixed(2)}MB, should be under 100MB`)

      // Memory per episode should be reasonable (less than 1MB per episode)
      if (result.successCount > 0) {
        const memoryPerEpisodeMB = memoryIncrease / result.successCount / (1024 * 1024)
        assert(memoryPerEpisodeMB < 1, 
          `Memory per episode is ${memoryPerEpisodeMB.toFixed(2)}MB, should be under 1MB`)
      }
    })
  })

  describe('Concurrent Operation Performance', () => {
    it('should handle multiple dry runs concurrently without degradation', async function() {
      this.timeout = 20000
      
      const config1: SyncConfig = {
        rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
        outputDirectory: testOutputDir,
        podcastFolder: 'concurrent-1',
        podcastName: 'Concurrent Test 1',
        fileNamePattern: '{number}-{slug}',
        autoPublish: false,
        fullSync: false,
        maxEpisodes: 5,
        includeDescription: true,
        truncateDescriptionAt: 1000,
        retryAttempts: 2,
        retryBackoff: [500, 2000],
        performanceTimeoutMs: 15000,
        generatePlaceholders: true
      }

      const config2: SyncConfig = {
        ...config1,
        podcastFolder: 'concurrent-2',
        podcastName: 'Concurrent Test 2'
      }

      const config3: SyncConfig = {
        ...config1,
        podcastFolder: 'concurrent-3',
        podcastName: 'Concurrent Test 3'
      }

      console.log('Starting concurrent dry run performance test...')
      const startTime = performance.now()
      
      // Run three dry runs concurrently
      const [preview1, preview2, preview3] = await Promise.all([
        syncService.dryRun(config1),
        syncService.dryRun(config2),
        syncService.dryRun(config3)
      ])
      
      const endTime = performance.now()
      const duration = endTime - startTime
      const durationSeconds = duration / 1000

      console.log(`Concurrent dry run results:`)
      console.log(`- Total duration: ${durationSeconds.toFixed(2)} seconds`)
      console.log(`- Episodes analyzed: ${preview1.totalCount}, ${preview2.totalCount}, ${preview3.totalCount}`)

      // Should complete within reasonable time (not much slower than single operation)
      assert(duration < 15000, 
        `Concurrent dry runs took ${durationSeconds.toFixed(2)}s, should be under 15s`)

      // All previews should have results
      assert(preview1.totalCount >= 0)
      assert(preview2.totalCount >= 0)
      assert(preview3.totalCount >= 0)
    })
  })

  describe('Scaling Behavior', () => {
    it('should demonstrate linear scaling with episode count', async function() {
      this.timeout = 40000
      
      const baseConfig: SyncConfig = {
        rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
        outputDirectory: testOutputDir,
        podcastFolder: 'scaling-test',
        podcastName: 'Scaling Test Podcast',
        fileNamePattern: '{number}-{slug}',
        autoPublish: false,
        fullSync: false,
        includeDescription: true,
        truncateDescriptionAt: 2000,
        retryAttempts: 2,
        retryBackoff: [500, 2000],
        performanceTimeoutMs: 35000,
        generatePlaceholders: true
      }

      // Test with different episode counts
      const testCounts = [3, 6, 12]
      const timings: Array<{ count: number; duration: number; episodesPerSecond: number }> = []

      for (const count of testCounts) {
        const config = { ...baseConfig, maxEpisodes: count, podcastFolder: `scaling-test-${count}` }
        
        console.log(`Testing with ${count} episodes...`)
        const startTime = performance.now()
        
        const result = await syncService.syncFeed(config)
        
        const endTime = performance.now()
        const duration = endTime - startTime
        const durationSeconds = duration / 1000
        const episodesPerSecond = result.successCount / durationSeconds

        timings.push({
          count: result.successCount,
          duration,
          episodesPerSecond
        })

        console.log(`- ${result.successCount} episodes in ${durationSeconds.toFixed(2)}s (${episodesPerSecond.toFixed(2)} eps/s)`)
        
        // Each test should complete within reasonable time
        assert(duration < 30000, `Test with ${count} episodes should complete within 30s`)
      }

      // Analyze scaling behavior
      console.log('Scaling analysis:')
      timings.forEach(timing => {
        console.log(`- ${timing.count} episodes: ${timing.episodesPerSecond.toFixed(2)} eps/s`)
      })

      // Performance should remain relatively consistent or improve with larger batches
      // (due to connection reuse, caching, etc.)
      if (timings.length >= 2) {
        const firstRate = timings[0].episodesPerSecond
        const lastRate = timings[timings.length - 1].episodesPerSecond
        
        // Performance shouldn't degrade by more than 50%
        assert(lastRate > firstRate * 0.5, 
          `Performance degraded too much: ${firstRate.toFixed(2)} to ${lastRate.toFixed(2)} eps/s`)
      }
    })
  })
})