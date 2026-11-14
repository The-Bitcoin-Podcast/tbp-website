import type { Metadata } from "next";
import { getPageContent, getAllContentSlugs } from "@/lib/content";
import { MarkdownContent } from "@/components/shared/MarkdownContent";

export const metadata: Metadata = {
  title: "Sponsors",
  description: "Sponsors of The Bitcoin Podcast Network",
};

export default async function SponsorsPage() {
  const indexPage = await getPageContent("sponsors/index.md");
  const slugs = getAllContentSlugs("sponsors");

  const sponsors = await Promise.all(
    slugs.map(async (slug) => {
      const page = await getPageContent(`sponsors/${slug}.md`);
      return page ? { slug, title: (page.frontmatter.title as string) || slug, content: page.content } : null;
    })
  );

  const validSponsors = sponsors.filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl text-center mb-10">
        Sponsors
      </h1>
      {indexPage && (
        <div className="mb-10">
          <MarkdownContent html={indexPage.content} />
        </div>
      )}
      {validSponsors.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {validSponsors.map((sponsor) => (
            <div key={sponsor!.slug} className="card p-5">
              <h3 className="text-base font-semibold mb-3">{sponsor!.title}</h3>
              <MarkdownContent html={sponsor!.content} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
