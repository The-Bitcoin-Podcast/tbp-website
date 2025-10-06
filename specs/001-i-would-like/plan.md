
# Implementation Plan: Podcast Landing Page

**Branch**: `001-i-would-like` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-i-would-like/spec.md`

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

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Create a custom landing page component for the TBP podcast website that serves as the main entry point. The page will feature a hero section with the podcast title, tagline, latest episode player, and Discord call-to-action, followed by a prominent display of the 5 most recent episodes in card format. The landing page will provide navigation to About, Sponsors, Contact Us, and Guests pages, and display social media links (Discord, Twitter, YouTube, RSS). The design must be fully responsive and use TBP brand colors (black #000000, orange #F7931A, white #FFFFFF).

## Technical Context
**Language/Version**: TypeScript 5.9.2 with Node.js >=22
**Primary Dependencies**: Quartz 4.5.2 (Preact 10.27.2, unified/remark/rehype ecosystem, esbuild)
**Storage**: Markdown files with frontmatter in `/content` directory (flat file structure)
**Testing**: tsx --test (Node.js test runner)
**Target Platform**: Static site generation (build output served as static HTML/CSS/JS)
**Project Type**: Single project (Quartz SSG with custom components)
**Performance Goals**: Sub-second hot reload during development, build time <5 seconds for typical sites
**Constraints**: Static generation only (no server-side rendering), responsive design (320px-1024px+), content-first architecture
**Scale/Scope**: Single landing page component + supporting data structures, integrates with existing Quartz plugin system

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**I. Content-First Architecture**
- [x] Feature treats markdown files as single source of truth (episodes/pages stored as markdown with frontmatter)
- [x] No source file modifications - build-time only transformations (landing page renders from content at build time)
- [x] Plugins operate on AST with clear contracts (uses existing Quartz emitter plugin pattern)

**II. Wiki-Style Linking**
- [x] WikiLinks syntax supported for internal links (leverages existing Quartz CrawlLinks plugin)
- [x] Backlinks automatically discovered (existing Quartz functionality)
- [x] Fuzzy matching and case-insensitive link resolution (existing Quartz functionality)

**III. Flat File Simplicity**
- [x] No database dependencies introduced (pure static generation)
- [x] Media as embedded links only (episode audio/thumbnails as URLs in frontmatter)
- [x] No enforced rigid folder structures (users organize content/ as desired)

**IV. Build-Time Performance**
- [x] Incremental rebuild support for changed files (Quartz chokidar-based watch mode)
- [x] Development server hot reload <1s (Quartz dev server with micromorph)
- [x] Build time benchmarks documented (will measure landing page generation impact)

**V. User Extensibility**
- [x] Plugin APIs exposed where applicable (landing page as custom page component)
- [x] TypeScript type definitions provided (QuartzComponent and QuartzComponentProps)
- [x] Configuration remains code-based (quartz.config.ts layout configuration)

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
├── components/
│   ├── pages/
│   │   ├── Content.tsx          # Existing standard page
│   │   ├── FolderContent.tsx    # Existing folder page
│   │   ├── TagContent.tsx       # Existing tag page
│   │   └── LandingPage.tsx      # NEW: Custom landing page component
│   ├── PageList.tsx              # Existing - may reuse for episodes
│   ├── Date.tsx                  # Existing - reuse for episode dates
│   └── styles/
│       └── landingPage.scss      # NEW: Landing page styles
└── plugins/
    └── emitters/
        └── landingPage.tsx       # NEW: Emitter plugin for index route

content/
├── index.md                      # NEW: Landing page content/config
├── episodes/                     # Episodes as markdown files
│   ├── episode-001.md
│   └── episode-002.md
├── about.md                      # Existing navigation targets
├── sponsors.md
├── contact.md
└── guests/

tests/
└── landingPage.test.ts          # NEW: Component tests
```

**Structure Decision**: Single project (Quartz SSG). The landing page is implemented as a custom page component in `quartz/components/pages/LandingPage.tsx` following Quartz's existing component patterns (Content, FolderContent, TagContent). A custom emitter plugin in `quartz/plugins/emitters/landingPage.tsx` will generate the landing page at the root route (`/`). Episode data comes from markdown files in `content/episodes/` with frontmatter metadata (title, date, audio URL, description, thumbnail, duration, guests).

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

