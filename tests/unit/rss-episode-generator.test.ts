/**
 * Contract test for RSS episode generator functionality
 * Tests the RSSEpisodeGeneratorContract interface compliance
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

// Import contracts (these will be implemented in Phase 3.3)
import type { 
  RSSEpisodeGeneratorContract,
  RSSEpisodeData,
  GenerationConfig,
  GenerationResult,
  RSSEpisodeFrontmatter,
  GenerationError
} from '../../quartz/types/rss-sync.js'

// This will be implemented in Phase 3.4/3.5
import { createEpisodeGenerator } from '../../quartz/util/episode-generator.js'

describe('RSSEpisodeGeneratorContract', () => {
  let generator: RSSEpisodeGeneratorContract

  // This will fail until implementation exists
  generator = createEpisodeGenerator()

  const mockEpisode: RSSEpisodeData = {
    guid: 'test-episode-123',
    title: 'Test Episode Title',
    description: 'This is a test episode description with some content.',
    pubDate: new Date('2026-01-01T10:00:00Z'),
    duration: 3600, // 1 hour in seconds
    enclosureUrl: 'https://anchor.fm/s/f8e7252c/podcast/play/123456',
    enclosureType: 'audio/mpeg',
    enclosureLength: 12345678,
    author: 'Test Host',
    explicit: false,
    image: 'https://example.com/episode-image.jpg'
  }

  const mockConfig: GenerationConfig = {
    outputDirectory: 'content/episodes',
    podcastFolder: 'hio',
    podcastName: 'Hashing It Out',
    fileNamePattern: '{number}-{slug}.md',
    autoPublish: false,
    includeDescription: true,
    truncateDescriptionAt: 5000,
    includeAudioEmbed: true
  }

  describe('generateEpisodeFile', () => {
    it('should generate complete markdown file with frontmatter and content', async () => {
      const result = await generator.generateEpisodeFile(mockEpisode, 201, mockConfig)
      
      assert(typeof result.filePath === 'string')
      assert(typeof result.content === 'string')
      assert(typeof result.frontmatter === 'object')
      assert(typeof result.filename === 'string')
      
      // File path should include podcast folder
      assert(result.filePath.includes(mockConfig.podcastFolder))
      assert(result.filePath.endsWith('.md'))
      
      // Content should include frontmatter and body
      assert(result.content.includes('---'))
      assert(result.content.includes('title:'))
      assert(result.content.includes('episodeNumber:'))
      assert(result.content.includes(mockEpisode.title))
    })

    it('should handle missing metadata with placeholders when enabled', async () => {
      const episodeWithMissingData: RSSEpisodeData = {
        ...mockEpisode,
        title: '', // Missing title
        description: '', // Missing description
        author: undefined
      }
      
      const result = await generator.generateEpisodeFile(episodeWithMissingData, 202, mockConfig)
      
      assert(result.frontmatter.hasPlaceholders === true)
      assert(Array.isArray(result.frontmatter.warnings))
      assert(result.frontmatter.warnings.length > 0)
      
      // Should have placeholder values
      assert(result.frontmatter.title.includes('Episode') || result.frontmatter.title.includes('202'))
    })

    it('should include podcast folder in file path', async () => {
      const result = await generator.generateEpisodeFile(mockEpisode, 203, mockConfig)
      
      const expectedPath = `${mockConfig.outputDirectory}/${mockConfig.podcastFolder}/`
      assert(result.filePath.startsWith(expectedPath))
    })

    it('should respect truncation settings for description', async () => {
      const longDescription = 'A'.repeat(10000) // Very long description
      const episodeWithLongDesc: RSSEpisodeData = {
        ...mockEpisode,
        description: longDescription
      }
      
      const result = await generator.generateEpisodeFile(episodeWithLongDesc, 204, mockConfig)
      
      assert(result.frontmatter.description.length <= mockConfig.truncateDescriptionAt)
    })

    it('should set correct draft status based on autoPublish', async () => {
      const autoPublishConfig: GenerationConfig = {
        ...mockConfig,
        autoPublish: true
      }
      
      const result = await generator.generateEpisodeFile(mockEpisode, 205, autoPublishConfig)
      
      assert(result.frontmatter.draft === false)
      
      // Test draft mode
      const draftConfig: GenerationConfig = {
        ...mockConfig,
        autoPublish: false
      }
      
      const draftResult = await generator.generateEpisodeFile(mockEpisode, 206, draftConfig)
      assert(draftResult.frontmatter.draft === true)
    })

    it('should throw GenerationError on invalid episode data', async () => {
      const invalidEpisode: RSSEpisodeData = {
        ...mockEpisode,
        guid: '', // Empty GUID should cause error
        enclosureUrl: 'invalid-url' // Invalid URL should cause error
      }
      
      await assert.rejects(
        () => generator.generateEpisodeFile(invalidEpisode, 207, mockConfig),
        (error: any) => error.name === 'GenerationError'
      )
    })
  })

  describe('generateFrontmatter', () => {
    it('should generate valid frontmatter structure', () => {
      const frontmatter = generator.generateFrontmatter(mockEpisode, 208, mockConfig)
      
      assert(typeof frontmatter.title === 'string')
      assert(typeof frontmatter.date === 'string')
      assert(typeof frontmatter.draft === 'boolean')
      assert(typeof frontmatter.episodeNumber === 'number')
      assert(typeof frontmatter.rssGuid === 'string')
      assert(typeof frontmatter.audioUrl === 'string')
      assert(typeof frontmatter.duration === 'string')
      assert(typeof frontmatter.description === 'string')
      assert(typeof frontmatter.syncedAt === 'string')
      assert(typeof frontmatter.status === 'string')
      assert(typeof frontmatter.hasPlaceholders === 'boolean')
      
      // Check specific values
      assert(frontmatter.episodeNumber === 208)
      assert(frontmatter.rssGuid === mockEpisode.guid)
      assert(frontmatter.audioUrl === mockEpisode.enclosureUrl)
      assert(['available', 'unavailable'].includes(frontmatter.status))
    })

    it('should format date correctly', () => {
      const frontmatter = generator.generateFrontmatter(mockEpisode, 209, mockConfig)
      
      // Date should be in YYYY-MM-DD format
      assert(/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.date))
    })

    it('should format duration as human-readable', () => {
      const frontmatter = generator.generateFrontmatter(mockEpisode, 210, mockConfig)
      
      // Duration should be human readable (e.g., "1:00:00")
      assert(frontmatter.duration.includes(':'))
    })

    it('should include warnings for missing data', () => {
      const episodeWithMissingData: RSSEpisodeData = {
        ...mockEpisode,
        title: '',
        author: undefined
      }
      
      const frontmatter = generator.generateFrontmatter(episodeWithMissingData, 211, mockConfig)
      
      assert(frontmatter.hasPlaceholders === true)
      assert(Array.isArray(frontmatter.warnings))
      assert(frontmatter.warnings.length > 0)
    })
  })

  describe('generateFilename', () => {
    it('should generate filename from pattern', () => {
      const filename = generator.generateFilename(mockEpisode, 212, '{number}-{slug}.md')
      
      assert(filename.startsWith('212-'))
      assert(filename.endsWith('.md'))
      assert(filename.includes('test-episode'))
    })

    it('should handle special characters in title', () => {
      const episodeWithSpecialChars: RSSEpisodeData = {
        ...mockEpisode,
        title: 'Episode with Special Ch@rs & Symbols!'
      }
      
      const filename = generator.generateFilename(episodeWithSpecialChars, 213, '{number}-{slug}.md')
      
      // Should create valid filesystem name
      assert(!filename.includes('@'))
      assert(!filename.includes('&'))
      assert(!filename.includes('!'))
      assert(filename.includes('213-'))
    })

    it('should support different filename patterns', () => {
      const patterns = [
        '{number}-{slug}.md',
        'hio-{number}-{slug}.md',
        'episode-{number}.md'
      ]
      
      patterns.forEach(pattern => {
        const filename = generator.generateFilename(mockEpisode, 214, pattern)
        
        assert(filename.endsWith('.md'))
        assert(filename.includes('214'))
        
        if (pattern.includes('hio')) {
          assert(filename.includes('hio'))
        }
      })
    })

    it('should handle empty or very long titles', () => {
      const episodeEmptyTitle: RSSEpisodeData = {
        ...mockEpisode,
        title: ''
      }
      
      const filenameEmpty = generator.generateFilename(episodeEmptyTitle, 215, '{number}-{slug}.md')
      assert(filenameEmpty.startsWith('215-'))
      
      const episodeLongTitle: RSSEpisodeData = {
        ...mockEpisode,
        title: 'This is a very long episode title that exceeds normal length limits and should be truncated properly'
      }
      
      const filenameLong = generator.generateFilename(episodeLongTitle, 216, '{number}-{slug}.md')
      assert(filenameLong.length < 100) // Should be reasonably short
      assert(filenameLong.startsWith('216-'))
    })
  })
})