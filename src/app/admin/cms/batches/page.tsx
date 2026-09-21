import * as React from "react";
import { Layers } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function BatchesCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Batches & Cohorts"
      section="CONTENT"
      description="Manage featured cohorts, ongoing batch offerings, assigned lead educators, enrollment badges, and promotional card themes."
      icon={Layers}
      targetTable="cms_batches"
      capabilities={[
        "Featured batches (Section 1) and ongoing batches (Section 2) management",
        "Lead educator assignment with avatar URL and educator profile linkage",
        "Badge styling with variants (orange, pink, green, purple)",
        "Gradient background and border color token customization",
        "Enrollment CTA text and dynamic routing links",
        "Batch lifecycle management (Draft, Submissions Review, Published)",
      ]}
    />
  );
}
