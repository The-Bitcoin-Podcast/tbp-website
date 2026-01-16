# Research: Expand YouTube Sync to Hashing It Out Channel

## Technical Context Analysis

### Current Implementation Structure

**Decision**: Extend existing youtube-sync.ts script with multi-channel support
**Rationale**: The current architecture is well-designed with clean separation of concerns:
- `youtube-sync.ts` - Main CLI orchestration
- `quartz/types/youtube-sync.ts` - Type definitions including `SyncConfig`
- `quartz/util/youtube.ts` - YouTube API interactions (already supports channel handles)
- `quartz/util/git.ts` - Sync state management
- `quartz/util/episode-generator.ts` - Markdown file generation

**Alternatives Considered**:
- Create separate script for HIO sync - Rejected: Code duplication, maintenance overhead
- Single script with channel presets - Selected: Minimal changes, maintains consistency

### Channel Configuration Strategy

**Decision**: Add `--channel` CLI flag with preset configurations for known channels
**Rationale**: 
- User-friendly: `npm run youtube-sync -- --channel hio` vs complex config files
- Backwards compatible: Default channel remains `@thebtcpodcast`
- Extensible: Easy to add more channels in future

**Channel Presets**:
```typescript
const CHANNEL_PRESETS = {
  tbp: {
    channelId: '@thebtcpodcast',
    outputDirectory: 'content/episodes/tbp',
  },
  hio: {
    channelId: '@HashingItOut-real',
    outputDirectory: 'content/episodes/hio',
  }
}
```

### Sync State Per-Channel

**Decision**: Modify `buildSyncState()` to accept channel-specific output directory
**Rationale**: Current implementation already scans specific directory paths; passing the channel's output directory allows independent sync state per channel.

**Current Code** (`quartz/util/git.ts:18`):
```typescript
export async function buildSyncState(
  repoPath: string,
  episodeDirectory: string = "content/episodes",
): Promise<SyncState>
```

This already supports per-directory sync state - just need to pass the channel-specific directory.

### Content Layout Reordering

**Decision**: Modify `generateEpisodeFile()` to place video embed before description
**Rationale**: Simple reordering of existing code blocks in `quartz/util/episode-generator.ts`

**Current Order** (lines 50-80):
1. Episode Description
2. Watch Episode (video embed)
3. Guests

**New Order**:
1. Watch Episode (video embed)
2. Episode Description
3. Guests

### Episode Numbering Per-Channel

**Decision**: Each channel maintains its own episode count via sync state
**Rationale**: The `syncState.episodeCount` is already derived from the scanned directory. By scanning channel-specific directories, episode numbers are automatically independent.

## Files Requiring Modification

| File | Change |
|------|--------|
| `quartz/scripts/youtube-sync.ts` | Add `--channel` flag, channel presets, pass output directory to functions |
| `quartz/types/youtube-sync.ts` | Add `ChannelPreset` type, update `DEFAULT_CONFIG` |
| `quartz/util/episode-generator.ts` | Reorder body sections (video embed first) |
| `CLAUDE.md` | Add HIO channel documentation |

## API Compatibility

**YouTube Data API v3**: 
- `verifyChannel()` in `quartz/util/youtube.ts` already handles `@username` format
- Channel handle `@HashingItOut-real` will resolve correctly
- No API changes required

## Existing Episode Structure Compatibility

Both TBP and HIO episodes use identical frontmatter structure (reviewed samples from `content/episodes/tbp/` and `content/episodes/hio/`). The generated YouTube sync files will be compatible with existing RSS-synced episodes.

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing TBP sync | Default channel remains TBP; all tests pass before merge |
| Episode number conflicts | Per-directory sync state ensures independence |
| YouTube API quota | Existing retry logic handles rate limits |
