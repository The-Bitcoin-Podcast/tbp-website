# Data Model

**Feature**: YouTube Channel Sync
**Date**: 2025-10-05

## Entity Definitions

### 1. YouTubeVideo (Source Entity)

Represents a video fetched from YouTube Data API v3.

**Fields**:
```typescript
interface YouTubeVideo {
  // YouTube API fields
  videoId: string              // Unique YouTube video identifier (e.g., "dQw4w9WgXcQ")
  channelId: string            // Channel identifier (always @thebtcpodcast)
  title: string                // Video title
  description: string          // Full video description text
  publishedAt: string          // ISO 8601 datetime (e.g., "2024-01-15T10:30:00Z")
  duration: string             // ISO 8601 duration (e.g., "PT1H23M45S")
  thumbnailUrl: string         // URL to highest quality thumbnail
  tags?: string[]              // YouTube tags/keywords (may be empty)

  // Derived fields (computed during sync)
  episodeNumber?: number       // Sequential episode number (1, 2, 3, ...)
  guests?: string[]            // Parsed guest names from description
  privacyStatus?: 'public' | 'unlisted' | 'private'
}
```

**Validation Rules**:
- `videoId`: Required, must match YouTube ID format (11 alphanumeric chars)
- `title`: Required, max 100 chars (YouTube limit)
- `description`: Optional, max 5000 chars (truncated if longer)
- `publishedAt`: Required, valid ISO 8601 datetime
- `duration`: Required, valid ISO 8601 duration format

**Relationships**:
- Source for EpisodePage (1:1 mapping)
- Belongs to YouTubeChannel (@thebtcpodcast)

**State Transitions**: None (immutable API response)

---

### 2. EpisodePage (Generated Entity)

Represents a generated markdown file with frontmatter for Quartz.

**Fields** (Frontmatter):
```typescript
interface EpisodeFrontmatter {
  // Core metadata
  title: string                // From YouTubeVideo.title
  date: string                 // From YouTubeVideo.publishedAt (YYYY-MM-DD format)
  draft: boolean               // Default: true (manual approval required)

  // Episode identification
  episodeNumber: number        // Sequential number
  youtubeId: string           // For duplicate detection & embed

  // Media
  thumbnail: string            // YouTubeVideo.thumbnailUrl
  duration: string             // Human-readable (e.g., "1:23:45")
  audioUrl?: string            // Optional podcast RSS audio URL (manual)

  // Content
  description: string          // Converted markdown from YouTubeVideo.description
  guests?: Guest[]             // Parsed guest objects
  tags?: string[]              // From YouTubeVideo.tags + manual additions

  // Status
  syncedAt: string             // ISO 8601 timestamp of sync operation
  status?: 'available' | 'unavailable' | 'private'  // Video availability
}

interface Guest {
  name: string
  twitter?: string             // If parsed from @username
  bio?: string                 // Manual addition post-sync
}
```

**Validation Rules**:
- `title`: Required, matches YouTube title
- `episodeNumber`: Required, positive integer, unique across episodes
- `youtubeId`: Required, must match YouTubeVideo.videoId
- `draft`: Required, boolean
- `guests`: Optional array, each guest has required `name` field

**Relationships**:
- Generated from YouTubeVideo (1:1)
- Stored as file in content/episodes/ directory
- Referenced in git commit history (for sync state)

**State Transitions**:
```
[New Video] → [Synced (draft: true)] → [Reviewed (draft: false)] → [Published]
                                     ↘ [Updated] (if YouTube metadata changes)
```

**File Structure**:
```markdown
---
title: "Bitcoin Basics: Understanding Decentralization"
date: 2024-01-15
draft: true
episodeNumber: 42
youtubeId: "dQw4w9WgXcQ"
thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
duration: "1:23:45"
description: "In this episode..."
guests:
  - name: "Alice Johnson"
    twitter: "alicej"
  - name: "Bob Smith"
tags: ["bitcoin", "decentralization", "blockchain"]
syncedAt: "2024-01-20T15:30:00Z"
status: "available"
---

## Episode Description

[Converted YouTube description with markdown formatting...]

## Watch Episode

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" ...></iframe>
</div>

## Guests

- **Alice Johnson** ([@alicej](https://twitter.com/alicej))
- **Bob Smith**

## Topics Covered

[Auto-generated from tags or manual addition...]
```

---

### 3. SyncState (Derived Entity)

Represents the sync state derived from git commit history.

**Fields**:
```typescript
interface SyncState {
  syncedVideoIds: Set<string>      // All youtubeId values from git history
  lastSyncTimestamp?: Date          // Most recent commit timestamp for episode
  episodeCount: number              // Total synced episodes
  syncHistory: SyncRecord[]         // Audit trail
}

interface SyncRecord {
  videoId: string
  episodePath: string               // File path in git
  syncedAt: Date                    // Commit timestamp
  commitHash: string                // Git commit SHA
}
```

**Validation Rules**:
- `syncedVideoIds`: Must contain valid YouTube video IDs
- `syncHistory`: Ordered by syncedAt ascending (oldest first)

