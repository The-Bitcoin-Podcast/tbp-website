/**
 * RSS Parser Implementation
 * Handles RSS feed fetching, parsing, and validation
 */

import Parser from 'rss-parser'
import type {
  RSSParserContract,
  ParsedRSSFeed,
  RSSEpisode,
  RSSEnclosure,
  RSSImage,
  FetchOptions,
  FeedValidationResult,
  ValidationError,
  ValidationWarning,
  RSSParseError
} from '../types/rss-sync.js'

/**
 * RSS Parser implementation using rss-parser library
 */
export class RSSParserImpl implements RSSParserContract {
  private parser: Parser

  constructor() {
    // Configure rss-parser with custom field mappings
    this.parser = new Parser({
      customFields: {
        feed: ['language', 'lastBuildDate'],
        item: [
          'guid',
          'itunes:duration',
          'itunes:author', 
          'itunes:explicit',
          'itunes:image',
          'itunes:summary'
        ]
      },
      timeout: 30000, // 30 second timeout
      headers: {
        'User-Agent': 'RSS-Sync/1.0 (Podcast Sync Tool)'
      }
    })
  }

  /**
   * Parse RSS feed from XML string
   */
  async parseRSSFeed(xmlContent: string): Promise<ParsedRSSFeed> {
    try {
      const feed = await this.parser.parseString(xmlContent)
      return this.transformToStandardFormat(feed)
    } catch (error) {
      throw new RSSParseError(
        `Failed to parse RSS XML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parseXML',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Fetch and parse RSS feed from URL
   */
  async fetchAndParseRSS(url: string, options: FetchOptions = {}): Promise<ParsedRSSFeed> {
    const {
      timeout = 30000,
      retryAttempts = 3,
      retryBackoff = [1000, 5000, 15000],
      userAgent = 'RSS-Sync/1.0 (Podcast Sync Tool)',
      headers = {}
    } = options

    let lastError: Error

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Configure parser for this request
        const requestParser = new Parser({
          ...this.parser.options,
          timeout,
          headers: {
            'User-Agent': userAgent,
            ...headers
          }
        })

        const feed = await requestParser.parseURL(url)
        return this.transformToStandardFormat(feed)

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Don't retry for certain errors
        if (this.isNonRetryableError(lastError)) {
          break
        }

        // Don't wait after the last attempt
        if (attempt < retryAttempts) {
          const delay = retryBackoff[Math.min(attempt, retryBackoff.length - 1)]
          await this.sleep(delay)
        }
      }
    }

    throw new RSSParseError(
      `Failed to fetch RSS feed after ${retryAttempts + 1} attempts: ${lastError.message}`,
      'fetchRSS',
      lastError
    )
  }

  /**
   * Validate RSS feed structure and required fields
   */
  validateFeed(feed: ParsedRSSFeed): FeedValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let validEpisodeCount = 0

    // Validate feed-level fields
    if (!feed.title?.trim()) {
      errors.push({
        field: 'title',
        message: 'Feed title is required'
      })
    }

    if (!feed.description?.trim()) {
      warnings.push({
        field: 'description',
        message: 'Feed description is missing or empty'
      })
    }

    // Validate episodes
    feed.episodes.forEach((episode, index) => {
      const episodeErrors = this.validateEpisode(episode, index)
      errors.push(...episodeErrors.errors)
      warnings.push(...episodeErrors.warnings)
      
      if (episodeErrors.errors.length === 0) {
        validEpisodeCount++
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      episodeCount: feed.episodes.length,
      validEpisodeCount
    }
  }

  /**
   * Transform rss-parser output to our standard format
   */
  private transformToStandardFormat(feed: any): ParsedRSSFeed {
    const episodes: RSSEpisode[] = (feed.items || []).map((item: any) => {
      return {
        guid: this.extractGUID(item),
        title: this.sanitizeString(item.title || ''),
        description: this.sanitizeString(item.contentSnippet || item.content || item.summary || ''),
        pubDate: this.parseDate(item.pubDate || item.isoDate),
        duration: this.parseDuration(item['itunes:duration']),
        enclosure: this.parseEnclosure(item.enclosure),
        author: this.sanitizeString(item['itunes:author'] || item.creator || ''),
        explicit: this.parseExplicit(item['itunes:explicit']),
        image: this.parseImage(item['itunes:image']),
        link: this.sanitizeUrl(item.link)
      }
    })

    const image = this.parseImage(feed.image || feed['itunes:image'])

    return {
      title: this.sanitizeString(feed.title || ''),
      description: this.sanitizeString(feed.description || ''),
      link: this.sanitizeUrl(feed.link),
      image,
      language: this.sanitizeString(feed.language || ''),
      lastBuildDate: this.parseDate(feed.lastBuildDate),
      episodes
    }
  }

  /**
   * Extract GUID from episode item
   */
  private extractGUID(item: any): string {
    if (item.guid) {
      // Handle different GUID formats
      if (typeof item.guid === 'string') {
        return item.guid
      } else if (item.guid._ || item.guid['#text']) {
        return item.guid._ || item.guid['#text']
      } else if (item.guid.toString) {
        return item.guid.toString()
      }
    }
    
    // Fallback to link if no GUID
    return item.link || `episode-${Date.now()}-${Math.random()}`
  }

  /**
   * Parse duration from various formats
   */
  private parseDuration(duration: any): number | undefined {
    if (!duration) return undefined

    const durationStr = String(duration).trim()
    
    // Handle HH:MM:SS format
    if (durationStr.includes(':')) {
      const parts = durationStr.split(':').map(p => parseInt(p, 10))
      if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
      } else if (parts.length === 2 && parts.every(p => !isNaN(p))) {
        return parts[0] * 60 + parts[1]
      }
    }

    // Handle seconds as number
    const seconds = parseInt(durationStr, 10)
    return isNaN(seconds) ? undefined : seconds
  }

  /**
   * Parse enclosure information
   */
  private parseEnclosure(enclosure: any): RSSEnclosure | undefined {
    if (!enclosure) return undefined

    return {
      url: this.sanitizeUrl(enclosure.url) || '',
      type: this.sanitizeString(enclosure.type) || 'audio/mpeg',
      length: enclosure.length ? parseInt(String(enclosure.length), 10) : undefined
    }
  }

  /**
   * Parse image information
   */
  private parseImage(image: any): RSSImage | undefined {
    if (!image) return undefined

    let imageUrl: string | undefined

    if (typeof image === 'string') {
      imageUrl = image
    } else if (image.href) {
      imageUrl = image.href
    } else if (image.url) {
      imageUrl = image.url
    }

    if (!imageUrl) return undefined

    return {
      url: this.sanitizeUrl(imageUrl) || '',
      title: this.sanitizeString(image.title),
      link: this.sanitizeUrl(image.link)
    }
  }

  /**
   * Parse explicit flag
   */
  private parseExplicit(explicit: any): boolean {
    if (typeof explicit === 'boolean') return explicit
    if (typeof explicit === 'string') {
      const lower = explicit.toLowerCase()
      return lower === 'yes' || lower === 'true' || lower === 'explicit'
    }
    return false
  }

  /**
   * Parse date from various formats
   */
  private parseDate(dateStr: any): Date {
    if (!dateStr) return new Date()
    
    if (dateStr instanceof Date) return dateStr
    
    const parsed = new Date(String(dateStr))
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }

  /**
   * Sanitize string content
   */
  private sanitizeString(str: any): string {
    if (!str) return ''
    return String(str).trim().replace(/\s+/g, ' ')
  }

  /**
   * Sanitize URL
   */
  private sanitizeUrl(url: any): string | undefined {
    if (!url) return undefined
    
    const urlStr = String(url).trim()
    if (!urlStr) return undefined
    
    try {
      new URL(urlStr)
      return urlStr
    } catch {
      return undefined
    }
  }

  /**
   * Validate individual episode
   */
  private validateEpisode(episode: RSSEpisode, index: number): { errors: ValidationError[], warnings: ValidationWarning[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    // Required fields
    if (!episode.guid?.trim()) {
      errors.push({
        field: 'guid',
        message: 'Episode GUID is required',
        episodeIndex: index
      })
    }

    if (!episode.title?.trim()) {
      warnings.push({
        field: 'title',
        message: 'Episode title is missing or empty',
        episodeIndex: index
      })
    }

    if (!episode.description?.trim()) {
      warnings.push({
        field: 'description',
        message: 'Episode description is missing or empty',
        episodeIndex: index
      })
    }

    // Validate enclosure
    if (episode.enclosure) {
      if (!episode.enclosure.url) {
        warnings.push({
          field: 'enclosure.url',
          message: 'Episode audio URL is missing',
          episodeIndex: index
        })
      }
    } else {
      warnings.push({
        field: 'enclosure',
        message: 'Episode audio enclosure is missing',
        episodeIndex: index
      })
    }

    // Validate publication date
    if (!episode.pubDate || isNaN(episode.pubDate.getTime())) {
      warnings.push({
        field: 'pubDate',
        message: 'Episode publication date is invalid',
        episodeIndex: index
      })
    }

    return { errors, warnings }
  }

  /**
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // URL parsing errors
    if (message.includes('invalid url') || message.includes('malformed url')) {
      return true
    }

    // Permission errors
    if (message.includes('permission denied') || message.includes('forbidden')) {
      return true
    }

    // Not found errors
    if (message.includes('not found') || message.includes('404')) {
      return true
    }

    return false
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Create RSS parser instance
 */
export function createRSSParser(): RSSParserContract {
  return new RSSParserImpl()
}

/**
 * Simple episode generator wrapper for RSS episodes
 * This creates a minimal episode generator that works with RSS episode data
 */
export function createEpisodeGenerator() {
  return {
    async generateEpisodeFile(episode: any, episodeNumber: number, config: any) {
      // Convert RSS episode to the format expected by the existing generator
      const rssEpisode = {
        videoId: episode.guid,
        title: episode.title,
        description: episode.description,
        publishedAt: episode.pubDate.toISOString(),
        duration: `PT${Math.floor(episode.duration / 3600)}H${Math.floor((episode.duration % 3600) / 60)}M${episode.duration % 60}S`,
        thumbnailUrl: episode.image,
        tags: [],
        episodeNumber,
        guests: []
      }

      // Use the existing YouTube episode generator with adapted config
      const { generateEpisodeFile } = await import('./episode-generator.js')
      return generateEpisodeFile(rssEpisode, episodeNumber, {
        outputDirectory: config.outputDirectory,
        autoPublish: config.autoPublish,
        includeVideoEmbed: false, // No video for RSS
        truncateDescriptionAt: config.truncateDescriptionAt
      })
    }
  }
}