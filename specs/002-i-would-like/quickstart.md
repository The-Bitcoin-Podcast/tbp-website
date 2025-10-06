# YouTube Channel Sync - Quickstart Guide

**Feature**: Automatically sync YouTube videos from @thebtcpodcast to Quartz episode pages

## Prerequisites

- Node.js 22+ installed
- Quartz 4.5.2+ project set up
- Git repository initialized
- YouTube Data API v3 access (API key)

## Setup (5 minutes)

### 1. Get YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **YouTube Data API v3**
4. Create credentials → API Key
5. (Optional) Restrict key to YouTube Data API v3 only

### 2. Configure Environment

Create `.env` file in project root:

```bash
YOUTUBE_API_KEY=your_api_key_here
YOUTUBE_CHANNEL_ID=@thebtcpodcast
```

Add to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

### 3. Install Dependencies

```bash
npm install @googleapis/youtube dotenv
```

(Other dependencies already in Quartz: `@napi-rs/simple-git`, `gray-matter`, `github-slugger`)

### 4. Create Episode Directory

```bash
mkdir -p content/episodes
```

## Basic Usage

### Run Initial Full Sync

Sync all historical videos from @thebtcpodcast:

```bash
npx tsx quartz/scripts/youtube-sync.ts --full
```

**What happens**:
1. Fetches all videos from YouTube channel
2. Scans git history to find already-synced videos
3. Creates markdown files for new videos in `content/episodes/`
4. Generates frontmatter with metadata, guests, tags
5. Embeds YouTube player iframe
6. Commits new episodes to git

**Expected output**:
```
🔍 Scanning git history for synced episodes...
   Found 0 synced episodes

📺 Fetching videos from @thebtcpodcast...
   Found 247 total videos

🎬 Processing 247 new videos...
   ✓ Synced: Episode 1 - Bitcoin Basics (dQw4w9WgXcQ)
   ✓ Synced: Episode 2 - Decentralization (xyz789abc)
   ...
   ✓ Synced: Episode 247 - The Future of Money (abc123def)

✅ Sync complete: 247 succeeded, 0 failed
📝 Committed 247 episodes to git (commit: abc123de)
```

### Run Incremental Sync (Daily Use)

Sync only new videos since last sync:

```bash
npx tsx quartz/scripts/youtube-sync.ts
```

**What happens**:
1. Finds last sync timestamp from git history
2. Fetches only videos published after that timestamp
3. Creates markdown files for new videos
4. Commits to git

**Expected output**:
```
🔍 Scanning git history for synced episodes...
   Found 247 synced episodes
   Last sync: 2024-01-15 10:30:00

📺 Fetching new videos since 2024-01-15...
   Found 3 new videos

🎬 Processing 3 new videos...
   ✓ Synced: Episode 248 - Lightning Network (video123)
   ✓ Synced: Episode 249 - Privacy Tech (video456)
   ✓ Synced: Episode 250 - DeFi Trends (video789)

✅ Sync complete: 3 succeeded, 0 failed
📝 Committed 3 episodes to git (commit: def456gh)
```

## Reviewing & Publishing Episodes

Episodes are created with `draft: true` by default. To publish:

1. **Review generated episode**:
   ```bash
   cat content/episodes/248-lightning-network.md
   ```

2. **Edit if needed** (add notes, fix guest names, etc.):
   ```bash
   vim content/episodes/248-lightning-network.md
   ```

3. **Publish by changing draft status**:
   ```yaml
   ---
   draft: false  # Change from true to false
   ---
   ```

4. **Build site to see changes**:
   ```bash
   npx quartz build
   ```

## Configuration Options

Create `quartz/sync-config.ts`:

```typescript
import { SyncConfig } from './types/youtube-sync'

export const config: SyncConfig = {
  // Channel settings
  channelId: '@thebtcpodcast',
  outputDirectory: 'content/episodes',

  // Behavior
  autoPublish: false,          // Set true to skip draft status
  fullSync: false,              // Set true to always sync all videos

  // Content
  includeVideoEmbed: true,      // Set false to only link to YouTube
  truncateDescriptionAt: 5000,  // Max description length

  // Exclusions
  excludedVideoIds: [
    'videoIdToSkip1',
    'videoIdToSkip2'
  ],

  // Error handling
  retryAttempts: 3,
  retryBackoff: [60000, 300000, 900000]  // 1min, 5min, 15min
}
```

Use config:
```bash
npx tsx quartz/scripts/youtube-sync.ts --config quartz/sync-config.ts
```

## Advanced Usage

### Sync Specific Date Range

