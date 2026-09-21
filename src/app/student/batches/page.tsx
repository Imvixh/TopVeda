"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { BookOpen } from "lucide-react";

export default function BatchesPage() {
  return (
    <StudentPortalPageWrapper
      title="Academic Batches"
      categoryBadge="Batches Catalog"
      description="No new batches are currently listed for enrollment. Newly announced batches will appear here as soon as they are published by TopVeda."
      icon={BookOpen}
    />
  );
}
