# RSS Podcast Sync - Data Model

## Core Entities

### RSSEpisode
Source entity representing a single podcast episode from the RSS feed.

**Fields:**
- `guid: string` - Unique episode identifier from RSS feed
- `title: string` - Episode title
- `description: string` - Episode description/show notes
- `pubDate: string` - Publication date in ISO 8601 format
- `duration: string` - Duration in HH:MM:SS format from iTunes tags
- `enclosureUrl: string` - Direct URL to audio file
- `author?: string` - Episode author/host
- `explicit: boolean` - Content explicit flag
- `image?: string` - Episode-specific artwork URL

**Relationships:**
- Source for generating EpisodeFrontmatter
- Maps to podcast feed channel metadata

**Validation Rules:**
- `guid` must be non-empty and unique within feed
- `title` must be non-empty
- `pubDate` must be valid ISO 8601 date string
- `enclosureUrl` must be valid HTTP/HTTPS URL
- `duration` must match HH:MM:SS, MM:SS, or seconds format

### RSSFeed
Container entity representing the entire podcast RSS feed.

**Fields:**
- `title: string` - Podcast title
- `description: string` - Podcast description
- `author: string` - Podcast author/host
- `language: string` - Language code (default: 'en')
- `image: string` - Podcast artwork URL
- `link: string` - Podcast website URL
- `lastBuildDate?: string` - Feed last updated timestamp
- `episodes: RSSEpisode[]` - Array of episode data

**Validation Rules:**
- `title` and `description` must be non-empty
- `image` must be valid HTTP/HTTPS URL
- `episodes` must be array of valid RSSEpisode objects

### RSSConfig
Configuration entity for RSS sync process.

**Fields:**
- `rssUrl: string` - RSS feed URL
- `outputDirectory: string` - Output directory for episode files
- `podcastFolder: string` - Podcast-specific subdirectory (e.g., "hio")
- `podcastName: string` - Human-readable podcast name for identification
- `fileNamePattern: string` - File naming pattern template
- `autoPublish: boolean` - Auto-publish episodes (draft: false)
- `fullSync: boolean` - Perform full sync vs incremental
- `maxEpisodes?: number` - Maximum episodes to sync (for testing)
- `includeDescription: boolean` - Include full description in markdown
- `truncateDescriptionAt: number` - Description character limit
- `excludedGuids?: string[]` - Episode GUIDs to skip
- `retryAttempts: number` - HTTP retry attempts
- `cacheHeaders?: CacheHeaders` - HTTP cache headers for efficient polling

**Relationships:**
- Consumed by RSS sync script
- Maps to generated episode frontmatter format

**Validation Rules:**
- `rssUrl` must be valid HTTP/HTTPS URL
- `outputDirectory` must be valid file path
- `podcastFolder` must be valid directory name (no special characters)
- `podcastName` must be non-empty string
- `maxEpisodes` if set must be positive integer
- `truncateDescriptionAt` must be positive integer

### RSSEpisodeFrontmatter
Generated frontmatter for episode markdown files.

**Fields:**
- `title: string` - From RSSEpisode.title (or placeholder if missing)
- `date: string` - From RSSEpisode.pubDate in YYYY-MM-DD format (or placeholder if missing)
- `draft: boolean` - Publication status (default: true)
- `episodeNumber: number` - Sequential episode number
- `rssGuid: string` - Original RSS episode GUID for tracking
- `audioUrl: string` - Direct link to audio file
- `duration: string` - Human-readable duration
- `description: string` - Episode description/show notes
- `author?: string` - Episode host/author
- `explicit: boolean` - Content warning flag
- `thumbnail?: string` - Episode artwork URL
- `syncedAt: string` - Sync timestamp in ISO 8601 format
- `status: 'available' | 'unavailable'` - Episode availability status (from clarifications)
- `hasPlaceholders: boolean` - Indicates if episode contains generated placeholder values
- `warnings?: string[]` - Array of warnings about missing or placeholder data

**State Transitions:**
- Generated from RSSEpisode data
- Written to markdown file in output directory
- Tracked in git commit history for sync state

## Data Flow

```
RSS Feed (XML) 
  ↓ [HTTP fetch + parse]
RSSFeed + RSSEpisode[]
  ↓ [filter + validate] 
Unsynced RSSEpisode[]
  ↓ [transform + number + folder mapping]
RSSEpisodeFrontmatter[]
  ↓ [generate + write to podcast folder]
Markdown files in content/episodes/{podcastFolder}/ + Git commit
```

## Sync State Management

### SyncState
Tracks synchronization history and current state.

**Fields:**
- `syncedGuids: Set<string>` - Set of already-synced episode GUIDs
- `lastSyncTimestamp?: Date` - Most recent sync operation timestamp  
- `episodeCount: number` - Total synced episode count for this podcast
- `syncHistory: SyncRecord[]` - Audit trail of sync operations
- `podcastFolder: string` - Podcast folder this sync state applies to

**Derived From:**
- Git commit history analysis for specific podcast folder
- Episode frontmatter parsing from podcast subdirectory
- Previous sync operation records

### SyncRecord
Individual sync operation audit entry.

**Fields:**
- `rssGuid: string` - Episode GUID from RSS
- `episodePath: string` - Generated file path
- `syncedAt: Date` - Operation timestamp
- `commitHash: string` - Git commit identifier

## Integration Points

### Shared with YouTube Sync
- `EpisodeFrontmatter` structure (compatible with existing format)
- `SyncState` management pattern
- Git utilities and episode file generation
- Episode numbering strategy

### RSS-Specific Extensions
- `rssGuid` field for RSS episode identification
- `audioUrl` field for podcast player integration  
- `explicit` flag for content warnings
- HTTP caching support for RSS feed polling