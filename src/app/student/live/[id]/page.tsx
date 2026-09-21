"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { Video } from "lucide-react";

export default function LiveRoomPage() {
  return (
    <StudentPortalPageWrapper
      title="Live Classroom"
      categoryBadge="Interactive Session"
      description="The live broadcast room, whiteboard stream, and live chat will open when the educator initiates the session."
      icon={Video}
    />
  );
}
