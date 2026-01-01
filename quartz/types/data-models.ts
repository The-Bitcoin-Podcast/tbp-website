/**
 * Data Models and Transformation Types
 * Defines data structures for RSS episode processing and transformation
 */

// ============================================================================
// RSS Feed Data Models
// ============================================================================

/**
 * Raw RSS feed item as parsed from XML
 */
export interface RawRSSItem {
  guid?: string | { _: string } | { _: string; $: { isPermaLink: string } };
  title?: string;
  description?: string;
  'content:encoded'?: string;
  pubDate?: string;
  'itunes:duration'?: string;
  enclosure?: {
    $: {
      url: string;
      type: string;
      length?: string;
    };
  };
  'itunes:author'?: string;
  'itunes:explicit'?: string | boolean;
  'itunes:image'?: {
    $: {
      href: string;
    };
  };
  link?: string;
  'itunes:summary'?: string;
  'itunes:subtitle'?: string;
  'itunes:keywords'?: string;
  category?: string | string[];
}

/**
 * Raw RSS channel data as parsed from XML
 */
export interface RawRSSChannel {
  title?: string;
  description?: string;
  link?: string;
  language?: string;
  lastBuildDate?: string;
  'itunes:author'?: string;
  'itunes:summary'?: string;
  'itunes:owner'?: {
    'itunes:name'?: string;
    'itunes:email'?: string;
  };
  'itunes:image'?: {
    $: {
      href: string;
    };
  };
  'itunes:category'?: Array<{
    $: {
      text: string;
    };
  }>;
  'itunes:explicit'?: string | boolean;
  item?: RawRSSItem[];
}

/**
 * Raw RSS feed structure as parsed from XML
 */
export interface RawRSSFeed {
  rss?: {
    $: {
      version: string;
    };
    channel?: RawRSSChannel;
  };
}

// ============================================================================
// Normalized Data Models
// ============================================================================

/**
 * Normalized episode data after initial processing
 */
export interface NormalizedEpisode {
  // Required fields
  guid: string;
  title: string;
  description: string;
  pubDate: Date;
  
  // Optional metadata
  duration?: number; // Duration in seconds
  enclosureUrl?: string;
  enclosureType?: string;
  enclosureLength?: number;
  author?: string;
  explicit?: boolean;
  image?: string;
  link?: string;
  summary?: string;
  subtitle?: string;
  keywords?: string[];
  categories?: string[];
  
  // Processing metadata
  source: 'rss';
  rawData: RawRSSItem;
  processingTimestamp: Date;
  validationWarnings: string[];
}

/**
 * Normalized podcast metadata
 */
export interface NormalizedPodcast {
  title: string;
  description: string;
  link?: string;
  language?: string;
  lastBuildDate?: Date;
  author?: string;
  owner?: {
    name?: string;
    email?: string;
  };
  image?: string;
  categories?: string[];
  explicit?: boolean;
  
  // Processing metadata
  source: 'rss';
  rawData: RawRSSChannel;
  processingTimestamp: Date;
}

// ============================================================================
// Episode Processing Pipeline Types
// ============================================================================

/**
 * Episode processing context
 */
export interface EpisodeProcessingContext {
  episode: NormalizedEpisode;
  episodeNumber: number;
  podcast: NormalizedPodcast;
  config: EpisodeProcessingConfig;
  processingMetadata: ProcessingMetadata;
}

/**
 * Episode processing configuration
 */
export interface EpisodeProcessingConfig {
  // Content processing
  cleanHtml: boolean;
  extractPlainText: boolean;
  preserveFormatting: boolean;
  maxDescriptionLength: number;
  
  // Metadata extraction
  extractGuests: boolean;
  extractTimestamps: boolean;
  extractLinks: boolean;
  extractTopics: boolean;
  
  // File generation
  templatePath?: string;
  customFields: Record<string, any>;
  includeRawMetadata: boolean;
  
  // Validation
  strictValidation: boolean;
  requiredFields: string[];
  allowPlaceholders: boolean;
}

/**
 * Processing metadata and tracking
 */
export interface ProcessingMetadata {
  processingId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  processingSteps: ProcessingStep[];
  warnings: ProcessingWarning[];
  errors: ProcessingError[];
}

/**
 * Individual processing step
 */
export interface ProcessingStep {
  name: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  success: boolean;
  metadata?: Record<string, any>;
}

/**
 * Processing warning
 */
