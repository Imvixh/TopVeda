"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { GraduationCap } from "lucide-react";

export default function MyLearningPage() {
  return (
    <StudentPortalPageWrapper
      title="My Learning"
      categoryBadge="Enrolled Content"
      description="You have not enrolled in any courses yet. Explore available batches on TopVeda to start your learning journey."
      icon={GraduationCap}
      actionText="Explore TopVeda Batches"
      actionHref="/student"
    />
  );
}
