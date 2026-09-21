import * as React from "react";
import { ListOrdered } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function ChaptersCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Syllabus Chapters & Units"
      section="ACADEMIC"
      description="Organize course syllabus chapters, unit numbers, sequence ordering, and descriptions mapped to specific courses."
      icon={ListOrdered}
      targetTable="cms_chapters"
      capabilities={[
        "Course-bound chapter indexing and syllabus numbering (e.g. Chapter 1, 2)",
        "Chapter titles, detailed summaries, and learning objectives",
        "Parent batch assignment for batch-specific customized syllabi",
        "Direct relation to lecture video assets and chapter study notes",
        "Sequential reordering with display_order and visibility controls",
      ]}
    />
  );
}
