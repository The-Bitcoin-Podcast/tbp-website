import { getAllEpisodeFrontmatter } from "./content";

export interface EpisodeIndexEntry {
  title: string;
  date: string;
  duration: number | string;
  slug: string;
  description?: string;
  thumbnail: string;
  channel: string;
  guestNames?: string;
  tags?: string[];
}

export function buildEpisodeIndex(): EpisodeIndexEntry[] {
  const all = getAllEpisodeFrontmatter();

  return all
    .filter((e) => e.frontmatter.thumbnail && e.frontmatter.duration !== undefined)
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
    )
    .map((e) => {
      const fm = e.frontmatter;
      const guests = fm.guests || [];
      const guestNames = guests.map((g) => g.name).join(", ");

      return {
        title: fm.title,
        date: fm.date,
        duration: fm.duration,
        slug: `/episodes/${e.slug}`,
        description: fm.description,
        thumbnail: fm.thumbnail,
        channel: e.channel,
        guestNames: guestNames || undefined,
        tags: fm.tags,
      };
    });
}
