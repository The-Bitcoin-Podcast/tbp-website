import type { Metadata } from "next";
import { ContentListPage } from "@/components/shared/ContentListPage";
import { NewsletterSignup } from "@/components/shared/NewsletterSignup";
import { SponsorSlot } from "@/components/sponsors/SponsorSlot";

export const metadata: Metadata = {
  title: "News",
  description: "Latest news from The Bitcoin Podcast Network",
};

export default function NewsPage() {
  return (
    <ContentListPage
      section="news"
      title="News"
      description="Latest updates from the Bitcoin Podcast Network"
      sponsor={<SponsorSlot slot="newsletter" className="mb-10" />}
      afterHeader={<NewsletterSignup />}
    />
  );
}
