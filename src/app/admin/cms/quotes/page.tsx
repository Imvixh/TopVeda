"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsDailyQuote, ContentStatus } from "@/types/cms.types";
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
  Quote as QuoteIcon,
  Plus,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Globe2,
  FileEdit,
  Archive,
  Calendar,
  CheckCircle2,
} from "lucide-react";

export default function DailyQuotesCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [quotes, setQuotes] = React.useState<CmsDailyQuote[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingQuote, setEditingQuote] = React.useState<CmsDailyQuote | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [formQuote, setFormQuote] = React.useState("");
  const [formAuthor, setFormAuthor] = React.useState("TopVeda Wisdom");
  const [formIsActive, setFormIsActive] = React.useState(false);
  const [formScheduledDate, setFormScheduledDate] = React.useState("");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState<number>(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formEndsAt, setFormEndsAt] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Governance Targets
  const [archiveTarget, setArchiveTarget] = React.useState<CmsDailyQuote | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [publishTarget, setPublishTarget] = React.useState<PublishDialogTarget | null>(null);
  const [isPublishProcessing, setIsPublishProcessing] = React.useState(false);
  const [previewTarget, setPreviewTarget] = React.useState<PreviewContentItem | null>(null);

  // Manual Refresh
  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Helper to format ISO timestamp for datetime-local input
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

  // Load Quotes
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await CmsService.getDailyQuotes(supabase);
        if (!isMounted) return;
        setQuotes(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load daily quotes." });
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
    setEditingQuote(null);
    setFormQuote("");
    setFormAuthor("TopVeda Wisdom");
    setFormIsActive(false);
    setFormScheduledDate("");
    setFormDisplayOrder(quotes.length);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (q: CmsDailyQuote) => {
    setEditingQuote(q);
    setFormQuote(q.quote || "");
    setFormAuthor(q.author || "TopVeda Wisdom");
    setFormIsActive(q.is_active || false);
    setFormScheduledDate(q.scheduled_for_date || "");
    setFormDisplayOrder(q.display_order ?? 0);
    setFormIsVisible(q.is_visible);
    setFormStatus(q.status);
    setFormStartsAt(formatForDateTimeInput(q.starts_at));
    setFormEndsAt(formatForDateTimeInput(q.ends_at));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formQuote.trim()) errors.quote = "Quote text is required";
    if (!formAuthor.trim()) errors.author = "Author attribution is required";

    if (formStartsAt && formEndsAt) {
      if (new Date(formStartsAt) >= new Date(formEndsAt)) {
        errors.ends_at = "End date must be strictly after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Quote Handler
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsDailyQuote> = {
      ...(editingQuote ? { id: editingQuote.id } : {}),
      quote: formQuote.trim(),
      author: formAuthor.trim(),
      is_active: formIsActive,
      scheduled_for_date: formScheduledDate.trim() || null,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertDailyQuote(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save daily quote." });
    } else {
      setFeedback({
        type: "success",
        message: editingQuote ? "Daily quote updated successfully." : "Daily quote created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  // Fast Toggle Active Quote
  const handleToggleActive = async (q: CmsDailyQuote) => {
    const nextVal = !q.is_active;
    const { error } = await CmsService.toggleActiveDailyQuote(supabase, q.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update active state." });
    } else {
      setFeedback({
        type: "success",
        message: `Quote "${q.quote.slice(0, 30)}..." is now ${nextVal ? "Active on Student Sidebar" : "Inactive"}.`,
      });
      handleManualRefresh();
    }
  };

  // Fast Toggle Visibility
  const handleToggleVisibility = async (q: CmsDailyQuote) => {
    const nextVal = !q.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_daily_quotes", q.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `Quote visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
      });
      handleManualRefresh();
    }
  };

  // Archive Confirm Handler
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_daily_quotes", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive quote." });
    } else {
      setFeedback({ type: "success", message: `Quote by "${archiveTarget.author}" archived successfully.` });
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
            entityType: "QUOTE",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish quote." });
        } else {
          setFeedback({ type: "success", message: `Daily quote published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish quote." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      // Unpublish action
      const { error } = await CmsService.unpublishContent(supabase, "QUOTE", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish quote." });
      } else {
        setFeedback({ type: "success", message: `Quote unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  // Filtered List
  const filteredQuotes = React.useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== "ALL" && q.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQuote = q.quote.toLowerCase().includes(query);
        const matchesAuthor = q.author.toLowerCase().includes(query);
        if (!matchesQuote && !matchesAuthor) return false;
      }
      return true;
    });
  }, [quotes, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <QuoteIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                Daily Quotes & Motivation
              </h1>
              <p className="text-xs text-brand-text-muted">
                Curate inspirational thoughts and motivational quotes displayed on the student portal navigation sidebar
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
            <span>New Daily Quote</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
            <Input
              placeholder="Search by quote text or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
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

      {/* Quotes Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-extrabold text-sm text-brand-text-primary flex items-center gap-1.5">
            <span>Configured Quotes Library</span>
            <span className="text-xs font-normal text-brand-text-muted">
              ({filteredQuotes.length} {filteredQuotes.length === 1 ? "quote" : "quotes"})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
            <p className="text-xs font-medium text-brand-text-muted">Loading daily quotes...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <QuoteIcon className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-brand-text-primary">No quotes found</h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try changing your search terms or status filter."
                  : "Add your first inspirational quote to display on the student portal navigation sidebar."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3.5">Inspirational Quote & Author</th>
                    <th className="p-3.5">Active Sidebar Quote</th>
                    <th className="p-3.5">Scheduled Date</th>
                    <th className="p-3.5">Order</th>
                    <th className="p-3.5">Schedule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-brand-bg-warm/30 transition-colors">
                      {/* Quote & Author */}
                      <td className="p-3.5 space-y-1 max-w-md">
                        <blockquote className="font-medium text-brand-text-primary text-xs italic line-clamp-2">
                          &ldquo;{q.quote}&rdquo;
                        </blockquote>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-orange">
                          <span>— {q.author}</span>
                        </div>
                      </td>

                      {/* Active Sidebar Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(q)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            q.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle active sidebar quote"
                        >
                          {q.is_active ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Live Active</span>
                            </>
                          ) : (
                            <span>Set Active</span>
                          )}
                        </button>
                      </td>

                      {/* Scheduled Date */}
                      <td className="p-3.5 whitespace-nowrap text-brand-text-muted font-mono text-[11px]">
                        {q.scheduled_for_date ? (
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Calendar className="h-3 w-3 text-brand-orange" />
                            {q.scheduled_for_date}
                          </span>
                        ) : (
                          <span className="text-slate-400">Always / General</span>
                        )}
                      </td>

                      {/* Display Order */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        #{q.display_order}
                      </td>

                      {/* Schedule */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ScheduleStatusBadge startsAt={q.starts_at} endsAt={q.ends_at} />
                        <div className="hidden lg:block">
                          <ScheduleSummaryText startsAt={q.starts_at} endsAt={q.ends_at} />
                        </div>
                      </td>

                      {/* Status & Visibility */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ContentStatusBadge status={q.status} size="sm" />
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            onClick={() => handleToggleVisibility(q)}
                            className="inline-flex items-center gap-1 font-semibold text-brand-text-muted hover:text-brand-text-primary transition-colors cursor-pointer"
                            title="Toggle Visibility"
                          >
                            {q.is_visible ? (
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
                          {q.status === "PUBLISHED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "QUOTE",
                                  entityId: q.id,
                                  title: `Quote by ${q.author}`,
                                  currentStatus: q.status,
                                  isVisible: q.is_visible,
                                  startsAt: q.starts_at,
                                  endsAt: q.ends_at,
                                  displayOrder: q.display_order,
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
                                  entityType: "QUOTE",
                                  entityId: q.id,
                                  title: `Quote by ${q.author}`,
                                  currentStatus: q.status,
                                  isVisible: q.is_visible,
                                  startsAt: q.starts_at,
                                  endsAt: q.ends_at,
                                  displayOrder: q.display_order,
                                  action: "PUBLISH",
                                })
                              }
                              title="Publish to Student Portal"
                              className="h-8 px-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                            >
                              <Globe2 className="h-3.5 w-3.5 mr-1" /> Publish
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewTarget({ type: "QUOTE", data: q })}
                            title="Preview Simulation"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(q)}
                            title="Edit Quote"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            Edit
                          </Button>

                          {q.status !== "ARCHIVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setArchiveTarget(q)}
                              title="Archive Quote"
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

      {/* Create / Edit Quote Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingQuote ? "Edit Daily Quote" : "Create Daily Quote"}
        description="Configure motivational quote text, author attribution, and student portal sidebar activation."
        maxWidth="md"
      >
        <form onSubmit={handleSaveQuote} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Motivational Quote Text *
            </label>
            <textarea
              value={formQuote}
              onChange={(e) => setFormQuote(e.target.value)}
              placeholder="e.g. Arise, awake, and stop not until the goal is reached."
              rows={3}
              disabled={isSaving}
              className={`w-full rounded-xl border bg-brand-surface p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 ${
                formErrors.quote
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-brand-border focus:ring-brand-orange/20"
              }`}
            />
            {formErrors.quote && (
              <p className="text-[11px] font-semibold text-rose-600">{formErrors.quote}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Author Attribution *"
              value={formAuthor}
              onChange={(e) => setFormAuthor(e.target.value)}
              placeholder="e.g. Swami Vivekananda"
              error={formErrors.author}
              disabled={isSaving}
            />

            <Input
              label="Scheduled For Date (YYYY-MM-DD)"
              type="date"
              value={formScheduledDate}
              onChange={(e) => setFormScheduledDate(e.target.value)}
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

          {/* Active Sidebar Checkbox */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded text-brand-orange border-brand-border focus:ring-brand-orange"
              />
              <span className="text-xs font-bold text-amber-900">
                Mark as Live Active Sidebar Quote
              </span>
            </label>
            <p className="text-[11px] text-amber-800 leading-snug pl-6">
              When active and published, this quote appears directly on the student portal navigation sidebar card.
            </p>
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
                Student Portal Visibility Flag (is_visible = true)
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
              {isSaving ? "Saving..." : editingQuote ? "Save Quote Changes" : "Create Quote"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Daily Quote"
        description="Are you sure you want to archive this quote? Archived quotes are removed from student display."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-warm border border-brand-border text-xs space-y-1">
              <p className="font-semibold text-brand-text-primary italic">&ldquo;{archiveTarget.quote}&rdquo;</p>
              <p className="font-bold text-brand-orange">— {archiveTarget.author}</p>
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
