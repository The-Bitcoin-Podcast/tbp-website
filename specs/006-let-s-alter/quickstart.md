# RSS Podcast Sync - Quickstart Guide

## Overview
The RSS Podcast Sync script synchronizes episodes from the "Hashing It Out" podcast RSS feed to generate markdown episode files for the Quartz website.

## Prerequisites
- Node.js 22+
- TypeScript 5.9.2+
- Git repository initialized
- Access to RSS feed: https://anchor.fm/s/f8e7252c/podcast/rss

## Installation

1. **Add RSS parsing dependency**:
   ```bash
   npm install rss-parser
   npm install --save-dev @types/rss-parser
   ```

2. **Add script entry to package.json**:
   ```json
   {
     "scripts": {
       "rss-sync": "tsx quartz/scripts/rss-sync.ts"
     }
   }
   ```

## Basic Usage

### Quick Sync (Default Behavior)
```bash
npm run rss-sync
```
- Performs incremental sync (only new episodes)
- Creates draft episodes (draft: true)
- Uses default configuration

### Full Sync
```bash
npm run rss-sync -- --full
```
- Syncs all episodes regardless of sync history
- Useful for initial setup or recovery

### Dry Run (Preview)
```bash
npm run rss-sync -- --dry-run
```
- Shows what would be synced without creating files
- Useful for testing configuration changes

### Advanced Options
```bash
npm run rss-sync -- \
  --max 10 \
  --after "2024-01-01" \
  --before "2024-12-31" \
  --no-commit
```

## Configuration

### Default Configuration
The script uses sensible defaults based on clarifications:

```typescript
{
  rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
  outputDirectory: 'content/episodes',
  podcastFolder: 'hio',
  podcastName: 'Hashing It Out',
  fileNamePattern: '{number}-{slug}.md',
  autoPublish: false, // Creates draft episodes
  includeDescription: true,
  truncateDescriptionAt: 5000,
  retryAttempts: 3, // Retry RSS fetch 3 times (from clarifications)
  retryBackoff: [1000, 5000, 15000], // Exponential backoff: 1s, 5s, 15s
  performanceTimeoutMs: 30000, // 30 seconds timeout (from clarifications)
  generatePlaceholders: true // Generate placeholders for missing metadata (from clarifications)
}
```

### Custom Configuration
Create `rss-sync-config.json`:

```json
{
  "rssUrl": "https://anchor.fm/s/f8e7252c/podcast/rss",
  "outputDirectory": "content/episodes",
  "podcastFolder": "hio",
  "podcastName": "Hashing It Out",
  "fileNamePattern": "hashing-{number}-{slug}.md",
  "autoPublish": false,
  "includeDescription": true,
  "truncateDescriptionAt": 3000,
  "maxEpisodes": 50,
  "excludedGuids": ["episode-guid-to-skip"]
}
```

Use custom config:
```bash
npm run rss-sync -- --config rss-sync-config.json
```

## Generated Files

### Episode File Structure
Episodes are organized by podcast in subdirectories:

```
content/episodes/
├── hio/                           # Hashing It Out podcast folder
│   ├── 201-episode-title.md
│   ├── 202-another-episode.md
│   └── 203-latest-episode.md
├── tbp/                           # The Bitcoin Podcast folder  
│   ├── 1-original-episode.md
│   └── 2-another-episode.md
└── dose-of-ether/                 # Other podcast folders
    └── 1-ethereum-episode.md
```

### Episode Frontmatter
```yaml
---
title: "Episode Title Here"
date: "2024-01-15"
draft: true
episodeNumber: 201
rssGuid: "anchor.fm/episode-guid"
audioUrl: "https://anchor.fm/s/f8e7252c/podcast/play/123456"
duration: "1:23:45"
description: "Episode description and show notes..."
author: "Host Name"
explicit: false
thumbnail: "https://example.com/episode-artwork.jpg"
syncedAt: "2024-01-15T10:30:00Z"
status: "available"
hasPlaceholders: false
warnings: []
---

# Episode Title Here

Episode description and show notes content...
```

## Validation & Testing

### Test RSS Feed Access
```bash
# Verify feed is accessible
curl -I https://anchor.fm/s/f8e7252c/podcast/rss

# Check feed content (first 50 lines)
curl -s https://anchor.fm/s/f8e7252c/podcast/rss | head -50
```

### Validate Generated Files
```bash
# Check episode count for Hashing It Out
ls content/episodes/hio/*.md | wc -l

# Verify frontmatter syntax
head -20 content/episodes/hio/latest-episode.md

# Test git history
git log --oneline --grep="Sync.*episode"

# List all podcast folders
ls -la content/episodes/
```

### Integration Test
```typescript
import { RSSSyncService } from './quartz/scripts/rss-sync';

// Test sync with dry run
const service = new RSSSyncService();
const preview = await service.dryRun({
  rssUrl: 'https://anchor.fm/s/f8e7252c/podcast/rss',
  outputDirectory: 'test-output',
  podcastFolder: 'hio',
  podcastName: 'Hashing It Out',
  fileNamePattern: '{number}-{slug}.md',
  autoPublish: false,
  includeDescription: true,
  truncateDescriptionAt: 1000
});

console.log(`Would sync ${preview.newEpisodes.length} episodes to hio/ folder`);
```

## Troubleshooting

### Common Issues

**RSS Feed Unreachable**
```bash
# Check network connectivity
ping anchor.fm

# Verify RSS URL
curl -v https://anchor.fm/s/f8e7252c/podcast/rss
```

**Episode Number Conflicts**
```bash
# Check existing episode numbers for specific podcast
grep -r "episodeNumber:" content/episodes/hio/ | sort -t: -k3 -n

# Check episode numbers across all podcasts
find content/episodes -name "*.md" -exec grep -H "episodeNumber:" {} \; | sort -t: -k3 -n

# Reset sync state (use with caution)
git log --grep="Sync.*episode" --oneline
```

**Malformed RSS Data**
```bash
# Validate RSS XML
curl -s https://anchor.fm/s/f8e7252c/podcast/rss | xmllint --format -

# Check for encoding issues
file content/episodes/*.md
```

**Git Commit Failures**
```bash
# Check git status
git status

# Manual commit if needed
git add content/episodes/hio/
git commit -m "Manual RSS sync commit for Hashing It Out episodes"
```

### Performance Issues

**Slow Sync Times**
- Use `--max` flag to limit episodes for testing
- Check RSS feed response time: `time curl -s RSS_URL > /dev/null`
- Monitor network bandwidth during sync

**Memory Usage**
- Large episode descriptions consume memory
- Use `truncateDescriptionAt` to limit description size
- Consider processing episodes in batches for very large feeds

## Next Steps

1. **Review Generated Episodes**: Check `content/episodes/hio/` for new files
2. **Edit Draft Episodes**: Manually review and edit episodes before publishing
3. **Publish Episodes**: Change `draft: false` when ready to publish
4. **Automate Syncing**: Set up cron job or CI/CD pipeline for regular syncing
5. **Monitor Feed Changes**: Track RSS feed updates and sync frequency
6. **Multiple Podcasts**: Configure additional RSS sync scripts for other podcast folders

## Support

- Check logs for detailed error messages
- Use `--dry-run` to test configuration changes safely
- Review git history to track sync operations
- Validate RSS feed structure if sync fails consistently