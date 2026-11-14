import type { Metadata } from "next";
import Link from "next/link";
import { getAllPeopleSlugs, getPageContent, toUrlSlug } from "@/lib/content";

export const metadata: Metadata = {
  title: "Guests & Hosts",
  description: "People who have appeared on The Bitcoin Podcast Network",
};

export default async function PeoplePage() {
  const slugs = getAllPeopleSlugs();

  const people = await Promise.all(
    slugs.map(async (slug) => {
      const page = await getPageContent(`people/${slug}.md`);
      if (!page) return null;
      const name = (page.frontmatter.name as string) || (page.frontmatter.title as string) || slug;
      return { slug, name };
    })
  );

  const validPeople = people
    .filter(Boolean)
    .sort((a, b) => a!.name.localeCompare(b!.name));

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
          Guests & Hosts
        </h1>
        <p className="mt-2 text-sm text-muted">
          {validPeople.length} people from across the Bitcoin Podcast Network
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {validPeople.map((person) => (
          <Link
            key={person!.slug}
            href={`/people/${encodeURIComponent(toUrlSlug(person!.slug))}`}
            className="group flex items-center gap-3 rounded-md border border-border p-3 transition-all hover:border-accent/20 hover:bg-surface"
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent text-sm font-bold">
              {person!.name.charAt(0)}
            </span>
            <span className="text-sm text-foreground truncate group-hover:text-accent transition-colors">
              {person!.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
