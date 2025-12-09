# Feature Specification: YouTube Channel Sync

**Feature Branch**: `002-i-would-like`
**Created**: 2025-10-05
**Status**: Draft
**Input**: User description: "I would like to have a way to sync the content with a youtube channel such that any new videos on the youtube channel (@thebtcpodcast) adds a new episode page, extracts the details of the youtube video, and fills in the page contents."

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-05
- Q: Where should the sync state/history be persisted to track processed videos? → A: Git history - use commit messages/logs to track what's synced
- Q: Should the YouTube video player be embedded in episode pages, or just link to YouTube? → A: Embed YouTube player iframe - viewers watch on site
- Q: What happens when YouTube has guest names/info in video description - should they be parsed? → A: Auto-parse guests from description patterns - extract structured data

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
The podcast publisher uploads a new episode to their YouTube channel (@thebtcpodcast). The system automatically detects the new video, extracts relevant metadata (title, description, duration, thumbnail, publish date), and creates a corresponding episode page on the website with all content populated. This eliminates manual data entry and ensures the website stays synchronized with YouTube content.

### Acceptance Scenarios
1. **Given** a new video is published on @thebtcpodcast YouTube channel, **When** the sync process runs, **Then** a new episode page is created with title, description, publish date, duration, thumbnail, and embedded YouTube player iframe populated from YouTube metadata

2. **Given** an existing video on YouTube has updated metadata (title/description changed), **When** the sync process runs, **Then** the corresponding episode page is updated to reflect the new metadata

3. **Given** a video exists on YouTube but has already been synced, **When** the sync process runs, **Then** no duplicate episode page is created

4. **Given** the YouTube channel has multiple new videos since last sync, **When** the sync process runs, **Then** episode pages are created for all new videos in chronological order

5. **Given** the sync process encounters a YouTube video with missing metadata fields, **When** attempting to create an episode page, **Then** the system handles gracefully by using default values (empty description if missing, "Unknown" for missing duration) and flags the episode for manual review

### Edge Cases
- When YouTube API is unavailable or rate-limited during sync, the system will retry with exponential backoff (1min, 5min, 15min) and log the failure for manual intervention
- Videos that are unlisted or made private after initial sync will retain their episode page but display a notice that the video is no longer publicly available
- When a video is deleted from YouTube after being synced, the episode page is marked as "unavailable" with a notice to visitors
- YouTube live streams are ignored until they become VODs (Video on Demand), then synced normally
- YouTube metadata with special characters or markdown conflicts will be escaped/sanitized automatically during conversion
- Very long video descriptions (>5000 characters) will be truncated with a "Read more on YouTube" link
- When guest parsing fails or finds no guest patterns in description, the guest field is left empty for manual addition

## Requirements *(mandatory)*

### Functional Requirements

**Core Sync Functionality**
- **FR-001**: System MUST detect new videos published on @thebtcpodcast YouTube channel
- **FR-002**: System MUST extract video metadata including title, description, publish date, duration, video ID, and thumbnail URL
- **FR-003**: System MUST create episode pages with extracted metadata automatically populated
- **FR-004**: System MUST prevent duplicate episode pages from being created for the same YouTube video
- **FR-005**: System MUST track which YouTube videos have already been synced by scanning git commit history for episode page additions, using video ID from frontmatter to determine sync status

**Metadata Handling**
- **FR-006**: System MUST map YouTube video title to episode page title
- **FR-007**: System MUST map YouTube video description to episode page content/description
- **FR-008**: System MUST map YouTube publish date to episode date
- **FR-009**: System MUST map YouTube video duration to episode duration field
- **FR-010**: System MUST map YouTube thumbnail URL to episode thumbnail
- **FR-011**: System MUST extract YouTube video ID and generate embedded YouTube player iframe code for episode pages
- **FR-012**: System MUST handle YouTube description formatting and convert to markdown
- **FR-012a**: System MUST auto-parse guest information from YouTube video descriptions using common patterns (e.g., "Guest:", "Featuring:", "with @username") and populate episode guest metadata

