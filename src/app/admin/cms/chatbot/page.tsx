"use client";

import * as React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsChatbotSettings, ChatbotModelProvider } from "@/types/cms.types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Terminal,
  HelpCircle,
  Database,
  RefreshCw,
  Save,
  ShieldCheck,
  Sliders,
  ArrowRight,
  Lock,
} from "lucide-react";

export default function ChatbotOverviewCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [settings, setSettings] = React.useState<CmsChatbotSettings | null>(null);
  const [promptsCount, setPromptsCount] = React.useState<number>(0);
  const [faqsCount, setFaqsCount] = React.useState<number>(0);
  const [knowledgeCount, setKnowledgeCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Form State
  const [formName, setFormName] = React.useState("TopVeda AI");
  const [formGreeting, setFormGreeting] = React.useState("TopVeda AI Assistant");
  const [formWelcomeMessage, setFormWelcomeMessage] = React.useState(
    "Hello! I am TopVeda AI, your personal academic tutor. How can I help you revise today?"
  );
  const [formPlaceholderText, setFormPlaceholderText] = React.useState(
    "Ask any doubt from Mathematics, Science, or Board Exam syllabus..."
  );
  const [formExternalUrl, setFormExternalUrl] = React.useState("");
  const [formIsEnabled, setFormIsEnabled] = React.useState(true);
  const [formMaintenanceMode, setFormMaintenanceMode] = React.useState(false);
  const [formMaintenanceMessage, setFormMaintenanceMessage] = React.useState(
    "TopVeda AI is undergoing scheduled academic knowledge updates. It will be back shortly."
  );
  const [formRateLimit, setFormRateLimit] = React.useState(10);
  const [formMaxDailyQueries, setFormMaxDailyQueries] = React.useState(50);
  const [formModelProvider, setFormModelProvider] = React.useState<ChatbotModelProvider>("cloudflare_workers_ai");
  const [formModelName, setFormModelName] = React.useState("@cf/meta/llama-3.1-8b-instruct");
  const [formTemperature, setFormTemperature] = React.useState(0.2);
  const [formMaxTokens, setFormMaxTokens] = React.useState(1024);
  const [formSystemInstructions, setFormSystemInstructions] = React.useState(
    "You are TopVeda AI, an encouraging and academically rigorous tutor for Indian school students (CBSE/BSEB/ICSE) preparing for board and competitive exams. Answer strictly using approved TopVeda knowledge."
  );

  // Portal Visibility
  const [visStudentHome, setVisStudentHome] = React.useState(true);
  const [visBatchRoom, setVisBatchRoom] = React.useState(true);
  const [visDoubtSection, setVisDoubtSection] = React.useState(true);

  // Feedback Notification
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Load Data
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [settingsData, promptsData, faqsData, knowledgeData] = await Promise.all([
          CmsService.getChatbotAdminSettings(),
          CmsService.getChatbotPrompts(supabase),
          CmsService.getChatbotFaqs(supabase),
          CmsService.getChatbotKnowledgeSources(supabase),
        ]);

        if (!isMounted) return;

        setPromptsCount(promptsData.length);
        setFaqsCount(faqsData.length);
        setKnowledgeCount(knowledgeData.filter((k) => k.is_active).length);

        if (settingsData) {
          setSettings(settingsData);
          setFormName(settingsData.name || "TopVeda AI");
          setFormGreeting(settingsData.greeting || "TopVeda AI Assistant");
          setFormWelcomeMessage(settingsData.welcome_message || "");
          setFormPlaceholderText(settingsData.placeholder_text || "");
          setFormExternalUrl(settingsData.external_url || "");
          setFormIsEnabled(settingsData.is_enabled);
          setFormMaintenanceMode(settingsData.maintenance_mode);
          setFormMaintenanceMessage(settingsData.maintenance_message || "");
          setFormRateLimit(settingsData.rate_limit_per_minute || 10);
          setFormMaxDailyQueries(settingsData.max_daily_queries_per_student || 50);
          setFormModelProvider(settingsData.model_provider || "cloudflare_workers_ai");
          setFormModelName(settingsData.model_name || "@cf/meta/llama-3.1-8b-instruct");
          setFormTemperature(Number(settingsData.temperature) || 0.2);
          setFormMaxTokens(settingsData.max_tokens || 1024);
          setFormSystemInstructions(settingsData.system_instructions || "");

          if (settingsData.portal_visibility) {
            setVisStudentHome(!!settingsData.portal_visibility.student_home);
            setVisBatchRoom(!!settingsData.portal_visibility.batch_room);
            setVisDoubtSection(!!settingsData.portal_visibility.doubt_section);
          }
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load chatbot settings." });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [supabase, refreshTrigger]);

  // Save Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsChatbotSettings> = {
      name: formName.trim(),
      greeting: formGreeting.trim(),
      welcome_message: formWelcomeMessage.trim(),
      placeholder_text: formPlaceholderText.trim(),
      external_url: formExternalUrl.trim() || null,
      is_enabled: formIsEnabled,
      maintenance_mode: formMaintenanceMode,
      maintenance_message: formMaintenanceMessage.trim(),
      rate_limit_per_minute: Number(formRateLimit) || 10,
      max_daily_queries_per_student: Number(formMaxDailyQueries) || 50,
      model_provider: formModelProvider,
      model_name: formModelName.trim(),
      temperature: Number(formTemperature) || 0.2,
      max_tokens: Number(formMaxTokens) || 1024,
      system_instructions: formSystemInstructions.trim(),
      portal_visibility: {
        student_home: visStudentHome,
        batch_room: visBatchRoom,
        doubt_section: visDoubtSection,
      },
      academic_scope: settings?.academic_scope || {
        boards: ["CBSE", "BSEB", "ICSE"],
        classes: ["10", "11", "12"],
        subjects: ["Mathematics", "Science", "Physics", "Chemistry", "Biology"],
      },
    };

    const { success, error } = await CmsService.updateChatbotSettings(payload);

    setIsSaving(false);
    if (!success || error) {
      setFeedback({ type: "error", message: error?.message || "Failed to update chatbot settings." });
    } else {
      setFeedback({
        type: "success",
        message: "AI Chatbot global settings and engine configuration updated successfully.",
      });
      handleManualRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                AI Chatbot Studio & Settings
              </h1>
              <p className="text-xs text-brand-text-muted">
                Configure TopVeda AI assistant identity, academic scope, rate limits, model parameters, and knowledge governance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveSettings}
            disabled={isSaving || isLoading}
            className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white shadow-2xs text-xs font-bold"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : feedback.type === "info"
              ? "bg-sky-50 text-sky-800 border-sky-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Overview Stat Cards & Sub-Module Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <Card className="p-4 bg-brand-surface border border-brand-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-text-muted">Assistant Status</span>
            <div className="h-7 w-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-brand-text-primary">
                {formMaintenanceMode ? "Maintenance" : formIsEnabled ? "Active Online" : "Disabled"}
              </span>
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  formMaintenanceMode
                    ? "bg-amber-500 animate-pulse"
                    : formIsEnabled
                    ? "bg-emerald-500"
                    : "bg-rose-500"
                }`}
              />
            </div>
            <p className="text-[11px] text-brand-text-muted mt-0.5">
              Provider: <span className="font-mono">{formModelProvider}</span>
            </p>
          </div>
        </Card>

        {/* Prompts Link Card */}
        <Link href="/admin/cms/chatbot/prompts" className="block group">
          <Card className="p-4 bg-brand-surface border border-brand-border hover:border-brand-orange-border hover:shadow-xs transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-text-muted">Starter Prompts Bank</span>
              <div className="h-7 w-7 rounded-lg bg-orange-50 text-brand-orange flex items-center justify-center">
                <Terminal className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold text-brand-text-primary">{promptsCount}</span>
                <span className="text-xs font-bold text-brand-orange flex items-center gap-0.5 group-hover:underline">
                  Manage <ArrowRight className="h-3 w-3" />
                </span>
              </div>
              <p className="text-[11px] text-brand-text-muted mt-0.5">Quick query suggestion chips</p>
            </div>
          </Card>
        </Link>

        {/* FAQs Link Card */}
        <Link href="/admin/cms/chatbot/faqs" className="block group">
          <Card className="p-4 bg-brand-surface border border-brand-border hover:border-brand-orange-border hover:shadow-xs transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-text-muted">Platform & Academic FAQs</span>
              <div className="h-7 w-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                <HelpCircle className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold text-brand-text-primary">{faqsCount}</span>
                <span className="text-xs font-bold text-brand-orange flex items-center gap-0.5 group-hover:underline">
                  Manage <ArrowRight className="h-3 w-3" />
                </span>
              </div>
              <p className="text-[11px] text-brand-text-muted mt-0.5">Authoritative Q&A pairs</p>
            </div>
          </Card>
        </Link>

        {/* Knowledge Sources Link Card */}
        <Link href="/admin/cms/chatbot/knowledge" className="block group">
          <Card className="p-4 bg-brand-surface border border-brand-border hover:border-brand-orange-border hover:shadow-xs transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-text-muted">Indexed Knowledge Sources</span>
              <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold text-brand-text-primary">{knowledgeCount}</span>
                <span className="text-xs font-bold text-brand-orange flex items-center gap-0.5 group-hover:underline">
                  Manage <ArrowRight className="h-3 w-3" />
                </span>
              </div>
              <p className="text-[11px] text-brand-text-muted mt-0.5">Active curriculum & notes links</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Global Configuration Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Bot Identity & Communication */}
        <Card className="p-5 sm:p-6 bg-brand-surface border border-brand-border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-brand-border">
            <Bot className="h-5 w-5 text-brand-orange" />
            <h2 className="font-bold text-sm text-brand-text-primary">
              1. Assistant Identity & Student Messaging
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Bot Display Name *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. TopVeda AI"
              disabled={isSaving}
            />

            <Input
              label="Header Greeting *"
              value={formGreeting}
              onChange={(e) => setFormGreeting(e.target.value)}
              placeholder="e.g. TopVeda AI Assistant"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Welcome Message (First message sent to student) *
            </label>
            <textarea
              value={formWelcomeMessage}
              onChange={(e) => setFormWelcomeMessage(e.target.value)}
              rows={2}
              disabled={isSaving}
              className="w-full rounded-xl border border-brand-border bg-brand-surface p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Input Box Placeholder Text *"
              value={formPlaceholderText}
              onChange={(e) => setFormPlaceholderText(e.target.value)}
              placeholder="e.g. Ask any doubt from CBSE syllabus..."
              disabled={isSaving}
            />

            <Input
              label="External Helpdesk / Documentation URL (Optional)"
              value={formExternalUrl}
              onChange={(e) => setFormExternalUrl(e.target.value)}
              placeholder="https://topveda.com/docs"
              disabled={isSaving}
            />
          </div>
        </Card>

        {/* Section 2: Availability & Rate Limiting Controls */}
        <Card className="p-5 sm:p-6 bg-brand-surface border border-brand-border space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-brand-border">
            <Sliders className="h-5 w-5 text-brand-orange" />
            <h2 className="font-bold text-sm text-brand-text-primary">
              2. Availability, Safety Caps & Portal Visibility
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-brand-bg-warm/60 border border-brand-border space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsEnabled}
                  onChange={(e) => setFormIsEnabled(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded text-brand-orange border-brand-border focus:ring-brand-orange"
                />
                <span className="text-xs font-bold text-brand-text-primary">
                  Master Bot Activation (is_enabled)
                </span>
              </label>
              <p className="text-[11px] text-brand-text-muted leading-relaxed pl-6">
                When turned off, the AI chat floating widget will be hidden across all student portals.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formMaintenanceMode}
                  onChange={(e) => setFormMaintenanceMode(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-amber-900">
                  Maintenance Mode Override
                </span>
              </label>
              <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
                Enables temporary maintenance screen with custom broadcast notice.
              </p>
            </div>
          </div>

          {formMaintenanceMode && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-amber-900">
                Maintenance Broadcast Message
              </label>
              <textarea
                value={formMaintenanceMessage}
                onChange={(e) => setFormMaintenanceMessage(e.target.value)}
                rows={2}
                disabled={isSaving}
                className="w-full rounded-xl border border-amber-200 bg-amber-50/30 p-2.5 text-xs text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Rate Limit (Max Queries Per Minute Per Student)"
              type="number"
              value={formRateLimit}
              onChange={(e) => setFormRateLimit(parseInt(e.target.value, 10) || 10)}
              disabled={isSaving}
            />

            <Input
              label="Daily Query Cap (Max Daily Queries Per Student)"
              type="number"
              value={formMaxDailyQueries}
              onChange={(e) => setFormMaxDailyQueries(parseInt(e.target.value, 10) || 50)}
              disabled={isSaving}
            />
          </div>

          {/* Portal Visibility Toggles */}
          <div className="space-y-2 pt-2">
            <span className="block text-xs font-bold text-brand-text-primary">
              Portal Surface Visibility Toggles
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-3 rounded-xl border border-brand-border bg-brand-surface text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={visStudentHome}
                  onChange={(e) => setVisStudentHome(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded text-brand-orange"
                />
                <span>Student Home Page</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl border border-brand-border bg-brand-surface text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={visBatchRoom}
                  onChange={(e) => setVisBatchRoom(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded text-brand-orange"
                />
                <span>Batch Learning Room</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-xl border border-brand-border bg-brand-surface text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={visDoubtSection}
                  onChange={(e) => setVisDoubtSection(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded text-brand-orange"
                />
                <span>Doubt-Solving Section</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Section 3: AI Model Engine & System Instructions (Super Admin Protected) */}
        <Card className="p-5 sm:p-6 bg-brand-surface border-2 border-purple-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-purple-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <h2 className="font-bold text-sm text-brand-text-primary">
                3. AI Model Engine & System Instructions
              </h2>
            </div>
            <Badge variant="primary" size="sm" className="bg-purple-600 text-[10px] flex items-center gap-1">
              <Lock className="h-3 w-3" /> Super Admin Only
            </Badge>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-xs flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
            <span>
              These parameters control the AI model inference and system instructions. In accordance with Phase 4.1 security specifications, provider secrets and API keys are strictly maintained server-side and never stored in client database tables.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Model Provider
              </label>
              <select
                value={formModelProvider}
                onChange={(e) => setFormModelProvider(e.target.value as ChatbotModelProvider)}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="cloudflare_workers_ai">Cloudflare Workers AI</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Google Gemini</option>
                <option value="custom">Custom Server Endpoint</option>
              </select>
            </div>

            <Input
              label="Model Identifier"
              value={formModelName}
              onChange={(e) => setFormModelName(e.target.value)}
              placeholder="@cf/meta/llama-3.1-8b-instruct"
              disabled={isSaving}
            />

            <Input
              label="Temperature (0.0 to 1.0)"
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={formTemperature}
              onChange={(e) => setFormTemperature(parseFloat(e.target.value) || 0.2)}
              disabled={isSaving}
            />

            <Input
              label="Max Tokens Output"
              type="number"
              value={formMaxTokens}
              onChange={(e) => setFormMaxTokens(parseInt(e.target.value, 10) || 1024)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Global System Instructions (System Prompt) *
            </label>
            <textarea
              value={formSystemInstructions}
              onChange={(e) => setFormSystemInstructions(e.target.value)}
              rows={4}
              disabled={isSaving}
              className="w-full rounded-xl border border-brand-border bg-brand-surface p-3 font-mono text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-purple-200 leading-relaxed"
            />
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={isSaving || isLoading}
            className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold px-6"
          >
            {isSaving ? "Saving Configuration..." : "Save Chatbot Configuration"}
          </Button>
        </div>
      </form>
    </div>
  );
}
