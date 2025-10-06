# Data Model: Podcast Landing Page

**Feature**: 001-i-would-like
**Date**: 2025-10-04

## Overview

This data model describes the entities and their relationships for the podcast landing page feature. All data is stored as markdown files with YAML frontmatter, adhering to Quartz's content-first architecture.

---

## Entities

### 1. Episode

**Description**: Represents a single podcast episode with metadata and show notes.

**Storage**: Markdown file in `content/episodes/` directory

**Frontmatter Schema**:
```yaml
title: string                 # Required. Episode title (e.g., "Bitcoin and the Future of Money")
date: YYYY-MM-DD             # Required. Publication date (ISO 8601)
episodeNumber: number        # Required. Sequential episode number (1, 2, 3...)
duration: number             # Required. Duration in minutes
audioUrl: string             # Required. Direct URL to audio file (MP3)
description: string          # Required. Brief 2-3 sentence description for cards
thumbnail: string            # Required. Path or URL to episode cover art (16:9 or 1:1)
guests:                      # Optional. Array of guest objects
  - name: string            # Guest full name
    twitter: string         # Optional. Twitter handle (with @)
    linkedin: string        # Optional. LinkedIn profile URL
tags: string[]              # Optional. Episode topics/tags
draft: boolean              # Optional. If true, exclude from published list
```

**Content Body**: Full show notes in markdown (transcripts, links, timestamps)

**Validation Rules**:
- `title`: Non-empty string, max 150 characters (for display purposes)
- `date`: Valid ISO date, not in future
- `episodeNumber`: Positive integer, unique across episodes
- `duration`: Positive integer, reasonable range (1-300 minutes)
- `audioUrl`: Valid URL or local path to .mp3/.m4a file
- `description`: 2-3 sentences, max 300 characters
- `thumbnail`: Valid URL or path to image file
- `draft`: If true or frontmatter missing, episode excluded from landing page

**Example File**: `content/episodes/001-intro-to-bitcoin.md`
```markdown
---
title: "Introduction to Bitcoin"
date: 2025-09-15
episodeNumber: 1
duration: 45
audioUrl: "https://cdn.example.com/tbp-001.mp3"
description: "An introduction to Bitcoin's history, technology, and impact on the financial system. We cover the basics and why it matters."
thumbnail: "/static/episodes/ep001-thumb.jpg"
guests:
  - name: "Satoshi Nakamoto"
    twitter: "@satoshi"
tags:
  - bitcoin
  - introduction
  - basics
---

# Show Notes

## Topics Covered
- History of Bitcoin
- How blockchain works
...
```

---

### 2. Landing Page Configuration

**Description**: Configuration and content for the landing page hero section.

**Storage**: `content/index.md` frontmatter

**Frontmatter Schema**:
```yaml
title: string                # Site/podcast title (e.g., "The Bitcoin Podcast")
tagline: string              # Hero tagline (e.g., "Exploring the future of money")
discordUrl: string           # Discord invite URL
twitterUrl: string           # Twitter profile URL
youtubeUrl: string           # YouTube channel URL
rssUrl: string              # Podcast RSS feed URL
aboutUrl: string            # Path to about page (e.g., "/about")
sponsorsUrl: string         # Path to sponsors page (e.g., "/sponsors")
contactUrl: string          # Path to contact page (e.g., "/contact")
guestsUrl: string           # Path to guests page (e.g., "/guests")
episodesArchiveUrl: string  # Path to full episode archive (e.g., "/episodes")
```

**Validation Rules**:
- All URL fields: Valid URLs (http/https) or internal paths (starting with `/`)
- `title`, `tagline`: Non-empty strings
- Required fields: title, tagline, discordUrl

