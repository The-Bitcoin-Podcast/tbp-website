import Link from "next/link";
import { getPageContent, getAllContentSlugs } from "@/lib/content";
import { MarkdownContent } from "./MarkdownContent";
import type { ReactNode } from "react";

interface ContentListPageProps {
  section: string;
  title: string;
  description: string;
  /** Rendered between the page header and the list. */
  afterHeader?: ReactNode;
}

export async function ContentListPage({
  section,
  title,
  description,
  afterHeader,
}: ContentListPageProps) {
  const indexPage = await getPageContent(`${section}/index.md`);
  const slugs = getAllContentSlugs(section);

  const items = await Promise.all(
    slugs.map(async (slug) => {
      const page = await getPageContent(`${section}/${slug}.md`);
      if (!page) return null;
      const itemTitle =
        (page.frontmatter.title as string) || slug.replace(/-/g, " ");
      const date = page.frontmatter.date as string | undefined;
      return { slug, title: itemTitle, date };
    })
  );

  const validItems = items
    .filter(Boolean)
    .sort((a, b) => {
      if (a!.date && b!.date)
        return new Date(b!.date).getTime() - new Date(a!.date).getTime();
      return a!.title.localeCompare(b!.title);
    });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted">{description}</p>
      </div>

      {afterHeader && <div className="mb-10">{afterHeader}</div>}

      {indexPage && (
        <div className="mb-10">
          <MarkdownContent html={indexPage.content} />
        </div>
      )}

      {validItems.length > 0 ? (
        <div className="space-y-3">
          {validItems.map((item) => (
            <Link
              key={item!.slug}
              href={`/${section}/${item!.slug}`}
              className="group block card p-5"
            >
              <h3 className="text-base font-semibold group-hover:text-accent transition-colors">
                {item!.title}
              </h3>
              {item!.date && (
                <p className="mt-1 text-xs text-muted">
                  {new Date(item!.date).toLocaleDateString("en-US", {
    timeZone: "UTC",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted py-16">
          No content available yet. Check back soon!
        </p>
      )}
    </div>
  );
}
