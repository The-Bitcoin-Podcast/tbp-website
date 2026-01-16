# Implementation Plan: Expand YouTube Sync to HIO Channel

**Branch**: `007-expand-youtube-sync` | **Date**: 2026-01-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-expand-youtube-sync/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✓ Loaded spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✓ All context resolved
3. Fill the Constitution Check section
   → ✓ Completed
4. Evaluate Constitution Check section
   → ✓ PASS - No violations
5. Execute Phase 0 → research.md
   → ✓ Created research.md
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✓ Created all artifacts
7. Re-evaluate Constitution Check section
   → ✓ PASS - No new violations
8. Plan Phase 2 → Describe task generation approach
   → ✓ Documented below
9. STOP - Ready for /tasks command
```

## Summary

Extend the existing `youtube-sync.ts` script to support syncing from multiple YouTube channels, specifically adding support for the Hashing It Out channel (`@HashingItOut-real`) alongside the existing The Bitcoin Podcast channel (`@thebtcpodcast`). Additionally, reorder the generated episode markdown content to display the video embed first, followed by description and guest information.

**Technical Approach**: Add `--channel` CLI flag with preset configurations, pass channel-specific output directories to sync state and generation functions, and reorder body sections in `episode-generator.ts`.

## Technical Context
**Language/Version**: TypeScript 5.9.2, Node.js 22+
**Primary Dependencies**: @googleapis/youtube, yargs, simple-git, gray-matter, github-slugger
**Storage**: Flat markdown files in `content/episodes/{channel}/` directories
**Testing**: tsx (TypeScript execution), manual verification via `--dry-run`
**Target Platform**: Node.js CLI script
**Project Type**: Single project (Quartz static site generator with scripts)
**Performance Goals**: N/A (CLI script, runs on-demand)
**Constraints**: YouTube API quota limits (handled by existing retry logic)
**Scale/Scope**: ~150 HIO episodes, ~500 TBP episodes

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Content-First Architecture**
- [x] Feature treats markdown files as single source of truth
- [x] No source file modifications - build-time only transformations
- [x] Plugins operate on AST with clear contracts

**II. Wiki-Style Linking**
- [x] WikiLinks syntax supported for internal links (unchanged)
- [x] Backlinks automatically discovered (unchanged)
- [x] Fuzzy matching and case-insensitive link resolution (unchanged)

**III. Flat File Simplicity**
- [x] No database dependencies introduced
- [x] Media as embedded links only (YouTube embeds, thumbnail URLs)
- [x] No enforced rigid folder structures (user chooses channel directory)

**IV. Build-Time Performance**
- [x] Incremental rebuild support for changed files (unchanged)
- [x] Development server hot reload <1s (unchanged)
- [x] Build time benchmarks documented (N/A - sync script, not build)

**V. User Extensibility**
- [x] Plugin APIs exposed where applicable (N/A - CLI script)
- [x] TypeScript type definitions provided
- [x] Configuration remains code-based (channel presets in code)

## Project Structure

### Documentation (this feature)
```
specs/007-expand-youtube-sync/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── cli-interface.md # CLI usage contract
│   └── episode-output.md # Generated file format contract
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
quartz/
├── scripts/
│   └── youtube-sync.ts      # Main CLI script (modify)
├── types/
│   └── youtube-sync.ts      # Type definitions (modify)
└── util/
    ├── youtube.ts           # YouTube API utilities (unchanged)
    ├── git.ts               # Git sync state (unchanged)
    ├── episode-generator.ts # Markdown generation (modify)
    ├── embed-generator.ts   # YouTube embed HTML (unchanged)
    ├── filename-generator.ts # Filename utilities (unchanged)
    ├── guest-parser.ts      # Guest parsing (unchanged)
    ├── markdown-converter.ts # Description conversion (unchanged)
    └── duration-formatter.ts # Duration formatting (unchanged)

content/episodes/
├── tbp/                     # The Bitcoin Podcast episodes
└── hio/                     # Hashing It Out episodes
```

**Structure Decision**: Single project structure. This feature modifies existing CLI script and utilities - no new modules or packages required.

## Phase 0: Outline & Research

**Research Completed** - See [research.md](./research.md)

Key findings:
1. Current implementation already supports channel handles (`@username` format)
2. Sync state is already per-directory - just pass the correct output path
3. Episode numbering is derived from directory scan - independent per channel
4. Content layout change is a simple reorder in `episode-generator.ts`

## Phase 1: Design & Contracts

**Design Completed** - See artifacts:
- [data-model.md](./data-model.md) - Entity definitions
- [contracts/cli-interface.md](./contracts/cli-interface.md) - CLI usage
- [contracts/episode-output.md](./contracts/episode-output.md) - Output format
- [quickstart.md](./quickstart.md) - Usage guide

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do*

**Task Generation Strategy**:
1. Add `ChannelPreset` type and `CHANNEL_PRESETS` constant to types file
2. Add `--channel` CLI argument to yargs configuration
3. Modify config loading to merge channel preset with defaults
4. Update sync state building to use channel-specific directory
5. Reorder body sections in episode generator (video embed first)
6. Update CLAUDE.md with HIO sync documentation
7. Manual testing with `--dry-run` for both channels

**Ordering Strategy**:
- Types first (ChannelPreset)
- CLI argument second (depends on types)
- Config logic third (uses CLI argument)
- Episode generator fourth (independent change)
- Documentation last

**Estimated Output**: 6-8 numbered tasks in tasks.md

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md)  
**Phase 5**: Validation (test both channels with --dry-run, verify output format)

## Complexity Tracking
*No violations - section empty*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | - | - |

## Progress Tracking

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [x] Phase 4: Implementation complete
- [x] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
