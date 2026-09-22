"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import {
  CmsChatbotKnowledgeSource,
  ChatbotSourceType,
  ChatbotSyncStatus,
} from "@/types/cms.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Database,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Trash2,
  FileText,
  GraduationCap,
  BookOpen,
  HelpCircle,
  Compass,
  Power,
  ShieldCheck,
} from "lucide-react";

export default function ChatbotKnowledgeCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [sources, setSources] = React.useState<CmsChatbotKnowledgeSource[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");
  const [syncFilter, setSyncFilter] = React.useState<string>("ALL");

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState<CmsChatbotKnowledgeSource | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [formSourceType, setFormSourceType] = React.useState<ChatbotSourceType>("COURSE");
  const [formSourceId, setFormSourceId] = React.useState("");
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formIsActive, setFormIsActive] = React.useState(true);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Delete Target
  const [deleteTarget, setDeleteTarget] = React.useState<CmsChatbotKnowledgeSource | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Load Sources
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await CmsService.getChatbotKnowledgeSources(supabase);
        if (!isMounted) return;
        setSources(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load knowledge sources." });
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
    setEditingSource(null);
    setFormSourceType("COURSE");
    setFormSourceId("");
    setFormTitle("");
    setFormDescription("");
    setFormIsActive(true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (src: CmsChatbotKnowledgeSource) => {
    setEditingSource(src);
    setFormSourceType(src.source_type);
    setFormSourceId(src.source_id);
    setFormTitle(src.title || "");
    setFormDescription(src.description || "");
    setFormIsActive(src.is_active);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = "Source title is required";
    if (!editingSource && !formSourceId.trim()) errors.source_id = "Target Source UUID is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Source Handler
  const handleSaveSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsChatbotKnowledgeSource> = {
      ...(editingSource ? { id: editingSource.id } : {}),
      source_type: formSourceType,
      source_id: formSourceId.trim() || editingSource?.source_id,
      title: formTitle.trim(),
      description: formDescription.trim(),
      is_active: formIsActive,
      sync_status: formIsActive ? "PENDING" : "EXCLUDED",
    };

    const { data, error } = await CmsService.upsertChatbotKnowledgeSource(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to register knowledge source." });
    } else {
      setFeedback({
        type: "success",
        message: editingSource
          ? "Knowledge source metadata updated."
          : "Knowledge source registered and queued for AI indexing.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  // Toggle Active / Inclusion
  const handleToggleActive = async (src: CmsChatbotKnowledgeSource) => {
    const nextVal = !src.is_active;
    const { error } = await CmsService.toggleKnowledgeSourceActive(supabase, src.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to toggle active state." });
    } else {
      setFeedback({
        type: "success",
        message: `Knowledge source is now ${nextVal ? "Active (Included in AI Context)" : "Excluded from AI Context"}.`,
      });
      handleManualRefresh();
    }
  };

  // Request Sync Retry
  const handleRetrySync = async (src: CmsChatbotKnowledgeSource) => {
    const { error } = await CmsService.retryKnowledgeSync(supabase, src.id);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to queue sync retry." });
    } else {
      setFeedback({
        type: "success",
        message: `Re-indexing sync queued for "${src.title}".`,
      });
      handleManualRefresh();
    }
  };

  // Delete Confirm Handler
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await CmsService.deleteChatbotKnowledgeSource(supabase, deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to remove knowledge index." });
    } else {
      setFeedback({ type: "success", message: `Knowledge index link removed.` });
      handleManualRefresh();
    }
  };

  // Render Source Type Icon
  const renderSourceTypeIcon = (type: ChatbotSourceType) => {
    switch (type) {
      case "COURSE":
        return <GraduationCap className="h-4 w-4 text-brand-orange" />;
      case "CHAPTER":
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case "STUDY_MATERIAL":
        return <FileText className="h-4 w-4 text-emerald-600" />;
      case "FAQ":
        return <HelpCircle className="h-4 w-4 text-purple-600" />;
      case "CURRICULUM_SPEC":
      default:
        return <Compass className="h-4 w-4 text-amber-600" />;
    }
  };

  // Render Sync Status Badge
  const renderSyncStatusBadge = (status: ChatbotSyncStatus) => {
    switch (status) {
      case "SYNCED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Synced
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            <Clock className="h-3 w-3" /> Sync Pending
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="h-3 w-3" /> Failed
          </span>
        );
      case "EXCLUDED":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Power className="h-3 w-3" /> Excluded
          </span>
        );
    }
  };

  // Filtered List
  const filteredSources = React.useMemo(() => {
    return sources.filter((src) => {
      if (typeFilter !== "ALL" && src.source_type !== typeFilter) return false;
      if (syncFilter !== "ALL" && src.sync_status !== syncFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = src.title.toLowerCase().includes(q);
        const matchDesc = src.description?.toLowerCase().includes(q);
        const matchId = src.source_id.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchId) return false;
      }
      return true;
    });
  }, [sources, typeFilter, syncFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                AI Chatbot Knowledge Sources Index
              </h1>
              <p className="text-xs text-brand-text-muted">
                Governs verified curriculum sources, course modules, and study notes indexed into the TopVeda AI knowledge base
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
            <span>Register Knowledge Link</span>
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

      {/* Governance Notice */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">Explicit Knowledge Governance Principle</span>
          <p className="text-emerald-800 leading-relaxed text-[11px]">
            In accordance with TopVeda AI safety architecture, simply publishing a course or lecture does <em>not</em> automatically expose it to the AI assistant. Each knowledge source must be explicitly registered and activated below.
          </p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
            <Input
              placeholder="Search source title, description, or UUID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-muted shrink-0">Source Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Source Types</option>
              <option value="COURSE">Master Course</option>
              <option value="CHAPTER">Curriculum Chapter</option>
              <option value="STUDY_MATERIAL">Study Material Document</option>
              <option value="FAQ">FAQ Knowledge Pair</option>
              <option value="CURRICULUM_SPEC">Syllabus Specification</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-muted shrink-0">Sync Status:</span>
            <select
              value={syncFilter}
              onChange={(e) => setSyncFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Sync States</option>
              <option value="SYNCED">Synced (Live in Vector Index)</option>
              <option value="PENDING">Pending Sync</option>
              <option value="FAILED">Sync Failed</option>
              <option value="EXCLUDED">Excluded (Inactive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sources Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-extrabold text-sm text-brand-text-primary flex items-center gap-1.5">
            <span>Registered Knowledge Sources</span>
            <span className="text-xs font-normal text-brand-text-muted">
              ({filteredSources.length} {filteredSources.length === 1 ? "source" : "sources"})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
            <p className="text-xs font-medium text-brand-text-muted">Loading knowledge sources...</p>
          </div>
        ) : filteredSources.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <Database className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-brand-text-primary">No knowledge sources found</h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                {searchQuery || typeFilter !== "ALL" || syncFilter !== "ALL"
                  ? "Try changing your search terms or filters."
                  : "Register course notes, NCERT syllabus guides, and formula sheets into the AI knowledge index."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3.5">Source Title & Scope</th>
                    <th className="p-3.5">Source Type</th>
                    <th className="p-3.5">Sync Status</th>
                    <th className="p-3.5">AI Inclusion</th>
                    <th className="p-3.5">Last Synced</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredSources.map((src) => (
                    <tr key={src.id} className="hover:bg-brand-bg-warm/30 transition-colors">
                      {/* Title & Description */}
                      <td className="p-3.5 space-y-1 max-w-sm">
                        <p className="font-bold text-brand-text-primary text-xs line-clamp-1">
                          {src.title}
                        </p>
                        {src.description && (
                          <p className="text-[11px] text-brand-text-muted line-clamp-2">
                            {src.description}
                          </p>
                        )}
                        <span className="text-[9px] font-mono text-slate-400 block truncate max-w-[200px]">
                          Target ID: {src.source_id}
                        </span>
                      </td>

                      {/* Source Type */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-brand-text-primary">
                          {renderSourceTypeIcon(src.source_type)}
                          <span>{src.source_type.replace(/_/g, " ")}</span>
                        </div>
                      </td>

                      {/* Sync Status */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        {renderSyncStatusBadge(src.sync_status)}
                        {src.sync_error_message && (
                          <p className="text-[10px] text-rose-600 line-clamp-1 max-w-xs">
                            Error: {src.sync_error_message}
                          </p>
                        )}
                      </td>

                      {/* AI Inclusion Toggle */}
                      <td className="p-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(src)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            src.is_active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs"
                              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                          }`}
                          title="Click to toggle AI knowledge activation"
                        >
                          <Power className="h-3 w-3" />
                          <span>{src.is_active ? "Active in AI" : "Excluded"}</span>
                        </button>
                      </td>

                      {/* Last Synced */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-brand-text-muted">
                        {src.last_synced_at ? new Date(src.last_synced_at).toLocaleDateString() : "Never"}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetrySync(src)}
                            title="Queue Sync Re-index"
                            className="h-8 px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 border-blue-200"
                          >
                            <RotateCw className="h-3.5 w-3.5 mr-1 text-blue-600" /> Re-sync
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(src)}
                            title="Edit Source Metadata"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteTarget(src)}
                            title="Remove Knowledge Link"
                            className="h-8 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border-rose-200"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
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
        title={editingSource ? "Edit Knowledge Source" : "Register AI Knowledge Link"}
        description="Connect educational content entities into the TopVeda AI retrieval index."
        maxWidth="md"
      >
        <form onSubmit={handleSaveSource} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Polymorphic Source Type *
            </label>
            <select
              value={formSourceType}
              onChange={(e) => setFormSourceType(e.target.value as ChatbotSourceType)}
              disabled={isSaving || !!editingSource}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="COURSE">COURSE (Full Course Catalog Master)</option>
              <option value="CHAPTER">CHAPTER (Curriculum Chapter & Syllabus)</option>
              <option value="STUDY_MATERIAL">STUDY_MATERIAL (PDF Notes & Formulae)</option>
              <option value="FAQ">FAQ (Verified Q&A Knowledge Pair)</option>
              <option value="CURRICULUM_SPEC">CURRICULUM_SPEC (Board Blueprint & Guide)</option>
            </select>
          </div>

          {!editingSource && (
            <Input
              label="Target Entity UUID *"
              value={formSourceId}
              onChange={(e) => setFormSourceId(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              error={formErrors.source_id}
              disabled={isSaving}
            />
          )}

          <Input
            label="Source Title / Reference *"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            placeholder="e.g. Class 10 Science NCERT Complete Chapter Notes"
            error={formErrors.title}
            disabled={isSaving}
          />

          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Description / Knowledge Scope
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Contains verified chemical reactions, periodic properties, and formula sheets."
              rows={3}
              disabled={isSaving}
              className="w-full rounded-xl border border-brand-border bg-brand-surface p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>

          {/* Active Toggle Checkbox */}
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsActive}
                onChange={(e) => setFormIsActive(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded text-brand-orange border-brand-border focus:ring-brand-orange"
              />
              <span className="text-xs font-bold text-emerald-900">
                Explicitly Enable for AI Chatbot Retrieval
              </span>
            </label>
            <p className="text-[11px] text-emerald-800 leading-snug pl-6">
              When checked, this knowledge source will be included in the vector embedding pipeline and retrieved during student doubt queries.
            </p>
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
              {isSaving ? "Saving..." : editingSource ? "Save Metadata" : "Register Knowledge Source"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Remove Knowledge Index Link"
        description="Are you sure you want to remove this knowledge link from the AI index? The underlying CMS record will remain intact."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {deleteTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-warm border border-brand-border text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{deleteTarget.title}</p>
              <p className="text-brand-text-muted">Type: {deleteTarget.source_type}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? "Removing..." : "Confirm Removal"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
