# Research: Landing Page Improvements

## Problem Analysis

### Issue 1: Missing Episodes Navigation Link
**Current State**: The navigation only includes About, Sponsors, Contact, and Guests links
**Location**: `quartz/components/utils/landingPageUtils.ts:120-134` in `buildNavLinks()` function
**Root Cause**: The Episodes link was not included in the original navigation design

### Issue 2: Recent Episodes Section Not Working
**Current State**: Recent Episodes section doesn't display any episodes
**Location**: `quartz/components/utils/landingPageUtils.ts:17-62` in `getLatestEpisodes()` function
**Root Cause**: The validation logic expects ALL fields (audioUrl, description) to be present, but episodes only have:
- `title`, `date`, `episodeNumber`, `thumbnail`, `duration`, `youtubeId`
- **Missing**: `audioUrl`, `description` (brief 2-3 sentence version)

Episode files have:
- Full description in markdown body under `## Episode Description`
- YouTube video embed instead of audio file
- Duration in format "54:01" (string) not minutes (number)

**Validation Requirements (Current)**:
```typescript
fm?.title &&
fm?.date &&
fm?.episodeNumber !== undefined &&
fm?.audioUrl &&           // ❌ Not present in episodes
fm?.description &&        // ❌ Not present in frontmatter
fm?.thumbnail &&
fm?.duration !== undefined
```

### Issue 3: Data Model Mismatch
**Problem**: Episode frontmatter schema doesn't match actual episode files
- Episodes use `youtubeId` for video, not `audioUrl` for audio
- Episodes have markdown body descriptions, not frontmatter `description` field
- Episodes have duration as "MM:SS" string, not minutes as number

## Technology Review

### Existing Stack
- **Framework**: Quartz 4.5.2 (Preact 10.27.2)
- **Language**: TypeScript 5.9.2
- **Build**: Node.js 22+
- **Episode Storage**: Flat markdown files in `content/episodes/`
- **Metadata**: YAML frontmatter

### Component Architecture
```
LandingPage.tsx
├── Navigation (LandingPageNav.tsx)
├── Hero (LandingPageHero.tsx)
├── EpisodeGrid (EpisodeGrid.tsx)
│   └── EpisodeCard (EpisodeCard.tsx)
└── SocialLinks (SocialLinks.tsx)
```

### Data Flow
1. `LandingPage` calls `getLatestEpisodes(allFiles, 5)`
2. `getLatestEpisodes` filters and validates episodes
3. Returns `EpisodeCard[]` array
4. `EpisodeGrid` renders cards

## Design Decisions

### Decision 1: Add Episodes Link to Navigation
**Approach**: Add Episodes entry to `buildNavLinks()` function
**Location**: `quartz/components/utils/landingPageUtils.ts`
**Implementation**: Append new NavLink object with label "Episodes" and URL from `config.episodesArchiveUrl`

**Rationale**: 
- Minimal change to existing pattern
- Consistent with other navigation links
- URL already exists in config (`episodesArchiveUrl`)

### Decision 2: Fix Episode Validation Logic
**Approach**: Make validation flexible to handle actual episode data
**Options Considered**:

**Option A**: Require episodes to add missing fields
- **Rejected**: Would break existing episode sync process from YouTube
- Requires retroactive updates to all episodes

**Option B**: Make audioUrl and description optional in validation
- **Selected**: ✅
- Preserves existing episode format
- Allows gradual migration to include audio files later
- Episodes can work with YouTube embeds

**Implementation**:
```typescript
// Change validation to make audioUrl optional
fm?.title &&
fm?.date &&
fm?.episodeNumber !== undefined &&
fm?.thumbnail &&
fm?.duration !== undefined
// Remove: fm?.audioUrl && fm?.description
```

### Decision 3: Handle Missing Description Field
**Approach**: Extract description from markdown body or use placeholder
**Options Considered**:

**Option A**: Parse markdown body for ## Episode Description
- Complex, requires AST parsing
- Performance overhead

**Option B**: Use empty/placeholder description
- **Selected**: ✅
- Simple, fast
- Description can be optional in display
- Can add to EpisodeCard component to hide if empty

**Implementation**: Make `description` optional in `EpisodeCard` type and hide in render if not present

### Decision 4: Handle Duration Format
**Approach**: Support both string "MM:SS" and number (minutes)
**Implementation**: 
- Keep duration as-is in frontmatter
- Display as-is in card (it's just for display)
- Type can be `number | string`

## Best Practices

### Quartz Component Patterns
- Components use Preact function components
- Props passed via TypeScript interfaces
- Styling via SCSS modules imported as `style`
- No state management needed (static rendering)

### Type Safety
- All interfaces in `types/landingPage.ts`
- Extend `QuartzPluginData` for frontmatter types
- Runtime validation before rendering

### Content-First Architecture (Constitution Principle I)
- ✅ Episodes remain in flat markdown files
- ✅ No source modification
- ✅ Build-time transformation only

### Flat File Simplicity (Constitution Principle III)
- ✅ No database
- ✅ Episodes controlled by user
- ✅ No enforced structure beyond frontmatter

## Implementation Summary

### Changes Required
1. **Add Episodes to Navigation** (`landingPageUtils.ts:buildNavLinks`)
   - Add Episodes link entry
   
2. **Fix Episode Validation** (`landingPageUtils.ts:getLatestEpisodes`)
   - Remove audioUrl and description from required fields
   - Keep other validation intact

3. **Update Types** (`types/landingPage.ts`)
   - Make `audioUrl`, `description` optional in `EpisodeFrontmatter`
   - Make `duration` accept `number | string`
   - Make `description`, `audioUrl` optional in `EpisodeCard`

4. **Update Card Display** (`EpisodeCard.tsx`)
   - Conditionally render description if present
   - Handle duration display for both formats

5. **Add Empty State** (`EpisodeGrid.tsx`)
   - Show helpful message when no episodes available

### Files to Modify
- `quartz/components/utils/landingPageUtils.ts`
- `quartz/components/types/landingPage.ts`
- `quartz/components/EpisodeCard.tsx`
- `quartz/components/EpisodeGrid.tsx`

### Files to Test
- Test with existing episodes (no audioUrl/description)
- Test with 0 episodes
- Test with <5 episodes
- Test navigation on mobile
- Test Episodes link navigation

## Alternatives Considered

### Alternative 1: Strict Validation + Episode Migration
**Rejected**: Would require updating all existing episodes and modifying the YouTube sync process, breaking the existing workflow.

### Alternative 2: Separate YouTube Episodes from Audio Episodes
**Rejected**: Unnecessary complexity. Episodes are episodes regardless of format.

### Alternative 3: Parse Markdown Body for Description
**Rejected**: Adds parsing overhead and complexity. Better to make description optional.

## References
- Quartz Documentation: Component architecture
- Preact Documentation: Function components
- TypeScript: Optional properties and union types
- Constitution: Principles I (Content-First) and III (Flat File Simplicity)
