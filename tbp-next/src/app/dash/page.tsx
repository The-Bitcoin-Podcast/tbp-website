import type { Metadata } from "next";
import { ContentListPage } from "@/components/shared/ContentListPage";

export const metadata: Metadata = {
  title: "Dashboards",
  description: "Live dashboards from The Bitcoin Podcast Network",
};

export default function DashPage() {
  return (
    <ContentListPage
      section="dash"
      title="Dashboards"
      description="Live dashboards from The Bitcoin Podcast Network"
    />
  );
}
