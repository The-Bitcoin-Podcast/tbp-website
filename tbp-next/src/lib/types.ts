export interface EpisodeFrontmatter {
  title: string;
  date: string;
  episodeNumber: number;
  duration: number | string;
  audioUrl?: string;
  youtubeId?: string;
  description?: string;
  thumbnail: string;
  guests?: Guest[];
  tags?: string[];
  draft?: boolean;
  rssGuid?: string;
  syncedAt?: string;
  status?: string;
  hasPlaceholders?: boolean;
  author?: string;
  socialImage?: string;
  explicit?: boolean;
}

export interface Guest {
  name: string;
  twitter?: string;
  linkedin?: string;
}

export interface LandingPageFrontmatter {
  title: string;
  tagline: string;
  discordUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  rssUrl: string;
  aboutUrl: string;
  sponsorsUrl: string;
  contactUrl: string;
  guestsUrl: string;
  episodesArchiveUrl: string;
  reportsUrl: string;
  newsUrl: string;
  businessTipsUrl: string;
}

export interface EpisodeCard {
  title: string;
  date: string;
  duration: number | string;
  slug: string;
  description?: string;
  thumbnail: string;
  audioUrl?: string;
  youtubeId?: string;
  guestNames?: string;
  channel?: string;
}

export interface SocialLink {
  platform: "discord" | "twitter" | "youtube" | "rss";
  url: string;
  ariaLabel: string;
}

export interface NavLink {
  label: string;
  url: string;
}

export interface PersonFrontmatter {
  name?: string;
  title?: string;
  twitter?: string;
  linkedin?: string;
  bio?: string;
  [key: string]: unknown;
}

export interface ContentPage {
  frontmatter: Record<string, unknown>;
  content: string;
  slug: string;
  /** True when `content` is a complete HTML document rather than rendered markdown. */
  isHtmlDocument?: boolean;
}
