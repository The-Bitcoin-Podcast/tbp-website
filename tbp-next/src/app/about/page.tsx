import type { Metadata } from "next";
import { getPageContent } from "@/lib/content";
import { MarkdownContent } from "@/components/shared/MarkdownContent";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about The Bitcoin Podcast and the team behind it",
};

export default async function AboutPage() {
  const page = await getPageContent("about.md");
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl text-center mb-10">
        About
      </h1>
      <MarkdownContent html={page.content} />
    </div>
  );
}
