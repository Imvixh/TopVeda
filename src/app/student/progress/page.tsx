"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { TrendingUp } from "lucide-react";

export default function ProgressPage() {
  return (
    <StudentPortalPageWrapper
      title="Academic Progress"
      categoryBadge="Performance Analytics"
      description="Detailed chapter completion rates, test scores, attendance records, and accuracy insights will appear here as you complete lessons."
      icon={TrendingUp}
    />
  );
}
