/**
 * RSS Parsing Utilities
 * Core utilities for RSS feed parsing, duration handling, caching, and metadata processing
 */

import Parser from 'rss-parser'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import type {
  ParsedRSSFeed,
  RSSEpisode,
  FetchOptions,
  RSSParseError
} from '../types/rss-sync.js'

// ============================================================================
// RSS Parsing with Retry Logic
// ============================================================================

/**
 * RSS Parser with built-in retry logic and error handling
 */
export class RSSParser {
  private parser: Parser
  private cache: Map<string, CacheEntry> = new Map()

  constructor() {
    this.parser = new Parser({
      customFields: {
        feed: ['language', 'lastBuildDate', 'itunes:author', 'itunes:image'],
        item: [
          'guid',
          'itunes:duration',
          'itunes:author', 
          'itunes:explicit',
          'itunes:image',
          'itunes:summary'
        ]
      },
      timeout: 30000,
      headers: {
        'User-Agent': 'RSS-Sync/1.0 (Podcast Episode Sync Tool)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    })
  }

  /**
   * Fetch and parse RSS feed with retry logic
   */
  async fetchAndParseRSS(
    url: string, 
    options: FetchOptions = {}
  ): Promise<ParsedRSSFeed> {
    const {
      timeout = 30000,
      retryAttempts = 3,
      retryBackoff = [1000, 5000, 15000],
      userAgent,
      headers = {}
    } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        console.log(`Fetching RSS feed (attempt ${attempt + 1}/${retryAttempts + 1}): ${url}`)

        // Configure parser for this attempt
        const requestParser = new Parser({
          ...this.parser.options,
          timeout,
          headers: {
            'User-Agent': userAgent || 'RSS-Sync/1.0 (Podcast Episode Sync Tool)',
            ...headers
          }
        })

        const rawFeed = await requestParser.parseURL(url)
        const parsedFeed = this.transformToStandardFormat(rawFeed)
        
        console.log(`Successfully parsed RSS feed: ${parsedFeed.title} (${parsedFeed.episodes.length} episodes)`)
        return parsedFeed

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        console.warn(`RSS fetch attempt ${attempt + 1} failed:`, lastError.message)

        // Don't retry for certain errors
        if (this.isNonRetryableError(lastError)) {
          console.error('Non-retryable error encountered, aborting retries')
          break
        }

        // Wait before next attempt (except after the last attempt)
        if (attempt < retryAttempts) {
          const delay = retryBackoff[Math.min(attempt, retryBackoff.length - 1)]
          console.log(`Waiting ${delay}ms before retry...`)
          await this.sleep(delay)
        }
      }
    }

    const error = new RSSParseError(
      `Failed to fetch RSS feed after ${retryAttempts + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      'fetchRSS',
      lastError || undefined
    )
    console.error(error.message)
    throw error
  }

  /**
   * Parse RSS feed from XML string
   */
  async parseRSSFeed(xmlContent: string): Promise<ParsedRSSFeed> {
    try {
      const rawFeed = await this.parser.parseString(xmlContent)
      return this.transformToStandardFormat(rawFeed)
    } catch (error) {
      throw new RSSParseError(
        `Failed to parse RSS XML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'parseXML',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Transform raw RSS feed to our standard format
   */
  private transformToStandardFormat(rawFeed: any): ParsedRSSFeed {
    const episodes: RSSEpisode[] = (rawFeed.items || []).map((item: any, index: number) => {
      try {
        return {
          guid: this.extractGUID(item),
          title: this.sanitizeString(item.title || ''),
          description: this.sanitizeString(
            item['content:encoded'] || 
            item.contentSnippet || 
            item.content || 
            item['itunes:summary'] || 
            item.summary || 
            ''
          ),
          pubDate: this.parseDate(item.pubDate || item.isoDate),
          duration: this.parseDuration(item['itunes:duration']),
          enclosure: item.enclosure ? {
            url: this.sanitizeUrl(item.enclosure.url) || '',
            type: this.sanitizeString(item.enclosure.type) || 'audio/mpeg',
            length: item.enclosure.length ? parseInt(String(item.enclosure.length), 10) : undefined
          } : undefined,
          author: this.sanitizeString(item['itunes:author'] || item.creator || ''),
          explicit: this.parseExplicit(item['itunes:explicit']),
          image: this.parseImageUrl(item['itunes:image']),
          link: this.sanitizeUrl(item.link)
        }
      } catch (error) {
        console.warn(`Failed to parse episode ${index}:`, error)
        // Return a minimal episode with placeholder data
        return {
          guid: `episode-${Date.now()}-${index}`,
          title: `Episode ${index + 1}`,
          description: 'Episode description not available',
          pubDate: new Date(),
          duration: 0,
          enclosure: undefined,
          author: '',
          explicit: false,
          image: undefined,
          link: undefined
        }
      }
    })

    return {
      title: this.sanitizeString(rawFeed.title || 'Untitled Podcast'),
      description: this.sanitizeString(rawFeed.description || ''),
      link: this.sanitizeUrl(rawFeed.link),
      image: this.parseImageUrl(rawFeed['itunes:image'] || rawFeed.image),
      language: this.sanitizeString(rawFeed.language || 'en'),
      lastBuildDate: this.parseDate(rawFeed.lastBuildDate),
      episodes
    }
  }

  /**
   * Extract GUID from RSS item
   */
  private extractGUID(item: any): string {
    if (item.guid) {
      if (typeof item.guid === 'string') {
        return item.guid
      } else if (item.guid._ || item.guid['#text']) {
        return item.guid._ || item.guid['#text']
      } else if (item.guid.toString) {
        return item.guid.toString()
      }
    }
    
    // Fallback to link if available
    if (item.link) {
      return item.link
    }
    
    // Generate GUID from title and date if available
    if (item.title && item.pubDate) {
      const hash = crypto.createHash('md5')
        .update(item.title + item.pubDate)
        .digest('hex')
      return `generated-${hash.substring(0, 16)}`
    }
    
    // Last resort - timestamp-based GUID
    return `episode-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  /**
   * Parse image URL from various RSS formats
   */
  private parseImageUrl(image: any): string | undefined {
    if (!image) return undefined

    if (typeof image === 'string') {
      return this.sanitizeUrl(image)
    }

    if (image.href) {
      return this.sanitizeUrl(image.href)
    }

    if (image.url) {
      return this.sanitizeUrl(image.url)
    }

    if (image.$?.href) {
      return this.sanitizeUrl(image.$.href)
    }

    return undefined
  }

  /**
   * Parse explicit flag from various formats
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
   * Check if error is non-retryable
   */
  private isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // URL parsing errors
    if (message.includes('invalid url') || message.includes('malformed url')) {
      return true
    }

    // Permission/authentication errors
    if (message.includes('permission denied') || 
        message.includes('forbidden') || 
        message.includes('unauthorized') ||
        message.includes('401') ||
        message.includes('403')) {
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

  /**
   * Parse duration from various formats
   */
  private parseDuration(duration: any): number {
    return parseDuration(duration)
  }
}

// ============================================================================
// Duration Parsing Function
// ============================================================================

/**
 * Parse duration from various formats (HH:MM:SS, MM:SS, seconds)
 * @param duration - Duration in various formats
 * @returns Duration in seconds, or 0 if invalid
 */
export function parseDuration(duration: any): number {
  if (!duration) return 0

  const durationStr = String(duration).trim()
  
  // Handle empty or invalid strings
  if (!durationStr || durationStr === '0') return 0

  // Handle HH:MM:SS or MM:SS format
  if (durationStr.includes(':')) {
    const parts = durationStr.split(':').map(p => parseInt(p, 10))
    
    if (parts.length === 3 && parts.every(p => !isNaN(p) && p >= 0)) {
      // Validate time constraints
      const hours = parts[0]
      const minutes = parts[1] 
      const seconds = parts[2]
      
      if (minutes >= 60 || seconds >= 60) {
        return 0 // Invalid time
      }
      
      return hours * 3600 + minutes * 60 + seconds
    } else if (parts.length === 2 && parts.every(p => !isNaN(p) && p >= 0)) {
      // MM:SS format
      const minutes = parts[0]
      const seconds = parts[1]
      
      if (seconds >= 60) {
        return 0 // Invalid time
      }
      
      return minutes * 60 + seconds
    }
    
    return 0 // Invalid format
  }

  // Handle seconds as number
  const seconds = parseFloat(durationStr)
  if (!isNaN(seconds) && seconds >= 0) {
    return Math.floor(seconds)
  }

  // Handle ISO 8601 duration format (PT1H23M45S)
  const iso8601Match = durationStr.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/i)
  if (iso8601Match) {
    const hours = parseInt(iso8601Match[1] || '0', 10)
    const minutes = parseInt(iso8601Match[2] || '0', 10)
    const seconds = parseFloat(iso8601Match[3] || '0')
    
    return Math.floor(hours * 3600 + minutes * 60 + seconds)
  }

  console.warn(`Unable to parse duration: "${durationStr}"`)
  return 0
}

/**
 * Format duration as human-readable string (HH:MM:SS or MM:SS)
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) {
    return '00:00'
  }

  const totalSeconds = Math.floor(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

// ============================================================================
// HTTP Caching Support
// ============================================================================

interface CacheEntry {
  data: ParsedRSSFeed
  etag?: string
  lastModified?: string
  timestamp: number
  ttl: number
}

/**
 * HTTP caching utilities for efficient RSS feed polling
 */
export class RSSCache {
  private cache: Map<string, CacheEntry> = new Map()
  private cacheDir: string
  
  constructor(cacheDir: string = '.cache/rss') {
    this.cacheDir = cacheDir
  }

  /**
   * Initialize cache directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true })
    } catch (error) {
      console.warn('Failed to create cache directory:', error)
    }
  }

  /**
   * Get cache key for URL
   */
  private getCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex')
  }

  /**
   * Get cached feed if valid
   */
  async getCachedFeed(url: string): Promise<CacheEntry | null> {
    const key = this.getCacheKey(url)
    
    // Check in-memory cache first
    const memoryEntry = this.cache.get(key)
    if (memoryEntry && Date.now() - memoryEntry.timestamp < memoryEntry.ttl) {
      return memoryEntry
    }

    // Check disk cache
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`)
      const cacheData = await fs.readFile(cacheFile, 'utf-8')
      const entry: CacheEntry = JSON.parse(cacheData)
      
      if (Date.now() - entry.timestamp < entry.ttl) {
        // Restore to memory cache
        this.cache.set(key, entry)
        return entry
      }
    } catch {
      // Cache miss or invalid cache
    }

    return null
  }

  /**
   * Save feed to cache
   */
  async saveFeedToCache(
    url: string, 
    feed: ParsedRSSFeed, 
    etag?: string, 
    lastModified?: string,
    ttl: number = 15 * 60 * 1000 // 15 minutes default
  ): Promise<void> {
    const key = this.getCacheKey(url)
    const entry: CacheEntry = {
      data: feed,
      etag,
      lastModified,
      timestamp: Date.now(),
      ttl
    }

    // Save to memory cache
    this.cache.set(key, entry)

    // Save to disk cache
    try {
      const cacheFile = path.join(this.cacheDir, `${key}.json`)
      await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2))
    } catch (error) {
      console.warn('Failed to save cache to disk:', error)
    }
  }

  /**
   * Clear expired cache entries
   */
  async cleanupCache(): Promise<void> {
    const now = Date.now()
    
    // Clean memory cache
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }

    // Clean disk cache
    try {
      const files = await fs.readdir(this.cacheDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))
      
      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.cacheDir, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const entry: CacheEntry = JSON.parse(content)
          
          if (now - entry.timestamp > entry.ttl) {
            await fs.unlink(filePath)
          }
        } catch {
          // Skip invalid cache files
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup disk cache:', error)
    }
  }
}

