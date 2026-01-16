# Data Model: Expand YouTube Sync to HIO

## Entities

### ChannelPreset
Represents a predefined YouTube channel configuration for sync operations.

| Field | Type | Description |
|-------|------|-------------|
| channelId | string | YouTube channel handle (e.g., `@HashingItOut-real`) |
| outputDirectory | string | Target directory for episodes (e.g., `content/episodes/hio`) |
| name | string | Human-readable channel name |

**Relationships**: Used by SyncConfig to determine target channel settings

### SyncConfig (Extended)
Extended configuration to support multi-channel sync.

| Field | Type | Description |
|-------|------|-------------|
| youtubeApiKey | string | YouTube Data API key (from env) |
| channelId | string | Target channel handle |
| outputDirectory | string | Channel-specific output path |
| fileNamePattern | string | Episode filename format |
| autoPublish | boolean | Whether to set draft: false |
| fullSync | boolean | Ignore last sync timestamp |
| maxVideos | number? | Limit videos to sync |
| includeVideoEmbed | boolean | Include YouTube embed in output |
| truncateDescriptionAt | number | Max description length |
| excludedVideoIds | string[]? | Videos to skip |
| retryAttempts | number | API retry count |
| retryBackoff | number[] | Retry delay intervals |
| guestParsingPatterns | RegExp[] | Guest detection patterns |

### SyncState (Unchanged)
Per-channel sync state derived from git history.

| Field | Type | Description |
|-------|------|-------------|
| syncedVideoIds | Set\<string\> | YouTube IDs already synced |
| lastSyncTimestamp | Date? | Most recent sync time |
| episodeCount | number | Total episodes in channel directory |
| syncHistory | SyncRecord[] | Audit trail of syncs |

**Note**: Sync state is already per-directory - no changes needed to the entity structure.

### GenerationResult (Unchanged)
Result of episode file generation.

| Field | Type | Description |
|-------|------|-------------|
| filePath | string | Absolute path to created file |
| content | string | Full markdown with frontmatter |

## State Transitions

### Sync Operation Flow
```
IDLE → FETCHING → FILTERING → GENERATING → COMMITTING → COMPLETE
  │        │          │           │            │           │
  │        └──────────┴───────────┴────────────┴───────────┘
  │                        (on error)                      
  └──────────────────────────────────────────────────────→ ERROR
```

## Validation Rules

### ChannelPreset
- `channelId` must start with `@` for handle format
- `outputDirectory` must be relative path under `content/`
- `name` must be non-empty string

### CLI Arguments
- `--channel` must match a known preset key or be omitted (defaults to `tbp`)
- `--channel` and `--config` are mutually exclusive (config file takes precedence)
