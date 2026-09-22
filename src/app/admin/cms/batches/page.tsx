"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsBatch, CmsCourse, CmsBoard, CmsClassLevel, ContentStatus, BatchBadgeVariant } from "@/types/cms.types";
import { ContentStatusBadge } from "@/components/admin/cms/content-status-badge";
import { ScheduleStatusBadge } from "@/components/admin/cms/schedule-status-badge";
import {
  PublishConfirmationDialog,
  PublishDialogTarget,
} from "@/components/admin/cms/publish-confirmation-dialog";
import {
  ContentPreviewModal,
  PreviewContentItem,
} from "@/components/admin/cms/content-preview-modal";
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Archive,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Star,
  Radio,
  User,
  Globe2,
  FileEdit,
} from "lucide-react";

export default function BatchesCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [batches, setBatches] = React.useState<CmsBatch[]>([]);
  const [courses, setCourses] = React.useState<CmsCourse[]>([]);
  const [boards, setBoards] = React.useState<CmsBoard[]>([]);
  const [classLevels, setClassLevels] = React.useState<CmsClassLevel[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [featuredFilter, setFeaturedFilter] = React.useState<string>("ALL");
  const [statusTypeFilter, setStatusTypeFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBatch, setEditingBatch] = React.useState<CmsBatch | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsBatch | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Publishing & Governance Dialog State
  const [publishTarget, setPublishTarget] = React.useState<PublishDialogTarget | null>(null);
  const [isPublishProcessing, setIsPublishProcessing] = React.useState(false);

  // Simulation Preview Modal State
  const [previewItem, setPreviewItem] = React.useState<PreviewContentItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [formCourseId, setFormCourseId] = React.useState("");
  const [formBoardId, setFormBoardId] = React.useState("");
  const [formClassId, setFormClassId] = React.useState("");
  const [formBoardLabel, setFormBoardLabel] = React.useState("");
  const [formSubtitle, setFormSubtitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formBadgeText, setFormBadgeText] = React.useState("Trending");
  const [formBadgeVariant, setFormBadgeVariant] = React.useState<BatchBadgeVariant>("orange");
  const [formIsFeatured, setFormIsFeatured] = React.useState(false);
  const [formIsOngoing, setFormIsOngoing] = React.useState(true);
  const [formStatusType, setFormStatusType] = React.useState<"live" | "ongoing">("ongoing");
  const [formEducatorName, setFormEducatorName] = React.useState("Dr. Vandana Sharma");
  const [formEducatorAvatarUrl, setFormEducatorAvatarUrl] = React.useState("/avatars/doctor_female.jpg");
  const [formBgGradient, setFormBgGradient] = React.useState("from-sky-50/70 via-blue-50/40 to-indigo-50/30");
  const [formBorderColor, setFormBorderColor] = React.useState("border-sky-100");
  const [formIconType, setFormIconType] = React.useState("math");
  const [formIconBg, setFormIconBg] = React.useState("bg-emerald-50 border-emerald-100 text-emerald-600");
  const [formIconColor, setFormIconColor] = React.useState("text-emerald-600");
  const [formCtaText, setFormCtaText] = React.useState("Explore →");
  const [formCtaLink, setFormCtaLink] = React.useState("/student/batches");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formEndsAt, setFormEndsAt] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [bData, cData, clData, batchesData] = await Promise.all([
          CmsService.getBoards(supabase),
          CmsService.getCourses(supabase),
          CmsService.getClassLevels(supabase),
          CmsService.getBatches(supabase),
        ]);
        if (!isMounted) return;
        setBoards(bData);
        setCourses(cData);
        setClassLevels(clData);
        setBatches(batchesData);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load batches and academic dependencies." });
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormTitle(val);
    if (!editingBatch) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormSlug(autoSlug);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    setFormTitle("");
    setFormSlug("");
    setFormCourseId(courses[0]?.id || "");
    setFormBoardId(boards[0]?.id || "");
    setFormClassId(classLevels[0]?.id || "");
    setFormBoardLabel(boards[0]?.name || "CBSE Board");
    setFormSubtitle("Complete Syllabus Fast Track with Top Mentors");
    setFormDescription("");
    setFormBadgeText("Featured");
    setFormBadgeVariant("orange");
    setFormIsFeatured(true);
    setFormIsOngoing(true);
    setFormStatusType("ongoing");
    setFormEducatorName("Dr. Vandana Sharma");
    setFormEducatorAvatarUrl("/avatars/doctor_female.jpg");
    setFormBgGradient("from-sky-50/70 via-blue-50/40 to-indigo-50/30");
    setFormBorderColor("border-sky-100");
    setFormIconType("math");
    setFormIconBg("bg-emerald-50 border-emerald-100 text-emerald-600");
    setFormIconColor("text-emerald-600");
    setFormCtaText("Explore →");
    setFormCtaLink("/student/batches");
    setFormDisplayOrder(batches.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (batch: CmsBatch) => {
    setEditingBatch(batch);
    setFormTitle(batch.title);
    setFormSlug(batch.slug);
    setFormCourseId(batch.course_id || "");
    setFormBoardId(batch.board_id);
    setFormClassId(batch.class_id);
    setFormBoardLabel(batch.board_label);
    setFormSubtitle(batch.subtitle);
    setFormDescription(batch.description || "");
    setFormBadgeText(batch.badge_text || "");
    setFormBadgeVariant(batch.badge_variant);
    setFormIsFeatured(batch.is_featured);
    setFormIsOngoing(batch.is_ongoing);
    setFormStatusType(batch.status_type);
    setFormEducatorName(batch.educator_name);
    setFormEducatorAvatarUrl(batch.educator_avatar_url);
    setFormBgGradient(batch.bg_gradient);
    setFormBorderColor(batch.border_color);
    setFormIconType(batch.icon_type);
    setFormIconBg(batch.icon_bg);
    setFormIconColor(batch.icon_color);
    setFormCtaText(batch.cta_text);
    setFormCtaLink(batch.cta_link);
    setFormDisplayOrder(batch.display_order);
    setFormIsVisible(batch.is_visible);
    setFormStatus(batch.status);
    if (batch.starts_at) {
      try {
        const d = new Date(batch.starts_at);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setFormStartsAt(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch {
        setFormStartsAt("");
      }
    } else {
      setFormStartsAt("");
    }
    if (batch.ends_at) {
      try {
        const d = new Date(batch.ends_at);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setFormEndsAt(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch {
        setFormEndsAt("");
      }
    } else {
      setFormEndsAt("");
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = "Batch title is required";
    if (!formSlug.trim()) errors.slug = "URL slug is required";
    if (!formBoardId) errors.boardId = "Board is required";
    if (!formClassId) errors.classId = "Class level is required";
    if (!formBoardLabel.trim()) errors.boardLabel = "Board label is required (e.g. CBSE 10th)";
    if (!formSubtitle.trim()) errors.subtitle = "Subtitle is required";
    if (!formEducatorName.trim()) errors.educatorName = "Educator name is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsBatch> = {
      ...(editingBatch ? { id: editingBatch.id } : {}),
      title: formTitle.trim(),
      slug: formSlug.trim().toLowerCase(),
      course_id: formCourseId || null,
      board_id: formBoardId,
      class_id: formClassId,
      board_label: formBoardLabel.trim(),
      subtitle: formSubtitle.trim(),
      description: formDescription.trim() || null,
      badge_text: formBadgeText.trim() || null,
      badge_variant: formBadgeVariant,
      is_featured: formIsFeatured,
      is_ongoing: formIsOngoing,
      status_type: formStatusType,
      educator_name: formEducatorName.trim(),
      educator_avatar_url: formEducatorAvatarUrl.trim() || "/avatars/doctor_female.jpg",
      bg_gradient: formBgGradient.trim(),
      border_color: formBorderColor.trim(),
      icon_type: formIconType.trim(),
      icon_bg: formIconBg.trim(),
      icon_color: formIconColor.trim(),
      cta_text: formCtaText.trim() || "Explore →",
      cta_link: formCtaLink.trim() || "/student/batches",
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertBatch(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save batch." });
    } else {
      setFeedback({
        type: "success",
        message: editingBatch ? "Batch updated successfully." : "Batch created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_batches", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive batch." });
    } else {
      setFeedback({ type: "success", message: `Batch "${archiveTarget.title}" archived successfully.` });
      handleManualRefresh();
    }
  };

  const handleToggleVisibility = async (batch: CmsBatch) => {
    const nextVal = !batch.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_batches", batch.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `Batch "${batch.title}" visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
      });
      handleManualRefresh();
    }
  };

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
            entityType: "BATCH",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish batch." });
        } else {
          setFeedback({ type: "success", message: `Batch "${publishTarget.title}" published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish batch." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      // Unpublish action
      const { error } = await CmsService.unpublishContent(supabase, "BATCH", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish batch." });
      } else {
        setFeedback({ type: "success", message: `Batch "${publishTarget.title}" unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  // Filtered Batches List
  const filteredBatches = React.useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        searchQuery === "" ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.board_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.educator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFeatured =
        featuredFilter === "ALL" ||
        (featuredFilter === "FEATURED" && b.is_featured) ||
        (featuredFilter === "NOT_FEATURED" && !b.is_featured);

      const matchesStatusType = statusTypeFilter === "ALL" || b.status_type === statusTypeFilter;
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

      return matchesSearch && matchesFeatured && matchesStatusType && matchesStatus;
    });
  }, [batches, searchQuery, featuredFilter, statusTypeFilter, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              COHORTS & ENROLLMENT
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              cms_batches
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <Layers className="h-7 w-7 text-brand-orange" />
            <span>Batches & Cohorts</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Manage featured cohorts (Section 1) and ongoing batches (Section 2) with assigned educators and styling cards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Batch
          </Button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Search & Filter Toolbar */}
      <Card className="p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Input
              placeholder="Search batches by title, educator, or label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <select
              aria-label="Filter batches by featured status"
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Showcase Types</option>
              <option value="FEATURED">Section 1: Featured</option>
              <option value="NOT_FEATURED">Section 2: Ongoing Catalog</option>
            </select>
          </div>

          <div>
            <select
              aria-label="Filter batches by status type"
              value={statusTypeFilter}
              onChange={(e) => setStatusTypeFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Status Types</option>
              <option value="ongoing">Ongoing</option>
              <option value="live">Live Now</option>
            </select>
          </div>

          <div>
            <select
              aria-label="Filter batches by publication status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 3. Data Table */}
      <Card className="p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-brand-bg-warm/80 border-b border-brand-border text-brand-text-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Batch Title & Board</th>
                <th className="py-3 px-4">Educator</th>
                <th className="py-3 px-4 text-center">Schedule</th>
                <th className="py-3 px-4 text-center">Badge</th>
                <th className="py-3 px-4 text-center">Featured / Type</th>
                <th className="py-3 px-4 text-center">Order</th>
                <th className="py-3 px-4 text-center">Visibility</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-brand-orange" />
                      <span>Loading batches...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-text-muted">
                    <div className="space-y-2">
                      <Layers className="h-8 w-8 text-brand-text-muted/50 mx-auto" />
                      <p className="font-bold text-brand-text-primary">No batches found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search filter." : "Click '+ Add Batch' to create the first cohort offering."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-brand-text-primary max-w-sm">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-brand-text-primary line-clamp-1">{b.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-brand-text-muted">
                          <span className="font-bold text-brand-orange">{b.board_label}</span>
                          <span>•</span>
                          <span className="truncate">{b.subtitle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-text-primary">
                        <User className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                        <span className="truncate">{b.educator_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <ScheduleStatusBadge startsAt={b.starts_at} endsAt={b.ends_at} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {b.badge_text ? (
                        <Badge
                          variant={
                            b.badge_variant === "orange"
                              ? "peach"
                              : b.badge_variant === "green"
                              ? "success"
                              : "neutral"
                          }
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {b.badge_text}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {b.is_featured && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Featured
                          </span>
                        )}
                        {b.status_type === "live" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">
                            <Radio className="h-3 w-3" /> Live
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-brand-text-muted">Ongoing</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{b.display_order}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(b)}
                        title="Click to toggle visibility"
                        className="cursor-pointer focus:outline-none"
                      >
                        {b.is_visible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 transition-colors">
                            <Eye className="h-3 w-3" /> Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded-full border border-gray-200 transition-colors">
                            <EyeOff className="h-3 w-3" /> Hidden
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <ContentStatusBadge status={b.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewItem({ type: "BATCH", data: b })}
                          className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                          title="Preview Student Experience"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {b.status !== "PUBLISHED" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setPublishTarget({
                                entityType: "BATCH",
                                entityId: b.id,
                                title: b.title,
                                currentStatus: b.status,
                                isVisible: b.is_visible,
                                startsAt: b.starts_at,
                                endsAt: b.ends_at,
                                displayOrder: b.display_order,
                                featuredNote: b.is_featured ? "Featured Batch" : undefined,
                                action: "PUBLISH",
                              })
                            }
                            className="h-7 w-7 text-brand-text-muted hover:text-emerald-600"
                            title="Publish Batch"
                          >
                            <Globe2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setPublishTarget({
                                entityType: "BATCH",
                                entityId: b.id,
                                title: b.title,
                                currentStatus: b.status,
                                isVisible: b.is_visible,
                                startsAt: b.starts_at,
                                endsAt: b.ends_at,
                                displayOrder: b.display_order,
                                featuredNote: b.is_featured ? "Featured Batch" : undefined,
                                action: "UNPUBLISH",
                              })
                            }
                            className="h-7 w-7 text-brand-text-muted hover:text-amber-600"
                            title="Unpublish Batch"
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(b)}
                          className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                          title="Edit Batch"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {b.status !== "ARCHIVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setArchiveTarget(b)}
                            className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                            title="Archive Batch"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Create / Edit Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingBatch ? "Edit Batch / Cohort" : "Create Batch / Cohort"}
        description="Configure cohort offering, educator assignment, badge styling, and card themes."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBatch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Batch Title *"
              placeholder="e.g. Lakshya NEET 2026 Comprehensive"
              value={formTitle}
              onChange={handleTitleChange}
              error={formErrors.title}
              disabled={isSaving}
            />

            <Input
              label="URL Slug *"
              placeholder="e.g. lakshya-neet-2026"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              error={formErrors.slug}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Target Board *</label>
              <select
                aria-label="Target board"
                value={formBoardId}
                onChange={(e) => setFormBoardId(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Class Level *</label>
              <select
                aria-label="Class level"
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                {classLevels.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Linked Course</label>
              <select
                aria-label="Linked course"
                value={formCourseId}
                onChange={(e) => setFormCourseId(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="">None / Standalone Batch</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Board Label Badge *"
              placeholder="e.g. CBSE 10th Board"
              value={formBoardLabel}
              onChange={(e) => setFormBoardLabel(e.target.value)}
              error={formErrors.boardLabel}
              disabled={isSaving}
            />

            <Input
              label="Subtitle *"
              placeholder="e.g. Complete Syllabus with Mentors"
              value={formSubtitle}
              onChange={(e) => setFormSubtitle(e.target.value)}
              error={formErrors.subtitle}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Lead Educator Name *"
              placeholder="e.g. Dr. Vandana Sharma"
              value={formEducatorName}
              onChange={(e) => setFormEducatorName(e.target.value)}
              error={formErrors.educatorName}
              disabled={isSaving}
            />

            <Input
              label="Educator Avatar URL"
              placeholder="/avatars/doctor_female.jpg"
              value={formEducatorAvatarUrl}
              onChange={(e) => setFormEducatorAvatarUrl(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Badge Text"
              placeholder="e.g. Featured / Trending"
              value={formBadgeText}
              onChange={(e) => setFormBadgeText(e.target.value)}
              disabled={isSaving}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Badge Color Variant</label>
              <select
                aria-label="Badge color variant"
                value={formBadgeVariant}
                onChange={(e) => setFormBadgeVariant(e.target.value as BatchBadgeVariant)}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="orange">Orange</option>
                <option value="pink">Pink</option>
                <option value="green">Green</option>
                <option value="purple">Purple</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Status Type</label>
              <select
                aria-label="Status type"
                value={formStatusType}
                onChange={(e) => setFormStatusType(e.target.value as "live" | "ongoing")}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="ongoing">Ongoing</option>
                <option value="live">Live Now</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="CTA Text"
              placeholder="Explore →"
              value={formCtaText}
              onChange={(e) => setFormCtaText(e.target.value)}
              disabled={isSaving}
            />

            <Input
              label="CTA Redirect Link"
              placeholder="/student/batches"
              value={formCtaLink}
              onChange={(e) => setFormCtaLink(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Display Order"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
              disabled={isSaving}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Publication Status</label>
              <select
                aria-label="Publication status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-brand-text-primary">
                Starts At (Activation Window)
              </label>
              <input
                type="datetime-local"
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-brand-text-primary">
                Ends At (Expiry Window)
              </label>
              <input
                type="datetime-local"
                value={formEndsAt}
                onChange={(e) => setFormEndsAt(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsFeaturedBatch"
                checked={formIsFeatured}
                onChange={(e) => setFormIsFeatured(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
              />
              <label htmlFor="formIsFeaturedBatch" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
                Section 1: Featured Batch Hero Card
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsOngoingBatch"
                checked={formIsOngoing}
                onChange={(e) => setFormIsOngoing(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
              />
              <label htmlFor="formIsOngoingBatch" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
                Section 2: Ongoing Cohort Grid
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsVisibleBatch"
                checked={formIsVisible}
                onChange={(e) => setFormIsVisible(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
              />
              <label htmlFor="formIsVisibleBatch" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
                Visible to Students
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-brand-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSaving} className="shadow-2xs">
              {isSaving ? "Saving..." : editingBatch ? "Update Batch" : "Create Batch"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Batch?"
        description="Are you sure you want to archive this batch? It will be removed from active student enrollment cards."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-peach/50 border border-brand-orange-border/60 text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.title}</p>
              <p className="text-brand-text-muted">Slug: {archiveTarget.slug}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setArchiveTarget(null)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleArchiveConfirm}
              disabled={isArchiving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isArchiving ? "Archiving..." : "Confirm Archive"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. Step 5D Publishing Confirmation Dialog */}
      <PublishConfirmationDialog
        target={publishTarget}
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={handlePublishConfirm}
        isProcessing={isPublishProcessing}
      />

      {/* 7. Step 5D Student Experience Simulation Preview */}
      <ContentPreviewModal
        item={previewItem}
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}