export interface ProcessingWarning {
  step: string;
  field?: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

/**
 * Processing error
 */
export interface ProcessingError {
  step: string;
  field?: string;
  message: string;
  originalError?: Error;
  recoverable: boolean;
}

// ============================================================================
// Content Transformation Types
// ============================================================================

/**
 * Content transformation result
 */
export interface ContentTransformation {
  original: string;
  transformed: string;
  transformations: TransformationStep[];
  metadata: TransformationMetadata;
}

/**
 * Individual transformation step
 */
export interface TransformationStep {
  name: string;
  description: string;
  applied: boolean;
  beforeLength: number;
  afterLength: number;
  changes: string[];
}

/**
 * Transformation metadata
 */
export interface TransformationMetadata {
  totalSteps: number;
  appliedSteps: number;
  skippedSteps: number;
  originalLength: number;
  finalLength: number;
  transformationTime: number;
}

// ============================================================================
// Template and Generation Types
// ============================================================================

/**
 * Episode template data
 */
export interface EpisodeTemplateData {
  // Basic episode information
  title: string;
  description: string;
  date: string;
  episodeNumber: number;
  duration: string;
  
  // Audio information
  audioUrl?: string;
  audioType?: string;
  audioLength?: number;
  
  // Metadata
  author?: string;
  explicit: boolean;
  guid: string;
  
  // Podcast information
  podcastTitle: string;
  podcastDescription: string;
  
  // Processing information
  syncedAt: string;
  status: string;
  hasPlaceholders: boolean;
  warnings: string[];
  
  // Optional extracted content
  guests?: GuestTemplateData[];
  timestamps?: TimestampTemplateData[];
  links?: LinkTemplateData[];
  topics?: string[];
  
  // Custom fields
  customFields: Record<string, any>;
}

/**
 * Guest template data
 */
export interface GuestTemplateData {
  name: string;
  role?: string;
  bio?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
}

/**
 * Timestamp template data
 */
export interface TimestampTemplateData {
  time: string; // "HH:MM:SS"
  seconds: number;
  title: string;
  description?: string;
}

/**
 * Link template data
 */
export interface LinkTemplateData {
  url: string;
  title: string;
  description?: string;
  type: 'internal' | 'external' | 'social' | 'resource';
}

// ============================================================================
// Validation and Quality Assurance Types
// ============================================================================

/**
 * Episode quality assessment
 */
export interface EpisodeQualityAssessment {
  overallScore: number; // 0-100
  completeness: number; // 0-100
  accuracy: number; // 0-100
  consistency: number; // 0-100
  
  assessmentDetails: QualityAssessmentDetail[];
  recommendations: QualityRecommendation[];
}

/**
 * Quality assessment detail
 */
export interface QualityAssessmentDetail {
  category: 'metadata' | 'content' | 'formatting' | 'links';
  field: string;
  score: number;
  issues: string[];
  suggestions: string[];
}

/**
 * Quality recommendation
 */
export interface QualityRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  action: string;
  impact: string;
}

// ============================================================================
// Synchronization State Types
// ============================================================================

/**
 * Episode synchronization status
 */
export interface EpisodeSyncStatus {
  guid: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'skipped';
  filePath?: string;
  syncAttempts: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

/**
 * Batch synchronization status
 */
export interface BatchSyncStatus {
  batchId: string;
  startTime: Date;
  endTime?: Date;
  totalEpisodes: number;
  processedEpisodes: number;
  successfulEpisodes: number;
  failedEpisodes: number;
  skippedEpisodes: number;
  episodes: EpisodeSyncStatus[];
  overallStatus: 'running' | 'completed' | 'failed' | 'cancelled';
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Export and Import Types
// ============================================================================

/**
 * Data export configuration
 */
export interface ExportConfig {
  format: 'json' | 'csv' | 'xml' | 'yaml';
  includeContent: boolean;
  includeMetadata: boolean;
  includeProcessingData: boolean;
  filterCriteria?: FilterCriteria;
  compressionLevel?: number;
}

/**
 * Filter criteria for data operations
 */
export interface FilterCriteria {
  dateRange?: {
    start: Date;
    end: Date;
  };
  episodeNumbers?: number[];
  guids?: string[];
  statuses?: string[];
  hasWarnings?: boolean;
  hasErrors?: boolean;
  customFilters?: Record<string, any>;
}

/**
 * Data import result
 */
export interface ImportResult {
  totalRecords: number;
  importedRecords: number;
  skippedRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  summary: ImportSummary;
}

/**
 * Import error details
 */
export interface ImportError {
  recordIndex: number;
  recordId?: string;
  field?: string;
  message: string;
  originalData?: any;
}

/**
 * Import warning details
 */
export interface ImportWarning {
  recordIndex: number;
  recordId?: string;
  field?: string;
  message: string;
  suggestion?: string;
}

/**
 * Import operation summary
 */
export interface ImportSummary {
  operation: string;
  duration: number;
  sourceFormat: string;
  targetFormat: string;
  recordsProcessed: number;
  successRate: number;
  performanceMetrics: Record<string, number>;
}