# Feature Specification: RSS Podcast Sync Script

**Feature Branch**: `006-let-s-alter`  
**Created**: 2026-01-01  
**Status**: Draft  
**Input**: User description: "let's alter the spec to pull off the RSS feed instead of directly through Spotify, which is at: https://anchor.fm/s/f8e7252c/podcast/rss"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature description provided: Create RSS feed podcast sync script
2. Extract key concepts from description
   → Identified: RSS feed, podcast sync, specific feed URL provided
3. For each unclear aspect:
   → RSS feed URL is specified: https://anchor.fm/s/f8e7252c/podcast/rss
   → Sync behavior similar to existing YouTube sync functionality
4. Fill User Scenarios & Testing section
   → User flow: Content managers sync podcast episodes from RSS feed to website
5. Generate Functional Requirements
   → Each requirement must be testable
   → Requirements focus on RSS feed parsing and episode file generation
6. Identify Key Entities (if data involved)
   → Podcast episodes from RSS, sync state, configuration
7. Run Review Checklist
   → No major clarifications needed - RSS approach is well-defined
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2026-01-01
- Q: What should be the maximum acceptable sync time for a typical operation? → A: Under 30 seconds for up to 100 new episodes
- Q: What should happen when an episode that was previously synced is no longer available in the RSS feed? → A: Mark the episode file as unavailable but don't delete it
- Q: When the RSS feed is temporarily unavailable or returns errors, how many times should the system retry before giving up? → A: Retry 3 times with exponential backoff
- Q: When an episode has missing essential metadata (like title or publish date), what should the sync system do? → A: Generate placeholder values and include the episode with warnings
- Q: How often should the RSS sync script be expected to run in normal operations? → A: a couple times a month

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
Content managers need to automatically sync episodes from the "Hashing It Out" podcast RSS feed to the website, similar to how YouTube episodes are currently synced. The system should pull new podcast episodes from the RSS feed at https://anchor.fm/s/f8e7252c/podcast/rss and generate episode files with metadata for display on the website.

### Acceptance Scenarios
1. **Given** the sync script is configured with the RSS feed URL, **When** the script runs, **Then** it fetches all new episodes from the RSS feed that haven't been synced previously
2. **Given** new podcast episodes are found in the RSS feed, **When** the sync process completes, **Then** markdown files are generated in the episodes directory with proper frontmatter and content
3. **Given** the script runs in incremental mode, **When** it executes, **Then** it only syncs episodes published since the last successful sync
4. **Given** the script runs with dry-run flag, **When** it executes, **Then** it shows what would be synced without actually creating files
5. **Given** the RSS feed is temporarily unavailable, **When** the script runs, **Then** it provides a clear error message and exits gracefully

### Edge Cases
- What happens when the RSS feed URL is unreachable or returns invalid data?
- How does the system handle malformed RSS entries or missing required metadata?
- How does the system handle duplicate episode GUIDs or conflicting episode metadata?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST fetch podcast data from the RSS feed at https://anchor.fm/s/f8e7252c/podcast/rss
- **FR-002**: System MUST parse RSS XML format to extract episode metadata including title, description, publish date, duration, and episode URL
- **FR-003**: System MUST generate markdown files for each episode in the same format as YouTube episodes  
- **FR-003.1**: System MUST place episodes in podcast-specific subdirectories within the episodes folder
- **FR-004**: System MUST track sync state to support incremental syncing based on episode publish dates
- **FR-005**: System MUST support dry-run mode for previewing changes without creating files
- **FR-006**: System MUST support full sync mode that ignores previous sync state and processes all episodes
- **FR-007**: System MUST handle network errors and invalid RSS data gracefully with meaningful error messages
- **FR-008**: System MUST support configuration via external configuration file  
- **FR-008.1**: System MUST allow configuration of podcast identifier and target folder mapping
- **FR-009**: System MUST create git commits for successfully synced episodes
- **FR-010**: System MUST filter out already-synced episodes to avoid duplicates
- **FR-011**: System MUST assign sequential episode numbers starting from the last synced episode
- **FR-012**: System MUST validate RSS feed structure before processing episodes
- **FR-013**: System MUST support command-line options for date filtering (before/after) similar to YouTube sync
- **FR-014**: System MUST respect RSS feed caching headers to avoid excessive requests
- **FR-015**: System MUST complete sync operations within 30 seconds for up to 100 new episodes
- **FR-016**: System MUST mark episode files as unavailable when episodes are removed from RSS feed rather than deleting them
- **FR-017**: System MUST retry failed RSS feed requests exactly 3 times using exponential backoff before reporting failure
- **FR-018**: System MUST generate placeholder values for missing essential episode metadata and include episodes with warnings rather than skipping them
- **FR-019**: System MUST be designed for manual execution approximately twice per month rather than automated scheduling

### Key Entities *(include if feature involves data)*
- **Podcast Episode**: Represents a single episode from RSS with metadata (title, description, publish date, duration, episode URL, GUID)
- **RSS Feed**: The podcast feed structure containing episode data and podcast metadata
- **Podcast Identifier**: Configuration mapping RSS feed to podcast folder (e.g., "Hashing It Out" → "hio")
- **Sync Configuration**: Settings for the sync process (RSS URL, output directory, podcast folder, exclusions, rate limiting)
- **Sync State**: Tracks previously synced episodes and last sync timestamp to enable incremental updates

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---