import { getAllEpisodeFrontmatter } from "@/lib/content";

// Built once into out/index.xml, the feed URL the previous site used.
export const dynamic = "force-static";

const SITE_URL = "https://thebitcoinpodcast.com";
const ITEM_COUNT = 50;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function GET() {
  const episodes = getAllEpisodeFrontmatter()
    .filter((episode) => !Number.isNaN(new Date(episode.frontmatter.date).getTime()))
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime(),
    )
    .slice(0, ITEM_COUNT);

  const items = episodes
    .map(({ frontmatter, slug }) => {
      const url = `${SITE_URL}/episodes/${slug.split("/").map(encodeURIComponent).join("/")}`;
      return `    <item>
      <title>${escapeXml(String(frontmatter.title))}</title>
      <link>${url}</link>
      <guid>${url}</guid>
      <description>${escapeXml(String(frontmatter.description ?? ""))}</description>
      <pubDate>${new Date(frontmatter.date).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>The Bitcoin Podcast Network</title>
    <link>${SITE_URL}</link>
    <description>Latest episodes from The Bitcoin Podcast Network</description>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
