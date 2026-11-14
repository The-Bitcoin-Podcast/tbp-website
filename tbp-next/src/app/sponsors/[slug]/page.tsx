import type { Metadata } from "next";
import {
  getAllContentSlugs,
  getPageContent,
  resolveContentSlug,
  toUrlSlug,
} from "@/lib/content";
import { ContentDetailPage } from "@/components/shared/ContentDetailPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllContentSlugs("sponsors").map((slug) => ({ slug: toUrlSlug(slug) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const fileSlug = resolveContentSlug("sponsors", decodeURIComponent(slug));
  const page = await getPageContent(`sponsors/${fileSlug}.md`);
  return { title: (page?.frontmatter.title as string) || fileSlug };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ContentDetailPage
      section="sponsors"
      sectionLabel="Sponsors"
      slug={resolveContentSlug("sponsors", decodeURIComponent(slug))}
    />
  );
}
