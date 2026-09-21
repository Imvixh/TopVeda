import * as React from "react";
import { Database } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function ChatbotKnowledgeCmsPage() {
  return (
    <CmsPlaceholderPage
      title="AI Chatbot Knowledge Sources"
      section="AI CHATBOT"
      description="Connect verified curriculum sources, course textbooks, study notes, and syllabus specs to the AI knowledge indexing pipeline."
      icon={Database}
      targetTable="cms_chatbot_knowledge_sources"
      capabilities={[
        "Polymorphic source types (COURSE, CHAPTER, STUDY_MATERIAL, FAQ, CURRICULUM_SPEC)",
        "Sync status tracking (PENDING, SYNCED, FAILED, EXCLUDED)",
        "Last synchronized timestamp and diagnostic error logging",
        "Active toggle to explicitly include or exclude knowledge from bot reasoning",
        "Strict Super Admin clearance (zero unauthorized student access)",
        "Readiness for Phase 6 embeddings and vector synchronization pipeline",
      ]}
    />
  );
}
