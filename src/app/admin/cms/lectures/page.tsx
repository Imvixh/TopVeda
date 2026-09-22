"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { StorageService } from "@/lib/services/storage.service";
import {
  CmsLecture,
  CmsCourse,
  CmsChapter,
  CmsBatch,
  ContentStatus,
} from "@/types/cms.types";
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
  Video,
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
  Clock,
  User,
  Upload,
  Sparkles,
  Info,
  PlaySquare,
  Globe2,
  FileEdit,
} from "lucide-react";

export default function LecturesCmsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-sm text-brand-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
          Loading lectures library...
        </div>
      }
    >
      <LecturesCmsContent />
    </React.Suspense>
  );
}

function LecturesCmsContent() {
  const supabase = React.useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId") || "ALL";
  const initialChapterId = searchParams.get("chapterId") || "ALL";

  const [lectures, setLectures] = React.useState<CmsLecture[]>([]);
  const [courses, setCourses] = React.useState<CmsCourse[]>([]);
  const [chapters, setChapters] = React.useState<CmsChapter[]>([]);
  const [batches, setBatches] = React.useState<CmsBatch[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = React.useState<string>(initialCourseId);
  const [selectedChapterFilter, setSelectedChapterFilter] = React.useState<string>(initialChapterId);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingLecture, setEditingLecture] = React.useState<CmsLecture | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsLecture | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Publishing & Governance Dialog State
  const [publishTarget, setPublishTarget] = React.useState<PublishDialogTarget | null>(null);
  const [isPublishProcessing, setIsPublishProcessing] = React.useState(false);

  // Simulation Preview Modal State
  const [previewItem, setPreviewItem] = React.useState<PreviewContentItem | null>(null);

  // Form State
  const [formCourseId, setFormCourseId] = React.useState("");
  const [formChapterId, setFormChapterId] = React.useState("");
  const [formBatchId, setFormBatchId] = React.useState("");
  const [formTitle, setFormTitle] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [formSubject, setFormSubject] = React.useState("Mathematics");
  const [formTeacherName, setFormTeacherName] = React.useState("Dr. Vandana Sharma");
  const [formCategoryTag, setFormCategoryTag] = React.useState("Concept Deep-Dive");
  const [formDurationMinutes, setFormDurationMinutes] = React.useState(45);
  const [formDurationSecondsRemaining, setFormDurationSecondsRemaining] = React.useState(0);
  const [formThumbnailUrl, setFormThumbnailUrl] = React.useState("/thumbnails/default-lecture.jpg");
  const [formThumbnailBg, setFormThumbnailBg] = React.useState("from-[#0F2042] via-[#162D59] to-[#0A162B]");
  const [formVideoStreamId, setFormVideoStreamId] = React.useState("");
  const [formVideoPlaybackUrl, setFormVideoPlaybackUrl] = React.useState("");
  const [formIsHomeFeatured, setFormIsHomeFeatured] = React.useState(false);
  const [formIsFreePreview, setFormIsFreePreview] = React.useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = React.useState(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formEndsAt, setFormEndsAt] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Thumbnail upload helper state
  const [isUploadingThumb, setIsUploadingThumb] = React.useState(false);
  const [signedThumbPreview, setSignedThumbPreview] = React.useState<string | null>(null);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [cData, chData, bData, lData] = await Promise.all([
          CmsService.getCourses(supabase),
          CmsService.getChapters(supabase),
          CmsService.getBatches(supabase),
          CmsService.getLectures(supabase),
        ]);
        if (!isMounted) return;
        setCourses(cData);
        setChapters(chData);
        setBatches(bData);
        setLectures(lData);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load lectures and curriculum taxonomy." });
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

  // Dependent chapters based on selected course filter
  const filteredChaptersForFilter = React.useMemo(() => {
    if (selectedCourseFilter === "ALL") return chapters;
    return chapters.filter((ch) => ch.course_id === selectedCourseFilter);
  }, [chapters, selectedCourseFilter]);

  // Dependent chapters based on selected course in form modal
  const formChaptersList = React.useMemo(() => {
    if (!formCourseId) return chapters;
    return chapters.filter((ch) => ch.course_id === formCourseId);
  }, [chapters, formCourseId]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormTitle(val);
    if (!editingLecture) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormSlug(autoSlug);
    }
  };

  const handleCourseChangeInForm = (courseId: string) => {
    setFormCourseId(courseId);
    const relatedChapters = chapters.filter((ch) => ch.course_id === courseId);
    if (relatedChapters.length > 0) {
      setFormChapterId(relatedChapters[0].id);
    } else {
      setFormChapterId("");
    }
  };

  const handleOpenCreateModal = () => {
    setEditingLecture(null);
    const defaultCourse = courses[0]?.id || "";
    setFormCourseId(defaultCourse);
    const relatedChapters = chapters.filter((ch) => ch.course_id === defaultCourse);
    setFormChapterId(relatedChapters[0]?.id || chapters[0]?.id || "");
    setFormBatchId("");
    setFormTitle("");
    setFormSlug("");
    setFormSubject("Mathematics");
    setFormTeacherName("Dr. Vandana Sharma");
    setFormCategoryTag("Concept Deep-Dive");
    setFormDurationMinutes(45);
    setFormDurationSecondsRemaining(0);
    setFormThumbnailUrl("/thumbnails/default-lecture.jpg");
    setFormThumbnailBg("from-[#0F2042] via-[#162D59] to-[#0A162B]");
    setFormVideoStreamId("");
    setFormVideoPlaybackUrl("");
    setFormIsHomeFeatured(false);
    setFormIsFreePreview(true);
    setFormDisplayOrder(lectures.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setSignedThumbPreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (lec: CmsLecture) => {
    setEditingLecture(lec);
    // Find parent course from chapter
    const currentChapter = chapters.find((ch) => ch.id === lec.chapter_id);
    setFormCourseId(currentChapter?.course_id || courses[0]?.id || "");
    setFormChapterId(lec.chapter_id || "");
    setFormBatchId(lec.batch_id || "");
    setFormTitle(lec.title);
    setFormSlug(lec.slug);
    setFormSubject(lec.subject);
    setFormTeacherName(lec.teacher_name);
    setFormCategoryTag(lec.category_tag);

    const mins = Math.floor((lec.duration_seconds || 0) / 60);
    const secs = (lec.duration_seconds || 0) % 60;
    setFormDurationMinutes(mins);
    setFormDurationSecondsRemaining(secs);

    setFormThumbnailUrl(lec.thumbnail_url);
    setFormThumbnailBg(lec.thumbnail_bg || "from-[#0F2042] via-[#162D59] to-[#0A162B]");
    setFormVideoStreamId(lec.video_stream_id || "");
    setFormVideoPlaybackUrl(lec.video_playback_url || "");
    setFormIsHomeFeatured(lec.is_home_featured);
    setFormIsFreePreview(lec.is_free_preview);
    setFormDisplayOrder(lec.display_order);
    setFormIsVisible(lec.is_visible);
    setFormStatus(lec.status);
    if (lec.starts_at) {
      try {
        const d = new Date(lec.starts_at);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setFormStartsAt(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch {
        setFormStartsAt("");
      }
    } else {
      setFormStartsAt("");
    }
    if (lec.ends_at) {
      try {
        const d = new Date(lec.ends_at);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setFormEndsAt(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch {
        setFormEndsAt("");
      }
    } else {
      setFormEndsAt("");
    }
    setFormErrors({});

    // If thumbnail is in private storage, try generating a signed preview URL
    if (lec.thumbnail_url && lec.thumbnail_url.includes("/")) {
      const { signedUrl } = await StorageService.getSignedUrl(supabase, "lecture-thumbnails", lec.thumbnail_url);
      setSignedThumbPreview(signedUrl);
    } else {
      setSignedThumbPreview(null);
    }

    setIsModalOpen(true);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormErrors((prev) => ({ ...prev, thumb: "Only image files (JPEG, PNG, WEBP) are allowed." }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({ ...prev, thumb: "Thumbnail file size must not exceed 5 MB." }));
      return;
    }

    setIsUploadingThumb(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const authorId = userData.user?.id || "super-admin";
      const targetId = editingLecture?.id || "draft-" + Date.now();
      const storagePath = StorageService.generateScopedPath(authorId, targetId, file.name);

      const { path, error } = await StorageService.uploadFile(
        supabase,
        "lecture-thumbnails",
        storagePath,
        file,
        { contentType: file.type }
      );

      if (error || !path) {
        throw error || new Error("Failed to upload thumbnail.");
      }

      setFormThumbnailUrl(path);
      const { signedUrl } = await StorageService.getSignedUrl(supabase, "lecture-thumbnails", path);
      setSignedThumbPreview(signedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error uploading thumbnail";
      setFormErrors((prev) => ({ ...prev, thumb: msg }));
    } finally {
      setIsUploadingThumb(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formCourseId) errors.courseId = "Parent Course is required";
    if (!formChapterId) errors.chapterId = "Parent Chapter is required";
    if (!formTitle.trim()) errors.title = "Lecture title is required";
    if (!formSlug.trim()) errors.slug = "URL slug is required";
    if (!formSubject.trim()) errors.subject = "Subject name is required";
    if (!formTeacherName.trim()) errors.teacherName = "Teacher name is required";
    if (!formThumbnailUrl.trim()) errors.thumbnailUrl = "Thumbnail reference or image path is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const totalSeconds = (Number(formDurationMinutes) || 0) * 60 + (Number(formDurationSecondsRemaining) || 0);
    const formattedMinutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const formattedSeconds = String(totalSeconds % 60).padStart(2, "0");
    const durationFormatted = `${formattedMinutes}:${formattedSeconds}`;
    const durationHuman = `${Math.floor(totalSeconds / 60)} min`;

    const payload: Partial<CmsLecture> = {
      ...(editingLecture ? { id: editingLecture.id } : {}),
      chapter_id: formChapterId,
      batch_id: formBatchId || null,
      title: formTitle.trim(),
      slug: formSlug.trim().toLowerCase(),
      subject: formSubject.trim(),
      teacher_name: formTeacherName.trim(),
      duration_seconds: totalSeconds,
      duration_formatted: durationFormatted,
      duration_human: durationHuman,
      thumbnail_url: formThumbnailUrl.trim(),
      thumbnail_bg: formThumbnailBg.trim(),
      category_tag: formCategoryTag.trim(),
      video_stream_id: formVideoStreamId.trim() || null,
      video_playback_url: formVideoPlaybackUrl.trim() || null,
      video_upload_status: "ready",
      is_home_featured: formIsHomeFeatured,
      is_free_preview: formIsFreePreview,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertLecture(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save lecture." });
    } else {
      setFeedback({
        type: "success",
        message: editingLecture ? "Lecture updated successfully." : "Lecture created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_lectures", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive lecture." });
    } else {
      setFeedback({ type: "success", message: `Lecture "${archiveTarget.title}" archived successfully.` });
      handleManualRefresh();
    }
  };

  const handleToggleVisibility = async (lec: CmsLecture) => {
    const nextVal = !lec.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_lectures", lec.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `Lecture "${lec.title}" visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
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
            entityType: "LECTURE",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish lecture." });
        } else {
          setFeedback({ type: "success", message: `Lecture "${publishTarget.title}" published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish lecture." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      // Unpublish action
      const { error } = await CmsService.unpublishContent(supabase, "LECTURE", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish lecture." });
      } else {
        setFeedback({ type: "success", message: `Lecture "${publishTarget.title}" unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  const handleOpenPreview = async (lec: CmsLecture) => {
    let signedThumb: string | null = null;
    if (lec.thumbnail_url && lec.thumbnail_url.includes("/")) {
      const { signedUrl } = await StorageService.getSignedUrl(supabase, "lecture-thumbnails", lec.thumbnail_url);
      signedThumb = signedUrl;
    }
    setPreviewItem({ type: "LECTURE", data: lec, signedThumb });
  };

  // Chapter and Course title lookup maps
  const chapterMap = React.useMemo(() => {
    const map = new Map<string, CmsChapter>();
    for (const ch of chapters) {
      map.set(ch.id, ch);
    }
    return map;
  }, [chapters]);

  const courseMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) {
      map.set(c.id, c.title);
    }
    return map;
  }, [courses]);

  // Filtered Lectures List
  const filteredLectures = React.useMemo(() => {
    return lectures.filter((lec) => {
      const matchesSearch =
        searchQuery === "" ||
        lec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.category_tag.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesCourse = true;
      if (selectedCourseFilter !== "ALL") {
        const parentChapter = lec.chapter_id ? chapterMap.get(lec.chapter_id) : null;
        matchesCourse = parentChapter?.course_id === selectedCourseFilter;
      }

      const matchesChapter = selectedChapterFilter === "ALL" || lec.chapter_id === selectedChapterFilter;
      const matchesStatus = statusFilter === "ALL" || lec.status === statusFilter;

      return matchesSearch && matchesCourse && matchesChapter && matchesStatus;
    });
  }, [lectures, searchQuery, selectedCourseFilter, selectedChapterFilter, statusFilter, chapterMap]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              VIDEO CURRICULUM
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              cms_lectures
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <Video className="h-7 w-7 text-brand-orange" />
            <span>Lectures & Video Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Manage recorded classroom lectures, chapter syllabus associations, private thumbnails, and discovery tags.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Lecture
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

      {/* 2. Search & Multi-Level Filters Toolbar */}
      <Card className="p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by lecture title, subject, educator, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <select
              aria-label="Filter lectures by course"
              value={selectedCourseFilter}
              onChange={(e) => {
                setSelectedCourseFilter(e.target.value);
                setSelectedChapterFilter("ALL");
              }}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter lectures by chapter"
              value={selectedChapterFilter}
              onChange={(e) => setSelectedChapterFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Chapters</option>
              {filteredChaptersForFilter.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  Ch {ch.chapter_number}: {ch.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter lectures by content status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* 3. Data Table */}
      <Card className="p-0 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg-warm/80 font-bold text-brand-text-muted uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Lecture / Video Info</th>
                <th className="py-3 px-4">Curriculum Path</th>
                <th className="py-3 px-4">Educator & Timing</th>
                <th className="py-3 px-4 text-center">Schedule</th>
                <th className="py-3 px-4 text-center">Tags & Preview</th>
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
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
                    Loading lecture records...
                  </td>
                </tr>
              ) : filteredLectures.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-text-muted">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-full bg-brand-bg-peach flex items-center justify-center text-brand-orange">
                        <Video className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-brand-text-primary">No lectures found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search filter." : "Click '+ Add Lecture' to create your first lecture."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLectures.map((lec) => {
                  const parentChapter = lec.chapter_id ? chapterMap.get(lec.chapter_id) : null;
                  const parentCourseTitle = parentChapter ? courseMap.get(parentChapter.course_id) : "Unassigned";

                  return (
                    <tr key={lec.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-brand-text-primary max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="h-9 w-14 shrink-0 rounded bg-brand-bg-warm border border-brand-border flex items-center justify-center overflow-hidden">
                            <PlaySquare className="h-4 w-4 text-brand-orange" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-brand-text-primary line-clamp-1">{lec.title}</p>
                            <p className="text-[11px] font-mono text-brand-text-muted">{lec.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-brand-text-primary line-clamp-1">{parentCourseTitle}</p>
                          <p className="text-[11px] text-brand-text-muted line-clamp-1">
                            {parentChapter ? `Ch ${parentChapter.chapter_number}: ${parentChapter.title}` : "General"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-brand-text-primary font-semibold">
                            <User className="h-3.5 w-3.5 text-brand-orange" />
                            <span>{lec.teacher_name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-brand-text-muted">
                            <Clock className="h-3 w-3" />
                            <span>{lec.duration_human || lec.duration_formatted}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <ScheduleStatusBadge startsAt={lec.starts_at} endsAt={lec.ends_at} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center text-[10px] font-bold text-brand-text-primary bg-brand-bg-warm px-2 py-0.5 rounded border border-brand-border">
                            {lec.category_tag}
                          </span>
                          <div className="flex items-center gap-1">
                            {lec.is_home_featured && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Home
                              </span>
                            )}
                            {lec.is_free_preview && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                <Sparkles className="h-2.5 w-2.5" /> Free
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{lec.display_order}</td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(lec)}
                          title="Click to toggle visibility"
                          className="cursor-pointer focus:outline-none"
                        >
                          {lec.is_visible ? (
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
                        <ContentStatusBadge status={lec.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPreview(lec)}
                            className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                            title="Preview Student Experience"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {lec.status !== "PUBLISHED" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "LECTURE",
                                  entityId: lec.id,
                                  title: lec.title,
                                  currentStatus: lec.status,
                                  isVisible: lec.is_visible,
                                  startsAt: lec.starts_at,
                                  endsAt: lec.ends_at,
                                  displayOrder: lec.display_order,
                                  featuredNote: lec.is_home_featured ? "Home Featured" : undefined,
                                  action: "PUBLISH",
                                })
                              }
                              className="h-7 w-7 text-brand-text-muted hover:text-emerald-600"
                              title="Publish Lecture"
                            >
                              <Globe2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "LECTURE",
                                  entityId: lec.id,
                                  title: lec.title,
                                  currentStatus: lec.status,
                                  isVisible: lec.is_visible,
                                  startsAt: lec.starts_at,
                                  endsAt: lec.ends_at,
                                  displayOrder: lec.display_order,
                                  featuredNote: lec.is_home_featured ? "Home Featured" : undefined,
                                  action: "UNPUBLISH",
                                })
                              }
                              className="h-7 w-7 text-brand-text-muted hover:text-amber-600"
                              title="Unpublish Lecture"
                            >
                              <FileEdit className="h-3.5 w-3.5" />
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(lec)}
                            className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                            title="Edit Lecture"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {lec.status !== "ARCHIVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setArchiveTarget(lec)}
                              className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                              title="Archive Lecture"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. Create / Edit Lecture Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingLecture ? "Edit Recorded Lecture" : "Create Recorded Lecture"}
        description="Configure video lecture metadata, syllabus chapter binding, private thumbnail, and playback duration."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveLecture} className="space-y-4">
          {/* Dependent Course & Chapter Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Parent Course *</label>
              <select
                aria-label="Select course"
                value={formCourseId}
                onChange={(e) => handleCourseChangeInForm(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              {formErrors.courseId && <p className="text-[11px] text-red-500 font-medium">{formErrors.courseId}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Syllabus Chapter *</label>
              <select
                aria-label="Select syllabus chapter"
                value={formChapterId}
                onChange={(e) => setFormChapterId(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                {formChaptersList.length === 0 ? (
                  <option value="">No chapters available for course</option>
                ) : (
                  formChaptersList.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      Ch {ch.chapter_number}: {ch.title}
                    </option>
                  ))
                )}
              </select>
              {formErrors.chapterId && <p className="text-[11px] text-red-500 font-medium">{formErrors.chapterId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Lecture Title *"
              placeholder="e.g. Fundamental Theorem of Arithmetic & Proofs"
              value={formTitle}
              onChange={handleTitleChange}
              error={formErrors.title}
              disabled={isSaving}
            />

            <Input
              label="URL Slug *"
              placeholder="e.g. fundamental-theorem-of-arithmetic"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              error={formErrors.slug}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Subject Name *"
              placeholder="e.g. Mathematics"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              error={formErrors.subject}
              disabled={isSaving}
            />

            <Input
              label="Teacher / Educator Name *"
              placeholder="e.g. Dr. Vandana Sharma"
              value={formTeacherName}
              onChange={(e) => setFormTeacherName(e.target.value)}
              error={formErrors.teacherName}
              disabled={isSaving}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Category Tag</label>
              <select
                aria-label="Category tag"
                value={formCategoryTag}
                onChange={(e) => setFormCategoryTag(e.target.value)}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="Concept Deep-Dive">Concept Deep-Dive</option>
                <option value="Full Lecture">Full Lecture</option>
                <option value="Problem Solving">Problem Solving</option>
                <option value="Formula Revision">Formula Revision</option>
                <option value="PYQ Discussion">PYQ Discussion</option>
              </select>
            </div>
          </div>

          {/* Duration Helper */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-brand-bg-warm/40 border border-brand-border">
            <Input
              label="Duration (Minutes)"
              type="number"
              value={formDurationMinutes}
              onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
              disabled={isSaving}
            />

            <Input
              label="Duration (Seconds)"
              type="number"
              value={formDurationSecondsRemaining}
              onChange={(e) => setFormDurationSecondsRemaining(Number(e.target.value))}
              disabled={isSaving}
            />
          </div>

          {/* Thumbnail & Private Storage Helper */}
          <div className="space-y-2 p-3.5 rounded-xl border border-brand-border bg-brand-surface">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-brand-text-primary">Thumbnail Image (Private Bucket)</label>
              <span className="text-[10px] text-brand-text-muted font-mono">bucket: lecture-thumbnails</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Thumbnail Reference Path *"
                placeholder="e.g. {author_id}/{lecture_id}/thumb.jpg"
                value={formThumbnailUrl}
                onChange={(e) => setFormThumbnailUrl(e.target.value)}
                error={formErrors.thumbnailUrl}
                disabled={isSaving}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-text-primary">Upload Thumbnail File</label>
                <label className="flex items-center justify-center gap-2 h-10 w-full rounded-lg border border-dashed border-brand-border bg-brand-bg-warm px-3 py-2 text-xs font-semibold text-brand-text-primary cursor-pointer hover:border-brand-orange transition-colors">
                  <Upload className="h-4 w-4 text-brand-orange" />
                  <span>{isUploadingThumb ? "Uploading..." : "Upload File to Private Storage"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleThumbnailUpload}
                    disabled={isSaving || isUploadingThumb}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {formErrors.thumb && <p className="text-[11px] text-red-500 font-medium">{formErrors.thumb}</p>}

            {signedThumbPreview && (
              <div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-brand-bg-warm border border-brand-border text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={signedThumbPreview}
                  alt="Thumbnail Preview"
                  className="h-10 w-16 object-cover rounded border border-brand-border"
                />
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Secure signed URL generated for preview
                </span>
              </div>
            )}
          </div>

          {/* Cloudflare Stream Video Metadata Readiness Box */}
          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sky-900">
              <Info className="h-4 w-4 text-sky-600" />
              <span>Video Playback Metadata (Cloudflare Stream Integration)</span>
            </div>
            <p className="text-sky-700 text-[11px]">
              Direct Cloudflare Stream video uploading will be connected in a subsequent step. You can configure metadata or existing playback URLs below.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                label="Stream Video UID / Asset ID"
                placeholder="e.g. cf-stream-uuid-12345"
                value={formVideoStreamId}
                onChange={(e) => setFormVideoStreamId(e.target.value)}
                disabled={isSaving}
                className="bg-white"
              />
              <Input
                label="Playback / HLS URL"
                placeholder="e.g. https://videodelivery.net/.../manifest/video.m3u8"
                value={formVideoPlaybackUrl}
                onChange={(e) => setFormVideoPlaybackUrl(e.target.value)}
                disabled={isSaving}
                className="bg-white"
              />
            </div>
          </div>

          {/* Optional Linked Batch Selector */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">Linked Batch / Cohort (Optional)</label>
            <select
              aria-label="Select linked cohort"
              value={formBatchId}
              onChange={(e) => setFormBatchId(e.target.value)}
              disabled={isSaving}
              className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="">All Cohorts (General Course Lecture)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.board_label})
                </option>
              ))}
            </select>
          </div>

          {/* Flags & Publication Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Display Order"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
              disabled={isSaving}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Status</label>
              <select
                aria-label="Publication status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Visibility</label>
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  id="formIsVisibleLec"
                  checked={formIsVisible}
                  onChange={(e) => setFormIsVisible(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                />
                <label htmlFor="formIsVisibleLec" className="text-xs font-semibold text-brand-text-primary cursor-pointer">
                  Student Visible
                </label>
              </div>
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

          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-brand-bg-warm/40 border border-brand-border">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsFreePreview"
                checked={formIsFreePreview}
                onChange={(e) => setFormIsFreePreview(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
              />
              <label htmlFor="formIsFreePreview" className="text-xs font-semibold text-brand-text-primary cursor-pointer">
                Free Demo Preview
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsHomeFeatured"
                checked={formIsHomeFeatured}
                onChange={(e) => setFormIsHomeFeatured(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
              />
              <label htmlFor="formIsHomeFeatured" className="text-xs font-semibold text-brand-text-primary cursor-pointer">
                Featured on Student Home
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
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
              {isSaving ? "Saving..." : editingLecture ? "Update Lecture" : "Create Lecture"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Lecture?"
        description="Are you sure you want to archive this lecture? It will be hidden from student portals and home carousels."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-peach/50 border border-brand-orange-border/60 text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.title}</p>
              <p className="text-brand-text-muted">Subject: {archiveTarget.subject} • {archiveTarget.teacher_name}</p>
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