**Example File**: `content/index.md`
```markdown
---
title: "The Bitcoin Podcast"
tagline: "Exploring Bitcoin, blockchain, and the future of decentralized money"
discordUrl: "https://discord.gg/tbp"
twitterUrl: "https://twitter.com/bitcoinpodcast"
youtubeUrl: "https://youtube.com/@bitcoinpodcast"
rssUrl: "/index.xml"
aboutUrl: "/about"
sponsorsUrl: "/sponsors"
contactUrl: "/contact"
guestsUrl: "/guests"
episodesArchiveUrl: "/episodes"
---

Welcome to The Bitcoin Podcast home page.
(This content may not be rendered on landing page, but available for fallback)
```

---

### 3. Guest (Embedded)

**Description**: Information about a podcast guest (embedded within Episode entity).

**Storage**: Nested object within episode frontmatter

**Schema**:
```typescript
interface Guest {
  name: string        // Required. Guest full name
  twitter?: string    // Optional. Twitter handle (with @) or URL
  linkedin?: string   // Optional. LinkedIn profile URL
}
```

**Validation Rules**:
- `name`: Non-empty string
- `twitter`: Either @handle or full Twitter URL
- `linkedin`: Valid LinkedIn URL

**Usage**: Rendered in episode cards and episode detail pages

---

### 4. Social Link (Configuration)

**Description**: Social media platform link displayed in footer/header.

**Storage**: Derived from Landing Page Configuration frontmatter

**Schema** (runtime representation):
```typescript
interface SocialLink {
  platform: 'discord' | 'twitter' | 'youtube' | 'rss'
  url: string
  icon: JSX.Element  // SVG icon
  ariaLabel: string  // Accessibility label
}
```

**Validation Rules**:
- `url`: Valid URL
- Icon must be valid SVG
- ariaLabel format: "Visit our {platform}" or "Subscribe via {platform}"

**Generation**: Component constructs SocialLink[] from landing page config

---

## Relationships

```
LandingPageConfig (1) ──> (0..*) Episodes
                     │
                     └──> (4) SocialLinks

Episode (1) ──> (0..*) Guests
```

**Explanation**:
- Landing page displays the 5 most recent published episodes
- Each episode can have zero or more guests
- Social links are derived from landing page config URLs

---

## Data Access Patterns

### Query: Get Latest 5 Episodes

**Input**: `allFiles` (all content files from Quartz)

**Process**:
1. Filter files by path: `file.slug?.startsWith("episodes/")`
2. Filter out drafts: `file.frontmatter?.draft !== true`
3. Validate required fields exist (title, date, episodeNumber, audioUrl, description, thumbnail)
4. Sort by date descending: `(a, b) => b.frontmatter.date - a.frontmatter.date`
5. Take first 5: `.slice(0, 5)`

**Output**: `Episode[]` (array of file data with frontmatter)

**TypeScript**:
```typescript
const latestEpisodes = allFiles
  .filter(file => file.slug?.startsWith("episodes/"))
  .filter(file => !file.frontmatter?.draft)
  .filter(file => {
    const fm = file.frontmatter
    return fm?.title && fm?.date && fm?.episodeNumber &&
           fm?.audioUrl && fm?.description && fm?.thumbnail
  })
  .sort((a, b) => new Date(b.frontmatter!.date).getTime() - new Date(a.frontmatter!.date).getTime())
  .slice(0, 5)
```

---

### Query: Get Landing Page Config

**Input**: `fileData` (current page data for index.md)

**Process**:
1. Access `fileData.frontmatter`
2. Extract required config fields
3. Provide defaults for missing optional fields

**Output**: `LandingPageConfig` object

**TypeScript**:
```typescript
const config = {
  title: fileData.frontmatter?.title || "Podcast Title",
  tagline: fileData.frontmatter?.tagline || "",
  discordUrl: fileData.frontmatter?.discordUrl || "#",
  twitterUrl: fileData.frontmatter?.twitterUrl || "#",
  youtubeUrl: fileData.frontmatter?.youtubeUrl || "#",
  rssUrl: fileData.frontmatter?.rssUrl || "/index.xml",
  aboutUrl: fileData.frontmatter?.aboutUrl || "/about",
  // ... etc
}
```

