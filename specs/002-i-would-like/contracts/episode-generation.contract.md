# Episode Generation Contract

**Module**: Episode Generator
**Input**: YouTubeVideo + SyncConfig
**Output**: Markdown file with frontmatter

## Contract: Generate Episode File

**Function Signature**:
```typescript
async function generateEpisodeFile(
  video: YouTubeVideo,
  episodeNumber: number,
  config: SyncConfig
): Promise<{ filePath: string; content: string }>
```

**Input Contract**:
```typescript
interface YouTubeVideo {
  videoId: string              // Required, 11 chars
  title: string                // Required, max 100 chars
  description: string          // Required, may be empty
  publishedAt: string          // Required, ISO 8601
  duration: string             // Required, ISO 8601 duration
  thumbnailUrl: string         // Required, valid URL
  tags?: string[]              // Optional
  guests?: string[]            // Optional, parsed
  privacyStatus?: string       // Optional
}

// episodeNumber: positive integer
// config: valid SyncConfig (see data-model.md)
```

**Output Contract**:
```typescript
interface GenerationResult {
  filePath: string             // Absolute path to created file
  content: string              // Full markdown content with frontmatter
}
```

**Expected File Structure**:
```yaml
---
title: "{video.title}"
date: "{video.publishedAt as YYYY-MM-DD}"
draft: {!config.autoPublish}
episodeNumber: {episodeNumber}
youtubeId: "{video.videoId}"
thumbnail: "{video.thumbnailUrl}"
duration: "{formatted duration HH:MM:SS or MM:SS}"
description: "{truncated and escaped markdown}"
guests:
  - name: "{guest name}"
    twitter: "{username if @mention}"
tags: [{video.tags}]
syncedAt: "{current ISO 8601 timestamp}"
status: "available"
---

## Episode Description

{converted markdown from video.description}

## Watch Episode

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://www.youtube-nocookie.com/embed/{video.videoId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>

{if guests.length > 0}
## Guests

{for each guest}
- **{guest.name}** {if twitter}([@{twitter}](https://twitter.com/{twitter})){endif}
{endfor}
{endif}
```

**Validation Rules**:
1. File path must be: `{config.outputDirectory}/{episodeNumber}-{slug}.md`
2. Slug must be generated from title using github-slugger
3. Episode number must be zero-padded to 3 digits (001, 042, etc.)
4. All frontmatter fields must be valid YAML
5. Description must be escaped for markdown special chars
6. Duration must be converted from ISO 8601 to human-readable
7. YouTube iframe must use youtube-nocookie.com domain
8. File must be valid UTF-8 encoded markdown

**Error Conditions**:
```typescript
// Throw if:
- video.videoId is invalid format
- episodeNumber <= 0
- config.outputDirectory doesn't exist or not writable
- File already exists (duplicate protection)
- YAML frontmatter serialization fails
```

---

## Contract: Format Duration

**Function Signature**:
```typescript
function formatDuration(iso8601Duration: string): string
```

**Input/Output Examples**:
```typescript
formatDuration("PT1H23M45S")  → "1:23:45"
formatDuration("PT45M30S")    → "45:30"
formatDuration("PT2H5M")      → "2:05:00"
formatDuration("PT30S")       → "0:30"
formatDuration("PT0S")        → "0:00"
```

**Validation**:
- Input must match regex: `/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/`
- Output must be `HH:MM:SS` or `MM:SS` format
- Throw error if invalid ISO 8601 duration

---

## Contract: Generate File Name

**Function Signature**:
```typescript
function generateFileName(episodeNumber: number, title: string): string
```

**Input/Output Examples**:
```typescript
generateFileName(1, "Bitcoin Basics")          → "001-bitcoin-basics.md"
generateFileName(42, "The Future of Money")    → "042-the-future-of-money.md"
generateFileName(100, "Episode #100 Special!") → "100-episode-100-special.md"
generateFileName(5, "Interview: Alice & Bob")  → "005-interview-alice-bob.md"
```

**Validation**:
- Episode number must be >= 1
- Title must not be empty
- Slug must be lowercase, alphanumeric + hyphens only
- Extension must be `.md`
- Total filename length must be < 255 chars

---

## Contract: Parse Guests from Description

**Function Signature**:
```typescript
function parseGuests(description: string): Guest[]

interface Guest {
  name: string
  twitter?: string
}
```

**Pattern Matching (Priority Order)**:
1. `Guest: Name` or `Guests: Name1, Name2`
2. `Featuring: Name` or `ft. Name`
3. `with @username`
4. `Interview with Name`

**Input/Output Examples**:
```typescript
parseGuests("Guest: Alice Johnson")
→ [{ name: "Alice Johnson" }]

parseGuests("Guests: Alice, Bob Smith")
→ [{ name: "Alice" }, { name: "Bob Smith" }]

parseGuests("Interview with @alice and @bob")
→ [{ name: "alice", twitter: "alice" }, { name: "bob", twitter: "bob" }]

parseGuests("Featuring: Alice (CEO) & Bob")
→ [{ name: "Alice (CEO)" }, { name: "Bob" }]

parseGuests("Today we discuss Bitcoin.")
→ []  // No guests found
```

**Validation**:
- Return empty array if no patterns match
- Trim whitespace from all names
- Remove empty strings from guest list
- Twitter usernames extracted without @ prefix

---

## Contract: Convert Description to Markdown

**Function Signature**:
```typescript
function convertDescriptionToMarkdown(
  description: string,
  videoId: string,
  config: SyncConfig
): string
```

**Transformations**:
1. Escape markdown special chars: `*`, `_`, `` ` ``, `[`, `]`, `(`  , `)`
2. Preserve line breaks: `\n` → `  \n` (markdown line break)
3. Auto-link URLs: Wrap `http(s)://...` in `[url](url)`
4. Truncate if > `config.truncateDescriptionAt` chars
5. Add "Read more" link if truncated

**Input/Output Examples**:
```typescript
convertDescriptionToMarkdown(
  "Check out bitcoin.org for more info!\nGreat discussion.",
  "abc123",
  { truncateDescriptionAt: 5000 }
)
→ "Check out [bitcoin.org](bitcoin.org) for more info\\!  \nGreat discussion."

convertDescriptionToMarkdown(
  "A".repeat(6000),
  "abc123",
  { truncateDescriptionAt: 5000 }
)
→ "A".repeat(5000) + "...\n\n[Read more on YouTube](https://youtube.com/watch?v=abc123)"
```

**Validation**:
- Description must be string (may be empty)
- Config truncation limit must be > 0
- Output must be valid markdown

---

## Contract: Generate YouTube Embed

**Function Signature**:
```typescript
function generateYouTubeEmbed(videoId: string): string
```

**Output Format**:
```html
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://www.youtube-nocookie.com/embed/{videoId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>
```

**Validation**:
- Video ID must be 11 characters (YouTube format)
- Must use `youtube-nocookie.com` domain for privacy
- Must include responsive wrapper (16:9 aspect ratio)
- Must include allowfullscreen attribute

---

## Contract Tests Location

Tests implementing these contracts:
- `/home/petty/Github/tbp/quartz/tests/unit/episode-generator.test.ts`
- `/home/petty/Github/tbp/quartz/tests/unit/guest-parser.test.ts`

Each test validates:
- Input validation and error handling
- Output format matches contract exactly
- Edge cases (empty strings, special chars, etc.)
- File system operations (create, write, verify)
