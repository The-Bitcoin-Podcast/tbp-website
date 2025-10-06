import simpleGit from '@napi-rs/simple-git'
import matter from 'gray-matter'
import type { SyncState, SyncRecord } from '../types/youtube-sync.js'

/**
 * Build sync state by scanning git commit history for episode files
 *
 * Parses git log to find all committed episode markdown files,
 * extracts youtubeId from frontmatter to determine which videos
 * have been synced.
 *
 * @param repoPath - Absolute path to git repository
 * @param episodeDirectory - Relative path to episodes directory (e.g., "content/episodes")
 * @returns SyncState with synced video IDs and history
 */
export async function buildSyncState(
  repoPath: string,
  episodeDirectory: string = 'content/episodes'
): Promise<SyncState> {
  const git = simpleGit(repoPath)

  const syncedVideoIds = new Set<string>()
  const syncHistory: SyncRecord[] = []

  try {
    // Get git log for episode files (only additions)
    const log = await git.log({
      file: `${episodeDirectory}/*.md`,
      '--diff-filter': 'A', // Only added files
    })

    // Process each commit
    for (const commit of log.all) {
      // Get file content at this commit
      const files = commit.diff?.files || []

      for (const file of files) {
        if (!file.path?.includes(episodeDirectory)) continue

        try {
          // Get file content from git history
          const content = await git.show([`${commit.hash}:${file.path}`])

          // Parse frontmatter
          const { data } = matter(content)

          if (data.youtubeId) {
            syncedVideoIds.add(data.youtubeId)
            syncHistory.push({
              videoId: data.youtubeId,
              episodePath: file.path,
              syncedAt: new Date(commit.date),
              commitHash: commit.hash,
            })
          }
        } catch (error) {
          // Skip files that can't be parsed
          console.warn(`Failed to parse ${file.path} at ${commit.hash}:`, error)
          continue
        }
      }
    }

    // Sort sync history by date (oldest first)
    syncHistory.sort((a, b) => a.syncedAt.getTime() - b.syncedAt.getTime())

    return {
      syncedVideoIds,
      lastSyncTimestamp: syncHistory[syncHistory.length - 1]?.syncedAt,
      episodeCount: syncedVideoIds.size,
      syncHistory,
    }
  } catch (error) {
    // If git operations fail, return empty state
    console.warn('Failed to build sync state from git:', error)
    return {
      syncedVideoIds: new Set(),
      episodeCount: 0,
      syncHistory: [],
    }
  }
}

/**
 * Check if a video has already been synced
 *
 * @param videoId - YouTube video ID to check
 * @param syncState - Current sync state
 * @returns true if video has been synced, false otherwise
 */
export function isVideoSynced(videoId: string, syncState: SyncState): boolean {
  return syncState.syncedVideoIds.has(videoId)
}

/**
 * Get the timestamp of the last sync operation
 *
 * @param syncState - Current sync state
 * @returns Date of last sync, or null if no syncs
 */
export function getLastSyncTimestamp(syncState: SyncState): Date | null {
  if (syncState.syncHistory.length === 0) {
    return null
  }
  return syncState.syncHistory[syncState.syncHistory.length - 1].syncedAt
}
