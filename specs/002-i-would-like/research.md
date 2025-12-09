# Research & Technical Decisions

**Feature**: YouTube Channel Sync
**Date**: 2025-10-05

## Research Areas

### 1. YouTube Data API v3 Integration

**Decision**: Use `@googleapis/youtube` npm package (official Google client library)

**Rationale**:
- Official Google-maintained TypeScript/Node.js client with full type safety
- Handles authentication, rate limiting, and pagination automatically
- Well-documented with extensive examples
- Includes all YouTube Data API v3 endpoints needed (channels.list, search.list, videos.list)
- Active maintenance and security updates

**Alternatives Considered**:
- `youtube-api-v3-search` - Simpler but limited to search only, missing video details endpoint
- Direct REST API calls with `fetch` - More control but requires manual auth, typing, error handling
- `ytdl-core` - Video download focused, not suitable for metadata extraction only

**Implementation Notes**:
- API quota: 10,000 units/day default (channels.list=1 unit, videos.list=1 unit per video)
- Authentication: API key (simplest) or OAuth2 (if private videos needed - not required for @thebtcpodcast public channel)
- Rate limiting: Built-in exponential backoff in client library

### 2. Git History State Tracking

**Decision**: Use `@napi-rs/simple-git` (already in Quartz dependencies) + `gray-matter` for frontmatter parsing

**Rationale**:
- `@napi-rs/simple-git` is already a Quartz dependency (version 0.1.22), no new package needed
- Provides `git log` with file path filtering to find episode additions
- Can extract commit timestamps for sync audit trail
- `gray-matter` (also existing dependency) parses frontmatter to extract `youtubeId` field for duplicate detection

**Alternatives Considered**:
- `simple-git` (pure JS) - Slower than native bindings, already have better solution
- Custom `git log --diff-filter=A -- content/episodes/` shell command - Works but less maintainable
- Separate JSON/YAML state file - Violates constitution (prefer git-based state)

**Implementation Algorithm**:
```typescript
// Scan git history for synced videos
async function getSyncedVideoIds(): Promise<Set<string>> {
  const log = await git.log({ file: 'content/episodes/*.md', diff: 'A' })
  const videoIds = new Set<string>()

  for (const commit of log.all) {
    const files = commit.diff?.files || []
    for (const file of files) {
      const content = await git.show([`${commit.hash}:${file}`])
      const { data } = matter(content)
      if (data.youtubeId) videoIds.add(data.youtubeId)
    }
  }

  return videoIds
}
```

**Performance**: O(n) where n = number of episode commits. For 500 episodes, ~1-2s scan time acceptable.

### 3. Guest Name Extraction from Descriptions

**Decision**: Regex-based pattern matching with named capture groups

**Rationale**:
- YouTube descriptions follow semi-consistent patterns for guest mentions
- Regex provides fast, zero-dependency solution
- Can support multiple common patterns in priority order
- Easy to extend with new patterns over time

**Patterns to Support** (in priority order):
1. `Guest: Name` or `Guests: Name1, Name2` (explicit label)
2. `Featuring: Name` or `ft. Name` (featuring format)
3. `with @username` (Twitter-style mentions)
4. `Interview with Name` (interview format)

**Implementation**:
```typescript
const GUEST_PATTERNS = [
  /(?:Guest|Guests):\s*([^\n]+)/i,
  /(?:Featuring|ft\.|feat\.):\s*([^\n]+)/i,
  /with\s+@(\w+)/gi,
  /Interview with\s+([^\n]+)/i
]

function extractGuests(description: string): string[] {
  for (const pattern of GUEST_PATTERNS) {
    const match = description.match(pattern)
    if (match) {
      const guestString = match[1].trim()
      return guestString.split(/[,&]/).map(g => g.trim()).filter(Boolean)
    }
  }
  return []
}
```

**Alternatives Considered**:
- NLP library (compromise, spaCy) - Overkill, adds heavy dependency for simple task
- Manual-only - Defeats auto-sync purpose
- LLM-based extraction - Too slow and costly for bulk sync

**Edge Case Handling**:
- No pattern match → empty guest array (manual addition post-sync)
- Multiple patterns match → use first match (priority order)
- Special characters in names → preserve as-is (markdown escaping handled separately)

