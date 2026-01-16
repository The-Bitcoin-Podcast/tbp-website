# Episode Output Contract: Generated Markdown Format

## File Location
Episodes are written to channel-specific directories:
- TBP: `content/episodes/tbp/{number}-{slug}.md`
- HIO: `content/episodes/hio/{number}-{slug}.md`

## Filename Format
`{number}-{slug}.md` where:
- `{number}` = 3-digit zero-padded episode number (e.g., `001`, `042`, `148`)
- `{slug}` = GitHub-slugified title (lowercase, hyphenated)

Example: `148-nick-johnson-on-ens.md`

## Frontmatter Schema

```yaml
---
title: string           # YouTube video title
date: string            # YYYY-MM-DD format
draft: boolean          # true (default) or false if autoPublish
episodeNumber: number   # Sequential within channel
youtubeId: string       # 11-character YouTube video ID
thumbnail: string       # URL to highest quality thumbnail
duration: string        # Human-readable (e.g., "1:23:45")
syncedAt: string        # ISO 8601 timestamp of sync
status: string          # "available" | "unavailable" | "private"
guests:                 # Optional array
  - name: string
    twitter: string?    # Without @ prefix
tags: string[]?         # Optional, from YouTube tags
---
```

## Body Content Structure (NEW ORDER - Video First)

```markdown
## Watch Episode

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://www.youtube-nocookie.com/embed/{youtubeId}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>

## Episode Description

{markdown-converted description}

## Guests

- **{guest.name}** ([@{guest.twitter}](https://twitter.com/{guest.twitter}))
```

**Key Change**: Video embed section now appears FIRST, before Episode Description.

## Section Ordering

1. **Watch Episode** - YouTube embed (always present when `includeVideoEmbed: true`)
2. **Episode Description** - Converted markdown description
3. **Guests** - Optional, only if guests detected in description

## Example Output

```markdown
---
title: "Nick Johnson on ENS Domains"
date: "2024-03-15"
draft: true
episodeNumber: 148
youtubeId: "dQw4w9WgXcQ"
thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
duration: "1:23:45"
syncedAt: "2026-01-16T14:30:00.000Z"
status: "available"
guests:
  - name: "Nick Johnson"
    twitter: "arachnid"
tags:
  - "ENS"
  - "Ethereum"
  - "Web3"
---
## Watch Episode

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe
    src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen
  ></iframe>
</div>

## Episode Description

In this episode, we sit down with Nick Johnson from the Ethereum Foundation...

## Guests

- **Nick Johnson** ([@arachnid](https://twitter.com/arachnid))
```
