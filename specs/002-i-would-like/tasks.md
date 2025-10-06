# Tasks: YouTube Channel Sync

**Input**: Design documents from `/home/petty/Github/tbp/quartz/specs/002-i-would-like/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Status
- [x] Loaded plan.md - Tech stack: TypeScript 5.9.2, Node.js 22+, Quartz 4.5.2
- [x] Loaded data-model.md - 4 entities: YouTubeVideo, EpisodePage, SyncState, SyncConfig
- [x] Loaded contracts/ - 3 contracts: YouTube API, Episode Generation, Git State
- [x] Loaded research.md - 10 technical decisions documented
- [x] Loaded quickstart.md - 3 test scenarios extracted

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Paths are absolute from repository root: `/home/petty/Github/tbp/quartz/`

---

## Phase 3.1: Setup & Dependencies

- [x] **T001** Create directory structure for sync feature
  - Create `/home/petty/Github/tbp/quartz/quartz/scripts/`
  - Create `/home/petty/Github/tbp/quartz/quartz/util/`
  - Create `/home/petty/Github/tbp/quartz/quartz/types/`
  - Create `/home/petty/Github/tbp/quartz/tests/contract/`
  - Create `/home/petty/Github/tbp/quartz/tests/integration/`
  - Create `/home/petty/Github/tbp/quartz/tests/unit/`
  - Create `/home/petty/Github/tbp/quartz/content/episodes/`

- [x] **T002** Install required dependencies
  - Run `npm install @googleapis/youtube dotenv`
  - Verify package.json includes new dependencies
  - Note: @napi-rs/simple-git, gray-matter, github-slugger already exist

- [x] **T003** [P] Create TypeScript type definitions in `/home/petty/Github/tbp/quartz/quartz/types/youtube-sync.ts`
  - Define `YouTubeVideo` interface (per data-model.md)
  - Define `EpisodeFrontmatter` interface
  - Define `SyncState` interface with `SyncRecord`
  - Define `SyncConfig` interface with defaults
  - Define `Guest` interface
  - Export all types

- [x] **T004** [P] Create sync configuration template in `/home/petty/Github/tbp/quartz/quartz/sync-config.example.ts`
  - Import `SyncConfig` type
  - Export example config with all options documented
  - Include comments explaining each field
  - Set sensible defaults per research.md

- [x] **T005** Set up environment variable handling
  - Create `.env.example` with `YOUTUBE_API_KEY` placeholder
  - Add `.env` to `.gitignore` if not already present
  - Document env var requirements in README or quickstart

---

## Phase 3.2: Contract Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T006** [P] Create YouTube API contract test in `/home/petty/Github/tbp/quartz/tests/contract/youtube-api.test.ts`
  - Test `GET /search` request/response format (per contracts/youtube-api.contract.md)
  - Test `GET /videos` request/response format
  - Test error handling for 403 quota exceeded
  - Test error handling for 400 invalid key
  - Mock API responses, assert request structure
  - **✓ Tests FAIL as expected (no implementation yet)**

- [x] **T007** [P] Create episode generation contract test in `/home/petty/Github/tbp/quartz/tests/unit/episode-generator.test.ts`
  - Test `generateEpisodeFile()` output format (per contracts/episode-generation.contract.md)
  - Test frontmatter YAML structure
  - Test markdown body structure with YouTube embed
  - Test guest section rendering
  - **✓ Tests FAIL as expected (no implementation yet)**

- [x] **T008** [P] Create git state contract test in `/home/petty/Github/tbp/quartz/tests/integration/git-state.test.ts`
  - Test `buildSyncState()` git log parsing (per contracts/git-state.contract.md)
  - Test frontmatter extraction from git history
  - Test `isVideoSynced()` duplicate detection
  - Set up test git repository with sample commits
  - **✓ Tests FAIL as expected (no implementation yet)**

- [x] **T009** [P] Create guest parser contract test in `/home/petty/Github/tbp/quartz/tests/unit/guest-parser.test.ts`
  - Test pattern matching: "Guest: Name" → `[{name: "Name"}]`
  - Test pattern: "Guests: Alice, Bob" → two guest objects
  - Test pattern: "with @username" → extract twitter handle
  - Test no match → empty array
  - Input/output examples from contracts/episode-generation.contract.md
  - **✓ Tests FAIL as expected (no implementation yet)**

- [x] **T010** [P] Create description converter contract test in `/home/petty/Github/tbp/quartz/tests/unit/markdown-converter.test.ts`
  - Test markdown special char escaping: `*_[]()` → `\*\_\[\]\(\)`
  - Test URL auto-linking: `http://...` → `[url](url)`
  - Test truncation at 5000 chars with "Read more" link
  - Test line break preservation: `\n` → `  \n`
  - Input/output examples from contracts/episode-generation.contract.md
  - **✓ Tests FAIL as expected (no implementation yet)**

