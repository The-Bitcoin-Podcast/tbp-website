# Data Model: Landing Page Improvements

## Overview
This feature modifies existing data structures to support Episodes navigation and flexible episode metadata. No new entities are introduced.

## Modified Entities

### EpisodeFrontmatter (Type Contract)
**Location**: `quartz/components/types/landingPage.ts`

**Changes**: Make audioUrl and description optional to support episodes that use YouTube embeds instead of audio files.

**Fields**:
```typescript
{
  title: string              // Required - Episode title
  date: string              // Required - Publication date (ISO 8601)
  episodeNumber: number     // Required - Sequential episode number
  duration: number | string // Required - Duration (minutes as number OR "MM:SS" string)
  thumbnail: string         // Required - Cover art URL/path
  audioUrl?: string         // Optional - Audio file URL (not present for YouTube-only episodes)
  description?: string      // Optional - Brief description (may be in markdown body instead)
  guests?: Guest[]          // Optional - Guest information
  tags?: string[]           // Optional - Topic tags
  draft?: boolean           // Optional - Draft status (default: false)
}
```

**Validation Rules**:
- Required fields: title, date, episodeNumber, duration, thumbnail
- Optional fields: audioUrl, description (previously required)
- Draft episodes (draft: true) excluded from display

**State Transitions**: None (stateless data)

**Relationships**:
- One Episode may have zero or more Guests
- Episodes referenced by slug in navigation

### EpisodeCard (Runtime Type)
**Location**: `quartz/components/types/landingPage.ts`

**Changes**: Make description and audioUrl optional to support flexible display.

**Fields**:
```typescript
{
  title: string         // Episode title
  date: string          // Publication date (formatted)
  duration: number | string // Duration in minutes or "MM:SS" format
  slug: string          // Episode URL slug
  description?: string  // Optional - Brief description
  thumbnail: string     // Thumbnail image URL/path
  audioUrl?: string     // Optional - Audio URL
  guestNames?: string   // Optional - Comma-separated guest names
}
```

**Derivation**: Transformed from EpisodeFrontmatter by `getLatestEpisodes()` utility function.

### NavLink (Type Contract)
**Location**: `quartz/components/types/landingPage.ts`

**Changes**: None to structure, but navigation links array will include new Episodes entry.

**Fields**:
```typescript
{
  label: string    // Link label (e.g., "Episodes", "About")
  url: string      // Link destination URL/path
  icon?: string    // Optional icon identifier
}
```

**Navigation Links** (after change):
```typescript
[
  { label: "Episodes", url: config.episodesArchiveUrl },  // ← NEW
  { label: "About", url: config.aboutUrl },
  { label: "Sponsors", url: config.sponsorsUrl },
  { label: "Contact", url: config.contactUrl },
  { label: "Guests", url: config.guestsUrl }
]
```

### LandingPageFrontmatter (Type Contract)
**Location**: `quartz/components/types/landingPage.ts`

**Changes**: None required - `episodesArchiveUrl` field already exists.

**Relevant Fields**:
```typescript
{
  episodesArchiveUrl: string  // Path to episode archive (e.g., "/episodes")
  aboutUrl: string
  sponsorsUrl: string
  contactUrl: string
  guestsUrl: string
  // ... other fields
}
```

## Data Flow

### Episode Retrieval Flow
```
1. LandingPage component receives allFiles (QuartzPluginData[])
2. Calls getLatestEpisodes(allFiles, 5)
3. getLatestEpisodes filters/validates:
   - Filter: slug starts with "episodes/"
   - Filter: draft !== true
   - Validate: title, date, episodeNumber, thumbnail, duration present
   - (audioUrl and description NO LONGER required)
4. Sort by date descending
5. Slice first 5 episodes
6. Map to EpisodeCard[] with optional fields
7. Return to LandingPage
8. Pass to EpisodeGrid for rendering
```

### Navigation Link Flow
```
1. LandingPage calls buildNavLinks(config)
2. buildNavLinks creates NavLink[] including Episodes entry
3. Pass to Navigation component
4. Navigation renders in desktop nav and mobile menu
```

## Validation Changes

### Before (Strict)
```typescript
// In getLatestEpisodes validation
fm?.title &&
fm?.date &&
fm?.episodeNumber !== undefined &&
fm?.audioUrl &&          // ❌ Blocked episodes without audio
fm?.description &&       // ❌ Blocked episodes without description
fm?.thumbnail &&
fm?.duration !== undefined
```

### After (Flexible)
```typescript
// In getLatestEpisodes validation
fm?.title &&
fm?.date &&
fm?.episodeNumber !== undefined &&
fm?.thumbnail &&
fm?.duration !== undefined
// audioUrl and description now optional
```

## Edge Cases

### No Episodes Available
**Scenario**: No published episodes exist
**Handling**: EpisodeGrid shows empty state message
**Data**: `episodes = []`
**Display**: "No episodes available yet. Check back soon!"

### Fewer Than 5 Episodes
**Scenario**: Only 2 episodes published
**Handling**: Display all available episodes
**Data**: `episodes.length = 2`
**Display**: Both episodes shown, no error

### Episode Without Description
**Scenario**: Episode lacks frontmatter description field
**Handling**: EpisodeCard hides description section
**Data**: `episode.description = undefined`
**Display**: Shows title, date, thumbnail, duration only

### Episode Without AudioUrl
**Scenario**: Episode uses YouTube embed instead of audio file
**Handling**: Episode still displayed, audioUrl not rendered
**Data**: `episode.audioUrl = undefined`
**Display**: Normal card without audio player

## Type Dependencies

```
QuartzPluginData (Quartz core)
    ↓
EpisodeFrontmatter
    ↓
EpisodeCard → EpisodeGrid → LandingPage
             ↓
         EpisodeCard Component

LandingPageFrontmatter
    ↓
buildNavLinks() → NavLink[]
    ↓
Navigation Component
```

## Migration Impact

### Existing Episodes: ✅ Compatible
- Current episodes (without audioUrl/description) will now pass validation
- No changes required to existing episode files
- YouTube sync process unaffected

### Future Episodes: ✅ Compatible
- Episodes can optionally include audioUrl and description
- System supports both formats
- Gradual migration possible

### Breaking Changes: ❌ None
- All changes are additive or relaxations of constraints
- Existing functionality preserved
