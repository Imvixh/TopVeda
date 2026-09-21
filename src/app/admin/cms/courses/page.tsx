import * as React from "react";
import { GraduationCap } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function CoursesCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Courses Master Catalog"
      section="CONTENT"
      description="Create and organize academic curriculum courses linked to educational boards, class levels, and core subject areas."
      icon={GraduationCap}
      targetTable="cms_courses"
      capabilities={[
        "Academic hierarchy mapping (Board + Class Level + Subject FKs)",
        "Course title, category tagging, slug generation, and short descriptions",
        "Visual styling: thumbnail image URLs, theme color tokens, and icon badges",
        "Featured course toggle for Explore Courses showcase carousel",
        "Status lifecycle governance (DRAFT → PUBLISHED → ARCHIVED)",
        "Direct link to chapter syllabus and study material collections",
      ]}
    />
  );
}