---

## Phase 3.3: Core Utilities (ONLY after tests are failing)

- [x] **T011** [P] Implement YouTube API client in `/home/petty/Github/tbp/quartz/quartz/util/youtube.ts`
  - Import `@googleapis/youtube` and create authenticated client
  - Implement `searchChannelVideos(channelId, options)` → SearchResponse
  - Implement `getVideoDetails(videoIds)` → VideosResponse
  - Implement `verifyChannel(channelId)` → ChannelsResponse
  - Add error handling with exponential backoff (1min, 5min, 15min)
  - Handle quota exceeded (403) and invalid key (400) errors
  - **✓ Implemented with retry logic**

- [x] **T012** [P] Implement git history scanner in `/home/petty/Github/tbp/quartz/quartz/util/git.ts`
  - Import `@napi-rs/simple-git` and `gray-matter`
  - Implement `buildSyncState(repoPath, episodeDir)` → SyncState
  - Parse git log with `--diff-filter=A` for added episode files
  - Use `git show` to get file content at each commit
  - Extract `youtubeId` from frontmatter with gray-matter
  - Implement `isVideoSynced(videoId, syncState)` → boolean
  - Implement `getLastSyncTimestamp(syncState)` → Date | null
  - **✓ Implemented with error handling**

- [x] **T013** [P] Implement guest parser in `/home/petty/Github/tbp/quartz/quartz/util/guest-parser.ts`
  - Define regex patterns array from research.md:
    - `/(?:Guest|Guests):\s*([^\n]+)/i`
    - `/(?:Featuring|ft\.|feat\.):\s*([^\n]+)/i`
    - `/with\s+@(\w+)/gi`
    - `/Interview with\s+([^\n]+)/i`
  - Implement `parseGuests(description)` → Guest[]
  - Try patterns in priority order, return first match
  - Parse comma/ampersand-separated names
  - Extract Twitter handles from @mentions
  - Return empty array if no patterns match
  - **✓ Implemented with all patterns**

