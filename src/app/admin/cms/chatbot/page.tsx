import * as React from "react";
import { Bot } from "lucide-react";
import { CmsPlaceholderPage } from "@/components/admin/cms/cms-placeholder-page";

export default function ChatbotOverviewCmsPage() {
  return (
    <CmsPlaceholderPage
      title="AI Chatbot Settings & Studio"
      section="AI CHATBOT"
      description="Configure TopVeda AI assistant identity, academic scope filters, rate limits, model parameters, and emergency maintenance mode."
      icon={Bot}
      targetTable="cms_chatbot_settings"
      capabilities={[
        "Bot identity: display name, welcome message, greeting, and placeholder text",
        "System prompt instructions (Super Admin protected, server-only access)",
        "Academic scope filters (permitted boards, classes, and subjects)",
        "Portal visibility controls (student home, batch rooms, doubt section)",
        "Rate limiting safeguards (queries per minute, daily query caps per student)",
        "Maintenance mode toggle with customizable student broadcast message",
      ]}
    />
  );
}
