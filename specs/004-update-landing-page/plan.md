# Implementation Plan: Landing Page Improvements

**Branch**: `004-update-landing-page` | **Date**: 2025-10-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/home/petty/Github/tbp/quartz/specs/004-update-landing-page/spec.md`

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
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Fix landing page navigation and Recent Episodes display by adding Episodes link to navigation bar and making episode field validation flexible to support episodes with YouTube embeds (no audioUrl) and episodes without frontmatter descriptions. This enables the Recent Episodes section to properly display existing episode content.

## Technical Context
**Language/Version**: TypeScript 5.9.2 with Node.js 22+  
**Primary Dependencies**: Quartz 4.5.2 (Preact 10.27.2, unified/remark/rehype ecosystem, esbuild)  
**Storage**: Flat markdown files in content/episodes/ directory  
**Testing**: npm test (framework TBD from package.json)  
**Target Platform**: Static site (browser), Node.js build tooling  
**Project Type**: Single (Quartz static site generator)  
**Performance Goals**: Build time <5 seconds for typical sites, sub-second hot reload  
**Constraints**: No source file modification (build-time only), content-first architecture  
**Scale/Scope**: ~5-10 episodes currently, scalable to hundreds

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Content-First Architecture**
- [x] Feature treats markdown files as single source of truth - Episodes remain in markdown
- [x] No source file modifications - Build-time only transformations via component rendering
- [x] Plugins operate on AST with clear contracts - Component consumes QuartzPluginData

**II. Wiki-Style Linking**
- [x] WikiLinks syntax supported for internal links - Not applicable to this feature
- [x] Backlinks automatically discovered - Not applicable to this feature
- [x] Fuzzy matching and case-insensitive link resolution - Not applicable to this feature

**III. Flat File Simplicity**
- [x] No database dependencies introduced - Pure file-based episodes
- [x] Media as embedded links only (no binary uploads) - Thumbnails and audio are URLs
- [x] No enforced rigid folder structures - Episodes in content/episodes/ (existing convention)

**IV. Build-Time Performance**
- [x] Incremental rebuild support for changed files - Quartz built-in behavior preserved
- [x] Development server hot reload <1s - No blocking operations added
- [x] Build time benchmarks documented - Validation logic simplified (faster than before)

**V. User Extensibility**
- [x] Plugin APIs exposed where applicable - Component follows Quartz component API
- [x] TypeScript type definitions provided - All types in types/landingPage.ts
- [x] Configuration remains code-based - Config via frontmatter (Quartz pattern)

**Status**: ✅ PASS - No constitutional violations

## Project Structure

### Documentation (this feature)
```
specs/004-update-landing-page/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command) ✅
├── data-model.md        # Phase 1 output (/plan command) ✅
├── quickstart.md        # Phase 1 output (/plan command) ✅
├── contracts/           # Phase 1 output (/plan command) ✅
│   ├── getLatestEpisodes.contract.md
│   ├── buildNavLinks.contract.md
│   ├── EpisodeGrid.component.contract.md
│   └── EpisodeCard.component.contract.md
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
quartz/
├── components/
│   ├── types/
│   │   └── landingPage.ts           # Type definitions (MODIFY)
│   ├── utils/
│   │   └── landingPageUtils.ts      # Utility functions (MODIFY)
│   ├── pages/
│   │   └── LandingPage.tsx          # Main landing page (NO CHANGE)
│   ├── LandingPageNav.tsx           # Navigation component (NO CHANGE)
│   ├── EpisodeGrid.tsx              # Episode grid component (MODIFY)
│   └── EpisodeCard.tsx              # Episode card component (MODIFY)
│
├── plugins/
│   └── emitters/
│       └── landingPage.tsx          # Landing page emitter (NO CHANGE)
│
content/
└── episodes/                         # Episode markdown files (NO CHANGE)
    ├── 001-*.md
    ├── 002-*.md
    └── ...

tests/
└── [test files corresponding to modified components]
```

**Structure Decision**: Single project structure. This is a Quartz static site generator with TypeScript components in `quartz/` and markdown content in `content/`. Standard Quartz convention of components, plugins, and content directories.

## Phase 0: Outline & Research
**Status**: ✅ Complete - See [research.md](./research.md)

### Key Findings

1. **Problem Identified**: Recent Episodes section not displaying episodes due to overly strict validation requiring `audioUrl` and `description` fields that don't exist in current episode frontmatter.

2. **Current Episode Format**: Episodes have `youtubeId`, `thumbnail`, `duration` (as "MM:SS" string), but lack `audioUrl` and frontmatter `description`. Descriptions are in markdown body under `## Episode Description`.

