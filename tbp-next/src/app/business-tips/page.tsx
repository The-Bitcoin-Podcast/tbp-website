import type { Metadata } from "next";
import { ContentListPage } from "@/components/shared/ContentListPage";
import { SponsorSlot } from "@/components/sponsors/SponsorSlot";

export const metadata: Metadata = {
  title: "Business Tips",
  description: "Business tips from The Bitcoin Podcast Network",
};

export default function BusinessTipsPage() {
  return (
    <ContentListPage
      section="business-tips"
      title="Business Tips"
      description="Practical business insights from the Bitcoin ecosystem"
      sponsor={<SponsorSlot slot="section" target="business-tips" className="mb-10" />}
    />
  );
}
