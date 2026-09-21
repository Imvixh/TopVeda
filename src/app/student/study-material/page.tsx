"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { FileText } from "lucide-react";

export default function StudyMaterialPage() {
  return (
    <StudentPortalPageWrapper
      title="Study Material"
      categoryBadge="Notes & Revision"
      description="Handwritten notes, NCERT solutions, chapter formula sheets, and past year question papers will be listed here for download."
      icon={FileText}
    />
  );
}