---

### Query: Get Social Links

**Input**: `LandingPageConfig`

**Process**:
1. Map each platform to SocialLink object
2. Include only non-empty URLs
3. Attach corresponding icon and aria label

**Output**: `SocialLink[]`

**TypeScript**:
```typescript
const socialLinks: SocialLink[] = [
  { platform: 'discord', url: config.discordUrl, icon: <DiscordIcon />, ariaLabel: "Visit our Discord" },
  { platform: 'twitter', url: config.twitterUrl, icon: <TwitterIcon />, ariaLabel: "Visit our Twitter" },
  { platform: 'youtube', url: config.youtubeUrl, icon: <YouTubeIcon />, ariaLabel: "Visit our YouTube" },
  { platform: 'rss', url: config.rssUrl, icon: <RSSIcon />, ariaLabel: "Subscribe via RSS" },
].filter(link => link.url && link.url !== "#")
```

---

## State Transitions

Episodes have a simple state model:

```
[Draft] ──(publish)──> [Published] ──(update)──> [Published]
   │                                                  │
   └──────────────────(unpublish)───────────────────┘
```

**Draft**: `draft: true` in frontmatter → excluded from landing page
**Published**: `draft: false` or field absent → included in landing page (if valid)
**Update**: Edit frontmatter or content → triggers rebuild, no state change

**Note**: State is implicit (based on `draft` field), not tracked separately.

---

## Type Definitions

**TypeScript interfaces** (for component implementation):

```typescript
// Extends Quartz's built-in types
import { QuartzPluginData } from "../plugins/vfile"

interface EpisodeFrontmatter extends QuartzPluginData {
  title: string
  date: string  // ISO date string
  episodeNumber: number
  duration: number
  audioUrl: string
  description: string
  thumbnail: string
  guests?: Guest[]
  tags?: string[]
  draft?: boolean
}

interface Guest {
  name: string
  twitter?: string
  linkedin?: string
}

interface LandingPageFrontmatter extends QuartzPluginData {
  title: string
  tagline: string
  discordUrl: string
  twitterUrl: string
  youtubeUrl: string
  rssUrl: string
  aboutUrl: string
  sponsorsUrl: string
  contactUrl: string
  guestsUrl: string
  episodesArchiveUrl: string
}

interface SocialLink {
  platform: 'discord' | 'twitter' | 'youtube' | 'rss'
  url: string
  icon: JSX.Element
  ariaLabel: string
}
```

---

## Data Integrity

**Validation Strategy**:
- Frontmatter validation happens at component render time
- Invalid/missing episodes are silently excluded (logged to console in dev mode)
- Landing page gracefully handles 0 episodes (shows "Coming soon" message)
- Missing config values fall back to defaults (empty strings or "#")

**Build-time checks**:
- Quartz FrontMatter plugin parses YAML
- Invalid YAML causes build failure (early error detection)
- TypeScript compilation catches type mismatches

**Runtime checks**:
- Component validates required fields before rendering
- Console warnings for missing thumbnails, audio URLs
- No runtime errors from missing optional fields

---

## Performance Considerations

**Impact on build time**:
- Querying 5 episodes from `allFiles`: O(n) where n = total files
- Expected n < 500 for typical podcast sites → negligible impact
- Frontmatter parsing cached by Quartz build system

**Optimization strategies**:
- Limit episode query to 5 (not paginated on landing page)
- Thumbnail images: use Quartz Assets plugin for optimization
- Audio files: external hosting (CDN), not processed by Quartz

**Memory footprint**:
- Episode frontmatter: ~1KB each × 5 = 5KB
- Landing page config: ~500 bytes
- Total data model in memory during build: <10KB

---

**Status**: Data model complete and validated against constitutional principles (content-first, flat files, no database).
