"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { BookOpen } from "lucide-react";

export default function BatchDetailPage() {
  return (
    <StudentPortalPageWrapper
      title="Batch Details"
      categoryBadge="Batch Details"
      description="Detailed syllabus breakdown, faculty allocations, and live lecture schedules for this batch will be available upon publication."
      icon={BookOpen}
    />
  );
}
