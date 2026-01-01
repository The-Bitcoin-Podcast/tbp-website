/**
 * RSS Parser Contract - TypeScript Interface Definitions
 * Defines the contract for RSS feed parsing functionality
 */

export interface RSSParserContract {
  /**
   * Parse RSS feed from XML string
   * @param xmlContent - Raw RSS XML content
   * @returns Parsed RSS feed data
   * @throws RSSParseError if XML is malformed or missing required fields
   */
  parseRSSFeed(xmlContent: string): Promise<ParsedRSSFeed>;

  /**
   * Fetch and parse RSS feed from URL
   * @param url - RSS feed URL
   * @param options - Optional fetch configuration
   * @returns Parsed RSS feed data
   * @throws NetworkError if fetch fails
   * @throws RSSParseError if parsing fails
   */
  fetchAndParseRSS(url: string, options?: FetchOptions): Promise<ParsedRSSFeed>;

  /**
   * Validate RSS feed structure
   * @param feed - Parsed feed object
   * @returns Validation result with errors if any
   */
  validateFeed(feed: ParsedRSSFeed): ValidationResult;
}

export interface ParsedRSSFeed {
  title: string;
  description: string;
  author: string;
  language: string;
  image: string;
  link: string;
  lastBuildDate?: Date;
  episodes: ParsedRSSEpisode[];
}

export interface ParsedRSSEpisode {
  guid: string;
  title: string;
  description: string;
  pubDate: Date;
  duration: number; // Duration in seconds
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  author?: string;
  explicit: boolean;
  image?: string;
}

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  cacheHeaders?: {
    etag?: string;
    lastModified?: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class RSSParseError extends Error {
  constructor(message: string, public readonly xmlContent?: string) {
    super(message);
    this.name = 'RSSParseError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly url: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}