- [x] **T014** [P] Implement description converter in `/home/petty/Github/tbp/quartz/quartz/util/markdown-converter.ts`
  - Implement `convertDescriptionToMarkdown(description, videoId, config)` → string
  - Escape markdown special characters: `([*_`[\]()])/g` → `\\$1`
  - Preserve line breaks: `\n` → `  \n`
  - Auto-link URLs with regex: `/(https?:\/\/[^\s]+)/g` → `[$1]($1)`
  - Truncate at `config.truncateDescriptionAt` chars
  - Append "Read more on YouTube" link if truncated
  - **✓ Implemented with all transformations**

- [x] **T015** [P] Implement duration formatter in `/home/petty/Github/tbp/quartz/quartz/util/duration-formatter.ts`
  - Implement `formatDuration(iso8601Duration)` → "HH:MM:SS" or "MM:SS"
  - Parse ISO 8601 duration: `/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/`
  - Examples from contracts/episode-generation.contract.md:
    - "PT1H23M45S" → "1:23:45"
    - "PT45M30S" → "45:30"
    - "PT30S" → "0:30"
  - Throw error if invalid format
  - **✓ Implemented with validation**

- [x] **T016** [P] Implement filename generator in `/home/petty/Github/tbp/quartz/quartz/util/filename-generator.ts`
  - Import `github-slugger`
  - Implement `generateFileName(episodeNumber, title)` → "{number}-{slug}.md"
  - Zero-pad episode number to 3 digits (001, 042, etc.)
  - Slugify title with github-slugger
  - Examples from contracts/episode-generation.contract.md:
    - (1, "Bitcoin Basics") → "001-bitcoin-basics.md"
    - (42, "Future of Money") → "042-the-future-of-money.md"
  - **✓ Implemented with validation**

- [x] **T017** [P] Implement YouTube embed generator in `/home/petty/Github/tbp/quartz/quartz/util/embed-generator.ts`
  - Implement `generateYouTubeEmbed(videoId)` → HTML string
  - Use youtube-nocookie.com domain for privacy
  - Include responsive wrapper (16:9 aspect ratio with padding-bottom: 56.25%)
  - Include allowfullscreen and accessibility attributes
  - Exact format from contracts/episode-generation.contract.md
  - **✓ Implemented with responsive wrapper**

- [x] **T018** Implement episode generator in `/home/petty/Github/tbp/quartz/quartz/util/episode-generator.ts`
  - Import all utilities (duration, filename, embed, markdown converter, guest parser)
  - Import `gray-matter` for frontmatter serialization
  - Implement `generateEpisodeFile(video, episodeNumber, config)` → {filePath, content}
  - Build EpisodeFrontmatter from YouTubeVideo (per data-model.md)
  - Convert duration with formatDuration()
  - Generate filename with generateFileName()
  - Parse guests with parseGuests()
  - Convert description with convertDescriptionToMarkdown()
  - Generate YouTube embed with generateYouTubeEmbed()
  - Serialize frontmatter + body to markdown
  - Return absolute file path and full content
  - **✓ Implemented integrating all utilities**

---

## Phase 3.4: Main Sync Script

- [ ] **T019** Create CLI argument parser in `/home/petty/Github/tbp/quartz/quartz/scripts/youtube-sync.ts` (Part 1)
  - Import `yargs` for argument parsing
  - Define CLI options:
    - `--full` (boolean): Run full sync vs incremental
    - `--dry-run` (boolean): Preview without committing
    - `--no-commit` (boolean): Skip git commit
    - `--max <number>`: Limit videos for testing
    - `--after <date>`: Sync videos after date
    - `--before <date>`: Sync videos before date
    - `--config <path>`: Load custom config file
  - Load environment variables with dotenv
  - Validate YOUTUBE_API_KEY exists

- [ ] **T020** Implement main sync orchestration in `/home/petty/Github/tbp/quartz/quartz/scripts/youtube-sync.ts` (Part 2)
  - Import all utilities (youtube, git, episode-generator)
  - Implement `main()` function with steps:
    1. Load config (default or from --config path)
    2. Build SyncState from git history
    3. Fetch videos from YouTube (full or incremental based on last sync)
    4. Filter already-synced videos using SyncState
    5. Apply exclusions from config.excludedVideoIds
    6. Sort by publishedAt ascending
    7. Assign episode numbers sequentially
    8. For each video: call generateEpisodeFile(), write to disk
    9. Collect success/failure results
  - Log progress with console.log (✓ success, ✗ failure)
  - Handle --dry-run (preview only, no writes)

- [ ] **T021** Implement error handling and retry logic in `/home/petty/Github/tbp/quartz/quartz/scripts/youtube-sync.ts` (Part 3)
  - Wrap video processing in try/catch
  - Continue on per-video errors (don't crash entire sync)
  - Implement retry with exponential backoff for API errors
  - Retry attempts: config.retryAttempts (default 3)
  - Backoff delays: config.retryBackoff (default [60000, 300000, 900000])
  - Log detailed errors with video ID and error message
  - Return summary: {success: videoId[], failed: {id, error}[]}

- [ ] **T022** Implement git commit in `/home/petty/Github/tbp/quartz/quartz/scripts/youtube-sync.ts` (Part 4)
  - Import `@napi-rs/simple-git`
  - If --no-commit flag, skip this step
  - Generate commit message format (from contracts/git-state.contract.md):
    ```
    Sync {count} episode(s): {episode numbers}

    - Episode {num}: {title} (YouTube: {videoId})
    ...

    Generated by youtube-sync script
    ```
  - Run `git add content/episodes/*.md`
  - Run `git commit -m "{message}"`
  - Get commit hash with `git rev-parse HEAD`
  - Log commit hash to console

---

## Phase 3.5: Integration Tests & Validation

- [ ] **T023** [P] Create end-to-end sync flow integration test in `/home/petty/Github/tbp/quartz/tests/integration/sync-flow.test.ts`
  - Set up test git repository
  - Mock YouTube API responses (5 sample videos)
  - Run full sync flow
  - Assert 5 episode files created in correct location
  - Assert frontmatter structure matches data-model.md
  - Assert git commit created with correct message format
  - Clean up test files after

- [ ] **T024** [P] Create incremental sync test in `/home/petty/Github/tbp/quartz/tests/integration/incremental-sync.test.ts`
  - Set up test git repo with 3 existing episodes
  - Mock YouTube API to return 2 new videos published after last sync
  - Run incremental sync
  - Assert only 2 new episodes created (not duplicates of existing 3)
  - Assert episode numbers continue from 4, 5
  - Assert lastSyncTimestamp used in API query

- [ ] **T025** [P] Create error scenario test in `/home/petty/Github/tbp/quartz/tests/integration/error-handling.test.ts`
  - Test quota exceeded (403) → retry with backoff → log error
  - Test invalid API key (400) → fail fast, no retry
  - Test network timeout → retry 3 times → log failure
  - Test missing metadata (no title) → use defaults, flag for review
  - Assert sync continues after non-fatal errors

- [ ] **T026** Performance benchmark test in `/home/petty/Github/tbp/quartz/tests/integration/performance.test.ts`
  - Mock 50 YouTube videos
  - Run sync, measure time
  - Assert total sync time < 10 seconds (per Technical Context)
  - Assert git history scan < 1 second
  - Mock 500 episodes in git history, assert scan < 2 seconds
  - Log performance metrics

- [ ] **T027** Manual validation using quickstart guide
  - Follow quickstart.md setup steps exactly
  - Run initial full sync with `--max 5`
  - Verify 5 episode files created
  - Verify frontmatter fields populated correctly
  - Change one episode to `draft: false`
  - Run `npx quartz build`
  - Verify episode renders correctly with YouTube embed
  - Document any issues found

- [ ] **T028** Update documentation and polish
  - Add usage examples to README.md (if exists)
  - Document sync script in main docs
  - Add error troubleshooting guide (from quickstart.md)
  - Verify all TypeScript has proper type annotations
  - Run `npm run format` to format all new files
  - Run `npm run check` to verify no TypeScript errors

---

## Dependencies

**Setup Phase (T001-T005)** → Must complete before all other phases

**Test Phase (T006-T010)** → Must complete before implementation
- No dependencies within this phase (all parallel)
- Blocks: T011-T028

**Core Utilities (T011-T018)**:
- Depends on: T001-T010
- T011, T012, T013, T014, T015, T016, T017 are parallel (different files)
- T018 depends on T013, T014, T015, T016, T017 (imports them)

**Main Script (T019-T022)**:
- T019 depends on: T001-T005
- T020 depends on: T011, T012, T018, T019
- T021 depends on: T020 (adds to same file)
- T022 depends on: T021 (adds to same file)

**Integration Phase (T023-T028)**:
- Depends on: T001-T022 (full implementation)
- T023, T024, T025, T026 are parallel (different test files)
- T027 depends on: T020-T022 (needs working script)
- T028 depends on: T027 (final polish)

## Parallel Execution Examples

### Phase 3.2 - All Contract Tests Together
```bash
# Launch T006-T010 in parallel (all are independent test files):
npx tsx --test tests/contract/youtube-api.test.ts &
npx tsx --test tests/unit/episode-generator.test.ts &
npx tsx --test tests/integration/git-state.test.ts &
npx tsx --test tests/unit/guest-parser.test.ts &
npx tsx --test tests/unit/markdown-converter.test.ts &
wait
```

### Phase 3.3 - Core Utilities (T011-T017 parallel)
```bash
# Launch T011-T017 in parallel (all are independent implementations):
# Work on quartz/util/youtube.ts (T011)
# Work on quartz/util/git.ts (T012)
# Work on quartz/util/guest-parser.ts (T013)
# Work on quartz/util/markdown-converter.ts (T014)
# Work on quartz/util/duration-formatter.ts (T015)
# Work on quartz/util/filename-generator.ts (T016)
# Work on quartz/util/embed-generator.ts (T017)
# Then T018 (depends on above utilities)
```

### Phase 3.5 - Integration Tests (T023-T026 parallel)
```bash
# Launch T023-T026 in parallel:
npx tsx --test tests/integration/sync-flow.test.ts &
npx tsx --test tests/integration/incremental-sync.test.ts &
npx tsx --test tests/integration/error-handling.test.ts &
npx tsx --test tests/integration/performance.test.ts &
wait
```

## Validation Checklist

- [x] All contracts have corresponding tests (T006-T010)
- [x] All entities have implementation tasks (YouTubeVideo→T011, SyncState→T012, EpisodePage→T018)
- [x] All tests come before implementation (T006-T010 before T011-T018)
- [x] Parallel tasks truly independent (verified file paths)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] All quickstart scenarios have validation tasks (T027)

## Notes

- **TDD Critical**: Must run T006-T010 and verify tests FAIL before starting T011-T018
- **Git State**: T008 requires setting up test git repository with sample commits
- **API Mocking**: T006 should mock YouTube API, not make real requests
- **Environment**: Set up `.env` with test API key before T023-T027
- **Performance**: T026 benchmarks must match Technical Context constraints (<10s for 50 videos)
- **Commit After Each Phase**: Commit after T005, T010, T018, T022, T028

## Task Count: 28 tasks
- Setup: 5 tasks (T001-T005)
- Contract Tests: 5 tasks (T006-T010) [All P]
- Core Implementation: 8 tasks (T011-T018) [7P, 1 sequential]
- Main Script: 4 tasks (T019-T022) [Sequential]
- Integration & Polish: 6 tasks (T023-T028) [4P, 2 sequential]
