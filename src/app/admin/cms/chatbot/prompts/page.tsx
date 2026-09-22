"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsChatbotPrompt, ContentStatus } from "@/types/cms.types";
import { ContentStatusBadge } from "@/components/admin/cms/content-status-badge";
import { ScheduleStatusBadge, ScheduleSummaryText } from "@/components/admin/cms/schedule-status-badge";
import {
  PublishConfirmationDialog,
  PublishDialogTarget,
} from "@/components/admin/cms/publish-confirmation-dialog";
import { ContentPreviewModal, PreviewContentItem } from "@/components/admin/cms/content-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Terminal,
  Sparkles,
  Calculator,
  BookOpen,
  HelpCircle,
  Atom,
  Target,
  Lightbulb,
  Plus,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Globe2,
  FileEdit,
  Archive,
  Calendar,
} from "lucide-react";

export default function ChatbotPromptsCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [prompts, setPrompts] = React.useState<CmsChatbotPrompt[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPrompt, setEditingPrompt] = React.useState<CmsChatbotPrompt | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [formPromptText, setFormPromptText] = React.useState("");
  const [formCategoryTag, setFormCategoryTag] = React.useState("General");
  const [formIconName, setFormIconName] = React.useState("Sparkles");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState<number>(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formEndsAt, setFormEndsAt] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Governance Targets
  const [archiveTarget, setArchiveTarget] = React.useState<CmsChatbotPrompt | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [publishTarget, setPublishTarget] = React.useState<PublishDialogTarget | null>(null);
  const [isPublishProcessing, setIsPublishProcessing] = React.useState(false);
  const [previewTarget, setPreviewTarget] = React.useState<PreviewContentItem | null>(null);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const formatForDateTimeInput = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  // Load Prompts
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await CmsService.getChatbotPrompts(supabase);
        if (!isMounted) return;
        setPrompts(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load chatbot prompts." });
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

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPrompt(null);
    setFormPromptText("");
    setFormCategoryTag("General");
    setFormIconName("Sparkles");
    setFormDisplayOrder(prompts.length);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (p: CmsChatbotPrompt) => {
    setEditingPrompt(p);
    setFormPromptText(p.prompt_text || "");
    setFormCategoryTag(p.category_tag || "General");
    setFormIconName(p.icon_name || "Sparkles");
    setFormDisplayOrder(p.display_order ?? 0);
    setFormIsVisible(p.is_visible);
    setFormStatus(p.status);
    setFormStartsAt(formatForDateTimeInput(p.starts_at));
    setFormEndsAt(formatForDateTimeInput(p.ends_at));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formPromptText.trim()) errors.prompt_text = "Prompt text is required";
    if (!formCategoryTag.trim()) errors.category_tag = "Category tag is required";

    if (formStartsAt && formEndsAt) {
      if (new Date(formStartsAt) >= new Date(formEndsAt)) {
        errors.ends_at = "End date must be strictly after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Prompt Handler
  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsChatbotPrompt> = {
      ...(editingPrompt ? { id: editingPrompt.id } : {}),
      prompt_text: formPromptText.trim(),
      category_tag: formCategoryTag.trim(),
      icon_name: formIconName,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertChatbotPrompt(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save prompt." });
    } else {
      setFeedback({
        type: "success",
        message: editingPrompt ? "Chatbot starter prompt updated." : "Chatbot starter prompt created.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  // Fast Toggle Visibility
  const handleToggleVisibility = async (p: CmsChatbotPrompt) => {
    const nextVal = !p.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_chatbot_prompts", p.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `Prompt visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
      });
      handleManualRefresh();
    }
  };

  // Archive Confirm Handler
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_chatbot_prompts", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive prompt." });
    } else {
      setFeedback({ type: "success", message: `Starter prompt archived successfully.` });
      handleManualRefresh();
    }
  };

  // Publish Dialog Confirm
  const handlePublishConfirm = async (options: {
    displayOrder?: number;
    startsAt?: string | null;
    endsAt?: string | null;
  }) => {
    if (!publishTarget) return;
    setIsPublishProcessing(true);

    if (publishTarget.action === "PUBLISH") {
      try {
        const res = await fetch("/api/admin/cms/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "CHATBOT_PROMPT",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish prompt." });
        } else {
          setFeedback({ type: "success", message: `Chatbot prompt published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish prompt." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      const { error } = await CmsService.unpublishContent(supabase, "CHATBOT_PROMPT", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish prompt." });
      } else {
        setFeedback({ type: "success", message: `Prompt unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  // Render Prompt Icon
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case "Calculator":
        return <Calculator className="h-3.5 w-3.5" />;
      case "BookOpen":
        return <BookOpen className="h-3.5 w-3.5" />;
      case "HelpCircle":
        return <HelpCircle className="h-3.5 w-3.5" />;
      case "Atom":
        return <Atom className="h-3.5 w-3.5" />;
      case "Target":
        return <Target className="h-3.5 w-3.5" />;
      case "Lightbulb":
        return <Lightbulb className="h-3.5 w-3.5" />;
      case "Sparkles":
      default:
        return <Sparkles className="h-3.5 w-3.5" />;
    }
  };

  // Filtered List
  const filteredPrompts = React.useMemo(() => {
    return prompts.filter((p) => {
      if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && p.category_tag !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = p.prompt_text.toLowerCase().includes(q);
        const matchesCat = p.category_tag.toLowerCase().includes(q);
        if (!matchesText && !matchesCat) return false;
      }
      return true;
    });
  }, [prompts, statusFilter, categoryFilter, searchQuery]);

  // Unique Categories
  const categories = React.useMemo(() => {
    const set = new Set(prompts.map((p) => p.category_tag));
    return Array.from(set);
  }, [prompts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-50 text-brand-orange border border-orange-200 flex items-center justify-center">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                Starter Prompts & Query Chips Bank
              </h1>
              <p className="text-xs text-brand-text-muted">
                Curate quick starter questions, formula query shortcuts, and doubt starters shown in the student AI chat widget
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
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white shadow-2xs text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>New Prompt Chip</span>
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

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
            <Input
              placeholder="Search prompts or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-muted shrink-0">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-muted shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Prompts Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-extrabold text-sm text-brand-text-primary flex items-center gap-1.5">
            <span>Configured Prompt Chips</span>
            <span className="text-xs font-normal text-brand-text-muted">
              ({filteredPrompts.length} {filteredPrompts.length === 1 ? "chip" : "chips"})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
            <p className="text-xs font-medium text-brand-text-muted">Loading prompt bank...</p>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 text-brand-orange flex items-center justify-center mx-auto">
              <Terminal className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-brand-text-primary">No starter prompts found</h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try changing your search terms or filters."
                  : "Add starter doubt prompts to help students discover AI tutoring capabilities."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3.5">Prompt Chip Text</th>
                    <th className="p-3.5">Category Tag</th>
                    <th className="p-3.5">Order</th>
                    <th className="p-3.5">Schedule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredPrompts.map((p) => (
                    <tr key={p.id} className="hover:bg-brand-bg-warm/30 transition-colors">
                      {/* Prompt & Icon */}
                      <td className="p-3.5 space-y-1 max-w-md">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-orange-50 text-brand-orange border border-orange-200 shrink-0 flex items-center justify-center">
                            {renderIcon(p.icon_name)}
                          </div>
                          <span className="font-bold text-brand-text-primary text-xs line-clamp-1">
                            {p.prompt_text}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category_tag}
                        </span>
                      </td>

                      {/* Display Order */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        #{p.display_order}
                      </td>

                      {/* Schedule */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ScheduleStatusBadge startsAt={p.starts_at} endsAt={p.ends_at} />
                        <div className="hidden lg:block">
                          <ScheduleSummaryText startsAt={p.starts_at} endsAt={p.ends_at} />
                        </div>
                      </td>

                      {/* Status & Visibility */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ContentStatusBadge status={p.status} size="sm" />
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            onClick={() => handleToggleVisibility(p)}
                            className="inline-flex items-center gap-1 font-semibold text-brand-text-muted hover:text-brand-text-primary transition-colors cursor-pointer"
                            title="Toggle Visibility"
                          >
                            {p.is_visible ? (
                              <span className="text-emerald-700 flex items-center gap-0.5">
                                <Eye className="h-3 w-3" /> Visible
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-0.5">
                                <EyeOff className="h-3 w-3" /> Hidden
                              </span>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === "PUBLISHED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "CHATBOT_PROMPT",
                                  entityId: p.id,
                                  title: p.prompt_text,
                                  currentStatus: p.status,
                                  isVisible: p.is_visible,
                                  startsAt: p.starts_at,
                                  endsAt: p.ends_at,
                                  displayOrder: p.display_order,
                                  action: "UNPUBLISH",
                                })
                              }
                              title="Unpublish"
                              className="h-8 px-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 border-amber-200"
                            >
                              <FileEdit className="h-3.5 w-3.5 mr-1 text-amber-600" /> Unpublish
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "CHATBOT_PROMPT",
                                  entityId: p.id,
                                  title: p.prompt_text,
                                  currentStatus: p.status,
                                  isVisible: p.is_visible,
                                  startsAt: p.starts_at,
                                  endsAt: p.ends_at,
                                  displayOrder: p.display_order,
                                  action: "PUBLISH",
                                })
                              }
                              title="Publish Prompt"
                              className="h-8 px-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                            >
                              <Globe2 className="h-3.5 w-3.5 mr-1" /> Publish
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewTarget({ type: "CHATBOT_PROMPT", data: p })}
                            title="Preview Simulation"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Prompt"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            Edit
                          </Button>

                          {p.status !== "ARCHIVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setArchiveTarget(p)}
                              title="Archive Prompt"
                              className="h-8 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              <Archive className="h-3.5 w-3.5 text-rose-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingPrompt ? "Edit Starter Prompt Chip" : "Create Starter Prompt Chip"}
        description="Configure student starter chips for instant one-click AI doubt queries."
        maxWidth="md"
      >
        <form onSubmit={handleSavePrompt} className="space-y-4 pt-1">
          <Input
            label="Prompt Query Text *"
            value={formPromptText}
            onChange={(e) => setFormPromptText(e.target.value)}
            placeholder="e.g. Explain Newton's Third Law with real-life examples"
            error={formErrors.prompt_text}
            disabled={isSaving}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Category Tag *"
              value={formCategoryTag}
              onChange={(e) => setFormCategoryTag(e.target.value)}
              placeholder="e.g. Physics / Board Prep"
              error={formErrors.category_tag}
              disabled={isSaving}
            />

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Chip Icon
              </label>
              <select
                value={formIconName}
                onChange={(e) => setFormIconName(e.target.value)}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="Sparkles">Sparkles (General / Smart)</option>
                <option value="Calculator">Calculator (Math / Formula)</option>
                <option value="Atom">Atom (Physics / Chemistry)</option>
                <option value="BookOpen">BookOpen (Reading / Literature)</option>
                <option value="HelpCircle">HelpCircle (Doubt / Question)</option>
                <option value="Target">Target (Exam Goals)</option>
                <option value="Lightbulb">Lightbulb (Tips / Insights)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Display Order Index"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(parseInt(e.target.value, 10) || 0)}
              disabled={isSaving}
            />

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Content Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Visibility Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsVisible}
                onChange={(e) => setFormIsVisible(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded text-brand-orange border-brand-border focus:ring-brand-orange"
              />
              <span className="text-xs font-bold text-brand-text-primary">
                Student Chat Visibility Flag (is_visible = true)
              </span>
            </label>
          </div>

          {/* Date Range Scheduling */}
          <div className="space-y-2 p-3.5 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-text-primary">
              <Calendar className="h-4 w-4 text-brand-orange" />
              <span>Time-Window Scheduling (Optional)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                  Starts At (Live from)
                </label>
                <input
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                  disabled={isSaving}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                  Ends At (Expires at)
                </label>
                <input
                  type="datetime-local"
                  value={formEndsAt}
                  onChange={(e) => setFormEndsAt(e.target.value)}
                  disabled={isSaving}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>
            </div>
            {formErrors.ends_at && (
              <p className="text-[11px] font-semibold text-rose-600">{formErrors.ends_at}</p>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold"
            >
              {isSaving ? "Saving..." : editingPrompt ? "Save Changes" : "Create Prompt Chip"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Starter Prompt"
        description="Are you sure you want to archive this starter prompt? Archived prompts will no longer appear in student chat."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-warm border border-brand-border text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.prompt_text}</p>
              <p className="text-brand-text-muted">Category: {archiveTarget.category_tag}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveTarget(null)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleArchiveConfirm}
              disabled={isArchiving}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isArchiving ? "Archiving..." : "Confirm Archive"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publishing Confirmation Dialog */}
      <PublishConfirmationDialog
        target={publishTarget}
        isOpen={!!publishTarget}
        onClose={() => !isPublishProcessing && setPublishTarget(null)}
        onConfirm={handlePublishConfirm}
        isProcessing={isPublishProcessing}
      />

      {/* Preview Modal */}
      <ContentPreviewModal
        item={previewTarget}
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