// ============================================================================
// Missing Metadata Placeholder Generation
// ============================================================================

/**
 * Generate placeholder data for missing episode metadata
 */
export function generatePlaceholders(
  episode: Partial<RSSEpisode>, 
  episodeNumber: number,
  podcastName: string
): { episode: RSSEpisode; warnings: string[] } {
  const warnings: string[] = []
  const now = new Date()

  // Generate title placeholder
  let title = episode.title?.trim()
  if (!title) {
    title = `Episode ${episodeNumber}`
    warnings.push('Episode title was missing, generated placeholder')
  }

  // Generate description placeholder
  let description = episode.description?.trim()
  if (!description) {
    description = `Episode ${episodeNumber} of ${podcastName}`
    warnings.push('Episode description was missing, generated placeholder')
  }

  // Generate GUID if missing
  let guid = episode.guid?.trim()
  if (!guid) {
    guid = `generated-${Date.now()}-${episodeNumber}`
    warnings.push('Episode GUID was missing, generated placeholder')
  }

  // Use current date if publication date is missing
  let pubDate = episode.pubDate
  if (!pubDate || isNaN(pubDate.getTime())) {
    pubDate = now
    warnings.push('Episode publication date was missing or invalid, using current date')
  }

  // Set default duration if missing
  let duration = episode.duration || 0
  if (duration === 0) {
    warnings.push('Episode duration was missing, set to 0')
  }

  // Check for missing enclosure
  if (!episode.enclosure?.url) {
    warnings.push('Episode audio URL is missing, marked as unavailable')
  }

  const completeEpisode: RSSEpisode = {
    guid,
    title,
    description,
    pubDate,
    duration,
    enclosure: episode.enclosure,
    author: episode.author || undefined,
    explicit: episode.explicit || false,
    image: episode.image,
    link: episode.link
  }

  return { episode: completeEpisode, warnings }
}

