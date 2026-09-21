"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { Video } from "lucide-react";

export default function LiveClassesPage() {
  return (
    <StudentPortalPageWrapper
      title="Live Classes"
      categoryBadge="Live Schedule"
      description="No live interactive sessions are currently active. Scheduled live classes and teacher broadcasts will appear here."
      icon={Video}
    />
  );
}
