/**
 * RSS Sync Type Definitions
 * Comprehensive TypeScript types for RSS podcast synchronization functionality
 * 
 * This file contains all type definitions needed for the RSS sync system,
 * including contracts for RSS parsing, episode generation, and sync services.
 */

// ============================================================================
// RSS Parser Contract Types
// ============================================================================

export interface RSSParserContract {
  /**
   * Parse RSS feed from XML string
   * @param xmlContent - Raw RSS XML content
   * @returns Parsed RSS feed data
   * @throws RSSParseError if XML parsing fails
   */
  parseRSSFeed(xmlContent: string): Promise<ParsedRSSFeed>;

  /**
   * Fetch and parse RSS feed from URL
   * @param url - RSS feed URL
   * @param options - Fetch options including timeout and retry config
   * @returns Parsed RSS feed data
   * @throws RSSParseError if fetch or parsing fails
   */
  fetchAndParseRSS(url: string, options?: FetchOptions): Promise<ParsedRSSFeed>;

  /**
   * Validate RSS feed structure and required fields
   * @param feed - Parsed RSS feed to validate
   * @returns Validation result with warnings and errors
   */
  validateFeed(feed: ParsedRSSFeed): FeedValidationResult;
}

export interface ParsedRSSFeed {
  title: string;
  description: string;
  link?: string;
  image?: RSSImage;
  language?: string;
  lastBuildDate?: Date;
  episodes: RSSEpisode[];
}

export interface RSSEpisode {
  guid: string;
  title: string;
  description: string;
  pubDate: Date;
  duration?: number; // Duration in seconds
  enclosure?: RSSEnclosure;
  author?: string;
  explicit?: boolean;
  image?: string;
  link?: string;
}

export interface RSSEnclosure {
  url: string;
  type: string;
  length?: number;
}

export interface RSSImage {
  url: string;
  title?: string;
  link?: string;
}

export interface FetchOptions {
  timeout?: number; // Timeout in milliseconds
  retryAttempts?: number;
  retryBackoff?: number[]; // Retry delay in milliseconds for each attempt
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface FeedValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  episodeCount: number;
  validEpisodeCount: number;
}

export interface ValidationError {
  field: string;
  message: string;
  episodeIndex?: number;
}

export interface ValidationWarning {
  field: string;
  message: string;
  episodeIndex?: number;
}

export class RSSParseError extends Error {
  constructor(
    message: string, 
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'RSSParseError';
  }
}

// ============================================================================
// Episode Generator Contract Types
// ============================================================================

export interface RSSEpisodeGeneratorContract {
  /**
   * Generate markdown episode file from RSS episode data
   * @param episode - Parsed RSS episode data
   * @param episodeNumber - Sequential episode number
   * @param config - Generation configuration
   * @returns Generated file content and metadata
   * @throws GenerationError if file generation fails
   */
  generateEpisodeFile(
    episode: RSSEpisodeData, 
    episodeNumber: number, 
    config: GenerationConfig
  ): Promise<GenerationResult>;

  /**
   * Generate episode frontmatter only
   * @param episode - RSS episode data
   * @param episodeNumber - Sequential episode number
   * @param config - Generation configuration
   * @returns Frontmatter object
   */
  generateFrontmatter(
    episode: RSSEpisodeData, 
    episodeNumber: number, 
    config: GenerationConfig
  ): RSSEpisodeFrontmatter;

  /**
   * Generate filename for episode
   * @param episode - RSS episode data
   * @param episodeNumber - Sequential episode number
   * @param pattern - Filename pattern template
   * @returns Generated filename
   */
  generateFilename(
    episode: RSSEpisodeData, 
    episodeNumber: number, 
    pattern: string
  ): string;
}

export interface RSSEpisodeData {
  guid: string;
  title: string;
  description: string;
  pubDate: Date;
  duration: number; // seconds
  enclosureUrl: string;
  enclosureType: string;
  enclosureLength: number;
  author?: string;
  explicit: boolean;
  image?: string;
}

export interface GenerationConfig {
  outputDirectory: string;
  podcastFolder: string;
  podcastName: string;
  fileNamePattern: string;
  autoPublish: boolean;
  includeDescription: boolean;
  truncateDescriptionAt: number;
  includeAudioEmbed: boolean;
}

export interface GenerationResult {
  filePath: string;
  content: string;
  frontmatter: RSSEpisodeFrontmatter;
  filename: string;
}

export interface RSSEpisodeFrontmatter {
  title: string;
  date: string; // YYYY-MM-DD format
  draft: boolean;
  episodeNumber: number;
  rssGuid: string;
  audioUrl: string;
  duration: string; // Human-readable format (e.g., "1:23:45")
  description: string;
  author?: string;
  explicit: boolean;
  thumbnail?: string;
  syncedAt: string; // ISO 8601 timestamp
  status: 'available' | 'unavailable'; // Episode availability status
  hasPlaceholders: boolean; // Indicates if episode contains generated placeholder values
  warnings?: string[]; // Array of warnings about missing or placeholder data
}

