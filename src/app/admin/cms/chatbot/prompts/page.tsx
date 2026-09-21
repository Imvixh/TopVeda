import * as React from "react";
import { Terminal } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function ChatbotPromptsCmsPage() {
  return (
    <CmsPlaceholderPage
      title="Chatbot Prompts & Starter Bank"
      section="AI CHATBOT"
      description="Manage pre-crafted query starter chips, formula query templates, and academic doubt prompt starters shown in the student chat interface."
      icon={Terminal}
      targetTable="cms_chatbot_prompts"
      capabilities={[
        "Prompt starter text and academic category tagging",
        "Lucide icon association (calculator, atom, book, help)",
        "Display ordering and active visibility toggle",
        "Student portal chat widget dynamic sync",
        "Super Admin CRUD and publishing controls",
      ]}
    />
  );
}
