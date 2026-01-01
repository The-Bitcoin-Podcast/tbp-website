/**
 * Shared Type Definitions
 * Common types and interfaces shared between RSS sync and YouTube sync systems
 */

// ============================================================================
// Episode Content and Frontmatter Shared Types
// ============================================================================

/**
 * Base frontmatter interface that both YouTube and RSS episodes should implement
 */
export interface BaseEpisodeFrontmatter {
  title: string;
  date: string; // YYYY-MM-DD format
  draft: boolean;
  episodeNumber: number;
  description: string;
  duration: string; // Human-readable format (e.g., "1:23:45")
  syncedAt: string; // ISO 8601 timestamp
  status: 'available' | 'unavailable';
  hasPlaceholders: boolean;
  warnings?: string[];
}

/**
 * Guest information structure used in both systems
 */
export interface GuestInfo {
  name: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  bio?: string;
}

/**
 * Topic/tag information structure
 */
export interface TopicInfo {
  name: string;
  category?: string;
  description?: string;
}

/**
 * Timestamp information for episode segments
 */
export interface TimestampInfo {
  time: string; // Format: "HH:MM:SS"
  title: string;
  description?: string;
}

// ============================================================================
// File Processing Shared Types
// ============================================================================

/**
 * File generation result that both systems should return
 */
export interface BaseGenerationResult {
  filePath: string;
  content: string;
  filename: string;
  metadata: Record<string, any>;
}

/**
 * Slug generation configuration
 */
export interface SlugConfig {
  maxLength?: number;
  separator?: string;
  lowercase?: boolean;
  removeStopWords?: boolean;
  customReplacements?: Record<string, string>;
}

/**
 * Content sanitization options
 */
export interface SanitizationOptions {
  removeHtml: boolean;
  escapeMarkdown: boolean;
  normalizeWhitespace: boolean;
  maxLength?: number;
  preserveLineBreaks: boolean;
}

// ============================================================================
// Sync State and History Shared Types
// ============================================================================

/**
 * Base sync record that both systems should implement
 */
export interface BaseSyncRecord {
  guid: string;
  episodePath: string;
  syncedAt: Date;
  commitHash: string;
  source: 'youtube' | 'rss';
}

/**
 * Sync operation metadata
 */
export interface SyncOperationMetadata {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  source: 'youtube' | 'rss';
  trigger: 'manual' | 'scheduled' | 'webhook';
  version: string;
}

// ============================================================================
// Configuration Shared Types
// ============================================================================

/**
 * Base configuration interface for sync operations
 */
export interface BaseSyncConfig {
  outputDirectory: string;
  podcastFolder: string;
  podcastName: string;
  fileNamePattern: string;
  autoPublish: boolean;
  includeDescription: boolean;
  truncateDescriptionAt: number;
  performanceTimeoutMs: number;
  generatePlaceholders: boolean;
}

/**
 * Retry configuration used by both systems
 */
export interface RetryConfig {
  retryAttempts: number;
  retryBackoff: number[];
  retryableErrors?: string[];
  maxRetryDelay?: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  burstLimit?: number;
  backoffMultiplier?: number;
}

// ============================================================================
// Error Handling Shared Types
// ============================================================================

/**
 * Base error for sync operations
 */
export abstract class BaseSyncError extends Error {
  public abstract readonly source: 'youtube' | 'rss';
  
  constructor(
    message: string,
    public readonly operation: string,
    public readonly retryable: boolean = false,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
  }
}

/**
 * Error context information
 */
export interface ErrorContext {
  operation: string;
  episodeId?: string;
  episodeTitle?: string;
  timestamp: Date;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  strategy: 'retry' | 'skip' | 'placeholder' | 'fail';
  maxAttempts?: number;
  backoffMs?: number;
  placeholderData?: Record<string, any>;
}

// ============================================================================
// Utility and Helper Types
// ============================================================================

/**
 * Duration parsing and formatting utilities
 */
export interface DurationInfo {
  totalSeconds: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string; // "HH:MM:SS" format
}

/**
 * Date handling utilities
 */
export interface DateInfo {
  original: Date;
  formatted: string; // YYYY-MM-DD format
  iso: string; // ISO 8601 format
  timestamp: number; // Unix timestamp
}

/**
 * URL validation and parsing result
 */
export interface URLInfo {
  isValid: boolean;
  protocol?: string;
  hostname?: string;
  pathname?: string;
  searchParams?: URLSearchParams;
  error?: string;
}

/**
 * File system operation result
 */
export interface FileSystemResult {
  success: boolean;
  filePath?: string;
  error?: string;
  size?: number;
  permissions?: string;
}

// ============================================================================
// Progress Tracking and Monitoring
// ============================================================================

/**
 * Progress tracking for long-running operations
 */
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  currentOperation: string;
  estimatedTimeRemaining?: number;
  startTime: Date;
}

/**
 * Resource usage monitoring
 */
export interface ResourceUsage {
  memoryUsageMB: number;
  cpuUsagePercent: number;
  diskUsageMB: number;
  networkUsageMB: number;
  operationCount: number;
}

/**
 * Performance benchmark result
 */
export interface BenchmarkResult {
  operationName: string;
  iterations: number;
  totalDurationMs: number;
  averageDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  standardDeviation: number;
}

// ============================================================================
// Plugin and Extension Types
// ============================================================================

/**
 * Plugin interface for extending sync functionality
 */
export interface SyncPlugin {
  name: string;
  version: string;
  priority: number;
  
  beforeSync?(config: BaseSyncConfig): Promise<void>;
  afterSync?(result: BaseGenerationResult[]): Promise<void>;
  onError?(error: Error, context: ErrorContext): Promise<ErrorRecoveryStrategy>;
  processEpisode?(episode: any): Promise<any>;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  priority: number;
  options: Record<string, any>;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  plugin: SyncPlugin;
  config: PluginConfig;
  loadTime: Date;
  status: 'loaded' | 'error' | 'disabled';
  error?: Error;
}