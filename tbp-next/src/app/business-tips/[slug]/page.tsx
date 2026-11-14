import type { Metadata } from "next";
import { getAllContentSlugs, getPageContent } from "@/lib/content";
import { ContentDetailPage } from "@/components/shared/ContentDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getAllContentSlugs("business-tips");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageContent(
    `business-tips/${decodeURIComponent(slug)}.md`
  );
  return {
    title: (page?.frontmatter.title as string) || slug,
  };
}

export default async function BusinessTipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ContentDetailPage
      section="business-tips"
      sectionLabel="Business Tips"
      slug={slug}
    />
  );
}
