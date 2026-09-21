import * as React from "react";
import { Megaphone } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function HubAnnouncementsCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Hub Announcements & What's Happening"
      section="ENGAGEMENT"
      description="Publish important student updates, exam schedule alerts, new study material releases, and platform study tips."
      icon={Megaphone}
      targetTable="cms_hub_items"
      capabilities={[
        "Hub categories: announcements, material alerts, live notices, study tips",
        "Badge text and color variant customization (orange, blue, emerald, purple)",
        "Headline title, teaser description, and CTA redirect link",
        "Lucide icon selection (megaphone, target, sparkles, book)",
        "Display ordering and active publishing controls",
        "Student Home Section 6 dynamic aggregation integration",
      ]}
    />
  );
}
