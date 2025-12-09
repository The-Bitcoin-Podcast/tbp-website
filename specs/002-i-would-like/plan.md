
# Implementation Plan: YouTube Channel Sync

**Branch**: `002-i-would-like` | **Date**: 2025-10-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/petty/Github/tbp/quartz/specs/002-i-would-like/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from file system structure or context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code, or `AGENTS.md` for all other agents).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

**Post-Design Constitution Check**: ✅ PASS - Design maintains all constitutional principles:
- Content-First: Episodes stored as markdown with frontmatter, no source modifications
- Wiki-Style Linking: Existing Quartz system unchanged
- Flat File Simplicity: Git-based state tracking, markdown content only, no database
- Build-Time Performance: Sync is separate build-time tool, doesn't impact Quartz build/dev server
- User Extensibility: TypeScript sync script with config file, follows Quartz patterns

## Summary
Automatically sync YouTube videos from @thebtcpodcast channel to create episode pages on the Quartz static site. The system will fetch video metadata via YouTube Data API v3, parse guest information from descriptions, generate markdown files with frontmatter, embed YouTube player iframes, and track sync state via git commit history. Episodes are created in draft status by default with manual approval workflow.

## Technical Context
**Language/Version**: TypeScript 5.9.2, Node.js 22+
**Primary Dependencies**: Quartz 4.5.2 (Preact, unified/remark/rehype), YouTube Data API v3 client, gray-matter (frontmatter parsing)
**Storage**: Flat markdown files in content/episodes/ directory, git commit history for sync state tracking
**Testing**: tsx --test (Node.js test runner), contract tests for API integration
**Target Platform**: CLI script (Node.js) + Quartz static site generator
**Project Type**: Single project (Quartz plugin/script extension)
**Performance Goals**: <10s sync for 50 new videos, <1s git history scan for duplicate detection
**Constraints**: YouTube API quota (10,000 units/day default), build-time only processing (no runtime dependencies), git-based state only (no database)
**Scale/Scope**: ~500 YouTube videos initial sync, ongoing incremental sync (1-5 videos/week)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Content-First Architecture**
- [x] Feature treats markdown files as single source of truth - Episodes stored as .md with frontmatter
- [x] No source file modifications - Sync creates new files only, never modifies existing content
- [x] Plugins operate on AST with clear contracts - Existing Quartz plugin system used, no AST changes

**II. Wiki-Style Linking**
- [x] WikiLinks syntax supported for internal links - Existing Quartz WikiLinks preserved
- [x] Backlinks automatically discovered - No changes to link system
- [x] Fuzzy matching and case-insensitive link resolution - Existing behavior maintained

**III. Flat File Simplicity**
- [x] No database dependencies introduced - Uses git commit history for state, markdown files for content
- [x] Media as embedded links only (no binary uploads) - YouTube iframe embeds via video ID, thumbnails as URLs
- [x] No enforced rigid folder structures - User can configure episode directory location

**IV. Build-Time Performance**
- [x] Incremental rebuild support for changed files - Sync creates files that Quartz processes incrementally
- [x] Development server hot reload <1s - No changes to Quartz dev server
- [x] Build time benchmarks documented - Will document sync performance separately from build

**V. User Extensibility**
- [x] Plugin APIs exposed where applicable - CLI script, not a plugin (appropriate for build-time tool)
- [x] TypeScript type definitions provided - Will provide types for sync config and episode schema
- [x] Configuration remains code-based - Sync config in TypeScript/JSON

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
quartz/
├── scripts/
│   └── youtube-sync.ts        # Main CLI sync script
├── util/
│   ├── youtube.ts             # YouTube API client utilities
│   ├── git.ts                 # Git history scanner for sync state
│   ├── guest-parser.ts        # Guest extraction from descriptions
│   └── episode-generator.ts   # Markdown file generation
└── types/
    └── youtube-sync.ts        # Type definitions for sync entities

content/
└── episodes/                  # Generated episode markdown files
    ├── 001-episode-name.md
    └── 002-another-episode.md

tests/
├── contract/
│   └── youtube-api.test.ts   # YouTube API contract tests
├── integration/
│   ├── sync-flow.test.ts     # End-to-end sync tests
│   └── git-state.test.ts     # Git history state tests
└── unit/
    ├── guest-parser.test.ts  # Guest parsing unit tests
    └── episode-generator.test.ts
```

**Structure Decision**: Single project structure extending Quartz codebase. Sync functionality lives in `quartz/scripts/` as a standalone CLI tool that generates content files. Utility modules in `quartz/util/` for reusability. Episode content generated to `content/episodes/` following existing Quartz content organization patterns.

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `.specify/scripts/bash/update-agent-context.sh claude`
     **IMPORTANT**: Execute it exactly as specified above. Do not add or remove any arguments.
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Setup & Infrastructure** (Tasks 1-5):
   - Install dependencies (@googleapis/youtube, dotenv)
   - Create type definitions (quartz/types/youtube-sync.ts)
   - Set up configuration structure (sync-config.ts)
   - Create test fixtures and utilities
   - Set up environment variable handling

2. **Contract Tests First** (Tasks 6-10) [P]:
   - YouTube API contract test (tests/contract/youtube-api.test.ts)
   - Episode generation contract test (tests/unit/episode-generator.test.ts)
   - Git state contract test (tests/integration/git-state.test.ts)
   - Guest parsing contract test (tests/unit/guest-parser.test.ts)
   - Description conversion contract test (tests/unit/markdown-converter.test.ts)

3. **Core Utilities** (Tasks 11-18):
   - YouTube API client (quartz/util/youtube.ts)
   - Git history scanner (quartz/util/git.ts)
   - Guest parser (quartz/util/guest-parser.ts)
   - Description converter (quartz/util/markdown-converter.ts)
   - Episode generator (quartz/util/episode-generator.ts)
   - Duration formatter utility
   - File name generator utility
   - YouTube embed generator utility

4. **Main Sync Script** (Tasks 19-22):
   - CLI argument parsing
   - Main sync orchestration logic
   - Error handling and retry logic
   - Logging and reporting

5. **Integration & Validation** (Tasks 23-28):
   - End-to-end sync flow integration test
   - Incremental sync test
   - Full sync test
   - Error scenario tests
   - Performance benchmarking
   - Quickstart validation (run through guide)

**Ordering Strategy**:
- **TDD approach**: All contract tests (Tasks 6-10) before implementations (Tasks 11-18)
- **Dependency order**:
  - Types/config → Utilities → Main script
  - Tests before implementation for each module
- **Parallel execution**: Tasks marked [P] are independent and can run simultaneously
  - All contract tests (6-10) are parallel
  - Utility implementations (11-18) are parallel after tests pass
- **Sequential gates**:
  - Gate 1: Setup complete before tests
  - Gate 2: All tests written before implementations
  - Gate 3: All utilities complete before main script
  - Gate 4: Main script complete before integration tests

**Task Categories**:
- **[SETUP]**: Infrastructure and configuration (5 tasks)
- **[TEST]**: Contract and unit tests (10 tasks)
- **[IMPL]**: Core implementation (8 tasks)
- **[INTEGRATION]**: End-to-end validation (5 tasks)

**Estimated Output**: 28 numbered, dependency-ordered tasks in tasks.md

**Key Milestones**:
- Milestone 1: All contracts defined and tests failing (Task 10)
- Milestone 2: All utilities implemented, tests passing (Task 18)
- Milestone 3: Main script functional (Task 22)
- Milestone 4: Full validation complete (Task 28)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