```bash
npx tsx quartz/scripts/youtube-sync.ts --after 2024-01-01 --before 2024-12-31
```

### Dry Run (Preview Without Committing)

```bash
npx tsx quartz/scripts/youtube-sync.ts --dry-run
```

### Skip Git Commit (Manual Commit Later)

```bash
npx tsx quartz/scripts/youtube-sync.ts --no-commit
```

### Limit Number of Videos (Testing)

```bash
npx tsx quartz/scripts/youtube-sync.ts --max 10
```

## Automation

### Daily Sync with Cron

Add to crontab:
```bash
# Run sync daily at 6 AM
0 6 * * * cd /path/to/quartz && npx tsx quartz/scripts/youtube-sync.ts >> logs/sync.log 2>&1
```

### GitHub Actions (CI/CD)

`.github/workflows/youtube-sync.yml`:
```yaml
name: YouTube Sync

on:
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC
  workflow_dispatch:      # Manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Install dependencies
        run: npm install

      - name: Run YouTube sync
        env:
          YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY }}
        run: npx tsx quartz/scripts/youtube-sync.ts

      - name: Commit and push if changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git push
```

Add `YOUTUBE_API_KEY` to GitHub repository secrets.

## Troubleshooting

### "API key not valid" Error

**Cause**: Invalid or missing API key
**Fix**:
```bash
echo "YOUTUBE_API_KEY=your_actual_key" > .env
```

### "Quota exceeded" Error

**Cause**: Hit daily YouTube API quota (10,000 units)
**Fix**: Wait 24 hours or request quota increase from Google

### "Duplicate episode" Warning

**Cause**: Video already synced (git history shows existing episode)
**Fix**: This is expected behavior - sync skips duplicates automatically

### "Git working tree dirty" Error

**Cause**: Uncommitted changes in `content/episodes/`
**Fix**:
```bash
git add content/episodes/
git commit -m "Manual episode edits"
# Then run sync again
```

### "Failed to parse guests" Warning

**Cause**: No guest pattern found in video description
**Fix**: Edit episode file manually to add guests:
```yaml
guests:
  - name: "Guest Name"
    twitter: "username"
```

## Validation Tests

### Test Full Sync Flow

```bash
# 1. Run sync
npx tsx quartz/scripts/youtube-sync.ts --max 5

# 2. Verify files created
ls -la content/episodes/

# 3. Verify frontmatter
head -20 content/episodes/001-*.md

# 4. Verify git commit
git log -1 --stat

# 5. Build site
npx quartz build

# 6. Check episode page
open public/episodes/001-*/index.html
```

### Test Incremental Sync

```bash
# 1. Run initial sync
npx tsx quartz/scripts/youtube-sync.ts --max 10

# 2. Run again (should find 0 new)
npx tsx quartz/scripts/youtube-sync.ts

# 3. Manually trigger with --after to simulate new video
npx tsx quartz/scripts/youtube-sync.ts --after 2024-01-01 --max 1
```

### Test Error Handling

```bash
# 1. Test invalid API key
YOUTUBE_API_KEY=invalid npx tsx quartz/scripts/youtube-sync.ts

# 2. Test network retry (disconnect network mid-sync)
npx tsx quartz/scripts/youtube-sync.ts --max 100
# Disconnect network briefly
# Should see retry messages

# 3. Test guest parsing
npx tsx quartz/scripts/youtube-sync.ts --max 5 --dry-run | grep "Guests:"
```

## Success Criteria

✅ **Initial sync completes** - All historical videos synced to `content/episodes/`
✅ **Incremental sync works** - Only new videos fetched on subsequent runs
✅ **Episode format correct** - Frontmatter valid, YouTube embed renders
✅ **Guests parsed** - Guest names extracted from descriptions where present
✅ **Git history clean** - Commits have clear messages, files tracked properly
✅ **Quartz build succeeds** - Episodes render on website correctly
✅ **Draft workflow works** - Episodes start as drafts, publish after review

## Next Steps

1. Run initial full sync: `npx tsx quartz/scripts/youtube-sync.ts --full`
2. Review generated episodes in `content/episodes/`
3. Publish episodes by setting `draft: false`
4. Set up automation (cron or GitHub Actions)
5. Customize sync config for your workflow

## Reference

- **Script location**: `quartz/scripts/youtube-sync.ts`
- **Config**: `quartz/sync-config.ts` (optional)
- **Types**: `quartz/types/youtube-sync.ts`
- **Tests**: `tests/integration/sync-flow.test.ts`
- **Docs**: This file (`specs/002-i-would-like/quickstart.md`)
