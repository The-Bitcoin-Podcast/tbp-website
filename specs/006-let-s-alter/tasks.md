# Tasks: RSS Podcast Sync Script

**Input**: Design documents from `/specs/006-let-s-alter/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
Based on plan.md structure: TypeScript project extending existing Quartz architecture
- **Scripts**: `quartz/scripts/`
- **Types**: `quartz/types/`
- **Utils**: `quartz/util/`
- **Tests**: `tests/unit/`, `tests/integration/`

## Phase 3.1: Setup
- [x] T001 Install RSS parsing dependency: `npm install rss-parser @types/rss-parser`
- [x] T002 Add `rss-sync` script entry to package.json
- [x] T003 [P] Create directory structure for RSS sync tests in tests/unit/ and tests/integration/

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T004 [P] Contract test for RSS parser in tests/unit/rss-parser.test.ts
- [x] T005 [P] Contract test for sync service in tests/unit/sync-service.test.ts
- [x] T006 [P] Contract test for episode generator in tests/unit/rss-episode-generator.test.ts
- [x] T007 [P] Integration test for RSS sync full workflow in tests/integration/rss-sync.test.ts
- [x] T008 [P] Integration test for performance requirements (30s for 100 episodes) in tests/integration/performance.test.ts
- [x] T009 [P] Integration test for retry logic and error handling in tests/integration/error-handling.test.ts

## Phase 3.3: Types and Data Models (ONLY after tests are failing)
- [x] T010 [P] RSSEpisode interface in quartz/types/rss-sync.ts
- [x] T011 [P] RSSFeed interface in quartz/types/rss-sync.ts
- [x] T012 [P] RSSConfig interface with clarification fields in quartz/types/rss-sync.ts
- [x] T013 [P] RSSEpisodeFrontmatter interface with status/warnings fields in quartz/types/rss-sync.ts
- [x] T014 [P] SyncState interface with podcast folder support in quartz/types/rss-sync.ts

## Phase 3.4: Core Implementation
- [x] T015 RSS parsing utilities with retry logic in quartz/util/rss.ts
- [x] T016 Duration parsing function (HH:MM:SS, MM:SS, seconds) in quartz/util/rss.ts
- [x] T017 HTTP caching support with ETag/Last-Modified in quartz/util/rss.ts
- [x] T018 Missing metadata placeholder generation in quartz/util/rss.ts
- [x] T019 Episode availability status management in quartz/util/rss.ts
- [x] T020 Podcast folder validation and path generation in quartz/util/rss.ts

## Phase 3.5: Sync Service Integration
- [x] T021 RSS sync service with podcast folder support in quartz/scripts/rss-sync.ts
- [x] T022 Command-line argument parsing (yargs integration) in quartz/scripts/rss-sync.ts
- [x] T023 Configuration loading and validation in quartz/scripts/rss-sync.ts
- [x] T024 Integrate existing git utilities for sync state tracking in quartz/scripts/rss-sync.ts
- [x] T025 Integrate existing episode-generator for markdown file creation in quartz/scripts/rss-sync.ts
- [x] T026 Episode numbering with podcast folder context in quartz/scripts/rss-sync.ts

## Phase 3.6: Error Handling and Performance
- [x] T027 Exponential backoff retry implementation (3 retries) in quartz/scripts/rss-sync.ts
- [x] T028 Performance monitoring and 30-second timeout enforcement in quartz/scripts/rss-sync.ts
- [x] T029 RSS feed validation and error reporting in quartz/scripts/rss-sync.ts
- [x] T030 Missing metadata warning system in quartz/scripts/rss-sync.ts
- [x] T031 Episode removal detection and status marking in quartz/scripts/rss-sync.ts
- [x] T032 Git commit creation for synced episodes in quartz/scripts/rss-sync.ts

## Phase 3.7: Polish and Documentation
- [x] T033 [P] Unit tests for RSS parsing edge cases in tests/unit/rss-edge-cases.test.ts
- [x] T034 [P] Unit tests for duration parsing formats in tests/unit/duration-parsing.test.ts
- [x] T035 [P] Unit tests for placeholder generation in tests/unit/placeholder-generation.test.ts
- [x] T036 [P] Update CLAUDE.md with RSS sync information
- [x] T037 Create example RSS sync configuration file
- [x] T038 [P] Performance validation tests (benchmark 30-second requirement) in tests/integration/performance-validation.test.ts
- [x] T039 End-to-end manual testing following quickstart.md scenarios
- [x] T040 Cleanup and refactoring for code consistency with youtube-sync.ts

## Dependencies
- Setup (T001-T003) before everything else
- Tests (T004-T009) before implementation (T010-T032)
- Types (T010-T014) before core implementation (T015-T020)
- Core implementation (T015-T020) before sync service (T021-T026)
- Sync service (T021-T026) before error handling (T027-T032)
- All implementation before polish (T033-T040)

## Parallel Example
```bash
# Launch contract tests together:
npm run test -- tests/unit/rss-parser.test.ts &
npm run test -- tests/unit/sync-service.test.ts &
npm run test -- tests/unit/episode-generator.test.ts &
wait

# Launch type definitions together:
# T010-T014 can all be implemented simultaneously in quartz/types/rss-sync.ts

# Launch unit tests together:
npm run test -- tests/unit/rss-edge-cases.test.ts &
npm run test -- tests/unit/duration-parsing.test.ts &
npm run test -- tests/unit/placeholder-generation.test.ts &
wait
```

## Task Agent Commands
Use these exact commands for parallel execution:

**Phase 3.2 (Tests):**
```
Task 1: "Contract test for RSS parser interface in tests/unit/rss-parser.test.ts - verify parseRSSFeed, fetchAndParseRSS, and validateFeed functions with proper error handling"
Task 2: "Contract test for sync service interface in tests/unit/sync-service.test.ts - verify syncFeed, fullSync, dryRun, and getSyncState functions"
Task 3: "Contract test for episode generator interface in tests/unit/episode-generator.test.ts - verify generateEpisodeFile, generateFrontmatter, and generateFilename functions"
Task 4: "Integration test for RSS sync workflow in tests/integration/rss-sync.test.ts - end-to-end sync from RSS feed to markdown files in podcast folder"
```

**Phase 3.3 (Types):**
```
Task 1: "Define RSSEpisode and RSSFeed interfaces in quartz/types/rss-sync.ts with proper TypeScript types"
Task 2: "Define RSSConfig interface with clarification fields (retryAttempts, performanceTimeoutMs, generatePlaceholders) in quartz/types/rss-sync.ts"
Task 3: "Define RSSEpisodeFrontmatter interface with status, hasPlaceholders, and warnings fields in quartz/types/rss-sync.ts"
Task 4: "Define SyncState interface with podcast folder support in quartz/types/rss-sync.ts"
```

## Notes
- [P] tasks = different files, no dependencies between them
- Verify all tests fail before implementing corresponding functionality
- Commit after each task completion
- Follow existing youtube-sync.ts patterns for consistency
- Ensure podcast folder structure is respected throughout
- All clarifications from user session must be implemented

## Validation Checklist
*GATE: Checked before task execution*

- [x] All contracts have corresponding tests (T004-T006)
- [x] All entities have model/type tasks (T010-T014)
- [x] All tests come before implementation
- [x] Parallel tasks truly independent ([P] tasks use different files)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Performance requirements (30s) explicitly tested (T008, T038)
- [x] Error handling (3 retries) explicitly tested (T009, T027)
- [x] Podcast folder organization maintained throughout