import type { Metadata } from "next";
import { getAllContentSlugs, getPageContent } from "@/lib/content";
import { ContentDetailPage } from "@/components/shared/ContentDetailPage";
import { NewsletterSignup } from "@/components/shared/NewsletterSignup";

export const dynamicParams = false;

export function generateStaticParams() {
  const slugs = getAllContentSlugs("news");
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageContent(`news/${decodeURIComponent(slug)}.md`);
  return {
    title: (page?.frontmatter.title as string) || slug,
  };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <ContentDetailPage
      section="news"
      sectionLabel="News"
      slug={slug}
      footer={<NewsletterSignup />}
    />
  );
}
