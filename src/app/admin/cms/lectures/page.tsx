"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
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
  Trash2,
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
  GraduationCap,
  Layers,
  BookOpen,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const initialBatchId = searchParams.get("batchId") || "ALL";

  const [lectures, setLectures] = React.useState<CmsLecture[]>([]);
  const [courses, setCourses] = React.useState<CmsCourse[]>([]);
  const [chapters, setChapters] = React.useState<CmsChapter[]>([]);
  const [batches, setBatches] = React.useState<CmsBatch[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = React.useState<string>(initialBatchId);
  const [selectedCourseFilter, setSelectedCourseFilter] = React.useState<string>(initialCourseId);
  const [selectedChapterFilter, setSelectedChapterFilter] = React.useState<string>(initialChapterId);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingLecture, setEditingLecture] = React.useState<CmsLecture | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Safe Delete Modal State
  const [deletingLecture, setDeletingLecture] = React.useState<CmsLecture | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Publishing & Governance Dialog State
  const [publishTarget, setPublishTarget] = React.useState<PublishDialogTarget | null>(null);
  const [isPublishProcessing, setIsPublishProcessing] = React.useState(false);

  // Simulation Preview Modal State
  const [previewItem, setPreviewItem] = React.useState<PreviewContentItem | null>(null);

  // Form State
  const [formBatchId, setFormBatchId] = React.useState("");
  const [formCourseId, setFormCourseId] = React.useState("");
  const [formChapterId, setFormChapterId] = React.useState("");
  const [formBoardId, setFormBoardId] = React.useState("");
  const [formClassId, setFormClassId] = React.useState("");
  const [formSubjectId, setFormSubjectId] = React.useState("");
  const [formTitle, setFormTitle] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formSubject, setFormSubject] = React.useState("Mathematics");
  const [formTeacherName, setFormTeacherName] = React.useState("Dr. Vandana Sharma");
  const [formCategoryTag, setFormCategoryTag] = React.useState("Full Lecture");
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

  // Helper when selecting a Batch in form: Automatically resolves Board, Class, Subject, Course, and Educator!
  const handleBatchSelectInForm = (batchId: string) => {
    setFormBatchId(batchId);
    if (!batchId) return;

    const selectedBatch = batches.find((b) => b.id === batchId);
    if (!selectedBatch) return;

    setFormBoardId(selectedBatch.board_id || "");
    setFormClassId(selectedBatch.class_id || "");
    setFormSubjectId(selectedBatch.subject_id || "");

    // Auto-resolve Course
    let targetCourse = courses.find((c) => c.id === selectedBatch.course_id);
    if (!targetCourse) {
      targetCourse = courses.find(
        (c) =>
          c.board_id === selectedBatch.board_id &&
          c.class_id === selectedBatch.class_id &&
          (selectedBatch.subject_id ? c.subject_id === selectedBatch.subject_id : true)
      );
    }
    if (!targetCourse) {
      targetCourse = courses.find(
        (c) =>
          c.board_id === selectedBatch.board_id &&
          c.class_id === selectedBatch.class_id
      );
    }

    if (targetCourse) {
      setFormCourseId(targetCourse.id);
      const relatedChapters = chapters.filter((ch) => ch.course_id === targetCourse.id);
      if (relatedChapters.length > 0) {
        setFormChapterId(relatedChapters[0].id);
      }
    }

    // Auto-resolve Subject Name
    if (selectedBatch.subject?.name) {
      setFormSubject(selectedBatch.subject.name);
    } else if (selectedBatch.title) {
      setFormSubject(selectedBatch.title);
    }

    // Auto-resolve Educator Name
    if (selectedBatch.educator_name) {
      setFormTeacherName(selectedBatch.educator_name);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingLecture(null);
    const defaultBatch = batches[0]?.id || "";

    setFormBatchId(defaultBatch);
    setFormTitle("");
    setFormSlug("");
    setFormDescription("");
    setFormCategoryTag("Full Lecture");
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

    if (defaultBatch) {
      handleBatchSelectInForm(defaultBatch);
    } else {
      const defaultCourse = courses[0]?.id || "";
      setFormCourseId(defaultCourse);
      const relatedChapters = chapters.filter((ch) => ch.course_id === defaultCourse);
      setFormChapterId(relatedChapters[0]?.id || chapters[0]?.id || "");
      setFormSubject("Mathematics");
      setFormTeacherName("TopVeda Educator");
    }

    setIsModalOpen(true);
  };

  // Open Edit Modal — Preselects existing batch and preserves real metadata
  const handleOpenEditModal = async (lec: CmsLecture) => {
    setEditingLecture(lec);

    // Preselect existing batch
    setFormBatchId(lec.batch_id || "");
    setFormBoardId(lec.board_id || "");
    setFormClassId(lec.class_id || "");
    setFormSubjectId(lec.subject_id || "");

    const currentChapter = chapters.find((ch) => ch.id === lec.chapter_id);
    setFormCourseId(lec.course_id || currentChapter?.course_id || courses[0]?.id || "");
    setFormChapterId(lec.chapter_id || "");

    setFormTitle(lec.title || "");
    setFormSlug(lec.slug || "");
    setFormDescription(lec.description || "");
    setFormSubject(lec.subject || "");
    setFormTeacherName(lec.teacher_name || "");
    setFormCategoryTag(lec.category_tag || "Full Lecture");

    const mins = Math.floor((lec.duration_seconds || 0) / 60);
    const secs = (lec.duration_seconds || 0) % 60;
    setFormDurationMinutes(mins || 45);
    setFormDurationSecondsRemaining(secs);

    setFormThumbnailUrl(lec.thumbnail_url || "/thumbnails/default-lecture.jpg");
    setFormThumbnailBg(lec.thumbnail_bg || "from-[#0F2042] via-[#162D59] to-[#0A162B]");
    setFormVideoStreamId(lec.video_stream_id || "");
    setFormVideoPlaybackUrl(lec.video_playback_url || "");
    setFormIsHomeFeatured(lec.is_home_featured);
    setFormIsFreePreview(lec.is_free_preview);
    setFormDisplayOrder(lec.display_order || 0);
    setFormIsVisible(lec.is_visible);
    setFormStatus(lec.status || "PUBLISHED");

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

    if (lec.thumbnail_url && lec.thumbnail_url.includes("/")) {
      const { signedUrl } = await StorageService.getSignedUrl(supabase, "lecture-thumbnails", lec.thumbnail_url);
      setSignedThumbPreview(signedUrl);
    } else {
      setSignedThumbPreview(null);
    }

    setIsModalOpen(true);
  };

  // Thumbnail upload helper
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

  // Save Lecture Form
  const handleSaveLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formTitle.trim()) errors.title = "Lecture title is required.";
    if (!formBatchId) errors.batchId = "Please select an assigned batch.";
    if (!formThumbnailUrl.trim()) errors.thumbnailUrl = "Thumbnail reference or image path is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    const totalSeconds = (Number(formDurationMinutes) || 0) * 60 + (Number(formDurationSecondsRemaining) || 0);
    const formattedMinutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const formattedSeconds = String(totalSeconds % 60).padStart(2, "0");
    const durationFormatted = `${formattedMinutes}:${formattedSeconds}`;
    const durationHuman = `${Math.floor(totalSeconds / 60)} min`;

    // Preserve real YouTube duration if existing lecture already has it
    const finalDurationSeconds =
      editingLecture && editingLecture.duration_seconds && editingLecture.duration_seconds > 0
        ? editingLecture.duration_seconds
        : totalSeconds;
    const finalDurationFormatted =
      editingLecture && editingLecture.duration_formatted && editingLecture.duration_formatted !== "45:00"
        ? editingLecture.duration_formatted
        : durationFormatted;
    const finalDurationHuman =
      editingLecture && editingLecture.duration_human && editingLecture.duration_human !== "45 min"
        ? editingLecture.duration_human
        : durationHuman;

    const payload: Partial<CmsLecture> = {
      ...(editingLecture ? { id: editingLecture.id } : {}),
      batch_id: formBatchId || null,
      course_id: formCourseId || null,
      chapter_id: formChapterId || null,
      board_id: formBoardId || null,
      class_id: formClassId || null,
      subject_id: formSubjectId || null,
      title: formTitle.trim(),
      slug: formSlug.trim().toLowerCase() || `${formTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`,
      description: formDescription.trim() || null,
      subject: formSubject.trim() || "Mathematics",
      teacher_name: formTeacherName.trim() || "TopVeda Educator",
      category_tag: formCategoryTag.trim() || "Full Lecture",
      duration_seconds: finalDurationSeconds,
      duration_formatted: finalDurationFormatted,
      duration_human: finalDurationHuman,
      thumbnail_url: formThumbnailUrl.trim(),
      thumbnail_bg: formThumbnailBg.trim(),
      video_stream_id: formVideoStreamId.trim() || (editingLecture?.video_stream_id || null),
      video_playback_url: formVideoPlaybackUrl.trim() || (editingLecture?.video_playback_url || null),
      video_upload_status: editingLecture?.video_upload_status || "ready",
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
        message: editingLecture ? `Lecture "${formTitle}" updated successfully.` : `Lecture "${formTitle}" created successfully.`,
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  // Safe Delete Lecture
  const handleDeleteLecture = async () => {
    if (!deletingLecture) return;
    try {
      setIsDeleting(true);
      const res = await CmsService.deleteLecture(supabase, deletingLecture.id);
      if (!res.success) throw new Error(res.error || "Failed to delete lecture.");

      setLectures((prev) => prev.filter((item) => item.id !== deletingLecture.id));
      setFeedback({ type: "success", message: `Lecture "${deletingLecture.title}" deleted successfully.` });
      setDeletingLecture(null);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Toggle Latest Lectures (is_home_featured)
  const handleToggleLatest = async (lec: CmsLecture) => {
    const nextVal = !lec.is_home_featured;
    try {
      const { error } = await supabase
        .from("cms_lectures")
        .update({ is_home_featured: nextVal, updated_at: new Date().toISOString() })
        .eq("id", lec.id);

      if (error) throw error;

      setLectures((prev) =>
        prev.map((item) => (item.id === lec.id ? { ...item, is_home_featured: nextVal } : item))
      );
      setFeedback({
        type: "success",
        message: `"${lec.title}" latest lecture discovery status set to ${nextVal ? "ON" : "OFF"}.`,
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    }
  };

  // Quick Toggle Visibility
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

  // Publishing Dialog Confirmation
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
      const { error } = await CmsService.unpublishContent(supabase, "LECTURE", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish lecture." });
      } else {
        setFeedback({ type: "success", message: `Lecture "${publishTarget.title}" unpublished.` });
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

  // Chapter and Course lookup maps
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

  const batchMap = React.useMemo(() => {
    const map = new Map<string, CmsBatch>();
    for (const b of batches) {
      map.set(b.id, b);
    }
    return map;
  }, [batches]);

  // Filtered Lectures List
  const filteredLectures = React.useMemo(() => {
    return lectures.filter((lec) => {
      const matchesSearch =
        searchQuery === "" ||
        lec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lec.category_tag.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBatch = selectedBatchFilter === "ALL" || lec.batch_id === selectedBatchFilter;

      let matchesCourse = true;
      if (selectedCourseFilter !== "ALL") {
        const parentChapter = lec.chapter_id ? chapterMap.get(lec.chapter_id) : null;
        matchesCourse = lec.course_id === selectedCourseFilter || parentChapter?.course_id === selectedCourseFilter;
      }

      const matchesChapter = selectedChapterFilter === "ALL" || lec.chapter_id === selectedChapterFilter;
      const matchesStatus = statusFilter === "ALL" || lec.status === statusFilter;

      return matchesSearch && matchesBatch && matchesCourse && matchesChapter && matchesStatus;
    });
  }, [lectures, searchQuery, selectedBatchFilter, selectedCourseFilter, selectedChapterFilter, statusFilter, chapterMap]);

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
            <span>Lectures &amp; Content CMS</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Manage recorded classroom lectures, batch assignments, YouTube duration, and Student Home Latest Lecture discovery.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs font-bold">
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
              placeholder="Search lecture title, subject, educator, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <select
              aria-label="Filter lectures by batch"
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-xl border border-brand-border bg-white px-3 py-1 font-medium text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Batches ({batches.length})</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.badge_text || b.board_label} • {b.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter lectures by course"
              value={selectedCourseFilter}
              onChange={(e) => {
                setSelectedCourseFilter(e.target.value);
                setSelectedChapterFilter("ALL");
              }}
              className="h-9 w-full text-xs rounded-xl border border-brand-border bg-white px-3 py-1 font-medium text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
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
              aria-label="Filter lectures by content status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-xl border border-brand-border bg-white px-3 py-1 font-medium text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
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
                <th className="py-3 px-4">Lecture / Video Title</th>
                <th className="py-3 px-4">Assigned Batch</th>
                <th className="py-3 px-4">Educator &amp; Duration</th>
                <th className="py-3 px-4 text-center">Latest Discovery</th>
                <th className="py-3 px-4 text-center">Order</th>
                <th className="py-3 px-4 text-center">Visibility</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-brand-text-muted">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
                    Loading lecture records...
                  </td>
                </tr>
              ) : filteredLectures.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-brand-text-muted">
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
                  const assignedBatch = lec.batch_id ? batchMap.get(lec.batch_id) : (lec.batch as CmsBatch | undefined);

                  return (
                    <tr key={lec.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                      {/* Lecture Title & Category */}
                      <td className="py-3.5 px-4 font-semibold text-brand-text-primary max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="h-9 w-14 shrink-0 rounded-lg bg-brand-bg-warm border border-brand-border flex items-center justify-center overflow-hidden">
                            {lec.thumbnail_url && !lec.thumbnail_url.includes("/") ? (
                              <PlaySquare className="h-4 w-4 text-brand-orange" />
                            ) : (
                              <PlaySquare className="h-4 w-4 text-brand-orange" />
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <p className="font-extrabold text-brand-charcoal line-clamp-1">{lec.title}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-brand-text-muted">
                              <span className="font-bold text-brand-orange">{lec.subject}</span>
                              <span>•</span>
                              <span>{lec.category_tag || "Full Lecture"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Batch */}
                      <td className="py-3.5 px-4">
                        {assignedBatch ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[11px]">
                              <BookOpen className="h-3 w-3 text-purple-600" />
                              {assignedBatch.title}
                            </span>
                            <p className="text-[10px] text-brand-text-muted font-medium">
                              {assignedBatch.badge_text || assignedBatch.board_label}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 font-semibold text-[10px]">
                            <AlertCircle className="h-3 w-3" /> Unassigned
                          </span>
                        )}
                      </td>

                      {/* Educator & Duration */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-brand-charcoal font-semibold text-xs">
                            <User className="h-3.5 w-3.5 text-brand-orange" />
                            <span>{lec.teacher_name || "Educator"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-brand-text-muted">
                            <Clock className="h-3 w-3" />
                            <span>{lec.duration_formatted || lec.duration_human || "45:00"}</span>
                          </div>
                        </div>
                      </td>

                      {/* Latest Discovery Switch Pill */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleLatest(lec)}
                          title="Toggle show in Student Home Latest Lectures"
                          className="cursor-pointer focus:outline-none"
                        >
                          {lec.is_home_featured ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 transition-colors shadow-2xs">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Latest: ON
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 transition-colors">
                              Latest: OFF
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Order */}
                      <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">
                        {lec.display_order}
                      </td>

                      {/* Visibility */}
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

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <ContentStatusBadge status={lec.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenPreview(lec)}
                            className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                            title="Preview Lecture"
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

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingLecture(lec)}
                            className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                            title="Delete Lecture"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* 4. REDESIGNED PORTRAIT-STYLE CREATE / EDIT LECTURE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        className="max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <form onSubmit={handleSaveLecture} className="flex flex-col h-full max-h-[90vh]">
          {/* Fixed Modal Header */}
          <div className="p-4 sm:p-5 border-b border-brand-border bg-white flex items-center justify-between shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {editingLecture ? "Edit Mode" : "New Lecture"}
                </span>
                <span className="text-[10px] text-brand-text-muted font-mono">
                  Recorded Syllabus
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                {editingLecture ? "Edit Lecture Details" : "Create Recorded Lecture"}
              </h3>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Section 1: Lecture Core Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                <span>1. Lecture Core Information</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Lecture Title <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Introduction to Quadratic Equations"
                  value={formTitle}
                  onChange={handleTitleChange}
                  disabled={isSaving}
                  className={cn("text-xs h-9", formErrors.title && "border-red-500")}
                />
                {formErrors.title && <p className="text-[10px] text-red-500 font-medium">{formErrors.title}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Description / Topic Notes
                </label>
                <textarea
                  placeholder="Detailed breakdown of formulas, theorem proofs, and solved problem sets..."
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={isSaving}
                  className="w-full p-2.5 rounded-xl border border-brand-border bg-white text-xs text-brand-charcoal font-medium resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Category Tag
                </label>
                <select
                  value={formCategoryTag}
                  onChange={(e) => setFormCategoryTag(e.target.value)}
                  disabled={isSaving}
                  className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                >
                  <option value="Full Lecture">Full Lecture</option>
                  <option value="Concept Deep-Dive">Concept Deep-Dive</option>
                  <option value="Problem Solving">Problem Solving</option>
                  <option value="Formula Revision">Formula Revision</option>
                  <option value="PYQ Discussion">PYQ Discussion</option>
                </select>
              </div>
            </div>

            {/* Section 2: Batch Assignment (CRITICAL) */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/90">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px]">
                  <BookOpen className="h-3.5 w-3.5 text-brand-orange" />
                  <span>2. Assigned Batch <span className="text-red-500">*</span></span>
                </div>
                <span className="text-[10px] font-bold text-brand-orange bg-white px-2 py-0.5 rounded border border-orange-200">
                  Required
                </span>
              </div>

              <p className="text-[11px] text-brand-text-muted leading-tight">
                Every lecture belongs to a batch. Selecting a batch auto-resolves curriculum board, class, course, and educators.
              </p>

              <div className="space-y-1">
                <select
                  value={formBatchId}
                  onChange={(e) => handleBatchSelectInForm(e.target.value)}
                  disabled={isSaving}
                  className={cn(
                    "w-full h-10 px-2.5 rounded-xl border bg-white text-xs font-bold text-brand-charcoal",
                    formErrors.batchId ? "border-red-500" : "border-brand-border"
                  )}
                >
                  <option value="">-- Select Target Batch --</option>
                  {batches.map((b) => {
                    const label = `${b.badge_text || b.board_label} • ${b.title} • ${b.subtitle || (b.is_ongoing ? "Ongoing" : "Upcoming")}`;
                    return (
                      <option key={b.id} value={b.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {formErrors.batchId && <p className="text-[10px] text-red-500 font-medium">{formErrors.batchId}</p>}
              </div>
            </div>

            {/* Section 3: Academic Context (Auto-Resolved) */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px]">
                <GraduationCap className="h-3.5 w-3.5 text-brand-orange" />
                <span>3. Academic Mapping</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Subject</label>
                  <Input
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    disabled={isSaving}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Syllabus Chapter</label>
                  <select
                    value={formChapterId}
                    onChange={(e) => setFormChapterId(e.target.value)}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    <option value="">General / Independent Lecture</option>
                    {formChaptersList.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        Ch {ch.chapter_number}: {ch.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Video & Thumbnail Control */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Video className="h-3.5 w-3.5 text-brand-orange" />
                <span>4. Video Stream &amp; Thumbnail</span>
              </div>

              {/* Video Playback / Stream Info */}
              <div className="space-y-2 p-3 rounded-xl bg-sky-50/60 border border-sky-200">
                <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                  <span>Video Stream Source</span>
                  {formVideoPlaybackUrl && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Ready
                    </span>
                  )}
                </div>

                <Input
                  placeholder="Playback / HLS URL or YouTube link"
                  value={formVideoPlaybackUrl}
                  onChange={(e) => setFormVideoPlaybackUrl(e.target.value)}
                  disabled={isSaving}
                  className="text-xs h-9 bg-white"
                />
              </div>

              {/* Thumbnail Control */}
              <div className="space-y-2 p-3 rounded-xl bg-white border border-brand-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-brand-charcoal">Thumbnail</label>
                  <span className="text-[10px] text-brand-text-muted font-mono">lecture-thumbnails</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="URL or storage path"
                    value={formThumbnailUrl}
                    onChange={(e) => setFormThumbnailUrl(e.target.value)}
                    disabled={isSaving}
                    className="text-xs h-9"
                  />

                  <label className="flex items-center justify-center gap-1.5 h-9 rounded-xl border border-dashed border-brand-border bg-brand-bg-warm/60 px-2.5 text-xs font-bold text-brand-charcoal cursor-pointer hover:border-brand-orange transition-colors">
                    <Upload className="h-3.5 w-3.5 text-brand-orange" />
                    <span>{isUploadingThumb ? "Uploading..." : "Upload Thumbnail"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbnailUpload}
                      disabled={isSaving || isUploadingThumb}
                      className="hidden"
                    />
                  </label>
                </div>

                {signedThumbPreview && (
                  <div className="mt-2 flex items-center gap-2.5 p-2 rounded-lg bg-brand-bg-warm border border-brand-border text-xs">
                    <img
                      src={signedThumbPreview}
                      alt="Thumbnail Preview"
                      className="h-9 w-14 object-cover rounded border border-brand-border"
                    />
                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Staged
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Lecture Metadata & Real YouTube Duration */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Clock className="h-3.5 w-3.5 text-brand-orange" />
                <span>5. Educator &amp; Duration</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Teacher Name</label>
                  <Input
                    value={formTeacherName}
                    onChange={(e) => setFormTeacherName(e.target.value)}
                    placeholder="e.g. Dr. Vandana Sharma"
                    disabled={isSaving}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Duration (Minutes)</label>
                  <Input
                    type="number"
                    value={formDurationMinutes}
                    onChange={(e) => setFormDurationMinutes(Number(e.target.value))}
                    disabled={isSaving}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-brand-border">
                <input
                  type="checkbox"
                  id="formIsFreePreview"
                  checked={formIsFreePreview}
                  onChange={(e) => setFormIsFreePreview(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange cursor-pointer"
                />
                <label htmlFor="formIsFreePreview" className="text-xs font-bold text-brand-charcoal cursor-pointer">
                  Free Demo Preview (Accessible without enrollment)
                </label>
              </div>
            </div>

            {/* Section 6: Latest Lecture Control (Toggle ON / OFF) */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-600 fill-amber-500" />
                  <span className="text-xs font-bold text-brand-charcoal">
                    Show in Latest Lectures
                  </span>
                </div>
                <input
                  type="checkbox"
                  id="formIsHomeFeatured"
                  checked={formIsHomeFeatured}
                  onChange={(e) => setFormIsHomeFeatured(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-amber-900 leading-tight">
                When enabled (ON), this lecture appears in the Student Home Latest Lectures section. Disabling (OFF) does not remove the lecture from its assigned batch.
              </p>
            </div>

            {/* Section 7: Display Order & Publication Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Layers className="h-3.5 w-3.5 text-brand-orange" />
                <span>6. Governance &amp; Visibility</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Publication Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Display Order</label>
                  <Input
                    type="number"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    disabled={isSaving}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-brand-border">
                <div>
                  <p className="text-xs font-bold text-brand-charcoal">Student Visibility</p>
                  <p className="text-[10px] text-brand-text-muted">Show in student batch syllabus</p>
                </div>
                <input
                  type="checkbox"
                  checked={formIsVisible}
                  onChange={(e) => setFormIsVisible(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Fixed Modal Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-brand-border bg-brand-bg-warm/60 flex items-center justify-end gap-2.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="text-xs font-bold shadow-2xs"
            >
              {isSaving ? "Saving..." : editingLecture ? "Save Changes" : "Create Lecture"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Safe Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingLecture}
        onClose={() => !isDeleting && setDeletingLecture(null)}
        title="Delete Recorded Lecture"
        description="Are you sure you want to delete this lecture? This action will permanently remove the lecture video record and will NOT affect its batch."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {deletingLecture && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <p className="font-bold">Lecture: {deletingLecture.title}</p>
              <p className="text-[11px] text-red-700">Subject: {deletingLecture.subject} • {deletingLecture.teacher_name}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingLecture(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteLecture}
              disabled={isDeleting}
              className="text-xs font-bold"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 6. Publishing Confirmation Dialog */}
      <PublishConfirmationDialog
        target={publishTarget}
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={handlePublishConfirm}
        isProcessing={isPublishProcessing}
      />

      {/* 7. Student Experience Simulation Preview */}
      <ContentPreviewModal
        item={previewItem}
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}
