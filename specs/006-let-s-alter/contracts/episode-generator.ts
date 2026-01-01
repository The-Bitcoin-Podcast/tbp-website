/**
 * Episode Generator Contract - TypeScript Interface Definitions
 * Defines the contract for RSS episode file generation
 */

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