export class GenerationError extends Error {
  constructor(
    message: string, 
    public readonly episode: RSSEpisodeData,
    public readonly operation: string
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

// ============================================================================
// Sync Service Contract Types
// ============================================================================

export interface RSSSyncServiceContract {
  /**
   * Perform incremental sync of RSS feed
   * @param config - Sync configuration
   * @returns Sync operation result
   * @throws SyncError if sync operation fails
   */
  syncFeed(config: SyncConfig): Promise<SyncResult>;

  /**
   * Perform full sync of RSS feed (ignores sync state)
   * @param config - Sync configuration
   * @returns Sync operation result
   * @throws SyncError if sync operation fails
   */
  fullSync(config: SyncConfig): Promise<SyncResult>;

  /**
   * Preview sync operation without writing files
   * @param config - Sync configuration
   * @returns Preview of what would be synced
   */
  dryRun(config: SyncConfig): Promise<SyncPreview>;

  /**
   * Get current sync state from git history
   * @param outputDirectory - Directory containing episode files
   * @param podcastFolder - Podcast-specific subdirectory
   * @returns Current synchronization state
   */
  getSyncState(outputDirectory: string, podcastFolder: string): Promise<SyncState>;
}

export interface SyncConfig {
  rssUrl: string;
  outputDirectory: string;
  podcastFolder: string;
  podcastName: string;
  fileNamePattern: string;
  autoPublish: boolean;
  fullSync: boolean;
  maxEpisodes?: number;
  includeDescription: boolean;
  truncateDescriptionAt: number;
  excludedGuids?: string[];
  retryAttempts: number; // Default: 3 (from clarifications)
  retryBackoff: number[]; // Exponential backoff delays in milliseconds
  performanceTimeoutMs: number; // Default: 30000 (30 seconds for 100 episodes)
  generatePlaceholders: boolean; // Default: true (generate placeholders for missing metadata)
  dateFilter?: {
    after?: Date;
    before?: Date;
  };
}

export interface SyncResult {
  successCount: number;
  failureCount: number;
  syncedEpisodes: SyncedEpisode[];
  failures: SyncFailure[];
  commitHash?: string;
  duration: number; // milliseconds
}

export interface SyncedEpisode {
  guid: string;
  episodeNumber: number;
  title: string;
  filePath: string;
  publishDate: Date;
}

export interface SyncFailure {
  guid: string;
  title?: string;
  error: string;
  retryable: boolean;
}

export interface SyncPreview {
  newEpisodes: PreviewEpisode[];
  totalCount: number;
  estimatedFiles: string[];
}

export interface PreviewEpisode {
  guid: string;
  title: string;
  publishDate: Date;
  estimatedFilePath: string;
  episodeNumber: number;
}

export interface SyncState {
  syncedGuids: Set<string>;
  lastSyncTimestamp?: Date;
  episodeCount: number;
  syncHistory: SyncRecord[];
  podcastFolder: string;
}

export interface SyncRecord {
  guid: string;
  episodePath: string;
  syncedAt: Date;
  commitHash: string;
}

export class SyncError extends Error {
  constructor(
    message: string, 
    public readonly operation: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'SyncError';
  }
}

// ============================================================================
// Utility Types for RSS Sync System
// ============================================================================

/**
 * Configuration for episode numbering strategy
 */
export interface EpisodeNumberingConfig {
  strategy: 'chronological' | 'reverse-chronological' | 'rss-order';
  startNumber?: number;
  padding?: number; // Zero-padding for filenames (e.g., 001, 002, etc.)
}

/**
 * Metadata extraction and processing configuration
 */
export interface MetadataProcessingConfig {
  extractGuests: boolean;
  extractTopics: boolean;
  extractTranscript: boolean;
  cleanHtml: boolean;
  preserveFormatting: boolean;
}

/**
 * File naming template variables
 */
export interface FileNamingVariables {
  number: string; // Episode number (padded if configured)
  slug: string; // URL-safe slug from title
  date: string; // Publication date (YYYY-MM-DD)
  year: string; // Publication year (YYYY)
  month: string; // Publication month (MM)
  day: string; // Publication day (DD)
  podcast: string; // Podcast folder name
  guid: string; // RSS GUID (sanitized for filename)
}

/**
 * Audio embedding configuration
 */
export interface AudioEmbedConfig {
  includeEmbed: boolean;
  embedType: 'html-audio' | 'iframe' | 'custom';
  customTemplate?: string;
  showControls: boolean;
  autoplay: boolean;
  preload: 'none' | 'metadata' | 'auto';
}

/**
 * Content processing options
 */
export interface ContentProcessingOptions {
  markdownEscaping: boolean;
  linkProcessing: boolean;
  imageProcessing: boolean;
  codeBlockFormatting: boolean;
  customProcessors?: Array<(content: string) => string>;
}

/**
 * Git integration configuration
 */
export interface GitIntegrationConfig {
  autoCommit: boolean;
  commitMessageTemplate: string;
  branchName?: string;
  authorName?: string;
  authorEmail?: string;
}

/**
 * Performance monitoring metrics
 */
export interface PerformanceMetrics {
  totalDuration: number; // Total operation time in ms
  fetchDuration: number; // RSS fetch time in ms
  parseDuration: number; // RSS parsing time in ms
  generationDuration: number; // File generation time in ms
  writeDuration: number; // File writing time in ms
  episodeProcessingTimes: number[]; // Individual episode processing times
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
  };
}

/**
 * Logging configuration for RSS sync operations
 */
export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  includeTimestamps: boolean;
  includePerformanceMetrics: boolean;
  logToFile?: string;
  consoleOutput: boolean;
}