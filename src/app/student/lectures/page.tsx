"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { PlaySquare } from "lucide-react";

export default function LecturesPage() {
  return (
    <StudentPortalPageWrapper
      title="Latest Lectures"
      categoryBadge="Recorded Lectures"
      description="Recorded concept lectures, problem-solving drills, and revision videos will be available here."
      icon={PlaySquare}
    />
  );
}
