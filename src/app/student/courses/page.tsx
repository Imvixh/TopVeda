"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { Compass } from "lucide-react";

export default function CoursesPage() {
  return (
    <StudentPortalPageWrapper
      title="Explore Courses"
      categoryBadge="Course Catalog"
      description="No courses available yet. Courses across Class 10, Class 12, CBSE, Bihar Board, JEE, and NEET will appear here when published by TopVeda."
      icon={Compass}
    />
  );
}
