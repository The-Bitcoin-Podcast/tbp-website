<!--
SYNC IMPACT REPORT
Version: 1.0.0 (Initial Constitution)
Ratification: 2025-10-04
Changes:
  - NEW: Content-First Architecture principle
  - NEW: Wiki-Style Linking principle
  - NEW: Flat File Simplicity principle
  - NEW: Build-Time Performance principle
  - NEW: User Extensibility principle
Templates:
  - ✅ plan-template.md: Constitution Check section added
  - ✅ spec-template.md: Alignment verified
  - ✅ tasks-template.md: Principle-driven task categorization aligned
Follow-up: None
-->

# Quartz Constitution

## Core Principles

### I. Content-First Architecture

All features MUST treat markdown files as the single source of truth. Content processing MUST be non-destructive - transformations occur at build time only, never modifying source files. Plugins and transformers MUST operate on abstract syntax trees (AST) with clear input/output contracts.

**Rationale**: Ensures users maintain full ownership of their content in portable, future-proof markdown format without vendor lock-in.

### II. Wiki-Style Linking

Internal links between content MUST be resolved automatically using WikiLinks syntax (`[[page-name]]`) alongside standard markdown links. Graph relationships MUST be bidirectional - backlinks automatically discovered. Link resolution MUST be fuzzy-matched and case-insensitive to prioritize user experience over technical precision.

**Rationale**: Creates the interconnected, navigable knowledge graph essential for digital gardens and podcast show notes with rich cross-references.

### III. Flat File Simplicity

Content MUST live in flat markdown files with frontmatter metadata - no databases, no content APIs, no complex CMS. Media references MUST be embedded links (URLs or local paths), never uploaded binaries in the build system. File organization is user-controlled; the system MUST NOT enforce rigid folder structures.

**Rationale**: Keeps the system simple, version-controllable, and allows users to manage content with familiar tools (text editors, git).

### IV. Build-Time Performance

Static site generation MUST complete in seconds, not minutes, for typical sites (hundreds of pages). Incremental rebuilds MUST process only changed files and their dependencies. Development server MUST provide sub-second hot reload for content changes.

**Rationale**: Maintains fast iteration cycles essential for content creators, especially podcasters updating show notes frequently.

### V. User Extensibility

Core architecture MUST expose plugin APIs for transformers (markdown → AST → HTML), emitters (HTML generation), and filters (content selection). Plugins MUST be composable TypeScript/JavaScript modules. Configuration MUST be code-based (TypeScript config file) allowing programmatic customization, not limited to YAML/JSON.

**Rationale**: Empowers users to adapt the system to their specific podcast workflows and presentation needs without forking the codebase.

## Content Processing Standards

### Markdown Processing Pipeline

- Markdown parsing MUST use unified/remark ecosystem for AST manipulation
- Transformers MUST declare dependencies on other transformers explicitly
- Syntax extensions (WikiLinks, callouts, embeds) MUST be implemented as remark plugins
- HTML output MUST be sanitized - raw HTML in markdown is allowed but passed through rehype-raw with safe defaults

### Media Embedding

- Audio/video embeds MUST support standard podcast formats (MP3, M4A, Opus for audio; MP4, WebM for video)
- Embedded media players MUST be accessible (ARIA labels, keyboard navigation)
- External media links (YouTube, Spotify, etc.) MUST be transformed to privacy-respecting embeds when possible
- Local media files MUST be copied to static output directory with cache-busting hashes

## Development Workflow

### Testing Requirements

- Content processing transformers MUST have unit tests with sample markdown fixtures
- Link resolution MUST have integration tests verifying graph consistency
- Performance regression tests MUST run on CI for builds exceeding 100 pages
- Visual regression tests (Playwright/Puppeteer) MUST cover critical UI components

### Plugin Development

- New plugins MUST include TypeScript type definitions
- Plugin configuration MUST be validated at build time with clear error messages
- Plugin errors MUST NOT crash the build - graceful degradation with warnings preferred
- Plugin documentation MUST include working code examples

## Governance

This constitution defines the architectural boundaries for all Quartz development. Feature proposals MUST align with these principles - violations require documented justification demonstrating why the principle itself should be amended.

**Amendment Process**: Constitution changes require a minor version bump. Amendments MUST include migration guidance for existing users and plugins. Breaking changes to plugin APIs require a major version bump and deprecation period.

**Compliance**: All pull requests MUST pass automated principle checks (content-first: verify no DB dependencies; flat file: verify no binary content processing; performance: verify build time benchmarks). Complex features requiring principle deviation MUST document in implementation plan's Complexity Tracking section.

**Version**: 1.0.0 | **Ratified**: 2025-10-04 | **Last Amended**: 2025-10-04
