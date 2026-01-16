# Feature Specification: Expand YouTube Sync to Hashing It Out Channel

**Feature Branch**: `007-expand-youtube-sync`  
**Created**: 2026-01-16  
**Status**: Draft  
**Input**: User description: "expand youtube-sync to hio, I want to expand the current youtube-sync.ts to allow me to pull from the hashing it out channel as well. That channel is found at: https://www.youtube.com/@HashingItOut-real. I'd also like to ensure that the generated pages show the video file first, then description and other content."

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a content manager, I want to sync YouTube videos from the Hashing It Out channel (@HashingItOut-real) to the website so that I can maintain episode pages for both The Bitcoin Podcast and Hashing It Out shows from a single sync tool. I also want the generated episode pages to display the video embed prominently at the top, followed by the description and other content, so viewers immediately see the video.

### Acceptance Scenarios
1. **Given** the youtube-sync script is configured for the Hashing It Out channel, **When** I run the sync command, **Then** episodes are created in `content/episodes/hio/` with correct metadata from the YouTube channel @HashingItOut-real.

2. **Given** the youtube-sync script is run, **When** episode markdown files are generated, **Then** the video embed section appears first in the body content, followed by the episode description and guest information.

3. **Given** I want to sync from The Bitcoin Podcast channel, **When** I run the sync command with that channel's configuration, **Then** episodes are still created in the appropriate directory as before (backwards compatible).

4. **Given** I run the sync for Hashing It Out, **When** the script processes videos, **Then** episode numbers are sequential within the HIO series (not mixed with TBP numbering).

5. **Given** the sync is complete, **When** I view a generated HIO episode page, **Then** I see the YouTube video embed at the top of the page content, making it easy for visitors to watch immediately.

### Edge Cases
- What happens when a video from HIO has the same YouTube ID as a previously synced video? System should detect duplicates using youtubeId field.
- How does the system handle running sync for both channels in sequence? Each channel maintains its own episode count and output directory.
- What happens if the HIO channel ID is invalid or inaccessible? System should provide clear error message about channel access failure.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST support syncing from multiple YouTube channels, including @HashingItOut-real in addition to @thebtcpodcast.
- **FR-002**: System MUST allow configuration of which channel to sync via command-line option or configuration file.
- **FR-003**: System MUST output Hashing It Out episodes to a dedicated directory (`content/episodes/hio/`).
- **FR-004**: System MUST maintain separate episode numbering per channel/show.
- **FR-005**: System MUST generate episode markdown files with the video embed section appearing before the description section in the body content.
- **FR-006**: System MUST preserve backwards compatibility with existing @thebtcpodcast sync functionality.
- **FR-007**: System MUST track sync state separately per channel to support incremental sync for each.
- **FR-008**: System MUST use the YouTube channel handle @HashingItOut-real as the identifier for the Hashing It Out channel.

### Content Layout Requirements
- **FR-009**: Generated episode pages MUST display content sections in this order:
  1. Video embed (Watch Episode)
  2. Episode description
  3. Guest information (if present)
- **FR-010**: The video embed MUST be the first content section visitors see after the frontmatter/title.

### Key Entities
- **Channel Configuration**: Represents a YouTube channel to sync, including channel ID/handle, output directory, and channel-specific settings.
- **Episode**: A synced video with channel-specific episode numbering and metadata, stored in channel-specific output directory.
- **Sync State**: Per-channel tracking of synced video IDs, last sync timestamp, and episode count.

---

## Review & Acceptance Checklist

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

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
