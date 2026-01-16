# Quickstart: YouTube Sync with Multi-Channel Support

## Prerequisites

1. Node.js 22+ installed
2. YouTube Data API key set in environment:
   ```bash
   export YOUTUBE_API_KEY=your_api_key_here
   ```
3. Repository cloned and dependencies installed:
   ```bash
   npm install
   ```

## Basic Usage

### Sync Hashing It Out Channel

```bash
# Dry run first to preview
npm run youtube-sync -- --channel hio --dry-run

# Run actual sync
npm run youtube-sync -- --channel hio
```

### Sync The Bitcoin Podcast Channel (Default)

```bash
# These are equivalent:
npm run youtube-sync
npm run youtube-sync -- --channel tbp
```

## Verification Steps

### 1. Check Generated Files
After sync, verify episodes appear in the correct directory:

```bash
# For HIO
ls -la content/episodes/hio/

# For TBP  
ls -la content/episodes/tbp/
```

### 2. Verify Content Layout
Open a generated episode file and confirm:
- Video embed appears FIRST (under "## Watch Episode")
- Description follows (under "## Episode Description")
- Guests section appears last (if detected)

### 3. Verify Episode Numbering
Episode numbers should be sequential within each channel:
- HIO episodes numbered independently from TBP
- Numbers continue from existing episode count in that directory

### 4. Verify Frontmatter
Check that generated frontmatter includes:
```yaml
title: "Episode Title"
date: "YYYY-MM-DD"
draft: true
episodeNumber: N
youtubeId: "xxxxxxxxxxx"
thumbnail: "https://..."
duration: "H:MM:SS"
syncedAt: "ISO timestamp"
status: "available"
```

### 5. Test Build
Ensure the site builds successfully with new episodes:
```bash
npx quartz build
```

## Common Operations

### Full Sync (Ignore Previous State)
```bash
npm run youtube-sync -- --channel hio --full
```

### Limit Videos for Testing
```bash
npm run youtube-sync -- --channel hio --max 3 --dry-run
```

### Sync Without Git Commit
```bash
npm run youtube-sync -- --channel hio --no-commit
```

### Filter by Date Range
```bash
npm run youtube-sync -- --channel hio --after 2024-01-01 --before 2024-06-30
```

## Expected Output

Successful sync displays:
```
YouTube Channel Sync Script
==================================================

✓ Configuration loaded
  Channel: @HashingItOut-real
  Output: content/episodes/hio
  Mode: Incremental sync

Scanning git history for synced episodes...
  Found N existing episode(s)

Fetching videos from channel: @HashingItOut-real
  Found M video(s)

Syncing X video(s)...
  ✓ Episode N+1: Episode Title
  ✓ Episode N+2: Another Episode

==================================================
Sync Complete!
  ✓ Success: X episode(s)
```

## Troubleshooting

### "YOUTUBE_API_KEY environment variable is required"
Set your API key: `export YOUTUBE_API_KEY=your_key`

### "Channel not found"
Verify the channel handle is correct (`@HashingItOut-real` for HIO)

### "YouTube API quota exceeded"
Wait and retry. The script has built-in retry logic with backoff.

### Episodes created in wrong directory
Ensure `--channel` flag matches intended channel (`hio` or `tbp`)
