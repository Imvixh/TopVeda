"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { PlaySquare } from "lucide-react";

export default function LectureVideoPlayerPage() {
  return (
    <StudentPortalPageWrapper
      title="Lecture Classroom"
      categoryBadge="Video Lecture"
      description="The video player, attached study notes, formula cheatsheets, and Q&A discussion board for this lecture are being prepared."
      icon={PlaySquare}
    />
  );
}
