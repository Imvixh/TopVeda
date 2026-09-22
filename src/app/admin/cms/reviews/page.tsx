"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { StorageService } from "@/lib/services/storage.service";
import {
  CmsPendingReviewItem,
  ContentStatus,
  CmsLecture,
  CmsStudyMaterial,
  CmsBatch,
} from "@/types/cms.types";
import { ContentStatusBadge } from "@/components/admin/cms/content-status-badge";
import { ReviewApprovalModal } from "@/components/admin/cms/review-approval-modal";
import { ReviewRejectionModal } from "@/components/admin/cms/review-rejection-modal";
import { ReviewInspectionModal } from "@/components/admin/cms/review-inspection-modal";
import { ContentPreviewModal, PreviewContentItem } from "@/components/admin/cms/content-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileCheck2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle2,
  RotateCcw,
  Clock,
  CheckCheck,
  AlertOctagon,
  User,
  Calendar,
  Inbox,
  ShieldCheck,
} from "lucide-react";

export default function ReviewCenterPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [items, setItems] = React.useState<CmsPendingReviewItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<ContentStatus | "ALL">("PENDING_REVIEW");
  const [entityFilter, setEntityFilter] = React.useState<string>("ALL");

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modal States
  const [inspectTarget, setInspectTarget] = React.useState<CmsPendingReviewItem | null>(null);
  const [approveTarget, setApproveTarget] = React.useState<CmsPendingReviewItem | null>(null);
  const [rejectTarget, setRejectTarget] = React.useState<CmsPendingReviewItem | null>(null);
  const [previewTarget, setPreviewTarget] = React.useState<PreviewContentItem | null>(null);
  const [isActionProcessing, setIsActionProcessing] = React.useState(false);

  // Manual Refresh
  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Load Review Queue Data
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const { data, error } = await CmsService.getReviewQueueItems(supabase, statusFilter);
        if (!isMounted) return;

        if (error) {
          setFeedback({ type: "error", message: `Failed to load review queue: ${error.message}` });
        } else {
          setItems(data || []);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load review queue." });
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
  }, [supabase, refreshTrigger, statusFilter]);

  // Statistics
  const pendingCount = React.useMemo(() => {
    return items.filter((i) => i.status === "PENDING_REVIEW").length;
  }, [items]);

  const approvedCount = React.useMemo(() => {
    return items.filter((i) => i.status === "APPROVED").length;
  }, [items]);

  const rejectedCount = React.useMemo(() => {
    return items.filter((i) => i.status === "REJECTED").length;
  }, [items]);

  // Filtered Items
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      // Entity Filter
      if (entityFilter !== "ALL" && item.entity_type !== entityFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubject = item.subject ? item.subject.toLowerCase().includes(q) : false;
        const matchesAuthor = item.author_name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesSubject && !matchesAuthor) return false;
      }

      return true;
    });
  }, [items, entityFilter, searchQuery]);

  // Handler: Open Sandboxed Preview Modal
  const handleOpenPreview = async (item: CmsPendingReviewItem) => {
    try {
      if (item.entity_type === "LECTURE") {
        const { data: rawLectures } = await supabase
          .from("cms_lectures")
          .select("*")
          .eq("id", item.entity_id)
          .single();

        let signedThumb: string | null = null;
        if (rawLectures?.thumbnail_url && !rawLectures.thumbnail_url.startsWith("http") && !rawLectures.thumbnail_url.startsWith("/")) {
          const { signedUrl } = await StorageService.getSignedUrl(supabase, "lecture-thumbnails", rawLectures.thumbnail_url, 300);
          signedThumb = signedUrl;
        } else {
          signedThumb = rawLectures?.thumbnail_url || null;
        }

        const lectureData: CmsLecture = rawLectures || {
          id: item.entity_id,
          chapter_id: null,
          title: item.title,
          description: "",
          subject: item.subject || "Academics",
          teacher_name: item.author_name,
          duration_seconds: 1800,
          duration_formatted: "30:00",
          duration_human: "30 mins",
          thumbnail_url: item.media_preview_url || "/thumbnails/lecture_preview.jpg",
          thumbnail_bg: "#0A162B",
          category_tag: "CONCEPT",
          video_upload_status: "ready",
          is_home_featured: false,
          is_free_preview: true,
          display_order: 0,
          is_visible: true,
          status: item.status,
          created_at: item.submitted_at,
          updated_at: item.updated_at || item.submitted_at,
        };

        setPreviewTarget({ type: "LECTURE", data: lectureData, signedThumb });
      } else if (item.entity_type === "STUDY_MATERIAL") {
        const { data: rawMaterial } = await supabase
          .from("cms_study_materials")
          .select("*")
          .eq("id", item.entity_id)
          .single();

        let signedPdf: string | null = null;
        if (rawMaterial?.file_url && !rawMaterial.file_url.startsWith("http")) {
          const { signedUrl } = await StorageService.getSignedUrl(supabase, "study-materials", rawMaterial.file_url, 300);
          signedPdf = signedUrl;
        }

        const materialData: CmsStudyMaterial = rawMaterial || {
          id: item.entity_id,
          title: item.title,
          material_type: "notes",
          file_url: item.media_preview_url || "",
          download_count: 0,
          display_order: 0,
          is_visible: true,
          status: item.status,
          created_at: item.submitted_at,
          updated_at: item.updated_at || item.submitted_at,
        };

        setPreviewTarget({ type: "STUDY_MATERIAL", data: materialData, signedPdf });
      } else if (item.entity_type === "BATCH") {
        const { data: rawBatch } = await supabase
          .from("cms_batches")
          .select("*")
          .eq("id", item.entity_id)
          .single();

        const batchData: CmsBatch = rawBatch || {
          id: item.entity_id,
          title: item.title,
          subtitle: "Comprehensive target batch curriculum",
          board_label: item.subject || "CBSE Class 10",
          educator_name: item.author_name,
          educator_avatar_url: item.media_preview_url || "/avatars/doctor_female.jpg",
          cta_text: "Enroll Now →",
          display_order: 0,
          is_visible: true,
          status: item.status,
          created_at: item.submitted_at,
          updated_at: item.updated_at || item.submitted_at,
        };

        setPreviewTarget({ type: "BATCH", data: batchData });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to generate sandbox preview." });
    }
  };

  // Handler: Confirm Approval (PENDING_REVIEW -> APPROVED)
  const handleApproveConfirm = async () => {
    if (!approveTarget) return;
    setIsActionProcessing(true);

    try {
      const res = await fetch("/api/admin/cms/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: approveTarget.entity_type,
          entityId: approveTarget.entity_id,
          decision: "APPROVED",
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        setFeedback({ type: "error", message: result.error || "Failed to approve content submission." });
      } else {
        setFeedback({
          type: "success",
          message: `Submission "${approveTarget.title}" approved successfully. It is staged in APPROVED status and ready for publishing.`,
        });
        setApproveTarget(null);
        handleManualRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to record approval decision." });
    } finally {
      setIsActionProcessing(false);
    }
  };

  // Handler: Confirm Rejection (PENDING_REVIEW -> REJECTED)
  const handleRejectConfirm = async (reviewNote: string) => {
    if (!rejectTarget) return;
    setIsActionProcessing(true);

    try {
      const res = await fetch("/api/admin/cms/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: rejectTarget.entity_type,
          entityId: rejectTarget.entity_id,
          decision: "REJECTED",
          reviewNote,
        }),
      });

      const result = await res.json();
      if (!res.ok || result.error) {
        setFeedback({ type: "error", message: result.error || "Failed to reject content submission." });
      } else {
        setFeedback({
          type: "info",
          message: `Submission "${rejectTarget.title}" returned for revision with feedback note.`,
        });
        setRejectTarget(null);
        handleManualRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to record rejection decision." });
    } finally {
      setIsActionProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                Review Center
              </h1>
              <p className="text-xs text-brand-text-muted">
                Super Admin governance review workspace for educator submissions and quality approvals
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
            <span>Refresh Queue</span>
          </Button>
        </div>
      </div>

      {/* Governance Banner Callout */}
      <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 text-xs text-sky-950 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold text-sky-950">Approved Content Lifecycle Rule</p>
          <p className="text-[11px] text-sky-800">
            Approving a submission transitions it to <strong className="font-semibold text-sky-950">APPROVED</strong>, signifying editorial sign-off. It does <em>not</em> publish to students. Publishing requires a subsequent Super Admin governance action from the content module.
          </p>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => setStatusFilter("PENDING_REVIEW")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "PENDING_REVIEW"
              ? "bg-amber-500/10 border-amber-400 shadow-sm ring-2 ring-amber-400/20"
              : "bg-brand-surface border-brand-border hover:border-brand-border-strong"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Pending Review
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900">
              {statusFilter === "PENDING_REVIEW" ? items.length : pendingCount}
            </span>
            <span className="text-[11px] text-amber-700">awaiting decision</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("APPROVED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "APPROVED"
              ? "bg-sky-500/10 border-sky-400 shadow-sm ring-2 ring-sky-400/20"
              : "bg-brand-surface border-brand-border hover:border-brand-border-strong"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Approved
            </span>
            <CheckCheck className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-900">
              {statusFilter === "APPROVED" ? items.length : approvedCount}
            </span>
            <span className="text-[11px] text-sky-700">staged for publish</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("REJECTED")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "REJECTED"
              ? "bg-rose-500/10 border-rose-400 shadow-sm ring-2 ring-rose-400/20"
              : "bg-brand-surface border-brand-border hover:border-brand-border-strong"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Returned / Rejected
            </span>
            <AlertOctagon className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-900">
              {statusFilter === "REJECTED" ? items.length : rejectedCount}
            </span>
            <span className="text-[11px] text-rose-700">needs author revision</span>
          </div>
        </div>

        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-brand-orange/10 border-brand-orange shadow-sm ring-2 ring-brand-orange/20"
              : "bg-brand-surface border-brand-border hover:border-brand-border-strong"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-text-muted">
              Total Monitored
            </span>
            <Inbox className="h-4 w-4 text-brand-text-muted" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-brand-text-primary">
              {items.length}
            </span>
            <span className="text-[11px] text-brand-text-muted">queue records</span>
          </div>
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

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
            <Input
              placeholder="Search by title, subject, educator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-brand-text-muted shrink-0" />
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Entity Types</option>
              <option value="LECTURE">Lectures</option>
              <option value="STUDY_MATERIAL">Study Materials</option>
              <option value="BATCH">Batches</option>
              <option value="COURSE">Courses</option>
              <option value="CHAPTER">Chapters</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-muted shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContentStatus | "ALL")}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="PENDING_REVIEW">Pending Review (Default)</option>
              <option value="APPROVED">Approved (Staged)</option>
              <option value="REJECTED">Returned for Revision</option>
              <option value="ALL">All Statuses</option>
            </select>
          </div>
        </div>
      </div>

      {/* Review Queue Listing */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-extrabold text-sm text-brand-text-primary flex items-center gap-1.5">
            <span>Review Queue Submissions</span>
            <span className="text-xs font-normal text-brand-text-muted">
              ({filteredItems.length} {filteredItems.length === 1 ? "item" : "items"})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
            <p className="text-xs font-medium text-brand-text-muted">Loading review submissions...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              {searchQuery || entityFilter !== "ALL" ? (
                <Search className="h-6 w-6" />
              ) : (
                <Inbox className="h-6 w-6" />
              )}
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-brand-text-primary">
                {searchQuery || entityFilter !== "ALL"
                  ? "No matching submissions found"
                  : statusFilter === "PENDING_REVIEW"
                  ? "All Clear! No Pending Reviews"
                  : "No submissions in this view"}
              </h3>
              <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                {searchQuery || entityFilter !== "ALL"
                  ? "Try adjusting your search keywords or entity filters."
                  : statusFilter === "PENDING_REVIEW"
                  ? "There are currently no educator submissions waiting for Super Admin review decision."
                  : "Change the status filter above to inspect pending or previous submissions."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3.5">Content & Type</th>
                    <th className="p-3.5">Submitted By</th>
                    <th className="p-3.5">Submission Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Governance Snapshot</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredItems.map((item) => {
                    const isPending = item.status === "PENDING_REVIEW";

                    return (
                      <tr key={`${item.entity_type}-${item.entity_id}`} className="hover:bg-brand-bg-warm/30 transition-colors">
                        {/* Content & Type */}
                        <td className="p-3.5 space-y-1 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold uppercase text-brand-orange bg-brand-bg-peach px-1.5 py-0.5 rounded border border-brand-orange-border/40">
                              {item.entity_type.replace(/_/g, " ")}
                            </span>
                            {item.subject && (
                              <span className="text-[10px] text-brand-text-muted font-medium truncate max-w-[120px]">
                                • {item.subject}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-brand-text-primary text-xs line-clamp-1">
                            {item.title}
                          </p>
                        </td>

                        {/* Submitted By */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 text-brand-text-primary font-medium">
                            <User className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                            <span>{item.author_name}</span>
                          </div>
                        </td>

                        {/* Submission Date */}
                        <td className="p-3.5 text-brand-text-muted text-[11px] whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                            <span>
                              {new Date(item.submitted_at).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3.5 whitespace-nowrap">
                          <ContentStatusBadge status={item.status} size="sm" />
                        </td>

                        {/* Governance Snapshot / Review Note */}
                        <td className="p-3.5 max-w-xs">
                          {item.review_note ? (
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-semibold text-rose-700 block">Feedback Note:</span>
                              <p className="text-[11px] text-brand-text-primary italic line-clamp-1">
                                &ldquo;{item.review_note}&rdquo;
                              </p>
                            </div>
                          ) : item.reviewed_at ? (
                            <span className="text-[10px] text-brand-text-muted">
                              Reviewed on {new Date(item.reviewed_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Awaiting Decision
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInspectTarget(item)}
                              title="Inspect Submission Details"
                              className="h-8 px-2 text-xs font-semibold"
                            >
                              <FileCheck2 className="h-3.5 w-3.5 mr-1 text-brand-orange" /> Inspect
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenPreview(item)}
                              title="Student Simulation Preview"
                              className="h-8 px-2 text-xs font-semibold"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-600" />
                            </Button>

                            {isPending && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => setApproveTarget(item)}
                                  title="Approve Submission"
                                  className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRejectTarget(item)}
                                  title="Return for Revision"
                                  className="h-8 px-2 text-xs font-bold text-rose-700 hover:bg-rose-50 border-rose-200"
                                >
                                  <RotateCcw className="h-3.5 w-3.5 mr-1 text-rose-600" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Approval Confirmation Modal */}
      <ReviewApprovalModal
        item={approveTarget}
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApproveConfirm}
        isProcessing={isActionProcessing}
      />

      {/* Rejection / Return Modal */}
      <ReviewRejectionModal
        item={rejectTarget}
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        isProcessing={isActionProcessing}
      />

      {/* Review Inspection & Snapshot Modal */}
      <ReviewInspectionModal
        item={inspectTarget}
        isOpen={!!inspectTarget}
        onClose={() => setInspectTarget(null)}
        onOpenApprove={(item) => setApproveTarget(item)}
        onOpenReject={(item) => setRejectTarget(item)}
        onOpenPreview={(item) => handleOpenPreview(item)}
      />

      {/* Student Experience Simulation Preview Modal */}
      <ContentPreviewModal
        item={previewTarget}
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