3. **Navigation Gap**: `buildNavLinks()` only creates 4 links (About, Sponsors, Contact, Guests), missing Episodes link.

4. **Design Decision**: Make `audioUrl` and `description` optional in validation to support existing episode format. Add Episodes link as first navigation item.

**Output**: research.md with detailed problem analysis, technology review, and design decisions

## Phase 1: Design & Contracts
**Status**: ✅ Complete

### Artifacts Generated

1. **data-model.md**: ✅ Complete
   - Modified EpisodeFrontmatter type (audioUrl, description optional)
   - Modified EpisodeCard type (optional fields)
   - Modified NavLink array (includes Episodes)
   - Validation rules updated
   - Edge case handling documented

2. **contracts/**: ✅ Complete (4 contracts)
   - `getLatestEpisodes.contract.md` - Episode filtering and validation
   - `buildNavLinks.contract.md` - Navigation link generation
   - `EpisodeGrid.component.contract.md` - Episode section rendering with empty state
   - `EpisodeCard.component.contract.md` - Individual card rendering with optional fields

3. **quickstart.md**: ✅ Complete
   - Step-by-step validation procedures
   - Test scenarios (0 episodes, 1 episode, optional fields)
   - Success criteria checklist
   - Troubleshooting guide

4. **Agent context update**: Pending (next step)

### Design Summary

**Core Changes**:
1. Update `getLatestEpisodes()` validation to remove audioUrl and description requirements
2. Add Episodes link to `buildNavLinks()` function
3. Update TypeScript types to make audioUrl and description optional
4. Add empty state to EpisodeGrid component
5. Update EpisodeCard to conditionally render optional fields

**Files to Modify**:
- `quartz/components/types/landingPage.ts` - Type updates
- `quartz/components/utils/landingPageUtils.ts` - Validation + navigation logic
- `quartz/components/EpisodeGrid.tsx` - Empty state handling
- `quartz/components/EpisodeCard.tsx` - Optional field rendering

**Files Unchanged**:
- `quartz/components/pages/LandingPage.tsx` - No changes needed
- `quartz/components/LandingPageNav.tsx` - Already handles dynamic link arrays
- `content/episodes/*.md` - No episode file changes required

### Constitution Re-Check
- ✅ Content-First: Episodes remain in markdown, no source modification
- ✅ Flat File: No database, no enforced structure changes
- ✅ Performance: Validation simplified (faster), no blocking operations
- ✅ Extensibility: Types and contracts clearly defined

**Status**: ✅ PASS - No new violations

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 contracts and data model
3. Follow TDD approach: tests before implementation

**Task Categories**:

### A. Type Definition Updates
- Update EpisodeFrontmatter interface (audioUrl, description optional)
- Update EpisodeCard interface (optional fields)
- Ensure duration supports number | string

### B. Utility Function Updates
- Modify `getLatestEpisodes()` validation logic (remove audioUrl, description requirements)
- Add Episodes link to `buildNavLinks()` function
- Test both functions with updated contracts

### C. Component Updates
- Update EpisodeGrid to add empty state rendering
- Update EpisodeCard to conditionally render description and guestNames
- Handle duration display for both string and number formats

### D. Testing
- Write unit tests for getLatestEpisodes (optional fields)
- Write unit tests for buildNavLinks (5 links including Episodes)
- Write component tests for EpisodeGrid (empty state)
- Write component tests for EpisodeCard (optional field rendering)
- Integration test for landing page with various episode scenarios

### E. Validation
- Build and test locally
- Run quickstart.md validation procedures
- Visual testing on desktop and mobile

**Ordering Strategy**:
1. Type updates first (foundation)
2. Utility function updates (core logic)
3. Component updates (UI layer)
4. Tests throughout (TDD where possible)
5. Integration testing last

**Dependency Analysis**:
```
Types (landingPage.ts)
  ↓
Utils (landingPageUtils.ts) [depends on types]
  ↓
Components (EpisodeGrid.tsx, EpisodeCard.tsx) [depends on utils and types]
  ↓
Integration (LandingPage.tsx) [depends on all]
```

**Parallel Execution Opportunities** [P]:
- Type updates [P] - Independent
- Test writing [P] - Can be written alongside implementation
- EpisodeGrid and EpisodeCard updates [P] - Independent components

**Estimated Output**: 15-20 tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, visual testing)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations - table not needed.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (none existed)
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- [x] research.md
- [x] data-model.md
- [x] contracts/ (4 contract files)
- [x] quickstart.md
- [ ] Agent context file updated (next step)
- [ ] tasks.md (generated by /tasks command)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
