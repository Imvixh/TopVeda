import * as React from "react";
import { HelpCircle } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function ChatbotFaqsCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Chatbot Frequently Asked Questions"
      section="AI CHATBOT"
      description="Manage verified question and answer pairs for instant retrieval by the TopVeda AI assistant and student help center."
      icon={HelpCircle}
      targetTable="cms_chatbot_faqs"
      capabilities={[
        "Academic and platform question-and-answer pairs",
        "Semantic search tags array for rapid intent matching",
        "Category grouping (Enrollment, Technical, Physics, Mathematics)",
        "Display order and live publishing controls",
        "Safe read access granted to student chat sessions",
      ]}
    />
  );
}
