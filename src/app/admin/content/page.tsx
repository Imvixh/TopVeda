"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CmsService } from "@/lib/services/cms.service";
import { EducatorContentItem, CmsBatch, CmsLecture, CmsLiveClass, CmsStudyMaterial } from "@/types/cms.types";
import { ContentStatusBadge } from "@/components/admin/cms/content-status-badge";
import { ContentPreviewModal, PreviewContentItem } from "@/components/admin/cms/content-preview-modal";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import {
  FileEdit,
  Send,
  Eye,
  Plus,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  FileText,
  Radio,
  Layers,
  BookOpen,
  ArrowLeft,
  LogOut,
  Loader2,
  Info,
} from "lucide-react";

export default function EducatorContentStudioPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading, logout } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [items, setItems] = React.useState<EducatorContentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusTab, setStatusTab] = React.useState<string>("ALL");
  const [typeFilter, setTypeFilter] = React.useState<string>("ALL");

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Submit for Review Dialog State
  const [submitTarget, setSubmitTarget] = React.useState<EducatorContentItem | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Preview State
  const [previewTarget, setPreviewTarget] = React.useState<PreviewContentItem | null>(null);

  // Creation Wizard Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [createEntityType, setCreateEntityType] = React.useState<
    "LECTURE" | "STUDY_MATERIAL" | "LIVE_CLASS" | "CHAPTER" | "BATCH"
  >("LECTURE");
  const [createTitle, setCreateTitle] = React.useState("");
  const [createSubject, setCreateSubject] = React.useState("Mathematics");
  const [createExtraField, setCreateExtraField] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [createErrors, setCreateErrors] = React.useState<Record<string, string>>({});

  // Edit Modal State
  const [editingItem, setEditingItem] = React.useState<EducatorContentItem | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editSubtitle, setEditSubtitle] = React.useState("");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Load Content Items
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user?.id) return;
      try {
        const { data, error } = await CmsService.getEducatorContent(supabase, user.id);
        if (!isMounted) return;
        if (error) {
          setFeedback({ type: "error", message: error.message || "Failed to load content workspace." });
        } else {
          setItems(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load content workspace." });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!isAuthLoading) {
      void loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id, isAuthLoading, refreshTrigger]);

  // Submit For Review Action
  const handleConfirmSubmit = async () => {
    if (!submitTarget) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/content/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: submitTarget.entityType,
          entityId: submitTarget.id,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.error) {
        setFeedback({ type: "error", message: result.error || "Failed to submit content for review." });
      } else {
        setFeedback({
          type: "success",
          message: `"${submitTarget.title}" has been submitted to Super Admin for review.`,
        });
        setSubmitTarget(null);
        handleManualRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to submit content for review." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Create New Content
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      setCreateErrors({ title: "Title is required" });
      return;
    }
    if (!user?.id) return;

    setIsCreating(true);
    setFeedback(null);

    try {
      if (createEntityType === "LECTURE") {
        const { error } = await supabase.from("cms_lectures").insert({
          title: createTitle.trim(),
          slug: createTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
          subject: createSubject,
          teacher_name: profile?.fullName || "Educator",
          educator_id: user.id,
          submitted_by: user.id,
          created_by: user.id,
          duration_seconds: 1800,
          duration_formatted: "30:00",
          duration_human: "30 mins",
          thumbnail_url: "/thumbnails/lecture_math.jpg",
          thumbnail_bg: "bg-slate-900",
          category_tag: "Core Concept",
          video_upload_status: "ready",
          status: "DRAFT",
          is_visible: false,
          display_order: 0,
        });
        if (error) throw new Error(error.message);
      } else if (createEntityType === "STUDY_MATERIAL") {
        const { error } = await supabase.from("cms_study_materials").insert({
          title: createTitle.trim(),
          material_type: "notes",
          file_url: createExtraField || "https://example.com/notes.pdf",
          download_count: 0,
          submitted_by: user.id,
          created_by: user.id,
          status: "DRAFT",
          is_visible: false,
          display_order: 0,
        });
        if (error) throw new Error(error.message);
      } else if (createEntityType === "LIVE_CLASS") {
        const { error } = await supabase.from("cms_live_classes").insert({
          topic: createTitle.trim(),
          subject: createSubject,
          educator_name: profile?.fullName || "Educator",
          educator_avatar_url: "/avatars/doctor_female.jpg",
          educator_id: user.id,
          submitted_by: user.id,
          created_by: user.id,
          scheduled_start: new Date(Date.now() + 86400000).toISOString(),
          time_display: "Tomorrow, 6:00 PM",
          is_live: false,
          status_text: "UPCOMING",
          live_status: "SCHEDULED",
          cta_text: "Join Live",
          status: "DRAFT",
          is_visible: false,
          display_order: 0,
        });
        if (error) throw new Error(error.message);
      } else if (createEntityType === "CHAPTER") {
        const { error } = await supabase.from("cms_chapters").insert({
          title: createTitle.trim(),
          slug: createTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
          chapter_number: 1,
          submitted_by: user.id,
          created_by: user.id,
          status: "DRAFT",
          is_visible: false,
          display_order: 0,
        });
        if (error) throw new Error(error.message);
      } else if (createEntityType === "BATCH") {
        const { error } = await supabase.from("cms_batches").insert({
          title: createTitle.trim(),
          slug: createTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now(),
          board_id: "cbse-board",
          class_id: "class-10",
          board_label: "CBSE Class 10",
          subtitle: "Comprehensive Syllabus Coverage",
          educator_name: profile?.fullName || "Lead Educator",
          educator_avatar_url: "/avatars/doctor_female.jpg",
          lead_educator_id: user.id,
          submitted_by: user.id,
          created_by: user.id,
          badge_variant: "orange",
          status_type: "ongoing",
          bg_gradient: "from-sky-50 via-blue-50 to-indigo-50",
          border_color: "border-sky-200",
          icon_type: "math",
          icon_bg: "bg-emerald-50",
          icon_color: "text-emerald-600",
          cta_text: "Enroll Now →",
          cta_link: "/student/batches",
          status: "DRAFT",
          is_visible: false,
          display_order: 0,
        });
        if (error) throw new Error(error.message);
      }

      setFeedback({
        type: "success",
        message: `New draft "${createTitle.trim()}" created successfully. You can now edit and submit it for review.`,
      });
      setIsCreateModalOpen(false);
      setCreateTitle("");
      setCreateExtraField("");
      setCreateErrors({});
      handleManualRefresh();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to create draft." });
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: EducatorContentItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditSubtitle(item.subtitle || "");
    setIsModalOpen(true);
  };

  // Save Edit
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSavingEdit(true);
    setFeedback(null);

    const tableMap: Record<string, string> = {
      BATCH: "cms_batches",
      CHAPTER: "cms_chapters",
      LECTURE: "cms_lectures",
      LIVE_CLASS: "cms_live_classes",
      STUDY_MATERIAL: "cms_study_materials",
    };
    const targetTable = tableMap[editingItem.entityType];

    try {
      const updatePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (editingItem.entityType === "LIVE_CLASS") {
        updatePayload.topic = editTitle.trim();
      } else {
        updatePayload.title = editTitle.trim();
      }
      if (editSubtitle && (editingItem.entityType === "BATCH" || editingItem.entityType === "LECTURE")) {
        updatePayload.subtitle = editSubtitle.trim();
      }

      const { error } = await supabase.from(targetTable).update(updatePayload).eq("id", editingItem.id);
      if (error) throw new Error(error.message);

      setFeedback({
        type: "success",
        message: `Changes saved for "${editTitle.trim()}".`,
      });
      setIsModalOpen(false);
      setEditingItem(null);
      handleManualRefresh();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to save edits." });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = (item: EducatorContentItem) => {
    if (item.entityType === "BATCH" && item.details) {
      setPreviewTarget({ type: "BATCH", data: item.details as unknown as CmsBatch });
    } else if (item.entityType === "LECTURE" && item.details) {
      setPreviewTarget({ type: "LECTURE", data: item.details as unknown as CmsLecture });
    } else if (item.entityType === "LIVE_CLASS" && item.details) {
      setPreviewTarget({ type: "LIVE_CLASS", data: item.details as unknown as CmsLiveClass });
    } else if (item.entityType === "STUDY_MATERIAL" && item.details) {
      setPreviewTarget({ type: "STUDY_MATERIAL", data: item.details as unknown as CmsStudyMaterial });
    }
  };

  // Filtered List
  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      if (statusTab !== "ALL" && item.status !== statusTab) return false;
      if (typeFilter !== "ALL" && item.entityType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchSub = item.subtitle?.toLowerCase().includes(q);
        if (!matchTitle && !matchSub) return false;
      }
      return true;
    });
  }, [items, statusTab, typeFilter, searchQuery]);

  // Counts by status
  const counts = React.useMemo(() => {
    return {
      all: items.length,
      draft: items.filter((i) => i.status === "DRAFT").length,
      pending: items.filter((i) => i.status === "PENDING_REVIEW").length,
      rejected: items.filter((i) => i.status === "REJECTED").length,
      approved: items.filter((i) => i.status === "APPROVED").length,
      published: items.filter((i) => i.status === "PUBLISHED").length,
    };
  }, [items]);

  // Render Icon for Entity Type
  const renderEntityIcon = (type: string) => {
    switch (type) {
      case "LECTURE":
        return <Video className="h-4 w-4 text-purple-600" />;
      case "STUDY_MATERIAL":
        return <FileText className="h-4 w-4 text-emerald-600" />;
      case "LIVE_CLASS":
        return <Radio className="h-4 w-4 text-red-600" />;
      case "CHAPTER":
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case "BATCH":
      default:
        return <Layers className="h-4 w-4 text-amber-600" />;
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">Loading Content Studio...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-brand-surface border-b border-brand-border/80">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <BrandGlyph size={26} />
              <div className="flex items-center gap-1.5">
                <Wordmark size="sm" />
                <Badge variant="peach" size="sm" className="text-[10px] uppercase font-bold">
                  Educator Studio
                </Badge>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-xs font-semibold">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Admin Center
                </Button>
              </Link>
              {isSuperAdmin && (
                <Link href="/admin/cms">
                  <Button variant="outline" size="sm" className="text-xs font-semibold text-brand-orange border-brand-orange/30">
                    Super Admin CMS
                  </Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8">
        <Container size="xl">
          <div className="space-y-6">
            {/* Header Title & CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-brand-orange text-white flex items-center justify-center shadow-md">
                    <FileEdit className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                      Educator Content Studio & Submissions
                    </h1>
                    <p className="text-xs text-brand-text-muted">
                      Draft your course lectures, notes, live sessions, and batches, then submit for Super Admin review and publishing.
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
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white shadow-2xs text-xs font-bold"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Draft</span>
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

            {/* Status Tabs Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-brand-border/60">
              <button
                onClick={() => setStatusTab("ALL")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusTab === "ALL"
                    ? "bg-brand-orange text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface"
                }`}
              >
                <span>All Items</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">{counts.all}</span>
              </button>

              <button
                onClick={() => setStatusTab("DRAFT")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusTab === "DRAFT"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface"
                }`}
              >
                <span>My Drafts</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">{counts.draft}</span>
              </button>

              <button
                onClick={() => setStatusTab("PENDING_REVIEW")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusTab === "PENDING_REVIEW"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface"
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Pending Review</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">{counts.pending}</span>
              </button>

              <button
                onClick={() => setStatusTab("REJECTED")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusTab === "REJECTED"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface"
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Revisions Requested</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">{counts.rejected}</span>
              </button>

              <button
                onClick={() => setStatusTab("APPROVED")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusTab === "APPROVED"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approved</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">{counts.approved}</span>
              </button>

              <button
                onClick={() => setStatusTab("PUBLISHED")}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  statusTab === "PUBLISHED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-surface"
                }`}
              >
                <span>Live Published</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">{counts.published}</span>
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
                  <Input
                    placeholder="Search by title or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-brand-text-muted shrink-0">Content Type:</span>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                  >
                    <option value="ALL">All Types</option>
                    <option value="LECTURE">Video Lectures</option>
                    <option value="STUDY_MATERIAL">Study Materials (Notes/PDFs)</option>
                    <option value="LIVE_CLASS">Live Classes</option>
                    <option value="CHAPTER">Chapters</option>
                    <option value="BATCH">Batches</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content List Table */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
                  <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
                  <p className="text-xs font-medium text-brand-text-muted">Loading your content items...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-200 text-brand-orange flex items-center justify-center mx-auto">
                    <FileEdit className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-brand-text-primary">No content items found</h3>
                    <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                      {searchQuery || statusTab !== "ALL" || typeFilter !== "ALL"
                        ? "Try adjusting your search criteria or status tab."
                        : "Create your first educational draft to submit for review."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                          <th className="p-3.5">Content Item</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Governance Status</th>
                          <th className="p-3.5">Review Feedback</th>
                          <th className="p-3.5">Last Updated</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/60">
                        {filteredItems.map((item) => (
                          <tr key={`${item.entityType}-${item.id}`} className="hover:bg-brand-bg-warm/30 transition-colors">
                            {/* Title & Subtitle */}
                            <td className="p-3.5 max-w-xs space-y-1">
                              <p className="font-bold text-brand-text-primary text-xs line-clamp-1">
                                {item.title}
                              </p>
                              {item.subtitle && (
                                <p className="text-[11px] text-brand-text-muted line-clamp-1">
                                  {item.subtitle}
                                </p>
                              )}
                            </td>

                            {/* Type */}
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 font-bold text-[11px] text-brand-text-primary">
                                {renderEntityIcon(item.entityType)}
                                <span>{item.entityType.replace(/_/g, " ")}</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="p-3.5 whitespace-nowrap space-y-1">
                              <ContentStatusBadge status={item.status} size="sm" />
                              {item.status === "APPROVED" && (
                                <span className="block text-[10px] text-sky-700 font-medium">
                                  Awaiting Super Admin Publication
                                </span>
                              )}
                              {item.status === "PENDING_REVIEW" && (
                                <span className="block text-[10px] text-amber-700 font-medium">
                                  Under Super Admin Review
                                </span>
                              )}
                            </td>

                            {/* Review Note / Rejection Feedback */}
                            <td className="p-3.5 max-w-xs">
                              {item.status === "REJECTED" && item.review_note ? (
                                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-0.5">
                                  <div className="font-bold flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 text-rose-600" />
                                    <span>Revision Note:</span>
                                  </div>
                                  <p className="italic line-clamp-2">&ldquo;{item.review_note}&rdquo;</p>
                                </div>
                              ) : item.review_note ? (
                                <p className="text-[11px] text-brand-text-muted italic line-clamp-2">
                                  &ldquo;{item.review_note}&rdquo;
                                </p>
                              ) : (
                                <span className="text-[11px] text-brand-text-muted">—</span>
                              )}
                            </td>

                            {/* Last Updated */}
                            <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-brand-text-muted">
                              {new Date(item.updated_at).toLocaleDateString()}
                            </td>

                            {/* Actions */}
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {(item.status === "DRAFT" || item.status === "REJECTED") && (
                                  <>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => setSubmitTarget(item)}
                                      title="Submit for Super Admin Review"
                                      className="h-8 px-2.5 text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-2xs flex items-center gap-1"
                                    >
                                      <Send className="h-3.5 w-3.5" /> Submit
                                    </Button>

                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenEditModal(item)}
                                      title="Edit Draft"
                                      className="h-8 px-2 text-xs font-semibold"
                                    >
                                      <FileEdit className="h-3.5 w-3.5 mr-1" /> Edit
                                    </Button>
                                  </>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenPreview(item)}
                                  title="Preview Simulation"
                                  className="h-8 px-2 text-xs font-semibold"
                                >
                                  <Eye className="h-3.5 w-3.5 text-slate-600" />
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
          </div>
        </Container>
      </main>

      {/* Submit for Review Confirmation Modal */}
      <Modal
        isOpen={!!submitTarget}
        onClose={() => !isSubmitting && setSubmitTarget(null)}
        title="Submit Content for Review"
        description="Confirm your submission to the Super Admin Review Center."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          {submitTarget && (
            <div className="p-4 rounded-xl bg-brand-bg-warm border border-brand-border text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-text-primary text-sm">{submitTarget.title}</span>
                <Badge variant="peach" size="sm">{submitTarget.entityType}</Badge>
              </div>
              <p className="text-brand-text-muted leading-relaxed">
                Once submitted, this item will transition to <strong className="text-amber-600">PENDING_REVIEW</strong> and will become read-only while the Super Admin evaluates your submission.
              </p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              If approved, only Super Administrators can publish content to the student portal. If revisions are required, you will receive feedback notes.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSubmitTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold"
            >
              {isSubmitting ? "Submitting..." : "Confirm & Submit"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Draft Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isCreating && setIsCreateModalOpen(false)}
        title="Create New Educational Draft"
        description="Select the type of educational content you want to author."
        maxWidth="md"
      >
        <form onSubmit={handleCreateDraft} className="space-y-4 pt-1">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Content Entity Type *
            </label>
            <select
              value={createEntityType}
              onChange={(e) =>
                setCreateEntityType(
                  e.target.value as "LECTURE" | "STUDY_MATERIAL" | "LIVE_CLASS" | "CHAPTER" | "BATCH"
                )
              }
              disabled={isCreating}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="LECTURE">Recorded Video Lecture</option>
              <option value="STUDY_MATERIAL">Study Material / PDF Notes</option>
              <option value="LIVE_CLASS">Live Interactive Class Session</option>
              <option value="CHAPTER">Curriculum Chapter</option>
              <option value="BATCH">Academic Batch</option>
            </select>
          </div>

          <Input
            label="Content Headline / Topic *"
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="e.g. NCERT Chapter 5: Periodic Classification of Elements"
            error={createErrors.title}
            disabled={isCreating}
          />

          {(createEntityType === "LECTURE" || createEntityType === "LIVE_CLASS") && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Subject Area
              </label>
              <select
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                disabled={isCreating}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Science">Science</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Biology">Biology</option>
                <option value="Social Science">Social Science</option>
              </select>
            </div>
          )}

          {createEntityType === "STUDY_MATERIAL" && (
            <Input
              label="Document Asset URL (Optional Preview)"
              value={createExtraField}
              onChange={(e) => setCreateExtraField(e.target.value)}
              placeholder="https://... or PDF reference"
              disabled={isCreating}
            />
          )}

          <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isCreating}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold"
            >
              {isCreating ? "Creating Draft..." : "Create Draft"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSavingEdit && setIsModalOpen(false)}
        title="Edit Content Draft"
        description="Update your draft details before submitting for review."
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
          <Input
            label="Title / Topic *"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            disabled={isSavingEdit}
          />

          {(editingItem?.entityType === "BATCH" || editingItem?.entityType === "LECTURE") && (
            <Input
              label="Subtitle / Description"
              value={editSubtitle}
              onChange={(e) => setEditSubtitle(e.target.value)}
              disabled={isSavingEdit}
            />
          )}

          <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingEdit}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold"
            >
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <ContentPreviewModal
        item={previewTarget}
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
