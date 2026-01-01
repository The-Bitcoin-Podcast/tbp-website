/**
 * Unit tests for placeholder generation
 * Tests missing metadata handling and placeholder generation logic
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

// Import placeholder utilities
import { generatePlaceholders, determineEpisodeStatus } from '../../quartz/util/rss.js'
import type { RSSEpisode } from '../../quartz/types/rss-sync.js'

describe('Placeholder Generation', () => {
  
  describe('Complete Missing Data Scenarios', () => {
    it('should generate all placeholders when all data is missing', () => {
      const emptyEpisode: Partial<RSSEpisode> = {
        guid: '',
        title: '',
        description: '',
        pubDate: undefined,
        duration: undefined,
        enclosure: undefined,
        author: undefined,
        explicit: false,
        image: undefined,
        link: undefined
      }

      const result = generatePlaceholders(emptyEpisode, 42, 'Test Podcast')
      
      // Check generated episode
      assert.strictEqual(result.episode.title, 'Episode 42')
      assert.strictEqual(result.episode.description, 'Episode 42 of Test Podcast')
      assert(result.episode.guid.startsWith('generated-'))
      assert(result.episode.pubDate instanceof Date)
      assert.strictEqual(result.episode.duration, 0)
      assert.strictEqual(result.episode.explicit, false)
      
      // Check warnings
      assert(result.warnings.length >= 4) // At minimum: title, description, GUID, duration
      assert(result.warnings.some(w => w.includes('title')))
      assert(result.warnings.some(w => w.includes('description')))
      assert(result.warnings.some(w => w.includes('GUID')))
      assert(result.warnings.some(w => w.includes('duration')))
    })

    it('should generate different placeholders for different episodes', () => {
      const emptyEpisode1: Partial<RSSEpisode> = { guid: '', title: '', description: '' }
      const emptyEpisode2: Partial<RSSEpisode> = { guid: '', title: '', description: '' }

      const result1 = generatePlaceholders(emptyEpisode1, 1, 'Podcast A')
      const result2 = generatePlaceholders(emptyEpisode2, 2, 'Podcast B')
      
      // Titles should be different
      assert.strictEqual(result1.episode.title, 'Episode 1')
      assert.strictEqual(result2.episode.title, 'Episode 2')
      
      // Descriptions should be different
      assert.strictEqual(result1.episode.description, 'Episode 1 of Podcast A')
      assert.strictEqual(result2.episode.description, 'Episode 2 of Podcast B')
      
      // GUIDs should be different (timestamp-based)
      assert.notStrictEqual(result1.episode.guid, result2.episode.guid)
    })
  })

  describe('Partial Missing Data Scenarios', () => {
    it('should preserve valid data while generating placeholders for missing fields', () => {
      const partialEpisode: Partial<RSSEpisode> = {
        guid: 'valid-guid-123',
        title: 'Valid Episode Title',
        description: '', // Missing
        pubDate: new Date('2024-01-01T10:00:00Z'),
        duration: 3600,
        enclosure: {
          url: 'https://example.com/audio.mp3',
          type: 'audio/mpeg',
          length: 12345678
        },
        author: undefined, // Missing
        explicit: false,
        image: 'https://example.com/image.jpg',
        link: 'https://example.com/episode'
      }

      const result = generatePlaceholders(partialEpisode, 15, 'My Podcast')
      
      // Valid data should be preserved
      assert.strictEqual(result.episode.guid, 'valid-guid-123')
      assert.strictEqual(result.episode.title, 'Valid Episode Title')
      assert.strictEqual(result.episode.pubDate.toISOString(), '2024-01-01T10:00:00.000Z')
      assert.strictEqual(result.episode.duration, 3600)
      assert.strictEqual(result.episode.enclosure?.url, 'https://example.com/audio.mp3')
      assert.strictEqual(result.episode.explicit, false)
      assert.strictEqual(result.episode.image, 'https://example.com/image.jpg')
      assert.strictEqual(result.episode.link, 'https://example.com/episode')
      
      // Missing description should get placeholder
      assert.strictEqual(result.episode.description, 'Episode 15 of My Podcast')
      
      // Should have one warning for missing description
      assert.strictEqual(result.warnings.length, 1)
      assert(result.warnings[0].includes('description'))
    })

    it('should handle invalid dates by replacing with current time', () => {
      const episodeWithBadDate: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: 'Test Episode',
        description: 'Test description',
        pubDate: new Date('invalid-date'),
        duration: 1800
      }

      const beforeGeneration = Date.now()
      const result = generatePlaceholders(episodeWithBadDate, 10, 'Test Podcast')
      const afterGeneration = Date.now()
      
      // Should have replaced invalid date with current date
      assert(result.episode.pubDate instanceof Date)
      assert(!isNaN(result.episode.pubDate.getTime()))
      
      // Date should be recent (within the test execution time)
      const resultTime = result.episode.pubDate.getTime()
      assert(resultTime >= beforeGeneration && resultTime <= afterGeneration)
      
      // Should have warning about date
      assert(result.warnings.some(w => w.includes('date')))
    })
  })

  describe('GUID Generation', () => {
    it('should generate unique GUIDs for episodes without GUIDs', () => {
      const episode1: Partial<RSSEpisode> = { title: 'Episode 1', guid: '' }
      const episode2: Partial<RSSEpisode> = { title: 'Episode 2', guid: '' }
      
      const result1 = generatePlaceholders(episode1, 1, 'Test Podcast')
      const result2 = generatePlaceholders(episode2, 2, 'Test Podcast')
      
      // Both should have generated GUIDs
      assert(result1.episode.guid.startsWith('generated-'))
      assert(result2.episode.guid.startsWith('generated-'))
      
      // GUIDs should be different
      assert.notStrictEqual(result1.episode.guid, result2.episode.guid)
    })

    it('should preserve existing valid GUIDs', () => {
      const episodeWithGuid: Partial<RSSEpisode> = {
        guid: 'existing-guid-456',
        title: '',
        description: ''
      }
      
      const result = generatePlaceholders(episodeWithGuid, 5, 'Test Podcast')
      
      assert.strictEqual(result.episode.guid, 'existing-guid-456')
      // Should not warn about GUID since it exists
      assert(!result.warnings.some(w => w.includes('GUID')))
    })

    it('should handle whitespace-only GUIDs', () => {
      const episodeWithWhitespaceGuid: Partial<RSSEpisode> = {
        guid: '   \t\n   ',
        title: 'Test Episode'
      }
      
      const result = generatePlaceholders(episodeWithWhitespaceGuid, 7, 'Test Podcast')
      
      // Should generate new GUID since whitespace-only is invalid
      assert(result.episode.guid.startsWith('generated-'))
      assert(result.warnings.some(w => w.includes('GUID')))
    })
  })

  describe('Duration Handling', () => {
    it('should set duration to 0 when missing', () => {
      const episodeWithoutDuration: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: 'Test Episode',
        duration: undefined
      }
      
      const result = generatePlaceholders(episodeWithoutDuration, 3, 'Test Podcast')
      
      assert.strictEqual(result.episode.duration, 0)
      assert(result.warnings.some(w => w.includes('duration')))
    })

    it('should preserve valid durations', () => {
      const episodeWithDuration: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: 'Test Episode',
        duration: 2400
      }
      
      const result = generatePlaceholders(episodeWithDuration, 4, 'Test Podcast')
      
      assert.strictEqual(result.episode.duration, 2400)
      assert(!result.warnings.some(w => w.includes('duration')))
    })

    it('should handle zero duration without warning', () => {
      const episodeWithZeroDuration: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: 'Test Episode',
        duration: 0
      }
      
      const result = generatePlaceholders(episodeWithZeroDuration, 5, 'Test Podcast')
      
      assert.strictEqual(result.episode.duration, 0)
      // Zero is a valid duration, so no warning expected for the duration itself
    })
  })

  describe('Enclosure and Audio URL Handling', () => {
    it('should warn when enclosure is missing', () => {
      const episodeWithoutEnclosure: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: 'Test Episode',
        enclosure: undefined
      }
      
      const result = generatePlaceholders(episodeWithoutEnclosure, 6, 'Test Podcast')
      
      assert.strictEqual(result.episode.enclosure, undefined)
      assert(result.warnings.some(w => w.includes('audio URL')))
    })

    it('should warn when enclosure URL is missing', () => {
      const episodeWithBadEnclosure: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: 'Test Episode',
        enclosure: {
          url: '',
          type: 'audio/mpeg'
        }
      }
      
      const result = generatePlaceholders(episodeWithBadEnclosure, 7, 'Test Podcast')
      
      assert(result.warnings.some(w => w.includes('audio URL')))
    })

    it('should preserve valid enclosures without warnings', () => {
      const episodeWithValidEnclosure: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: 'Test Episode',
        enclosure: {
          url: 'https://example.com/audio.mp3',
          type: 'audio/mpeg',
          length: 12345678
        }
      }
      
      const result = generatePlaceholders(episodeWithValidEnclosure, 8, 'Test Podcast')
      
      assert.strictEqual(result.episode.enclosure?.url, 'https://example.com/audio.mp3')
      assert.strictEqual(result.episode.enclosure?.type, 'audio/mpeg')
      assert.strictEqual(result.episode.enclosure?.length, 12345678)
      assert(!result.warnings.some(w => w.includes('audio URL')))
    })
  })

  describe('Title and Description Generation', () => {
    it('should generate episode-specific titles', () => {
      const episodes = [
        { guid: 'g1', title: '', description: '' },
        { guid: 'g2', title: '', description: '' },
        { guid: 'g3', title: '', description: '' }
      ]
      
      episodes.forEach((episode, index) => {
        const result = generatePlaceholders(episode, index + 10, 'Test Podcast')
        
        assert.strictEqual(result.episode.title, `Episode ${index + 10}`)
        assert.strictEqual(result.episode.description, `Episode ${index + 10} of Test Podcast`)
      })
    })

    it('should handle long podcast names in descriptions', () => {
      const episode: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: '',
        description: ''
      }
      
      const longPodcastName = 'This Is A Very Long Podcast Name That Might Cause Issues With Description Generation'
      const result = generatePlaceholders(episode, 99, longPodcastName)
      
      assert.strictEqual(result.episode.description, `Episode 99 of ${longPodcastName}`)
    })

    it('should handle special characters in podcast names', () => {
      const episode: Partial<RSSEpisode> = {
        guid: 'test-guid',
        title: '',
        description: ''
      }
      
      const specialPodcastName = 'Podcast & More: "The Best" Show!'
      const result = generatePlaceholders(episode, 12, specialPodcastName)
      
      assert.strictEqual(result.episode.description, `Episode 12 of ${specialPodcastName}`)
    })
  })

  describe('Warning Generation', () => {
    it('should accumulate warnings for multiple missing fields', () => {
      const episodeWithManyMissingFields: Partial<RSSEpisode> = {
        guid: '',
        title: '',
        description: '',
        pubDate: new Date('invalid'),
        duration: undefined,
        enclosure: undefined,
        author: undefined
      }
      
      const result = generatePlaceholders(episodeWithManyMissingFields, 20, 'Test Podcast')
      
      // Should have warnings for: title, description, GUID, date, duration, audio URL
      assert(result.warnings.length >= 6)
      
      const warningText = result.warnings.join(' ')
      assert(warningText.includes('title'))
      assert(warningText.includes('description'))
      assert(warningText.includes('GUID'))
      assert(warningText.includes('date'))
      assert(warningText.includes('duration'))
      assert(warningText.includes('audio URL'))
    })

    it('should generate no warnings when all data is present and valid', () => {
      const completeEpisode: Partial<RSSEpisode> = {
        guid: 'complete-guid-789',
        title: 'Complete Episode Title',
        description: 'This episode has all the required metadata fields.',
        pubDate: new Date('2024-01-15T10:30:00Z'),
        duration: 2700,
        enclosure: {
          url: 'https://example.com/complete-audio.mp3',
          type: 'audio/mpeg',
          length: 25600000
        },
        author: 'Podcast Host',
        explicit: false,
        image: 'https://example.com/complete-image.jpg',
        link: 'https://example.com/complete-episode'
      }
      
      const result = generatePlaceholders(completeEpisode, 100, 'Complete Podcast')
      
      // All data should be preserved as-is
      assert.strictEqual(result.episode.guid, 'complete-guid-789')
      assert.strictEqual(result.episode.title, 'Complete Episode Title')
      assert.strictEqual(result.episode.description, 'This episode has all the required metadata fields.')
      assert.strictEqual(result.episode.author, 'Podcast Host')
      
      // Should have no warnings
      assert.strictEqual(result.warnings.length, 0)
    })
  })
})

describe('Episode Status Determination', () => {
  
  describe('Available Episodes', () => {
    it('should mark episodes with valid audio URLs as available', () => {
      const availableEpisode: RSSEpisode = {
        guid: 'available-episode',
        title: 'Available Episode',
        description: 'This episode has audio',
        pubDate: new Date(),
        duration: 1800,
        enclosure: {
          url: 'https://example.com/audio.mp3',
          type: 'audio/mpeg',
          length: 18000000
        },
        author: 'Host',
        explicit: false
      }
      
      assert.strictEqual(determineEpisodeStatus(availableEpisode), 'available')
    })

    it('should handle different valid URL formats', () => {
      const urlVariations = [
        'https://example.com/audio.mp3',
        'http://example.com/audio.wav',
        'https://cdn.podcast.com/episodes/episode-1.m4a',
        'https://anchor.fm/s/abc123/podcast/play/12345'
      ]
      
      urlVariations.forEach(url => {
        const episode: RSSEpisode = {
          guid: 'test-episode',
          title: 'Test Episode',
          description: 'Test',
          pubDate: new Date(),
          duration: 1800,
          enclosure: {
            url,
            type: 'audio/mpeg'
          },
          author: 'Host',
          explicit: false
        }
        
        assert.strictEqual(determineEpisodeStatus(episode), 'available', `Failed for URL: ${url}`)
      })
    })
  })

  describe('Unavailable Episodes', () => {
    it('should mark episodes without enclosure as unavailable', () => {
      const noEnclosureEpisode: RSSEpisode = {
        guid: 'no-enclosure',
        title: 'Episode Without Audio',
        description: 'This episode has no audio',
        pubDate: new Date(),
        duration: 0,
        enclosure: undefined,
        author: 'Host',
        explicit: false
      }
      
      assert.strictEqual(determineEpisodeStatus(noEnclosureEpisode), 'unavailable')
    })

    it('should mark episodes with empty audio URLs as unavailable', () => {
      const emptyUrlEpisode: RSSEpisode = {
        guid: 'empty-url',
        title: 'Episode With Empty URL',
        description: 'This episode has empty audio URL',
        pubDate: new Date(),
        duration: 1800,
        enclosure: {
          url: '',
          type: 'audio/mpeg'
        },
        author: 'Host',
        explicit: false
      }
      
      assert.strictEqual(determineEpisodeStatus(emptyUrlEpisode), 'unavailable')
    })

    it('should mark episodes with invalid URLs as unavailable', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid-protocol.com/audio.mp3',
        'javascript:alert("xss")',
        '   ',
        'http://',
        'https://'
      ]
      
      invalidUrls.forEach(url => {
        const episode: RSSEpisode = {
          guid: 'invalid-url-episode',
          title: 'Episode With Invalid URL',
          description: 'This episode has invalid audio URL',
          pubDate: new Date(),
          duration: 1800,
          enclosure: {
            url,
            type: 'audio/mpeg'
          },
          author: 'Host',
          explicit: false
        }
        
        assert.strictEqual(determineEpisodeStatus(episode), 'unavailable', `Failed for invalid URL: ${url}`)
      })
    })
  })
})