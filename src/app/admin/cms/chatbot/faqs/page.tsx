"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsChatbotFaq, ContentStatus } from "@/types/cms.types";
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
  HelpCircle,
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

export default function ChatbotFaqsCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [faqs, setFaqs] = React.useState<CmsChatbotFaq[]>([]);
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
  const [editingFaq, setEditingFaq] = React.useState<CmsChatbotFaq | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [formQuestion, setFormQuestion] = React.useState("");
  const [formAnswer, setFormAnswer] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("Academics");
  const [formSearchTags, setFormSearchTags] = React.useState("");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState<number>(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formEndsAt, setFormEndsAt] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Governance Targets
  const [archiveTarget, setArchiveTarget] = React.useState<CmsChatbotFaq | null>(null);
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

  // Load FAQs
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await CmsService.getChatbotFaqs(supabase);
        if (!isMounted) return;
        setFaqs(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load chatbot FAQs." });
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
    setEditingFaq(null);
    setFormQuestion("");
    setFormAnswer("");
    setFormCategory("Academics");
    setFormSearchTags("cbse, syllabus, preparation");
    setFormDisplayOrder(faqs.length);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (faq: CmsChatbotFaq) => {
    setEditingFaq(faq);
    setFormQuestion(faq.question || "");
    setFormAnswer(faq.answer || "");
    setFormCategory(faq.category || "Academics");
    setFormSearchTags(faq.search_tags?.join(", ") || "");
    setFormDisplayOrder(faq.display_order ?? 0);
    setFormIsVisible(faq.is_visible);
    setFormStatus(faq.status);
    setFormStartsAt(formatForDateTimeInput(faq.starts_at));
    setFormEndsAt(formatForDateTimeInput(faq.ends_at));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formQuestion.trim()) errors.question = "Question is required";
    if (!formAnswer.trim()) errors.answer = "Answer is required";
    if (!formCategory.trim()) errors.category = "Category is required";

    if (formStartsAt && formEndsAt) {
      if (new Date(formStartsAt) >= new Date(formEndsAt)) {
        errors.ends_at = "End date must be strictly after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save FAQ Handler
  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const tagsArray = formSearchTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const payload: Partial<CmsChatbotFaq> = {
      ...(editingFaq ? { id: editingFaq.id } : {}),
      question: formQuestion.trim(),
      answer: formAnswer.trim(),
      category: formCategory.trim(),
      search_tags: tagsArray,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertChatbotFaq(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save FAQ." });
    } else {
      setFeedback({
        type: "success",
        message: editingFaq ? "Chatbot FAQ updated successfully." : "Chatbot FAQ created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  // Fast Toggle Visibility
  const handleToggleVisibility = async (faq: CmsChatbotFaq) => {
    const nextVal = !faq.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_chatbot_faqs", faq.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `FAQ visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
      });
      handleManualRefresh();
    }
  };

  // Archive Confirm Handler
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_chatbot_faqs", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive FAQ." });
    } else {
      setFeedback({ type: "success", message: `FAQ archived successfully.` });
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
            entityType: "CHATBOT_FAQ",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish FAQ." });
        } else {
          setFeedback({ type: "success", message: `FAQ published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish FAQ." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      const { error } = await CmsService.unpublishContent(supabase, "CHATBOT_FAQ", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish FAQ." });
      } else {
        setFeedback({ type: "success", message: `FAQ unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  // Filtered List
  const filteredFaqs = React.useMemo(() => {
    return faqs.filter((faq) => {
      if (statusFilter !== "ALL" && faq.status !== statusFilter) return false;
      if (categoryFilter !== "ALL" && faq.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQ = faq.question.toLowerCase().includes(q);
        const matchesA = faq.answer.toLowerCase().includes(q);
        const matchesCat = faq.category.toLowerCase().includes(q);
        const matchesTags = faq.search_tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesQ && !matchesA && !matchesCat && !matchesTags) return false;
      }
      return true;
    });
  }, [faqs, statusFilter, categoryFilter, searchQuery]);

  // Unique Categories
  const categories = React.useMemo(() => {
    const set = new Set(faqs.map((f) => f.category));
    return Array.from(set);
  }, [faqs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                Frequently Asked Questions (FAQ) Bank
              </h1>
              <p className="text-xs text-brand-text-muted">
                Authoritative platform & academic Q&A pairs for direct semantic retrieval by the TopVeda AI assistant
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
            <span>New FAQ Pair</span>
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
              placeholder="Search question, answer, or tags..."
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

      {/* FAQs Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-extrabold text-sm text-brand-text-primary flex items-center gap-1.5">
            <span>Configured FAQ Pairs</span>
            <span className="text-xs font-normal text-brand-text-muted">
              ({filteredFaqs.length} {filteredFaqs.length === 1 ? "pair" : "pairs"})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
            <p className="text-xs font-medium text-brand-text-muted">Loading FAQ bank...</p>
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-brand-text-primary">No FAQs found</h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try changing your search terms or filters."
                  : "Add authoritative question-and-answer pairs to give TopVeda AI instant retrieval knowledge."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3.5">Question & Answer Pair</th>
                    <th className="p-3.5">Category & Tags</th>
                    <th className="p-3.5">Order</th>
                    <th className="p-3.5">Schedule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredFaqs.map((faq) => (
                    <tr key={faq.id} className="hover:bg-brand-bg-warm/30 transition-colors">
                      {/* Question & Answer */}
                      <td className="p-3.5 space-y-1 max-w-md">
                        <p className="font-bold text-brand-text-primary text-xs line-clamp-2">
                          Q: {faq.question}
                        </p>
                        <p className="text-[11px] text-brand-text-muted line-clamp-2 leading-relaxed">
                          A: {faq.answer}
                        </p>
                      </td>

                      {/* Category & Tags */}
                      <td className="p-3.5 whitespace-nowrap space-y-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 block w-fit">
                          {faq.category}
                        </span>
                        {faq.search_tags && faq.search_tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {faq.search_tags.map((t) => (
                              <span
                                key={t}
                                className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Display Order */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        #{faq.display_order}
                      </td>

                      {/* Schedule */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ScheduleStatusBadge startsAt={faq.starts_at} endsAt={faq.ends_at} />
                        <div className="hidden lg:block">
                          <ScheduleSummaryText startsAt={faq.starts_at} endsAt={faq.ends_at} />
                        </div>
                      </td>

                      {/* Status & Visibility */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ContentStatusBadge status={faq.status} size="sm" />
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            onClick={() => handleToggleVisibility(faq)}
                            className="inline-flex items-center gap-1 font-semibold text-brand-text-muted hover:text-brand-text-primary transition-colors cursor-pointer"
                            title="Toggle Visibility"
                          >
                            {faq.is_visible ? (
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
                          {faq.status === "PUBLISHED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "CHATBOT_FAQ",
                                  entityId: faq.id,
                                  title: faq.question,
                                  currentStatus: faq.status,
                                  isVisible: faq.is_visible,
                                  startsAt: faq.starts_at,
                                  endsAt: faq.ends_at,
                                  displayOrder: faq.display_order,
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
                                  entityType: "CHATBOT_FAQ",
                                  entityId: faq.id,
                                  title: faq.question,
                                  currentStatus: faq.status,
                                  isVisible: faq.is_visible,
                                  startsAt: faq.starts_at,
                                  endsAt: faq.ends_at,
                                  displayOrder: faq.display_order,
                                  action: "PUBLISH",
                                })
                              }
                              title="Publish FAQ"
                              className="h-8 px-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                            >
                              <Globe2 className="h-3.5 w-3.5 mr-1" /> Publish
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewTarget({ type: "CHATBOT_FAQ", data: faq })}
                            title="Preview Simulation"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(faq)}
                            title="Edit FAQ"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            Edit
                          </Button>

                          {faq.status !== "ARCHIVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setArchiveTarget(faq)}
                              title="Archive FAQ"
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
        title={editingFaq ? "Edit Chatbot FAQ Pair" : "Create Chatbot FAQ Pair"}
        description="Configure authoritative Q&A knowledge retrieved by the AI assistant."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveFaq} className="space-y-4 pt-1">
          <Input
            label="Question / Intent Prompt *"
            value={formQuestion}
            onChange={(e) => setFormQuestion(e.target.value)}
            placeholder="e.g. When will Class 10 CBSE Board practical exams start?"
            error={formErrors.question}
            disabled={isSaving}
          />

          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Authoritative Answer Text *
            </label>
            <textarea
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              placeholder="e.g. Practical examinations for Class 10 are scheduled to begin in the first week of January according to the official CBSE circular..."
              rows={4}
              disabled={isSaving}
              className={`w-full rounded-xl border bg-brand-surface p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 ${
                formErrors.answer
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-brand-border focus:ring-brand-orange/20"
              }`}
            />
            {formErrors.answer && (
              <p className="text-[11px] font-semibold text-rose-600">{formErrors.answer}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Knowledge Category *"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="e.g. Academics, Enrollment, Batch Schedule"
              error={formErrors.category}
              disabled={isSaving}
            />

            <Input
              label="Semantic Search Tags (Comma-separated)"
              value={formSearchTags}
              onChange={(e) => setFormSearchTags(e.target.value)}
              placeholder="e.g. cbse, practicals, class 10, dates"
              disabled={isSaving}
            />
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
              {isSaving ? "Saving..." : editingFaq ? "Save Changes" : "Create FAQ Pair"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive FAQ"
        description="Are you sure you want to archive this FAQ pair? Archived FAQs will not be matched during student chat."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-warm border border-brand-border text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.question}</p>
              <p className="text-brand-text-muted line-clamp-2">{archiveTarget.answer}</p>
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
