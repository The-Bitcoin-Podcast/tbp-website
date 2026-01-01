/**
 * RSS Sync Service Contract - TypeScript Interface Definitions
 * Defines the contract for RSS episode synchronization functionality
 */

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