import type { Metadata } from "next";
import { getAllContentSlugs, getPageContent } from "@/lib/content";
import { ContentDetailPage } from "@/components/shared/ContentDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getAllContentSlugs("reports");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageContent(`reports/${decodeURIComponent(slug)}.md`);
  return {
    title: (page?.frontmatter.title as string) || slug,
  };
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ContentDetailPage section="reports" sectionLabel="Reports" slug={slug} />
  );
}
