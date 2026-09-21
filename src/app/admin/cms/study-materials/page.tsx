import * as React from "react";
import { FileText } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function StudyMaterialsCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Study Materials & Notes"
      section="CONTENT"
      description="Upload and govern downloadable PDF notes, formula cheatsheets, NCERT step-by-step solutions, and previous year question (PYQ) papers."
      icon={FileText}
      targetTable="cms_study_materials"
      capabilities={[
        "Material categories (Formula Sheets, Revision Notes, NCERT, PYQ)",
        "Secure private storage upload to `study-materials` bucket",
        "Deterministic scoped storage paths: `{authorId}/{materialId}/{filename}`",
        "Page counts, byte size formatting, and download counter metrics",
        "Relational linking to courses and specific syllabus chapters",
        "Time-bound signed download URL generation for eligible students",
      ]}
    />
  );
}
