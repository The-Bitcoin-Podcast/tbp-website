# CLI Interface Contract: youtube-sync

## Command Signature

```bash
npm run youtube-sync -- [options]
```

## Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--channel` | string | `tbp` | Channel preset to sync (`tbp`, `hio`) |
| `--full` | boolean | `false` | Perform full sync (ignore last sync timestamp) |
| `--dry-run` | boolean | `false` | Preview changes without writing files |
| `--no-commit` | boolean | `false` | Skip git commit step |
| `--max` | number | - | Maximum number of videos to sync |
| `--after` | string | - | Only sync videos published after this date (ISO 8601) |
| `--before` | string | - | Only sync videos published before this date (ISO 8601) |
| `--config` | string | - | Path to custom configuration file (overrides `--channel`) |
| `-h, --help` | - | - | Show help |

## Channel Presets

| Preset | Channel ID | Output Directory |
|--------|------------|------------------|
| `tbp` | `@thebtcpodcast` | `content/episodes/tbp` |
| `hio` | `@HashingItOut-real` | `content/episodes/hio` |

## Usage Examples

### Sync HIO Channel (Incremental)
```bash
npm run youtube-sync -- --channel hio
```

### Sync HIO Channel (Full Sync, Dry Run)
```bash
npm run youtube-sync -- --channel hio --full --dry-run
```

### Sync TBP Channel (Default Behavior)
```bash
npm run youtube-sync
# or explicitly:
npm run youtube-sync -- --channel tbp
```

### Limit Videos for Testing
```bash
npm run youtube-sync -- --channel hio --max 5 --dry-run
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (API failure, invalid config, etc.) |

## Output Format

```
YouTube Channel Sync Script
==================================================

✓ Configuration loaded
  Channel: @HashingItOut-real
  Output: content/episodes/hio
  Mode: Incremental sync

Scanning git history for synced episodes...
  Found 147 existing episode(s)
  Last sync: 2026-01-15T10:30:00.000Z

Fetching videos from channel: @HashingItOut-real
  Incremental sync from: 2026-01-15T10:30:00.000Z
  Found 3 video(s)

Filtering: 2 new video(s) to sync

Syncing 2 video(s)...
  ✓ Episode 148: Latest HIO Episode Title
  ✓ Episode 149: Another HIO Episode

Creating git commit...
  ✓ Committed: abc1234

==================================================
Sync Complete!
  ✓ Success: 2 episode(s)
```
