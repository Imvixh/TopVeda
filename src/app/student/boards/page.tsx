"use client";

import { StudentPortalPageWrapper } from "@/components/student/student-empty-state";
import { Award } from "lucide-react";

export default function BoardsPage() {
  return (
    <StudentPortalPageWrapper
      title="Educational Boards"
      categoryBadge="Boards & State Curriculum"
      description="CBSE, Bihar Board (BSEB), and other state syllabus resources, sample blueprint papers, and exam dates will be published here."
      icon={Award}
    />
  );
}
