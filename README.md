# The Bitcoin Podcast Network Knowledge Base

> A comprehensive, wiki-like knowledge base for The Bitcoin Podcast Network episodes, resources, and community-contributed content.

This project provides a searchable, interconnected static site built on [Quartz v4](https://quartz.jzhao.xyz/) that archives and organizes all episodes from The Bitcoin Podcast Network. It serves as a living knowledge base where users can explore episode content, discover connections between topics, and contribute additional resources and annotations.

## Features

- **Episode Archive**: Complete catalog of all The Bitcoin Podcast Network episodes with metadata, descriptions, transcripts, and links
- **Wiki-Style Navigation**: Bidirectional links, graph view, and semantic search across all content
- **Community Contributions**: Users can add resources, notes, and supplementary content that links to episodes
- **Static Site Generation**: Fast, secure, and hostable anywhere via Quartz's static site generation
- **Automated Syncing**: YouTube Data API integration to keep episode information up-to-date

## Project Structure

```
content/episodes/     # Episode markdown files
quartz/              # Quartz configuration and components
scripts/             # Sync and automation scripts
```

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npx quartz build --serve
```

### Syncing Episodes
view the specificaion documentation and quickstart located in `specs/002...` directory.

```bash
npm run sync
```

## Technology Stack

- **Quartz v4.5.2**: Static site generator built on Preact
- **TypeScript 5.9.2**: Type-safe development
- **YouTube Data API v3**: Episode metadata syncing
- **unified/remark/rehype**: Markdown processing pipeline

## Contributing

Contributions are welcome! You can:
- Add notes and annotations to existing episodes
- Link related resources and content
- Improve episode descriptions and metadata
- Suggest new features or improvements

## Built With Quartz

This project is powered by [Quartz v4](https://quartz.jzhao.xyz/), an open-source tool for publishing digital gardens and knowledge bases.

[Quartz Documentation](https://quartz.jzhao.xyz/) | [Quartz Discord Community](https://discord.gg/cRFFHYye7t)
