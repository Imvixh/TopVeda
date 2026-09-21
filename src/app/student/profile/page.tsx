"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { User } from "lucide-react";

export default function StudentProfilePage() {
  return (
    <StudentPortalPageWrapper
      title="Student Profile"
      categoryBadge="Account Profile"
      description="View and update your academic board preferences, standard/grade, contact details, and account credentials."
      icon={User}
    />
  );
}