### 4. YouTube Description to Markdown Conversion

**Decision**: Custom sanitization + truncation logic, use existing Quartz markdown processors

**Rationale**:
- YouTube descriptions are plain text with URLs, not HTML or markdown
- Need minimal processing: preserve line breaks, auto-link URLs, escape markdown special chars
- Quartz's existing remark/rehype pipeline handles final rendering
- Truncation needed for very long descriptions (>5000 chars)

**Implementation**:
```typescript
function convertDescriptionToMarkdown(description: string): string {
  // Escape markdown special characters
  let markdown = description
    .replace(/([*_`[\]()])/g, '\\$1')

  // Preserve line breaks
  markdown = markdown.replace(/\n/g, '  \n') // Two spaces for markdown line break

  // Auto-link URLs (simple pattern, Quartz will enhance)
  markdown = markdown.replace(
    /(https?:\/\/[^\s]+)/g,
    '[$1]($1)'
  )

  // Truncate if needed
  if (markdown.length > 5000) {
    markdown = markdown.substring(0, 5000).trim() +
      '...\n\n[Read more on YouTube](https://youtube.com/watch?v=VIDEO_ID)'
  }

  return markdown
}
```

**Alternatives Considered**:
- `turndown` (HTML to markdown) - YouTube descriptions aren't HTML
- Store raw description - Breaks links and formatting in Quartz
- AI summarization - Too slow for bulk sync

### 5. Episode Numbering Strategy

**Decision**: Sequential numbering based on YouTube publish date (oldest = Episode 1)

**Rationale**:
- Matches chronological listening order for podcast archives
- Deterministic - same numbering every sync run
- Easy to verify correctness (sorted by date ascending)
- Consistent with user expectation from spec clarification

**Implementation**:
```typescript
async function assignEpisodeNumbers(videos: YouTubeVideo[]): Promise<void> {
  // Sort by publish date ascending (oldest first)
  const sorted = videos.sort((a, b) =>
    new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  )

  // Assign sequential numbers starting from 1
  sorted.forEach((video, index) => {
    video.episodeNumber = index + 1
  })
}
```

**Edge Cases**:
- Videos published same day → secondary sort by video ID (lexicographic)
- Initial full sync vs incremental → always recalculate all numbers to handle gaps
- Existing episodes in git → merge new videos into sorted list, renumber if needed

**Alternatives Considered**:
- Use video order from YouTube API - Not necessarily chronological
- Manual assignment - Defeats auto-sync purpose
- Use publish date as episode number (YYYYMMDD) - Not user-friendly

### 6. Episode File Naming Convention

**Decision**: `{episode-number}-{slugified-title}.md`

**Rationale**:
- Sortable by episode number in file listings
- Human-readable episode title in filename
- Unique per episode (number uniqueness guaranteed)
- Compatible with existing Quartz file naming patterns

**Implementation**:
```typescript
import GithubSlugger from 'github-slugger'

function generateFilename(episodeNumber: number, title: string): string {
  const slugger = new GithubSlugger()
  const slug = slugger.slug(title)
  return `${String(episodeNumber).padStart(3, '0')}-${slug}.md`
}

// Examples:
// generateFilename(1, "Bitcoin Basics") → "001-bitcoin-basics.md"
// generateFilename(42, "The Future of Money") → "042-the-future-of-money.md"
```

**Alternatives Considered**:
- `{video-id}.md` - Not human-readable
- `{date}-{title}.md` - Harder to sort by episode order
- `{title}.md` only - Risk of collisions, no episode context

### 7. Draft Status and Publishing Workflow

**Decision**: Generate frontmatter with `draft: true` by default, require manual toggle to `false`

**Rationale**:
- Prevents accidental publishing of auto-synced content
- Allows review/editing before site deployment
- Follows Quartz's existing draft system (already filtered by draft.ts plugin)
- Can be overridden via config for auto-publish if user wants

**Implementation**:
```typescript
interface SyncConfig {
  autoPublish?: boolean  // Default: false
}

