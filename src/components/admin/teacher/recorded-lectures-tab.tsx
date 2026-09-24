"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { StorageService } from "@/lib/services/storage.service";
import { CmsLecture, CmsBoard, CmsClassLevel, CmsSubject, CmsCourse, CmsChapter, CmsBatch, ContentStatus } from "@/types/cms.types";
import {
  Video,
  Plus,
  Search,
  Clock,
  FileEdit,
  Eye,
  Send,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  Loader2,
  RefreshCw,
  Sparkles,
  Info,
  ExternalLink,
  Paperclip,
} from "lucide-react";

interface RecordedLecturesTabProps {
  teacherId: string;
  teacherName: string;
  lectures: CmsLecture[];
  boards: CmsBoard[];
  classes: CmsClassLevel[];
  subjects: CmsSubject[];
  courses: CmsCourse[];
  chapters: CmsChapter[];
  batches: CmsBatch[];
  isSuperAdmin?: boolean;
  onRefresh: () => void;
  setFeedback: (fb: { type: "success" | "error" | "info"; message: string } | null) => void;
}

export function RecordedLecturesTab({
  teacherId,
  teacherName,
  lectures,
  boards,
  classes,
  subjects,
  courses,
  chapters,
  batches,
  isSuperAdmin = false,
  onRefresh,
  setFeedback,
}: RecordedLecturesTabProps) {
  const supabase = React.useMemo(() => createClient(), []);

  const [filter, setFilter] = React.useState<"ALL" | "DRAFT" | "PENDING_REVIEW" | "REJECTED" | "APPROVED" | "PUBLISHED">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Upload Wizard Modal State
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadTitle, setUploadTitle] = React.useState("");
  const [uploadSubject, setUploadSubject] = React.useState("Mathematics");
  const [uploadBoardId, setUploadBoardId] = React.useState("");
  const [uploadClassId, setUploadClassId] = React.useState("");
  const [uploadCourseId, setUploadCourseId] = React.useState("");
  const [uploadChapterId, setUploadChapterId] = React.useState("");
  const [uploadBatchId, setUploadBatchId] = React.useState("");
  const [uploadLectureNumber, setUploadLectureNumber] = React.useState("1");
  const [uploadDescription, setUploadDescription] = React.useState("");
  const [uploadThumbnailUrl, setUploadThumbnailUrl] = React.useState("/thumbnails/physics_motion.jpg");
  const [uploadVideoPlaybackUrl, setUploadVideoPlaybackUrl] = React.useState("https://stream.topveda.com/lectures/sample.m3u8");
  const [uploadDurationFormatted, setUploadDurationFormatted] = React.useState("45:00");
  const [uploadStatusTarget, setUploadStatusTarget] = React.useState<"DRAFT" | "PENDING_REVIEW">("PENDING_REVIEW");

  // Material File Upload State
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [materialFile, setMaterialFile] = React.useState<File | null>(null);
  const [isUploadingMaterial, setIsUploadingMaterial] = React.useState(false);
  const [uploadedMaterialUrl, setUploadedMaterialUrl] = React.useState<string | null>(null);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Edit Modal State (Allowed for DRAFT, PENDING_REVIEW, REJECTED)
  const [editingLecture, setEditingLecture] = React.useState<CmsLecture | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editLectureNumber, setEditLectureNumber] = React.useState("1");
  const [editThumbnailUrl, setEditThumbnailUrl] = React.useState("");
  const [editVideoPlaybackUrl, setEditVideoPlaybackUrl] = React.useState("");
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);

  // Filtered Lectures
  const filteredLectures = React.useMemo(() => {
    return lectures.filter((l) => {
      const matchesSearch =
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.subject.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === "ALL") return true;
      return l.status === filter;
    });
  }, [lectures, filter, searchQuery]);

  // Handle Material Upload
  const handleMaterialFileUpload = async (file: File) => {
    try {
      setIsUploadingMaterial(true);
      const entityId = crypto.randomUUID();
      const path = StorageService.generateScopedPath(teacherId, entityId, file.name);

      const { path: uploadedPath, error } = await StorageService.uploadFile(
        supabase,
        "study-materials",
        path,
        file,
        { contentType: "application/pdf" }
      );

      if (error) throw error;
      setUploadedMaterialUrl(uploadedPath);
      setFeedback({ type: "success", message: `Companion PDF "${file.name}" uploaded successfully.` });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: `Failed to upload material: ${error.message}` });
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  // Handle Create / Upload Submission
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!uploadTitle.trim()) errors.title = "Lecture title is required.";
    if (!uploadThumbnailUrl.trim()) errors.thumbnail = "Thumbnail URL is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsUploading(true);
      setFeedback(null);

      let res: Response;

      if (videoFile) {
        const formData = new FormData();
        formData.append("title", uploadTitle.trim());
        formData.append("subject", uploadSubject);
        if (uploadBoardId) formData.append("boardId", uploadBoardId);
        if (uploadClassId) formData.append("classId", uploadClassId);
        if (uploadCourseId) formData.append("courseId", uploadCourseId);
        if (uploadChapterId) formData.append("chapterId", uploadChapterId);
        if (uploadBatchId) formData.append("batchId", uploadBatchId);
        formData.append("lectureNumber", uploadLectureNumber);
        if (uploadDescription.trim()) formData.append("description", uploadDescription.trim());
        formData.append("thumbnailUrl", uploadThumbnailUrl.trim());
        formData.append("durationFormatted", uploadDurationFormatted.trim() || "45:00");
        formData.append("durationHuman", `${uploadDurationFormatted.split(":")[0] || "45"} min`);
        formData.append("status", uploadStatusTarget);
        formData.append("video", videoFile);

        res = await fetch("/api/teacher/lectures/upload", {
          method: "POST",
          body: formData,
        });
      } else {
        const payload = {
          title: uploadTitle.trim(),
          subject: uploadSubject,
          boardId: uploadBoardId || null,
          classId: uploadClassId || null,
          courseId: uploadCourseId || null,
          chapterId: uploadChapterId || null,
          batchId: uploadBatchId || null,
          lectureNumber: parseInt(uploadLectureNumber, 10) || 1,
          description: uploadDescription.trim() || undefined,
          thumbnailUrl: uploadThumbnailUrl.trim(),
          videoPlaybackUrl: uploadVideoPlaybackUrl.trim() || undefined,
          durationFormatted: uploadDurationFormatted.trim() || "45:00",
          durationHuman: `${uploadDurationFormatted.split(":")[0] || "45"} min`,
          status: uploadStatusTarget,
        };

        res = await fetch("/api/teacher/lectures/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok || data.error) {
        setFeedback({ type: "error", message: data.error || "Failed to upload lecture." });
      } else {
        setFeedback({
          type: "success",
          message:
            uploadStatusTarget === "PENDING_REVIEW"
              ? `Lecture "${uploadTitle}" uploaded to YouTube and submitted to Super Admin for verification.`
              : `Lecture draft "${uploadTitle}" saved successfully.`,
        });
        setIsUploadOpen(false);
        // Reset form
        setUploadTitle("");
        setUploadDescription("");
        setVideoFile(null);
        setMaterialFile(null);
        setUploadedMaterialUrl(null);
        onRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (lec: CmsLecture) => {
    setEditingLecture(lec);
    setEditTitle(lec.title);
    setEditDescription(lec.description || "");
    setEditLectureNumber(String(lec.lecture_number || 1));
    setEditThumbnailUrl(lec.thumbnail_url);
    setEditVideoPlaybackUrl(lec.video_playback_url || "");
  };

  // Handle Save Edit & Resubmit
  const handleSaveEdit = async (submitForReview = false) => {
    if (!editingLecture) return;

    try {
      setIsSavingEdit(true);
      setFeedback(null);

      const payload = {
        id: editingLecture.id,
        title: editTitle.trim(),
        description: editDescription.trim(),
        lectureNumber: parseInt(editLectureNumber, 10) || 1,
        thumbnailUrl: editThumbnailUrl.trim(),
        videoPlaybackUrl: editVideoPlaybackUrl.trim() || undefined,
        status: submitForReview ? "PENDING_REVIEW" : undefined,
      };

      const res = await fetch("/api/teacher/lectures/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFeedback({ type: "error", message: data.error || "Failed to update lecture." });
      } else {
        setFeedback({
          type: "success",
          message: submitForReview
            ? `Revisions for "${editTitle}" submitted to Super Admin.`
            : `Lecture updated successfully.`,
        });
        setEditingLecture(null);
        onRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-brand-charcoal tracking-tight flex items-center gap-2">
            <Video className="h-5 w-5 text-brand-orange" />
            Recorded Lectures Workspace
          </h2>
          <p className="text-xs text-brand-text-muted">
            Upload new lectures with companion notes, modify drafts, and track Super Admin approval reviews.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          className="bg-brand-orange hover:bg-brand-orange-hover text-white shadow-md font-bold text-xs"
        >
          <UploadCloud className="h-4 w-4 mr-1.5" />
          Upload Recorded Lecture
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-brand-border/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {(["ALL", "DRAFT", "PENDING_REVIEW", "REJECTED", "APPROVED", "PUBLISHED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === tab
                  ? "bg-brand-charcoal text-white shadow-xs"
                  : "bg-brand-bg-warm text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-border/40"
              }`}
            >
              {tab === "REJECTED" ? "REVISION REQUESTED" : tab.replace("_", " ")}
              <span className="ml-1.5 opacity-70">
                {tab === "ALL" && lectures.length}
                {tab === "DRAFT" && lectures.filter((l) => l.status === "DRAFT").length}
                {tab === "PENDING_REVIEW" && lectures.filter((l) => l.status === "PENDING_REVIEW").length}
                {tab === "REJECTED" && lectures.filter((l) => l.status === "REJECTED").length}
                {tab === "APPROVED" && lectures.filter((l) => l.status === "APPROVED").length}
                {tab === "PUBLISHED" && lectures.filter((l) => l.status === "PUBLISHED").length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lectures..."
            className="pl-8 h-8 text-xs rounded-xl bg-brand-bg-warm/50 border-brand-border/80"
          />
        </div>
      </div>

      {/* Lectures Grid */}
      {filteredLectures.length === 0 ? (
        <Card className="p-12 text-center bg-brand-surface border-dashed border-2 border-brand-border/80 rounded-2xl space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-brand-bg-peach/60 text-brand-orange flex items-center justify-center mx-auto">
            <Video className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-brand-charcoal">No recorded lectures found</h3>
          <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
            {filter !== "ALL"
              ? `No lectures currently matching the "${filter}" filter.`
              : "You have not submitted any recorded lectures yet. Click 'Upload Recorded Lecture' above to create a draft."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLectures.map((lec) => {
            const isDraft = lec.status === "DRAFT";
            const isPending = lec.status === "PENDING_REVIEW";
            const isRejected = lec.status === "REJECTED";
            const isApproved = lec.status === "APPROVED";
            const isPublished = lec.status === "PUBLISHED";
            const isLocked = isApproved || isPublished;

            return (
              <Card
                key={lec.id}
                className="p-5 flex flex-col justify-between rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card transition-all"
              >
                <div className="space-y-3">
                  {/* Status & Subject Row */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-brand-orange">
                      {lec.subject}
                    </span>

                    {isDraft && (
                      <Badge variant="neutral" size="sm" className="text-[10px] font-bold uppercase">
                        DRAFT
                      </Badge>
                    )}

                    {isPending && (
                      <Badge variant="peach" size="sm" className="text-[10px] font-bold uppercase animate-pulse">
                        PENDING REVIEW
                      </Badge>
                    )}

                    {isRejected && (
                      <Badge variant="outline" size="sm" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-bold uppercase">
                        REVISION REQUESTED
                      </Badge>
                    )}

                    {isApproved && (
                      <Badge variant="outline" size="sm" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-bold uppercase">
                        APPROVED
                      </Badge>
                    )}

                    {isPublished && (
                      <Badge variant="primary" size="sm" className="text-[10px] font-bold uppercase">
                        PUBLISHED
                      </Badge>
                    )}
                  </div>

                  {/* Title & Duration */}
                  <div>
                    <h3 className="text-sm font-bold text-brand-charcoal line-clamp-2 leading-tight">
                      {lec.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-brand-text-muted mt-1 font-medium">
                      <span>Lecture #{lec.lecture_number || 1}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lec.duration_human || lec.duration_formatted}
                      </span>
                    </div>
                  </div>

                  {/* Rejection / Revision Notice Banner */}
                  {isRejected && lec.review_note && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>Super Admin Review Feedback:</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed italic">
                        &ldquo;{lec.review_note}&rdquo;
                      </p>
                      {lec.reviewed_at && (
                        <p className="text-[10px] text-rose-600/80 pt-0.5">
                          Reviewed on {new Date(lec.reviewed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Locked Governance Notice */}
                  {isLocked && (
                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                        <Lock className="h-3 w-3 text-emerald-600" />
                        <span>Editing Locked by Governance</span>
                      </div>
                      <p className="text-[10px] text-emerald-700">
                        Super Admin approved this lecture. Modifications are managed by CMS administration.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-brand-border/60 mt-4 flex items-center justify-between gap-2">
                  {!isLocked ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(lec)}
                        className="flex-1 bg-white hover:bg-brand-bg-warm text-brand-charcoal font-bold text-xs"
                      >
                        <FileEdit className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
                        Edit Metadata
                      </Button>

                      {isDraft && !isSuperAdmin && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            const res = await fetch("/api/teacher/lectures/update", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: lec.id, status: "PENDING_REVIEW" }),
                            });
                            if (res.ok) {
                              setFeedback({ type: "success", message: `"${lec.title}" submitted for review.` });
                              onRefresh();
                            }
                          }}
                          className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs"
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Submit
                        </Button>
                      )}

                      {isPending && isSuperAdmin && (
                        <Button
                          size="sm"
                          onClick={() => {
                            window.location.href = `/admin/cms/lectures?search=${encodeURIComponent(lec.title)}`;
                          }}
                          className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Review in CMS
                        </Button>
                      )}

                      {isRejected && !isSuperAdmin && (
                        <Button
                          size="sm"
                          onClick={() => openEditModal(lec)}
                          className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs"
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Fix & Resubmit
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-between w-full text-xs">
                      <span className="text-[11px] font-semibold text-brand-text-muted flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Approved & Live
                      </span>
                      {lec.video_playback_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(lec.video_playback_url || "#", "_blank")}
                          className="text-brand-orange hover:text-brand-orange-hover text-xs font-bold"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Watch Stream
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* UPLOAD RECORDED LECTURE MODAL / WIZARD */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Recorded Lecture"
        description="Provide comprehensive metadata and optional companion study notes before submitting for review."
        maxWidth="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">
              Lecture Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="e.g. Complete Kinematics & 2D Projectile Motion"
              className={formErrors.title ? "border-red-500" : ""}
            />
            {formErrors.title && <p className="text-[11px] text-red-500">{formErrors.title}</p>}
          </div>

          {/* Academic Taxonomy Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Subject *</label>
              <select
                value={uploadSubject}
                onChange={(e) => setUploadSubject(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium"
              >
                {subjects.length > 0 ? (
                  subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Class Level</label>
              <select
                value={uploadClassId}
                onChange={(e) => setUploadClassId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium"
              >
                <option value="">Select Class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Board</label>
              <select
                value={uploadBoardId}
                onChange={(e) => setUploadBoardId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium"
              >
                <option value="">Select Board</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Course, Batch, Lecture Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Course Mapping</label>
              <select
                value={uploadCourseId}
                onChange={(e) => setUploadCourseId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium"
              >
                <option value="">Select Course</option>
                {courses.map((cr) => (
                  <option key={cr.id} value={cr.id}>
                    {cr.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Batch Association</label>
              <select
                value={uploadBatchId}
                onChange={(e) => setUploadBatchId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium"
              >
                <option value="">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Lecture Number</label>
              <Input
                type="number"
                min="1"
                value={uploadLectureNumber}
                onChange={(e) => setUploadLectureNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Video Asset Upload Box */}
          <div className="p-3.5 rounded-2xl bg-orange-50/50 border border-orange-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5">
                <Video className="h-4 w-4 text-brand-orange" />
                Select Recorded Video File (Auto-Upload to YouTube)
              </label>
              <span className="text-[10px] font-bold text-brand-orange bg-white px-2 py-0.5 rounded-full border border-orange-200">
                YouTube v3 Ingest
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo"
                id="lecture-video-file-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setVideoFile(file);
                  }
                }}
              />
              <label
                htmlFor="lecture-video-file-input"
                className="w-full sm:w-auto cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-brand-border/80 text-xs font-bold text-brand-charcoal hover:bg-brand-bg-warm transition-all shadow-2xs shrink-0"
              >
                <UploadCloud className="h-4 w-4 text-brand-orange" />
                {videoFile ? "Change Video File" : "Choose Video File (MP4, WebM, MOV)"}
              </label>

              {videoFile ? (
                <div className="flex items-center gap-2 text-xs text-brand-charcoal font-medium bg-white px-3 py-1.5 rounded-xl border border-brand-border w-full justify-between">
                  <span className="truncate max-w-[200px] sm:max-w-[260px] font-bold text-brand-charcoal">
                    {videoFile.name}
                  </span>
                  <span className="text-[11px] text-brand-text-muted shrink-0">
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-brand-text-muted">
                  Or provide a pre-existing HLS stream URL below if already hosted.
                </p>
              )}
            </div>

            {!videoFile && (
              <div className="pt-1">
                <Input
                  value={uploadVideoPlaybackUrl}
                  onChange={(e) => setUploadVideoPlaybackUrl(e.target.value)}
                  placeholder="Fallback Stream URL: https://stream.topveda.com/.../manifest.m3u8"
                  className="h-8 text-xs bg-white"
                />
              </div>
            )}
          </div>

          {/* Thumbnail URL */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">
              Thumbnail URL <span className="text-red-500">*</span>
            </label>
            <Input
              value={uploadThumbnailUrl}
              onChange={(e) => setUploadThumbnailUrl(e.target.value)}
              placeholder="/thumbnails/sample.jpg"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Description & Syllabus Coverage</label>
            <textarea
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Summary of formulas, derivations, and practice problems covered in this lecture..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-brand-border/80 text-xs text-brand-charcoal font-medium resize-none focus:ring-2 focus:ring-brand-orange/30"
            />
          </div>

          {/* Optional Companion Lecture Materials (PDF) */}
          <div className="p-3 rounded-xl bg-brand-bg-warm/70 border border-brand-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-brand-charcoal flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-brand-orange" />
                Attach Lecture Notes / Formula Sheet (PDF)
              </label>
              <span className="text-[10px] text-brand-text-muted">Optional</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="application/pdf"
                id="lecture-material-input"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setMaterialFile(file);
                    void handleMaterialFileUpload(file);
                  }
                }}
              />
              <label
                htmlFor="lecture-material-input"
                className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-brand-border/80 text-xs font-bold text-brand-charcoal hover:bg-brand-bg-warm"
              >
                {isUploadingMaterial ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-orange" />
                ) : (
                  <UploadCloud className="h-3.5 w-3.5 text-brand-orange" />
                )}
                {materialFile ? materialFile.name : "Select PDF Document"}
              </label>

              {uploadedMaterialUrl && (
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Staged to Vault
                </span>
              )}
            </div>
          </div>

          {/* Submission Mode Selector */}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-brand-charcoal cursor-pointer">
              <input
                type="radio"
                name="uploadStatus"
                checked={uploadStatusTarget === "PENDING_REVIEW"}
                onChange={() => setUploadStatusTarget("PENDING_REVIEW")}
                className="text-brand-orange focus:ring-brand-orange"
              />
              Submit directly for Super Admin review
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-brand-charcoal cursor-pointer">
              <input
                type="radio"
                name="uploadStatus"
                checked={uploadStatusTarget === "DRAFT"}
                onChange={() => setUploadStatusTarget("DRAFT")}
                className="text-brand-orange focus:ring-brand-orange"
              />
              Save as draft (edit later)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUploadOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isUploading}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs"
            >
              {isUploading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              {uploadStatusTarget === "PENDING_REVIEW" ? "Upload & Submit for Review" : "Save Draft"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* EDIT LECTURE MODAL */}
      <Modal
        isOpen={!!editingLecture}
        onClose={() => setEditingLecture(null)}
        title="Edit Recorded Lecture"
        description="Modify metadata or respond to revision feedback before Super Admin approval."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2">
          {editingLecture?.status === "REJECTED" && editingLecture.review_note && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
              <p className="font-bold text-rose-800">Admin Revision Request Note:</p>
              <p className="text-rose-700 italic">&ldquo;{editingLecture.review_note}&rdquo;</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Lecture Title</label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Lecture Number</label>
              <Input
                type="number"
                min="1"
                value={editLectureNumber}
                onChange={(e) => setEditLectureNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Thumbnail URL</label>
              <Input value={editThumbnailUrl} onChange={(e) => setEditThumbnailUrl(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Video Stream / Playback URL</label>
            <Input value={editVideoPlaybackUrl} onChange={(e) => setEditVideoPlaybackUrl(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-brand-border/80 text-xs text-brand-charcoal resize-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingLecture(null)}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSaveEdit(false)}
              disabled={isSavingEdit}
              className="font-bold text-xs"
            >
              Save Changes
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveEdit(true)}
              disabled={isSavingEdit}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs"
            >
              {isSavingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save & Submit to Super Admin
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
