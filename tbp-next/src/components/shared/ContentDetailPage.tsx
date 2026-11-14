import Link from "next/link";
import { getPageContent } from "@/lib/content";
import { MarkdownContent } from "./MarkdownContent";
import { HtmlDocumentFrame } from "./HtmlDocumentFrame";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

interface ContentDetailPageProps {
  section: string;
  sectionLabel: string;
  slug: string;
  /** Rendered after the content, before the back link. */
  footer?: ReactNode;
}

export async function ContentDetailPage({
  section,
  sectionLabel,
  slug,
  footer,
}: ContentDetailPageProps) {
  const decoded = decodeURIComponent(slug);
  const page = await getPageContent(`${section}/${decoded}.md`);

  if (!page) notFound();

  const title =
    (page.frontmatter.title as string) || decoded.replace(/-/g, " ");
  const date = page.frontmatter.date as string | undefined;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-accent transition-colors">Home</Link>
        <span>/</span>
        <Link href={`/${section}`} className="hover:text-accent transition-colors">
          {sectionLabel}
        </Link>
      </nav>

      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
        {title}
      </h1>
      {date && (
        <p className="mt-2 text-sm text-muted mb-10">
          {new Date(date).toLocaleDateString("en-US", {
    timeZone: "UTC",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      )}
      {!date && <div className="mb-10" />}

      {page.isHtmlDocument ? (
        <HtmlDocumentFrame html={page.content} title={title} />
      ) : (
        <MarkdownContent html={page.content} />
      )}

      {footer && <div className="mt-14">{footer}</div>}

      <div className="mt-14 border-t border-border pt-8">
        <Link
          href={`/${section}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          {sectionLabel}
        </Link>
      </div>
    </div>
  );
}
