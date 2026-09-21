import * as React from "react";
import { Video } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function LecturesCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Lectures & Video Library"
      section="CONTENT"
      description="Manage recorded lecture content, educator associations, video playback URLs, duration timestamps, private thumbnails, and free preview access."
      icon={Video}
      targetTable="cms_lectures"
      capabilities={[
        "Chapter and batch relational linking with syllabus sequencing",
        "Video duration formatting (seconds, human-readable strings)",
        "Private storage signed thumbnail generation (`lecture-thumbnails` bucket)",
        "Cloudflare Stream integration readiness (stream_id and playback_url fields)",
        "Home featured carousel toggle (Latest Lectures section)",
        "Free preview toggle for unauthenticated/un-enrolled discovery",
      ]}
    />
  );
}