**Update & Sync Behavior**
- **FR-013**: System MUST prompt for confirmation before updating existing episode pages when YouTube metadata changes are detected
- **FR-014**: System MUST support on-demand manual sync triggered by a command or script
- **FR-015**: System MUST support full sync mode (all historical videos) and incremental sync mode (new videos only since last sync), with incremental as the default

**Error Handling & Resilience**
- **FR-016**: System MUST handle YouTube API errors gracefully without breaking the entire sync process
- **FR-017**: System MUST handle rate limiting from YouTube API by retry with backoff
- **FR-018**: System MUST log sync operations including successes, failures, and skipped videos
- **FR-019**: System MUST mark as "unavailable" if youtube video is deleted

**Content Organization**
- **FR-020**: System MUST store episode pages in a designated directory (e.g., content/episodes/) with consistent naming convention using video ID or episode number
- **FR-021**: System MUST assign episode numbers sequentially based on YouTube publish date (oldest = Episode 1)
- **FR-022**: System MUST extract tags from YouTube video tags/categories and store as frontmatter metadata, allowing manual addition/editing of tags after sync

**User Control**
- **FR-023**: System MUST provide a command-line interface to manually trigger sync process with options for full or incremental sync
- **FR-024**: System MUST allow exclusion of specific YouTube videos from sync via a configuration file or video ID list
- **FR-025**: System MUST create episode pages in draft status by default, requiring manual approval/publishing unless auto-publish is explicitly enabled in configuration

### Key Entities *(include if feature involves data)*

- **YouTube Video**: Source content from @thebtcpodcast channel containing metadata (video ID, title, description, publish date, duration, thumbnail URL, channel ID, status)

- **Episode Page**: Generated website page representing a podcast episode, containing synced metadata, episode number, content body, publish status, and reference to source YouTube video

- **Sync Record**: Historical record derived from git commit history showing which YouTube videos have been processed, when they were synced (commit timestamp), and mapping to created episode page files

- **Sync Configuration**: Settings entity containing YouTube channel identifier (@thebtcpodcast), sync schedule/trigger rules, content mapping rules, and error handling preferences

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

## Notes & Assumptions

**Dependencies:**
- Access to YouTube Data API v3 for retrieving channel videos and metadata
- YouTube channel identifier: @thebtcpodcast

**Key Decisions Made:**
1. **Sync frequency and trigger mechanism**: On-demand manual sync via CLI command, with support for automation via cron/scheduler if needed
2. **Historical video handling**: Support both modes - incremental sync (default, new videos only) and full sync mode (all historical videos)
3. **Update behavior for changed YouTube metadata**: Prompt for confirmation before updating existing pages to prevent accidental overwrites
4. **Episode numbering strategy**: Sequential numbering based on YouTube publish date (oldest video = Episode 1)
5. **Content approval workflow**: Draft status by default, requiring manual approval before publishing (auto-publish can be enabled in config)
6. **Error handling for missing metadata fields**: Use default values and flag for manual review
7. **Behavior when YouTube videos are deleted or made private**: Mark episode as "unavailable" with notice, retain page content
8. **Tag/category extraction strategy**: Extract from YouTube tags/categories field, store as frontmatter, allow manual editing
9. **Video filtering/exclusion capabilities**: Support exclusion list via configuration file (by video ID)
10. **Description format conversion requirements**: Convert to markdown, escape special characters, truncate if >5000 chars with "Read more" link
11. **Sync state persistence**: Use git commit history to track synced videos, scanning commit logs for episode page additions
12. **Video player integration**: Embed YouTube player iframe directly in episode pages for on-site viewing
13. **Guest extraction**: Auto-parse guest information from YouTube descriptions using common patterns (Guest:, Featuring:, @username)
