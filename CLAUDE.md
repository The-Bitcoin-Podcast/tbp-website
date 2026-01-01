# quartz Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-04

## Active Technologies
- TypeScript 5.9.2 with Node.js >=22 + Quartz 4.5.2 (Preact 10.27.2, unified/remark/rehype ecosystem, esbuild) (001-i-would-like)
- TypeScript 5.9.2, Node.js 22+ + Quartz 4.5.2 (Preact, unified/remark/rehype), YouTube Data API v3 client, gray-matter (frontmatter parsing) (002-i-would-like)
- Flat markdown files in content/episodes/ directory, git commit history for sync state tracking (002-i-would-like)
- TypeScript 5.9.2 with Node.js 22+ + Quartz 4.5.2 (Preact 10.27.2, unified/remark/rehype ecosystem, esbuild) (004-update-landing-page)
- TypeScript 5.9.2 with Node.js 22+ + TypeScript, yargs, simple-git, gray-matter, unified/remark/rehype, RSS parser (006-let-s-alter)
- Flat markdown files in content/episodes directory (006-let-s-alter)

## Project Structure
```
src/
tests/
```

## Commands
npm test
npm run lint
npm run rss-sync

## Code Style
TypeScript 5.9.2 with Node.js >=22: Follow standard conventions

## Recent Changes
- 006-let-s-alter: Added TypeScript 5.9.2 with Node.js 22+ + TypeScript, yargs, simple-git, gray-matter, unified/remark/rehype, RSS parser
- 004-update-landing-page: Added TypeScript 5.9.2 with Node.js 22+ + Quartz 4.5.2 (Preact 10.27.2, unified/remark/rehype ecosystem, esbuild)
- 002-i-would-like: Added TypeScript 5.9.2, Node.js 22+ + Quartz 4.5.2 (Preact, unified/remark/rehype), YouTube Data API v3 client, gray-matter (frontmatter parsing)

<!-- MANUAL ADDITIONS START -->
## RSS Sync Information
RSS podcast sync script for importing episodes from podcast RSS feeds.

Usage:
- `npm run rss-sync -- --url <RSS_URL> --folder <FOLDER_NAME> --name <PODCAST_NAME>`
- `npm run rss-sync -- --dry-run --url <RSS_URL> --folder <FOLDER_NAME>` for preview
- Episodes are created in `content/episodes/<FOLDER_NAME>/`
- Supports retry logic, performance monitoring, and missing metadata handling

Example configurations available in `rss-sync-config.example.ts`
<!-- MANUAL ADDITIONS END -->