**Relationships**:
- Derived from git log + EpisodePage frontmatter parsing
- Used to prevent duplicate syncs (idempotency)

**State Transitions**: None (read-only, computed on-demand)

**Computation Logic**:
```typescript
async function buildSyncState(git: SimpleGit): Promise<SyncState> {
  const log = await git.log({ file: 'content/episodes/*.md', '--diff-filter': 'A' })
  const syncedVideoIds = new Set<string>()
  const syncHistory: SyncRecord[] = []

  for (const commit of log.all) {
    for (const file of commit.diff?.files || []) {
      const content = await git.show([`${commit.hash}:${file.path}`])
      const { data } = matter(content)

      if (data.youtubeId) {
        syncedVideoIds.add(data.youtubeId)
        syncHistory.push({
          videoId: data.youtubeId,
          episodePath: file.path,
          syncedAt: new Date(commit.date),
          commitHash: commit.hash
        })
      }
    }
  }

  return {
    syncedVideoIds,
    lastSyncTimestamp: syncHistory[syncHistory.length - 1]?.syncedAt,
    episodeCount: syncedVideoIds.size,
    syncHistory
  }
}
```

---

### 4. SyncConfig (Configuration Entity)

Represents user configuration for the sync process.

**Fields**:
```typescript
interface SyncConfig {
  // API Configuration
  youtubeApiKey: string            // From environment variable
  channelId: string                // Default: @thebtcpodcast

  // Output Configuration
  outputDirectory: string          // Default: "content/episodes"
  fileNamePattern: string          // Default: "{number}-{slug}.md"

  // Behavior Configuration
  autoPublish: boolean             // Default: false (draft: true)
  fullSync: boolean                // Default: false (incremental only)
  maxVideos?: number               // Limit for testing (optional)

  // Content Configuration
  includeVideoEmbed: boolean       // Default: true
  truncateDescriptionAt: number    // Default: 5000 chars
  guestParsingPatterns: RegExp[]   // Default: GUEST_PATTERNS from research

  // Exclusions
  excludedVideoIds?: string[]      // Video IDs to skip

  // Error Handling
  retryAttempts: number            // Default: 3
  retryBackoff: number[]           // Default: [60000, 300000, 900000] (1min, 5min, 15min)
}
```

**Validation Rules**:
- `youtubeApiKey`: Required, non-empty string
- `channelId`: Required, valid YouTube channel identifier
- `outputDirectory`: Required, valid directory path
- `retryAttempts`: Must be >= 0
- `truncateDescriptionAt`: Must be > 0

**Defaults**:
```typescript
const DEFAULT_CONFIG: Partial<SyncConfig> = {
  channelId: '@thebtcpodcast',
  outputDirectory: 'content/episodes',
  fileNamePattern: '{number}-{slug}.md',
  autoPublish: false,
  fullSync: false,
  includeVideoEmbed: true,
  truncateDescriptionAt: 5000,
  retryAttempts: 3,
  retryBackoff: [60000, 300000, 900000]
}
```

**Relationships**:
- Loaded from `quartz.config.ts` or separate config file
- Consumed by sync script

---

## Entity Relationships Diagram

```
┌─────────────────┐
│  YouTubeChannel │
│  @thebtcpodcast │
└────────┬────────┘
         │ has many
         ↓
┌─────────────────┐         ┌──────────────┐
│  YouTubeVideo   │ 1:1     │ EpisodePage  │
│  (API Source)   │────────→│  (Generated) │
└─────────────────┘         └──────┬───────┘
                                   │
                                   │ tracked in
                                   ↓
                            ┌──────────────┐
                            │  SyncState   │
                            │ (Git-based)  │
                            └──────────────┘

┌──────────────┐
│  SyncConfig  │  (controls all sync behavior)
└──────────────┘
```

## Data Flow

1. **Fetch Phase**:
   - YouTube API → `YouTubeVideo[]`
   - SyncConfig determines query parameters

2. **Filter Phase**:
   - SyncState (from git) → `syncedVideoIds`
   - Filter `YouTubeVideo[]` to exclude already synced
   - Apply `excludedVideoIds` from SyncConfig

3. **Transform Phase**:
   - `YouTubeVideo` → parse guests → populate `guests[]`
   - `YouTubeVideo` → convert description → markdown
   - Sort by publishedAt → assign `episodeNumber`

4. **Generate Phase**:
   - `YouTubeVideo` + transforms → `EpisodeFrontmatter`
   - `EpisodeFrontmatter` + body → markdown file
   - Write to `outputDirectory`

5. **Commit Phase**:
   - Git add new episode files
   - Git commit with message: "Sync episode {number}: {title} (YouTube: {videoId})"
   - Update SyncState (re-computed from new git history)

## Invariants

1. **Uniqueness**: Each `youtubeId` appears at most once in git history
2. **Chronological Numbering**: Episode numbers match publish date order (ascending)
3. **File Naming**: Episode files follow `{number}-{slug}.md` pattern strictly
4. **Git Tracking**: All synced episodes have corresponding git commit with "Sync episode" message
5. **Draft Default**: All new episodes have `draft: true` unless `autoPublish: true` in config