function generateFrontmatter(video: YouTubeVideo, config: SyncConfig) {
  return {
    title: video.title,
    date: video.publishedAt,
    draft: !config.autoPublish,  // true unless auto-publish enabled
    youtubeId: video.videoId,
    episodeNumber: video.episodeNumber,
    // ... other fields
  }
}
```

**Workflow**:
1. Sync runs → creates episodes with `draft: true`
2. User reviews/edits episode markdown
3. User changes `draft: false` manually
4. Quartz build includes episode on next build

### 8. YouTube Iframe Embed Generation

**Decision**: Generate iframe embed code in markdown body with responsive wrapper

**Rationale**:
- Standard YouTube embed pattern with privacy-enhanced mode
- Responsive sizing for mobile compatibility
- No-cookie domain (`youtube-nocookie.com`) for privacy
- Quartz's rehype-raw plugin allows iframe HTML pass-through

**Implementation**:
```typescript
function generateYouTubeEmbed(videoId: string): string {
  return `
<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://www.youtube-nocookie.com/embed/${videoId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>
`
}
```

**Alternatives Considered**:
- Quartz component for embed - Requires Quartz core changes, overkill
- Plain `[video](url)` link - Spec requires embedded player
- `<video>` tag - YouTube doesn't provide direct video files

### 9. API Authentication and Security

**Decision**: Use API key from environment variable, no OAuth

**Rationale**:
- @thebtcpodcast is public channel, no private video access needed
- API key sufficient for read-only operations
- Simpler setup than OAuth flow
- Environment variable prevents key in git

**Implementation**:
```typescript
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

if (!YOUTUBE_API_KEY) {
  throw new Error('YOUTUBE_API_KEY environment variable required')
}

const youtube = google.youtube({
  version: 'v3',
  auth: YOUTUBE_API_KEY
})
```

**Security Notes**:
- `.env` file in `.gitignore`
- Document setup in quickstart.md
- Rate limit errors logged clearly for quota issues

**Alternatives Considered**:
- OAuth2 - Unnecessary for public data, complex setup
- Hardcoded key - Security risk
- Service account - Overkill for single channel read

### 10. Error Handling and Resilience

**Decision**: Graceful degradation with detailed logging, continue on per-video errors

**Rationale**:
- YouTube API can be flaky (rate limits, network issues)
- One bad video shouldn't block entire sync
- Detailed logs help debugging without crashing

**Implementation**:
```typescript
async function syncVideos(videos: YouTubeVideo[]) {
  const results = { success: [], failed: [] }

  for (const video of videos) {
    try {
      await createEpisodeFile(video)
      results.success.push(video.id)
      console.log(`✓ Synced: ${video.title}`)
    } catch (error) {
      results.failed.push({ id: video.id, error: error.message })
      console.error(`✗ Failed: ${video.title} - ${error.message}`)
      // Continue to next video
    }
  }

  // Summary report
  console.log(`\nSync complete: ${results.success.length} succeeded, ${results.failed.length} failed`)
  if (results.failed.length > 0) {
    console.log('Failed videos:', results.failed)
  }
}
```

**Error Categories**:
- API errors (rate limit, network) → retry with backoff
- Parse errors (bad metadata) → log and skip video
- File system errors → fail fast (permissions issue)

## Summary of Decisions

| Area | Decision | Key Package/Pattern |
|------|----------|-------------------|
| YouTube API | @googleapis/youtube | Official Google client |
| State Tracking | @napi-rs/simple-git + git log | Git history scanning |
| Guest Extraction | Regex patterns | Priority-ordered matching |
| Markdown Conversion | Custom sanitization | Escape + truncate + autolink |
| Episode Numbering | Chronological (publish date) | Sorted ascending |
| File Naming | {number}-{slug}.md | github-slugger |
| Draft Workflow | draft: true default | Manual approval required |
| Video Embed | Iframe with responsive wrapper | youtube-nocookie.com |
| Authentication | API key from env var | YOUTUBE_API_KEY |
| Error Handling | Graceful degradation | Per-video try/catch |

## Open Questions Resolved

All NEEDS CLARIFICATION items from Technical Context have been resolved through research.

## Next Phase

Proceed to Phase 1: Design & Contracts with these technical foundations established.
