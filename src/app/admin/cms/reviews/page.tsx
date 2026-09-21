import * as React from "react";
import { FileCheck2 } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function PendingReviewsCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Submissions & Review Queue"
      section="REVIEW"
      description="Super Admin review vault for inspecting educator-submitted lecture videos, proposed batch offerings, and study notes."
      icon={FileCheck2}
      targetTable="cms_pending_reviews_view"
      capabilities={[
        "Consolidated real-time view across lectures, study materials, and batches",
        "Submission details: author name, submitted timestamp, and entity payload",
        "Media inspection preview (lecture video preview & PDF document viewer)",
        "One-click Super Admin APPROVE action to advance to publish queue",
        "REJECT action requiring detailed feedback notes sent back to educator",
        "Full audit logging of reviewer UID and review timestamp",
      ]}
    />
  );
}
