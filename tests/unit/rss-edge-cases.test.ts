/**
 * Unit tests for RSS parsing edge cases
 * Tests various edge cases and malformed RSS feed scenarios
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

// Import RSS utilities
import { RSSParser, parseDuration, formatDuration, generatePlaceholders, validatePodcastFolder } from '../../quartz/util/rss.js'

describe('RSS Parsing Edge Cases', () => {
  let parser: RSSParser

  beforeEach(() => {
    parser = new RSSParser()
  })

  describe('Malformed RSS Feed Handling', () => {
    it('should handle empty RSS feed', async () => {
      const emptyFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title></title>
            <description></description>
          </channel>
        </rss>`

      const result = await parser.parseRSSFeed(emptyFeed)
      
      assert.strictEqual(result.title, 'Untitled Podcast')
      assert.strictEqual(result.description, '')
      assert.strictEqual(result.episodes.length, 0)
    })

    it('should handle RSS feed with malformed episodes', async () => {
      const malformedFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Test Podcast</title>
            <description>Test Description</description>
            <item>
              <!-- Episode with missing GUID -->
              <title>Episode 1</title>
              <description>Episode without GUID</description>
              <pubDate>Invalid Date</pubDate>
            </item>
            <item>
              <!-- Episode with empty title -->
              <guid>episode-2</guid>
              <title></title>
              <description>Episode without title</description>
              <pubDate>2024-01-01T00:00:00Z</pubDate>
            </item>
            <item>
              <!-- Completely malformed episode -->
              <invalid-tag>Invalid content</invalid-tag>
            </item>
          </channel>
        </rss>`

      const result = await parser.parseRSSFeed(malformedFeed)
      
      assert.strictEqual(result.title, 'Test Podcast')
      assert.strictEqual(result.episodes.length, 3)
      
      // First episode should have generated GUID
      const ep1 = result.episodes[0]
      assert(ep1.guid.startsWith('generated-') || ep1.title === 'Episode 1')
      
      // Second episode should have empty title
      const ep2 = result.episodes[1]
      assert.strictEqual(ep2.guid, 'episode-2')
      assert.strictEqual(ep2.title, '')
      
      // Third episode should have fallback values
      const ep3 = result.episodes[2]
      assert(ep3.title.includes('Episode') || ep3.title === '')
    })

    it('should handle RSS feed with special characters', async () => {
      const specialCharsFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Podcast with &amp; Special &lt;Characters&gt;</title>
            <description>Description with "quotes" and 'apostrophes'</description>
            <item>
              <guid>special-chars-episode</guid>
              <title>Episode with émojis 🎙️ and ünicode</title>
              <description>Content with &lt;script&gt;alert('xss')&lt;/script&gt; and line
breaks</description>
              <pubDate>2024-01-01T00:00:00Z</pubDate>
            </item>
          </channel>
        </rss>`

      const result = await parser.parseRSSFeed(specialCharsFeed)
      
      assert(result.title.includes('Special'))
      assert(result.description.includes('quotes'))
      
      const episode = result.episodes[0]
      assert(episode.title.includes('émojis'))
      assert(episode.description.includes('Content'))
      // Should not contain script tags
      assert(!episode.description.includes('<script>'))
    })
  })

  describe('Duration Parsing Edge Cases', () => {
    it('should handle various duration formats', () => {
      // Standard formats
      assert.strictEqual(parseDuration('1:23:45'), 5025) // 1h 23m 45s
      assert.strictEqual(parseDuration('23:45'), 1425)   // 23m 45s
      assert.strictEqual(parseDuration('3661'), 3661)    // seconds

      // Edge cases
      assert.strictEqual(parseDuration('0:00:00'), 0)
      assert.strictEqual(parseDuration('0:00'), 0)
      assert.strictEqual(parseDuration('0'), 0)
      assert.strictEqual(parseDuration(''), 0)
      assert.strictEqual(parseDuration(null), 0)
      assert.strictEqual(parseDuration(undefined), 0)
      
      // Invalid formats
      assert.strictEqual(parseDuration('invalid'), 0)
      assert.strictEqual(parseDuration('25:61'), 0) // Invalid minutes
      assert.strictEqual(parseDuration('-10'), 0)   // Negative
      assert.strictEqual(parseDuration('1:2:3:4'), 0) // Too many parts
      
      // ISO 8601 formats
      assert.strictEqual(parseDuration('PT1H23M45S'), 5025)
      assert.strictEqual(parseDuration('PT23M45S'), 1425)
      assert.strictEqual(parseDuration('PT45S'), 45)
      assert.strictEqual(parseDuration('PT1H'), 3600)
      assert.strictEqual(parseDuration('PT0S'), 0)
    })

    it('should format durations correctly', () => {
      assert.strictEqual(formatDuration(0), '00:00')
      assert.strictEqual(formatDuration(45), '00:45')
      assert.strictEqual(formatDuration(90), '01:30')
      assert.strictEqual(formatDuration(3661), '1:01:01')
      assert.strictEqual(formatDuration(7200), '2:00:00')
      
      // Edge cases
      assert.strictEqual(formatDuration(-10), '00:00')
      assert.strictEqual(formatDuration(NaN), '00:00')
      assert.strictEqual(formatDuration(undefined as any), '00:00')
      assert.strictEqual(formatDuration(null as any), '00:00')
    })
  })

  describe('GUID Extraction Edge Cases', () => {
    it('should extract GUID from various formats', async () => {
      const guidVariationsFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>GUID Test Podcast</title>
            <description>Testing different GUID formats</description>
            
            <!-- String GUID -->
            <item>
              <guid>simple-string-guid</guid>
              <title>Episode 1</title>
              <pubDate>2024-01-01T00:00:00Z</pubDate>
            </item>
            
            <!-- GUID with isPermaLink attribute -->
            <item>
              <guid isPermaLink="false">complex-guid-123</guid>
              <title>Episode 2</title>
              <pubDate>2024-01-02T00:00:00Z</pubDate>
            </item>
            
            <!-- GUID as permalink -->
            <item>
              <guid isPermaLink="true">https://example.com/episode/3</guid>
              <title>Episode 3</title>
              <pubDate>2024-01-03T00:00:00Z</pubDate>
            </item>
            
            <!-- No GUID, should use link -->
            <item>
              <title>Episode 4</title>
              <link>https://example.com/episode/4</link>
              <pubDate>2024-01-04T00:00:00Z</pubDate>
            </item>
            
            <!-- No GUID or link, should generate -->
            <item>
              <title>Episode 5</title>
              <pubDate>2024-01-05T00:00:00Z</pubDate>
            </item>
          </channel>
        </rss>`

      const result = await parser.parseRSSFeed(guidVariationsFeed)
      
      assert.strictEqual(result.episodes.length, 5)
      
      // Check GUID extraction
      assert.strictEqual(result.episodes[0].guid, 'simple-string-guid')
      assert.strictEqual(result.episodes[1].guid, 'complex-guid-123')
      assert.strictEqual(result.episodes[2].guid, 'https://example.com/episode/3')
      assert.strictEqual(result.episodes[3].guid, 'https://example.com/episode/4')
      
      // Episode 5 should have generated GUID
      const ep5 = result.episodes[4]
      assert(ep5.guid.startsWith('generated-') || ep5.guid.includes('episode'))
    })
  })

  describe('Image URL Parsing', () => {
    it('should parse image URLs from various formats', async () => {
      const imageVariationsFeed = `<?xml version="1.0"?>
        <rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
          <channel>
            <title>Image Test Podcast</title>
            <description>Testing different image formats</description>
            
            <item>
              <guid>image-test-1</guid>
              <title>Episode with iTunes image</title>
              <itunes:image href="https://example.com/image1.jpg"/>
              <pubDate>2024-01-01T00:00:00Z</pubDate>
            </item>
            
            <item>
              <guid>image-test-2</guid>
              <title>Episode with string image</title>
              <image>https://example.com/image2.jpg</image>
              <pubDate>2024-01-02T00:00:00Z</pubDate>
            </item>
            
            <item>
              <guid>image-test-3</guid>
              <title>Episode without image</title>
              <pubDate>2024-01-03T00:00:00Z</pubDate>
            </item>
          </channel>
        </rss>`

      const result = await parser.parseRSSFeed(imageVariationsFeed)
      
      assert.strictEqual(result.episodes[0].image, 'https://example.com/image1.jpg')
      assert.strictEqual(result.episodes[1].image, 'https://example.com/image2.jpg')
      assert.strictEqual(result.episodes[2].image, undefined)
    })
  })

  describe('Enclosure Parsing', () => {
    it('should parse audio enclosures correctly', async () => {
      const enclosureFeed = `<?xml version="1.0"?>
        <rss version="2.0">
          <channel>
            <title>Enclosure Test Podcast</title>
            <description>Testing audio enclosures</description>
            
            <item>
              <guid>enclosure-test-1</guid>
              <title>Episode with full enclosure</title>
              <enclosure url="https://example.com/audio1.mp3" type="audio/mpeg" length="12345678"/>
              <pubDate>2024-01-01T00:00:00Z</pubDate>
            </item>
            
            <item>
              <guid>enclosure-test-2</guid>
              <title>Episode with minimal enclosure</title>
              <enclosure url="https://example.com/audio2.mp3" type="audio/mpeg"/>
              <pubDate>2024-01-02T00:00:00Z</pubDate>
            </item>
            
            <item>
              <guid>enclosure-test-3</guid>
              <title>Episode without enclosure</title>
              <pubDate>2024-01-03T00:00:00Z</pubDate>
            </item>
          </channel>
        </rss>`

      const result = await parser.parseRSSFeed(enclosureFeed)
      
      // Episode 1 - full enclosure
      const ep1 = result.episodes[0]
      assert.strictEqual(ep1.enclosure?.url, 'https://example.com/audio1.mp3')
      assert.strictEqual(ep1.enclosure?.type, 'audio/mpeg')
      assert.strictEqual(ep1.enclosure?.length, 12345678)
      
      // Episode 2 - minimal enclosure
      const ep2 = result.episodes[1]
      assert.strictEqual(ep2.enclosure?.url, 'https://example.com/audio2.mp3')
      assert.strictEqual(ep2.enclosure?.type, 'audio/mpeg')
      assert.strictEqual(ep2.enclosure?.length, undefined)
      
      // Episode 3 - no enclosure
      const ep3 = result.episodes[2]
      assert.strictEqual(ep3.enclosure, undefined)
    })
  })

  describe('Podcast Folder Validation', () => {
    it('should validate folder names correctly', () => {
      // Valid names
      assert.strictEqual(validatePodcastFolder('hio').valid, true)
      assert.strictEqual(validatePodcastFolder('the-bitcoin-podcast').valid, true)
      assert.strictEqual(validatePodcastFolder('podcast_123').valid, true)
      assert.strictEqual(validatePodcastFolder('Dose-of-Ether').valid, true)
      
      // Invalid names
      assert.strictEqual(validatePodcastFolder('').valid, false)
      assert.strictEqual(validatePodcastFolder('   ').valid, false)
      assert.strictEqual(validatePodcastFolder('folder<name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder>name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder:name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder"name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder/name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder\\name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder|name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder?name').valid, false)
      assert.strictEqual(validatePodcastFolder('folder*name').valid, false)
      
      // Reserved names
      assert.strictEqual(validatePodcastFolder('CON').valid, false)
      assert.strictEqual(validatePodcastFolder('PRN').valid, false)
      assert.strictEqual(validatePodcastFolder('AUX').valid, false)
      assert.strictEqual(validatePodcastFolder('NUL').valid, false)
      assert.strictEqual(validatePodcastFolder('COM1').valid, false)
      
      // Too long
      const longName = 'a'.repeat(101)
      assert.strictEqual(validatePodcastFolder(longName).valid, false)
    })
  })

  describe('Placeholder Generation', () => {
    it('should generate appropriate placeholders for missing data', () => {
      const incompleteEpisode = {
        guid: '', // Missing
        title: '', // Missing
        description: '', // Missing
        pubDate: new Date('invalid'), // Invalid
        duration: undefined, // Missing
        enclosureUrl: '', // Missing
        enclosureType: 'audio/mpeg',
        enclosureLength: 0,
        explicit: false
      }

      const result = generatePlaceholders(incompleteEpisode, 42, 'Test Podcast')
      
      assert.strictEqual(result.episode.title, 'Episode 42')
      assert.strictEqual(result.episode.description, 'Episode 42 of Test Podcast')
      assert(result.episode.guid.startsWith('generated-'))
      assert(result.episode.pubDate instanceof Date)
      assert.strictEqual(result.episode.duration, 0)
      
      // Should have warnings
      assert(result.warnings.length > 0)
      assert(result.warnings.some(w => w.includes('title')))
      assert(result.warnings.some(w => w.includes('description')))
      assert(result.warnings.some(w => w.includes('GUID')))
      assert(result.warnings.some(w => w.includes('date')))
    })

    it('should preserve existing valid data when generating placeholders', () => {
      const partialEpisode = {
        guid: 'valid-guid-123',
        title: 'Valid Title',
        description: '', // Missing - should get placeholder
        pubDate: new Date('2024-01-01'),
        duration: 3600,
        enclosureUrl: 'https://example.com/audio.mp3',
        enclosureType: 'audio/mpeg',
        enclosureLength: 12345,
        explicit: false
      }

      const result = generatePlaceholders(partialEpisode, 99, 'Test Podcast')
      
      // Should preserve valid data
      assert.strictEqual(result.episode.guid, 'valid-guid-123')
      assert.strictEqual(result.episode.title, 'Valid Title')
      assert.strictEqual(result.episode.duration, 3600)
      assert.strictEqual(result.episode.enclosureUrl, 'https://example.com/audio.mp3')
      
      // Should generate placeholder for missing description
      assert.strictEqual(result.episode.description, 'Episode 99 of Test Podcast')
      
      // Should have minimal warnings
      assert(result.warnings.length === 1)
      assert(result.warnings[0].includes('description'))
    })
  })

  describe('Error Handling', () => {
    it('should handle completely invalid XML', async () => {
      const invalidXML = 'This is not XML at all!'
      
      await assert.rejects(
        () => parser.parseRSSFeed(invalidXML),
        (error: any) => {
          assert(error.name === 'RSSParseError')
          assert(error.operation === 'parseXML')
          return true
        }
      )
    })

    it('should handle network errors with appropriate error types', async () => {
      const invalidUrl = 'https://this-domain-should-not-exist-12345.invalid/feed.xml'
      
      await assert.rejects(
        () => parser.fetchAndParseRSS(invalidUrl, { retryAttempts: 1 }),
        (error: any) => {
          assert(error.name === 'RSSParseError')
          assert(error.operation === 'fetchRSS')
          return true
        }
      )
    })

    it('should respect retry attempts for network errors', async () => {
      const start = Date.now()
      
      await assert.rejects(
        () => parser.fetchAndParseRSS('https://httpstat.us/500', { 
          retryAttempts: 2, 
          retryBackoff: [100, 200] 
        })
      )
      
      const duration = Date.now() - start
      // Should have taken at least the backoff time
      assert(duration >= 300) // 100 + 200 ms minimum
    })
  })
})