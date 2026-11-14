import type { Metadata } from "next";
import { ContentListPage } from "@/components/shared/ContentListPage";

export const metadata: Metadata = {
  title: "Reports",
  description: "Analysis and reports from The Bitcoin Podcast Network",
};

export default function ReportsPage() {
  return (
    <ContentListPage
      section="reports"
      title="Reports & Analysis"
      description="Deep dives and analysis from the Bitcoin Podcast Network"
    />
  );
}