The `/tasks` command will load `.specify/templates/tasks-template.md` and generate tasks based on:

1. **Type Contract Tasks** (from `/contracts/types.ts` and `/contracts/component-interface.ts`):
   - Create type definition files in `quartz/components/types/`
   - Ensure types extend Quartz's built-in types correctly
   - Export all interfaces for component consumption

2. **Component Structure Tasks** (from data model and research):
   - Create `quartz/components/pages/LandingPage.tsx` main component
   - Create sub-components: Hero, EpisodeGrid, EpisodeCard, AudioPlayer, SocialLinks
   - Create utility functions: getLatestEpisodes, parseLandingConfig, buildSocialLinks

3. **Styling Tasks** (from responsive design requirements):
   - Create `quartz/components/styles/landingPage.scss`
   - Implement mobile-first responsive grid (320px, 768px, 1024px breakpoints)
   - Integrate TBP brand colors from theme variables

4. **Emitter Plugin Tasks** (from research):
   - Create `quartz/plugins/emitters/landingPage.tsx`
   - Implement emit() method to generate index.html at root route
   - Register plugin in `quartz.config.ts`

5. **Content Setup Tasks** (from data model):
   - Create example `content/index.md` with landing page frontmatter
   - Create example episodes in `content/episodes/`
   - Document frontmatter schema in README or docs

6. **Test Tasks** (from quickstart):
   - Create `tests/landingPage.test.ts` component tests
   - Test episode querying and sorting
   - Test responsive rendering
   - Test accessibility (ARIA labels, keyboard navigation)

7. **Integration Tasks** (from quickstart scenarios):
   - Validate build completes without errors
   - Validate all FR-001 through FR-014 requirements
   - Run accessibility audit (Lighthouse)
   - Performance validation (build time, hot reload)

**Ordering Strategy**:
1. **Phase 2a - Foundation** [P = parallel where possible]:
   - [P] Type definitions
   - [P] Example content files
   - [P] SCSS base styles
2. **Phase 2b - Components**:
   - Utility functions (dependencies for components)
   - Sub-components (Hero, EpisodeCard, etc.)
   - Main LandingPage component (depends on sub-components)
3. **Phase 2c - Integration**:
   - Emitter plugin (depends on LandingPage component)
   - Config registration (depends on emitter)
4. **Phase 2d - Testing**:
   - Unit tests (component logic)
   - Integration tests (build and render)
   - Quickstart validation (all FR requirements)

**Estimated Output**: 18-22 numbered, dependency-ordered tasks in tasks.md

**Parallelization**:
- Type definitions, content examples, and base styles can be done in parallel [P]
- Sub-components that don't depend on each other can be parallel [P]
- Tests can be written in parallel with implementation (TDD approach)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No constitutional violations detected. The landing page feature fully aligns with all five Quartz principles:
- Content-first architecture maintained (markdown source of truth)
- Wiki-style linking supported via existing Quartz infrastructure
- Flat file simplicity preserved (no database dependencies)
- Build-time performance optimized (incremental rebuilds, hot reload)
- User extensibility enabled (custom component, TypeScript configuration)


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
- [x] Initial Constitution Check: PASS (no violations)
- [x] Post-Design Constitution Check: PASS (no violations)
- [x] All NEEDS CLARIFICATION resolved (technical context fully specified)
- [x] Complexity deviations documented (none - full constitutional compliance)

**Artifacts Generated**:
- [x] research.md - 7 research questions answered with decisions and rationale
- [x] data-model.md - 4 entities defined with schemas and access patterns
- [x] contracts/types.ts - TypeScript type definitions for frontmatter and runtime data
- [x] contracts/component-interface.ts - Component interface contracts and utility function signatures
- [x] quickstart.md - 10-step end-to-end test scenario with validation criteria
- [x] CLAUDE.md - Agent context file updated with project tech stack
- [x] tasks.md - 20 implementation tasks with dependency ordering and parallel execution guidance

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
