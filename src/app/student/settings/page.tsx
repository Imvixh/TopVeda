"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { Settings } from "lucide-react";

export default function StudentSettingsPage() {
  return (
    <StudentPortalPageWrapper
      title="Account Settings"
      categoryBadge="Preferences"
      description="Manage your notification preferences, theme appearance, language options, and password security."
      icon={Settings}
    />
  );
}
