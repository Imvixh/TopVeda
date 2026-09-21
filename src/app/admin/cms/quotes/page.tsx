import * as React from "react";
import { Sparkles } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function DailyQuotesCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Daily Motivation & Quotes"
      section="ENGAGEMENT"
      description="Curate inspirational thoughts and motivational quotes displayed on the student portal navigation sidebar."
      icon={Sparkles}
      targetTable="cms_daily_quotes"
      capabilities={[
        "Quote text and author attribution (e.g. TopVeda, Swami Vivekananda, Einstein)",
        "Daily scheduled date matching (scheduled_for_date)",
        "Active quote toggle for immediate live student portal display",
        "Historical quote library management and archiving",
        "Graceful fallback to default motivational quote when inactive",
      ]}
    />
  );
}
