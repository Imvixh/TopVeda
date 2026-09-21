"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <StudentPortalPageWrapper
      title="Notifications"
      categoryBadge="Inbox"
      description="You have no unread notifications. Important class schedule updates, test announcements, and reminders will appear here."
      icon={Bell}
    />
  );
}
