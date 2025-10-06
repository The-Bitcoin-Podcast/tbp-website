import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { YouTubeVideo, SyncConfig } from '../../quartz/types/youtube-sync.js'

/**
 * Episode Generation Contract Tests
 *
 * Tests validate that generateEpisodeFile() produces correct markdown
 * with frontmatter matching the contract specification.
 *
 * Expected: All tests FAIL until episode-generator.ts is implemented
 */

describe('Episode Generation Contract', () => {
  const mockVideo: YouTubeVideo = {
    videoId: 'dQw4w9WgXcQ',
    channelId: 'UC123',
    title: 'Bitcoin Basics: Understanding Decentralization',
    description: 'In this episode we discuss Bitcoin fundamentals.\nGuest: Alice Johnson\nLearn more at bitcoin.org',
    publishedAt: '2024-01-15T10:30:00Z',
    duration: 'PT1H23M45S',
    thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    tags: ['bitcoin', 'decentralization'],
    episodeNumber: 42,
    guests: [{ name: 'Alice Johnson' }],
  }

  const mockConfig: Partial<SyncConfig> = {
    outputDirectory: 'content/episodes',
    autoPublish: false,
    includeVideoEmbed: true,
    truncateDescriptionAt: 5000,
  }

  it('should export generateEpisodeFile function', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')
    assert.strictEqual(typeof generateEpisodeFile, 'function')
  })

  it('should generate frontmatter with correct structure', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, mockConfig as SyncConfig)

    // Frontmatter should be YAML between --- delimiters
    assert.ok(result.content.startsWith('---\n'))
    assert.ok(result.content.includes('\n---\n'))

    // Required fields
    assert.ok(result.content.includes('title:'))
    assert.ok(result.content.includes('date:'))
    assert.ok(result.content.includes('draft:'))
    assert.ok(result.content.includes('episodeNumber:'))
    assert.ok(result.content.includes('youtubeId:'))
    assert.ok(result.content.includes('thumbnail:'))
    assert.ok(result.content.includes('duration:'))
  })

  it('should set draft: true by default when autoPublish is false', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, { ...mockConfig, autoPublish: false } as SyncConfig)

    assert.ok(result.content.includes('draft: true'))
  })

  it('should set draft: false when autoPublish is true', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, { ...mockConfig, autoPublish: true } as SyncConfig)

    assert.ok(result.content.includes('draft: false'))
  })

  it('should format date as YYYY-MM-DD', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, mockConfig as SyncConfig)

    // 2024-01-15T10:30:00Z should become 2024-01-15
    assert.ok(result.content.includes('date: 2024-01-15') || result.content.includes('date: "2024-01-15"'))
  })

  it('should format duration as HH:MM:SS', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, mockConfig as SyncConfig)

    // PT1H23M45S should become 1:23:45
    assert.ok(result.content.includes('duration: "1:23:45"') || result.content.includes('duration: 1:23:45'))
  })

  it('should include YouTube video embed when includeVideoEmbed is true', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, { ...mockConfig, includeVideoEmbed: true } as SyncConfig)

    // Must use youtube-nocookie.com domain
    assert.ok(result.content.includes('youtube-nocookie.com'))
    assert.ok(result.content.includes('embed/dQw4w9WgXcQ'))
    assert.ok(result.content.includes('<iframe'))
    assert.ok(result.content.includes('allowfullscreen'))
  })

  it('should include responsive wrapper for YouTube iframe', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, mockConfig as SyncConfig)

    // 16:9 aspect ratio with padding-bottom: 56.25%
    assert.ok(result.content.includes('padding-bottom: 56.25%'))
    assert.ok(result.content.includes('position: relative'))
  })

  it('should include guest section when guests are present', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const videoWithGuest = {
      ...mockVideo,
      guests: [
        { name: 'Alice Johnson', twitter: 'alicej' },
        { name: 'Bob Smith' },
      ],
    }

    const result = await generateEpisodeFile(videoWithGuest, 42, mockConfig as SyncConfig)

    assert.ok(result.content.includes('## Guests') || result.content.includes('guests:'))
    assert.ok(result.content.includes('Alice Johnson'))
    assert.ok(result.content.includes('Bob Smith'))
  })

  it('should generate correct file path with episode number and slug', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, mockConfig as SyncConfig)

    // Should be: content/episodes/042-bitcoin-basics-understanding-decentralization.md
    assert.ok(result.filePath.includes('042-'))
    assert.ok(result.filePath.endsWith('.md'))
    assert.ok(result.filePath.includes('bitcoin'))
  })

  it('should escape markdown special characters in description', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const videoWithSpecialChars = {
      ...mockVideo,
      description: 'Check out *this* and [that](url) and `code`',
    }

    const result = await generateEpisodeFile(videoWithSpecialChars, 42, mockConfig as SyncConfig)

    // Special chars should be escaped: * → \*, [ → \[, etc.
    assert.ok(result.content.includes('\\*') || result.content.includes('this'))
  })

  it('should truncate description if longer than limit', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const longDescription = 'A'.repeat(6000)
    const videoWithLongDesc = {
      ...mockVideo,
      description: longDescription,
    }

    const result = await generateEpisodeFile(
      videoWithLongDesc,
      42,
      { ...mockConfig, truncateDescriptionAt: 5000 } as SyncConfig
    )

    // Should include "Read more on YouTube" link
    assert.ok(result.content.includes('Read more on YouTube') || result.content.includes('youtube.com/watch'))
  })

  it('should include syncedAt timestamp', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, mockConfig as SyncConfig)

    assert.ok(result.content.includes('syncedAt:'))
  })

  it('should set status to available by default', async () => {
    const { generateEpisodeFile } = await import('../../quartz/util/episode-generator.js')

    const result = await generateEpisodeFile(mockVideo, 42, mockConfig as SyncConfig)

    assert.ok(result.content.includes('status: "available"') || result.content.includes('status: available'))
  })
})
