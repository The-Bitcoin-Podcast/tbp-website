import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, mkdir, rm } from 'fs/promises'
import { join } from 'path'

const execAsync = promisify(exec)

/**
 * Git State Tracking Contract Tests
 *
 * Tests validate that buildSyncState() correctly parses git history
 * to determine which videos have been synced.
 *
 * Expected: All tests FAIL until git.ts is implemented
 */

describe('Git State Contract', () => {
  const testRepoPath = join(process.cwd(), '.test-git-repo')
  const episodesPath = join(testRepoPath, 'content/episodes')

  before(async () => {
    // Set up test git repository with sample commits
    await rm(testRepoPath, { recursive: true, force: true })
    await mkdir(episodesPath, { recursive: true })

    // Initialize git repo
    await execAsync('git init', { cwd: testRepoPath })
    await execAsync('git config user.name "Test User"', { cwd: testRepoPath })
    await execAsync('git config user.email "test@example.com"', { cwd: testRepoPath })

    // Create sample episode files and commit them
    const episode1 = `---
title: "Bitcoin Basics"
youtubeId: "video123"
episodeNumber: 1
---
Content here`

    const episode2 = `---
title: "Decentralization"
youtubeId: "video456"
episodeNumber: 2
---
Content here`

    await writeFile(join(episodesPath, '001-bitcoin-basics.md'), episode1)
    await execAsync('git add .', { cwd: testRepoPath })
    await execAsync('git commit -m "Sync episode 1: Bitcoin Basics (YouTube: video123)"', { cwd: testRepoPath })

    // Wait a moment to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100))

    await writeFile(join(episodesPath, '002-decentralization.md'), episode2)
    await execAsync('git add content/episodes/002-decentralization.md', { cwd: testRepoPath })
    await execAsync('git commit -m "Sync episode 2: Decentralization (YouTube: video456)"', { cwd: testRepoPath })
  })

  after(async () => {
    // Clean up test repository
    await rm(testRepoPath, { recursive: true, force: true })
  })

  it('should export buildSyncState function', async () => {
    const { buildSyncState } = await import('../../quartz/util/git.js')
    assert.strictEqual(typeof buildSyncState, 'function')
  })

  it('should parse git log and extract synced video IDs', async () => {
    const { buildSyncState } = await import('../../quartz/util/git.js')

    const syncState = await buildSyncState(testRepoPath, 'content/episodes')

    // Should find both synced videos
    assert.ok(syncState.syncedVideoIds.has('video123'))
    assert.ok(syncState.syncedVideoIds.has('video456'))
    assert.strictEqual(syncState.episodeCount, 2)
  })

  it('should extract youtubeId from frontmatter', async () => {
    const { buildSyncState } = await import('../../quartz/util/git.js')

    const syncState = await buildSyncState(testRepoPath, 'content/episodes')

    // Verify Set contains correct IDs
    const ids = Array.from(syncState.syncedVideoIds)
    assert.ok(ids.includes('video123'))
    assert.ok(ids.includes('video456'))
  })

  it('should build sync history with commit details', async () => {
    const { buildSyncState } = await import('../../quartz/util/git.js')

    const syncState = await buildSyncState(testRepoPath, 'content/episodes')

    assert.strictEqual(syncState.syncHistory.length, 2)

    // First record
    assert.strictEqual(syncState.syncHistory[0].videoId, 'video123')
    assert.ok(syncState.syncHistory[0].episodePath.includes('001-bitcoin-basics.md'))
    assert.ok(syncState.syncHistory[0].commitHash)
    assert.ok(syncState.syncHistory[0].syncedAt instanceof Date)

    // Second record
    assert.strictEqual(syncState.syncHistory[1].videoId, 'video456')
    assert.ok(syncState.syncHistory[1].episodePath.includes('002-decentralization.md'))
  })

  it('should order sync history chronologically (oldest first)', async () => {
    const { buildSyncState } = await import('../../quartz/util/git.js')

    const syncState = await buildSyncState(testRepoPath, 'content/episodes')

    // First commit should be older than second
    assert.ok(syncState.syncHistory[0].syncedAt <= syncState.syncHistory[1].syncedAt)
  })

  it('should set lastSyncTimestamp to most recent commit', async () => {
    const { buildSyncState } = await import('../../quartz/util/git.js')

    const syncState = await buildSyncState(testRepoPath, 'content/episodes')

    assert.ok(syncState.lastSyncTimestamp)
    assert.ok(syncState.lastSyncTimestamp instanceof Date)

    // Should match the last item in sync history
    const lastRecord = syncState.syncHistory[syncState.syncHistory.length - 1]
    assert.strictEqual(syncState.lastSyncTimestamp.getTime(), lastRecord.syncedAt.getTime())
  })

  it('should export isVideoSynced function', async () => {
    const { isVideoSynced } = await import('../../quartz/util/git.js')
    assert.strictEqual(typeof isVideoSynced, 'function')
  })

  it('should correctly identify synced videos', async () => {
    const { buildSyncState, isVideoSynced } = await import('../../quartz/util/git.js')

    const syncState = await buildSyncState(testRepoPath, 'content/episodes')

    assert.strictEqual(isVideoSynced('video123', syncState), true)
    assert.strictEqual(isVideoSynced('video456', syncState), true)
    assert.strictEqual(isVideoSynced('video789', syncState), false)
  })

  it('should export getLastSyncTimestamp function', async () => {
    const { getLastSyncTimestamp } = await import('../../quartz/util/git.js')
    assert.strictEqual(typeof getLastSyncTimestamp, 'function')
  })

  it('should return last sync timestamp', async () => {
    const { buildSyncState, getLastSyncTimestamp } = await import('../../quartz/util/git.js')

    const syncState = await buildSyncState(testRepoPath, 'content/episodes')
    const timestamp = getLastSyncTimestamp(syncState)

    assert.ok(timestamp)
    assert.ok(timestamp instanceof Date)
  })

  it('should return null for empty sync history', async () => {
    const { getLastSyncTimestamp } = await import('../../quartz/util/git.js')

    const emptyState = {
      syncedVideoIds: new Set<string>(),
      episodeCount: 0,
      syncHistory: [],
    }

    const timestamp = getLastSyncTimestamp(emptyState)
    assert.strictEqual(timestamp, null)
  })

  it('should handle git log with --diff-filter=A flag', async () => {
    // Verify git log command filters only added files
    const { stdout } = await execAsync(
      'git log --diff-filter=A --name-only --pretty=format:"%H|%ai" -- content/episodes/*.md',
      { cwd: testRepoPath }
    )

    // Should contain both commits
    assert.ok(stdout.includes('001-bitcoin-basics.md'))
    assert.ok(stdout.includes('002-decentralization.md'))
  })
})
