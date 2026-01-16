# Tasks: Expand YouTube Sync to HIO Channel

**Input**: Design documents from `/specs/007-expand-youtube-sync/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are relative to repository root

## Phase 3.1: Setup
- [x] T001 Verify environment setup (Node.js 22+, YOUTUBE_API_KEY set)

## Phase 3.2: Types & Configuration
- [x] T002 Add `ChannelPreset` interface and `CHANNEL_PRESETS` constant to `quartz/types/youtube-sync.ts`
  - Add interface: `ChannelPreset { channelId: string; outputDirectory: string; name: string }`
  - Add constant: `CHANNEL_PRESETS` with `tbp` and `hio` presets
  - `tbp`: `{ channelId: '@thebtcpodcast', outputDirectory: 'content/episodes/tbp', name: 'The Bitcoin Podcast' }`
  - `hio`: `{ channelId: '@HashingItOut-real', outputDirectory: 'content/episodes/hio', name: 'Hashing It Out' }`
  - Export the new type and constant

## Phase 3.3: CLI Argument
- [x] T003 Add `--channel` CLI argument to `quartz/scripts/youtube-sync.ts`
  - Add yargs option: `--channel` with type `string`, default `tbp`, choices `['tbp', 'hio']`
  - Add description: "Channel preset to sync (tbp, hio)"
  - Import `CHANNEL_PRESETS` from types file

## Phase 3.4: Config Loading
- [x] T004 Modify `loadConfig()` in `quartz/scripts/youtube-sync.ts` to merge channel preset
  - After loading user config, check if `argv.channel` is set
  - If no custom config file provided, merge `CHANNEL_PRESETS[argv.channel]` into config
  - Override `channelId` and `outputDirectory` from the selected preset
  - Update console output to show the resolved channel name

## Phase 3.5: Content Layout Reorder
- [x] T005 [P] Reorder body sections in `quartz/util/episode-generator.ts` to show video embed first
  - In `generateEpisodeFile()`, move the "Watch Episode" section BEFORE "Episode Description"
  - Current order: Description → Video → Guests
  - New order: Video → Description → Guests
  - Update section header from "Watch Episode" to match contract (keep as "Watch Episode")

## Phase 3.6: Verification & Testing
- [x] T006 Test TBP channel sync (dry run) to verify backwards compatibility
  - Run: `npm run youtube-sync -- --dry-run --max 1`
  - Verify output shows channel `@thebtcpodcast` and directory `content/episodes/tbp`
  - Verify no errors occur

- [x] T007 Test HIO channel sync (dry run) to verify new functionality
  - Run: `npm run youtube-sync -- --channel hio --dry-run --max 1`
  - Verify output shows channel `@HashingItOut-real` and directory `content/episodes/hio`
  - Verify no errors occur

- [x] T008 Verify content layout by inspecting generated file
  - Run actual sync with `--max 1 --no-commit` for either channel
  - Open generated markdown file
  - Confirm "## Watch Episode" appears BEFORE "## Episode Description"
  - Confirm YouTube embed iframe is present under Watch Episode

## Phase 3.7: Documentation
- [x] T009 [P] Update CLAUDE.md with HIO sync documentation
  - Add to RSS Sync Information section (or create YouTube Sync section)
  - Document: `npm run youtube-sync -- --channel hio` for HIO
  - Document: `npm run youtube-sync` for TBP (default)
  - Include dry-run examples

## Dependencies
```
T001 (setup)
  └── T002 (types)
        └── T003 (CLI arg)
              └── T004 (config)
                    ├── T006 (test TBP)
                    └── T007 (test HIO)
                          └── T008 (verify layout)

T005 (layout) - independent, can run in parallel with T002-T004
T009 (docs) - independent, can run anytime after T004
```

## Parallel Execution Groups

### Group A: Types and Layout (can run together)
```
T002 - Add ChannelPreset type to quartz/types/youtube-sync.ts
T005 - Reorder body sections in quartz/util/episode-generator.ts
```
These modify different files and have no dependencies on each other.

### Group B: Testing (can run together after T004)
```
T006 - Test TBP channel sync
T007 - Test HIO channel sync
```
Both tests are read-only dry runs that don't conflict.

### Group C: Documentation (independent)
```
T009 - Update CLAUDE.md
```
Can run anytime after implementation is stable.

## Validation Checklist
- [x] CLI contract (--channel flag) has corresponding task (T003)
- [x] Episode output contract (video-first layout) has corresponding task (T005)
- [x] ChannelPreset entity has model task (T002)
- [x] Both channel presets tested (T006, T007)
- [x] Content layout verified (T008)
- [x] Each task specifies exact file path
- [x] Parallel tasks modify different files

## Notes
- No TDD approach used - this is a CLI script enhancement, not API development
- Testing is manual via `--dry-run` flag (existing pattern in codebase)
- T005 is independent and can start immediately
- T002 must complete before T003, which must complete before T004
- T006-T008 require YOUTUBE_API_KEY environment variable
