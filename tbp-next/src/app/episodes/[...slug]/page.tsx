import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getEpisodeBySlug,
  getAllEpisodeSlugs,
  getChannels,
  getPageContent,
  formatDate,
  formatDuration,
} from "@/lib/content";
import { VideoPlayer } from "@/components/episode/VideoPlayer";
import { AudioPlayer } from "@/components/episode/AudioPlayer";
import { GuestList } from "@/components/episode/GuestList";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { EpisodeArchive } from "@/components/archive/EpisodeArchive";
import { buildEpisodeIndex } from "@/lib/episode-index";

export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getAllEpisodeSlugs();
  // /episodes/<channel> lists one show, as the previous site did.
  const channels = getChannels().map((channel) => [channel]);
  return [...slugs, ...channels].map((slug) => ({ slug }));
}

/** A show's own page: /episodes/hio, /episodes/tbp, … */
async function getChannelPage(slug: string[]) {
  if (slug.length !== 1 || !getChannels().includes(slug[0])) return null;
  const channel = slug[0];
  const index = await getPageContent(`episodes/${channel}/index.md`);
  return {
    channel,
    title: (index?.frontmatter.title as string) || channel.replace(/-/g, " "),
    intro: index?.content,
    episodes: buildEpisodeIndex().filter((episode) => episode.channel === channel),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) {
    const channelPage = await getChannelPage(slug);
    return { title: channelPage ? channelPage.title : "Episode Not Found" };
  }

  return {
    title: episode.frontmatter.title,
    description: episode.frontmatter.description,
    openGraph: {
      title: episode.frontmatter.title,
      description: episode.frontmatter.description,
      images:
        episode.frontmatter.socialImage || episode.frontmatter.thumbnail
          ? [
              {
                url:
                  episode.frontmatter.socialImage ||
                  episode.frontmatter.thumbnail,
              },
            ]
          : undefined,
    },
  };
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);

  if (!episode) {
    const channelPage = await getChannelPage(slug);
    if (!channelPage) notFound();

    return (
      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
          <Link href="/" className="hover:text-accent transition-colors">Home</Link>
          <span>/</span>
          <Link href="/episodes" className="hover:text-accent transition-colors">Episodes</Link>
        </nav>
        <h1 className="font-display text-4xl font-extrabold capitalize sm:text-5xl">
          {channelPage.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {channelPage.episodes.length} episodes
        </p>
        {channelPage.intro && (
          <div className="mt-8">
            <MarkdownContent html={channelPage.intro} />
          </div>
        )}
        <div className="mt-10">
          <EpisodeArchive episodes={channelPage.episodes} channels={[]} />
        </div>
      </div>
    );
  }

  const { frontmatter: fm, content } = episode;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-accent transition-colors">Home</Link>
        <span>/</span>
        <Link href="/episodes" className="hover:text-accent transition-colors">Episodes</Link>
      </nav>

      {/* Header */}
      <header className="mb-10">
        {fm.episodeNumber && (
          <p className="mb-3 text-xs font-semibold text-accent uppercase tracking-wider">
            Episode {fm.episodeNumber}
          </p>
        )}
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          {fm.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
          <time dateTime={fm.date}>{formatDate(fm.date)}</time>
          <span>&middot;</span>
          <span>{formatDuration(fm.duration)}</span>
          {fm.author && (
            <>
              <span>&middot;</span>
              <span>{Array.isArray(fm.author) ? fm.author.join(", ") : fm.author}</span>
            </>
          )}
        </div>
        {fm.description && (
          <p className="mt-4 text-base text-muted leading-relaxed">
            {fm.description}
          </p>
        )}
      </header>

      {/* Player */}
      {fm.youtubeId && (
        <div className="mb-10">
          <VideoPlayer youtubeId={fm.youtubeId} title={fm.title} />
        </div>
      )}
      {fm.audioUrl && (
        <div className="mb-10">
          <AudioPlayer audioUrl={fm.audioUrl} title={fm.title} />
        </div>
      )}

      {/* Guests */}
      {fm.guests && fm.guests.length > 0 && (
        <div className="mb-10">
          <GuestList guests={fm.guests} />
        </div>
      )}

      {/* Content */}
      <MarkdownContent html={content} />

      {/* Back */}
      <div className="mt-14 border-t border-border pt-8">
        <Link
          href="/episodes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          All Episodes
        </Link>
      </div>
    </div>
  );
}
