import * as React from "react";
import { Landmark } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function BoardsCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Educational Boards Taxonomy"
      section="ACADEMIC"
      description="Manage the master registry of national and state education boards (CBSE, ICSE, UP Board, Bihar Board, Maharashtra State Board)."
      icon={Landmark}
      targetTable="cms_boards"
      capabilities={[
        "Board full name, abbreviation code (e.g. CBSE), and URL slug",
        "Icon glyph and branding configuration",
        "Display ordering and active visibility toggle",
        "Cascading relationship to courses and batch curriculums",
        "Audit trail tracking (created_by, updated_at)",
      ]}
    />
  );
}
