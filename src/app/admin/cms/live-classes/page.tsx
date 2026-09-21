import * as React from "react";
import { Radio } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function LiveClassesCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Live Interactive Classes"
      section="CONTENT"
      description="Schedule live classroom sessions, assign educators, configure broadcast rooms, and manage real-time active status on the student portal."
      icon={Radio}
      targetTable="cms_live_classes"
      capabilities={[
        "Scheduled start and end timestamp precision with timezone handling",
        "Educator avatar and topic metadata configuration",
        "Live status management (SCHEDULED → LIVE → COMPLETED → CANCELLED)",
        "Stream room join URL or third-party meeting URL integration",
        "Home discovery carousel integration (Live Classes Today section)",
        "Dynamic CTA button behavior ('Join Live' vs 'Remind Me')",
      ]}
    />
  );
}