// ============================================================================
// Episode Availability Status Management
// ============================================================================

/**
 * Episode availability status
 */
export type EpisodeStatus = 'available' | 'unavailable' | 'removed'

/**
 * Determine episode availability status
 */
export function determineEpisodeStatus(episode: RSSEpisode): EpisodeStatus {
  // Episode is available if it has a valid audio URL
  if (episode.enclosure?.url) {
    try {
      new URL(episode.enclosure.url)
      return 'available'
    } catch {
      return 'unavailable'
    }
  }
  
  return 'unavailable'
}

/**
 * Mark episode as unavailable (for episodes removed from feed)
 */
export function markEpisodeUnavailable(episodePath: string): Promise<void> {
  // This would update the frontmatter to mark episode as unavailable
  // Implementation would read the file, update the status field, and write back
  // For now, this is a placeholder that should be implemented with the file system utilities
  console.log(`Marking episode as unavailable: ${episodePath}`)
  return Promise.resolve()
}

// ============================================================================
// Podcast Folder Validation and Path Generation
// ============================================================================

/**
 * Validate podcast folder name
 */
export function validatePodcastFolder(folderName: string): { valid: boolean; error?: string } {
  if (!folderName || !folderName.trim()) {
    return { valid: false, error: 'Podcast folder name cannot be empty' }
  }

  const trimmed = folderName.trim()
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*\0]/
  if (invalidChars.test(trimmed)) {
    return { valid: false, error: 'Podcast folder name contains invalid characters' }
  }

  // Check for reserved names on Windows
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(trimmed.toUpperCase())) {
    return { valid: false, error: 'Podcast folder name is a reserved system name' }
  }

  // Check length
  if (trimmed.length > 100) {
    return { valid: false, error: 'Podcast folder name is too long (max 100 characters)' }
  }

  return { valid: true }
}

/**
 * Generate safe file path for podcast episode
 */
export function generateEpisodeFilePath(
  outputDirectory: string,
  podcastFolder: string,
  filename: string
): string {
  const validation = validatePodcastFolder(podcastFolder)
  if (!validation.valid) {
    throw new Error(`Invalid podcast folder: ${validation.error}`)
  }

  return path.join(outputDirectory, podcastFolder.trim(), filename)
}

/**
 * Ensure podcast folder exists
 */
export async function ensurePodcastFolder(
  outputDirectory: string,
  podcastFolder: string
): Promise<string> {
  const folderPath = path.join(outputDirectory, podcastFolder.trim())
  
  try {
    await fs.mkdir(folderPath, { recursive: true })
    console.log(`Ensured podcast folder exists: ${folderPath}`)
    return folderPath
  } catch (error) {
    throw new Error(`Failed to create podcast folder: ${error}`)
  }
}