"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { ClipboardCheck } from "lucide-react";

export default function TestsPage() {
  return (
    <StudentPortalPageWrapper
      title="Tests & Practice"
      categoryBadge="Mock Tests & Drills"
      description="Chapter-wise question banks, weekly test series, and full-length board mock exams will be available here."
      icon={ClipboardCheck}
    />
  );
}
