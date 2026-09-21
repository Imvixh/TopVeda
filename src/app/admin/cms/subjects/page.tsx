import * as React from "react";
import { BookOpen } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function SubjectsCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Subjects Master Registry"
      section="ACADEMIC"
      description="Manage the core academic subjects catalog (Mathematics, Physics, Chemistry, Biology, English, Social Science)."
      icon={BookOpen}
      targetTable="cms_subjects"
      capabilities={[
        "Subject naming, code identifiers, and URL slug generation",
        "Visual styling: Lucide icon name, color tokens, and badge background classes",
        "Display order sequencing for catalog discovery grids",
        "Direct foreign-key associations to courses and lectures",
        "Publishing governance and visibility control",
      ]}
    />
  );
}
