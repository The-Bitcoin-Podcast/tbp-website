import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getPageContent,
  getAllPeopleSlugs,
  resolveContentSlug,
  toUrlSlug,
} from "@/lib/content";
import { MarkdownContent } from "@/components/shared/MarkdownContent";

export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getAllPeopleSlugs();
  return slugs.map((slug) => ({ slug: toUrlSlug(slug) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const decoded = resolveContentSlug("people", decodeURIComponent(slug));
  const page = await getPageContent(`people/${decoded}.md`);
  if (!page) return { title: "Person Not Found" };

  const name = (page.frontmatter.name as string) || (page.frontmatter.title as string) || decoded;
  return {
    title: name,
    description: `Profile of ${name} from The Bitcoin Podcast Network`,
  };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const decoded = resolveContentSlug("people", decodeURIComponent(slug));
  const page = await getPageContent(`people/${decoded}.md`);

  if (!page) notFound();

  const name = (page.frontmatter.name as string) || (page.frontmatter.title as string) || decoded;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-accent transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/people" className="hover:text-accent transition-colors">
          People
        </Link>
        <span>/</span>
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-accent text-2xl font-bold">
          {name.charAt(0)}
        </div>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          {name}
        </h1>
      </div>

      <MarkdownContent html={page.content} />

      <div className="mt-12 border-t border-border/50 pt-8">
        <Link
          href="/people"
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent transition-colors hover:text-accent-hover"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to All People
        </Link>
      </div>
    </div>
  );
}
