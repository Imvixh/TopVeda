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
  CmsStudyMaterial,
  CmsCourse,
  CmsChapter,
  ContentStatus,
} from "@/types/cms.types";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Archive,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Upload,
  Download,
  FileCheck,
  HardDrive,
  FileSpreadsheet,
} from "lucide-react";

export default function StudyMaterialsCmsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-sm text-brand-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
          Loading study materials library...
        </div>
      }
    >
      <StudyMaterialsCmsContent />
    </React.Suspense>
  );
}

function StudyMaterialsCmsContent() {
  const supabase = React.useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId") || "ALL";
  const initialChapterId = searchParams.get("chapterId") || "ALL";

  const [studyMaterials, setStudyMaterials] = React.useState<CmsStudyMaterial[]>([]);
  const [courses, setCourses] = React.useState<CmsCourse[]>([]);
  const [chapters, setChapters] = React.useState<CmsChapter[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = React.useState<string>(initialCourseId);
  const [selectedChapterFilter, setSelectedChapterFilter] = React.useState<string>(initialChapterId);
  const [materialTypeFilter, setMaterialTypeFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingMaterial, setEditingMaterial] = React.useState<CmsStudyMaterial | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsStudyMaterial | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Form State
  const [formCourseId, setFormCourseId] = React.useState("");
  const [formChapterId, setFormChapterId] = React.useState("");
  const [formTitle, setFormTitle] = React.useState("");
  const [formMaterialType, setFormMaterialType] = React.useState<"formula_sheet" | "notes" | "ncert_solution" | "pyq_paper">("formula_sheet");
  const [formFileUrl, setFormFileUrl] = React.useState("");
  const [formFileSizeBytes, setFormFileSizeBytes] = React.useState<number | null>(null);
  const [formPageCount, setFormPageCount] = React.useState<number | null>(null);
  const [formDisplayOrder, setFormDisplayOrder] = React.useState(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // PDF Upload & Signed Preview States
  const [isUploadingPdf, setIsUploadingPdf] = React.useState(false);
  const [signedDocPreview, setSignedDocPreview] = React.useState<string | null>(null);

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [cData, chData, smData] = await Promise.all([
          CmsService.getCourses(supabase),
          CmsService.getChapters(supabase),
          CmsService.getStudyMaterials(supabase),
        ]);
        if (!isMounted) return;
        setCourses(cData);
        setChapters(chData);
        setStudyMaterials(smData);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load study materials and syllabus taxonomy." });
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
    setEditingMaterial(null);
    const defaultCourse = courses[0]?.id || "";
    setFormCourseId(defaultCourse);
    const relatedChapters = chapters.filter((ch) => ch.course_id === defaultCourse);
    setFormChapterId(relatedChapters[0]?.id || chapters[0]?.id || "");
    setFormTitle("");
    setFormMaterialType("formula_sheet");
    setFormFileUrl("");
    setFormFileSizeBytes(null);
    setFormPageCount(null);
    setFormDisplayOrder(studyMaterials.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormErrors({});
    setSignedDocPreview(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (sm: CmsStudyMaterial) => {
    setEditingMaterial(sm);
    // Find parent course from chapter or direct course_id
    let resolvedCourseId = sm.course_id || "";
    if (!resolvedCourseId && sm.chapter_id) {
      const parentCh = chapters.find((ch) => ch.id === sm.chapter_id);
      if (parentCh) resolvedCourseId = parentCh.course_id;
    }
    setFormCourseId(resolvedCourseId || courses[0]?.id || "");
    setFormChapterId(sm.chapter_id || "");
    setFormTitle(sm.title);
    setFormMaterialType(sm.material_type);
    setFormFileUrl(sm.file_url);
    setFormFileSizeBytes(sm.file_size_bytes || null);
    setFormPageCount(sm.page_count || null);
    setFormDisplayOrder(sm.display_order);
    setFormIsVisible(sm.is_visible);
    setFormStatus(sm.status);
    setFormErrors({});

    // If PDF is in private storage, generate signed download preview URL
    if (sm.file_url && sm.file_url.includes("/")) {
      const { signedUrl } = await StorageService.getSignedUrl(supabase, "study-materials", sm.file_url, 3600);
      setSignedDocPreview(signedUrl);
    } else {
      setSignedDocPreview(null);
    }

    setIsModalOpen(true);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate PDF client-side
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFormErrors((prev) => ({ ...prev, file: "Strict validation error: Only PDF documents are permitted." }));
      return;
    }

    // Validate 50 MB limit
    const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_BYTES) {
      setFormErrors((prev) => ({ ...prev, file: "Document size exceeds the 50 MB maximum bucket limit." }));
      return;
    }

    setIsUploadingPdf(true);
    setFormErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });

    try {
      const { data: userData } = await supabase.auth.getUser();
      const authorId = userData.user?.id || "super-admin";
      const targetMaterialId = editingMaterial?.id || "draft-" + Date.now();
      const storagePath = StorageService.generateScopedPath(authorId, targetMaterialId, file.name);

      const { path, error } = await StorageService.uploadFile(
        supabase,
        "study-materials",
        storagePath,
        file,
        { contentType: "application/pdf" }
      );

      if (error || !path) {
        throw error || new Error("Failed to upload PDF file to storage.");
      }

      setFormFileUrl(path);
      setFormFileSizeBytes(file.size);

      // Try generating a temporary signed URL for verification preview
      const { signedUrl } = await StorageService.getSignedUrl(supabase, "study-materials", path, 3600);
      setSignedDocPreview(signedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error uploading PDF document";
      setFormErrors((prev) => ({ ...prev, file: msg }));
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = "Document title is required";
    if (!formFileUrl.trim()) errors.fileUrl = "Valid PDF storage path or uploaded document is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsStudyMaterial> = {
      ...(editingMaterial ? { id: editingMaterial.id } : {}),
      course_id: formCourseId || null,
      chapter_id: formChapterId || null,
      title: formTitle.trim(),
      material_type: formMaterialType,
      file_url: formFileUrl.trim(),
      file_size_bytes: formFileSizeBytes ? Number(formFileSizeBytes) : null,
      page_count: formPageCount ? Number(formPageCount) : null,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
    };

    const { data, error } = await CmsService.upsertStudyMaterial(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save study material." });
    } else {
      setFeedback({
        type: "success",
        message: editingMaterial ? "Study material updated successfully." : "Study material published successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_study_materials", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive study material." });
    } else {
      setFeedback({ type: "success", message: `Study material "${archiveTarget.title}" archived successfully.` });
      handleManualRefresh();
    }
  };

  // Helper to format bytes to KB / MB
  const formatBytes = (bytes?: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Chapter and Course Map lookup
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

  // Filtered Study Materials
  const filteredMaterials = React.useMemo(() => {
    return studyMaterials.filter((sm) => {
      const matchesSearch =
        searchQuery === "" ||
        sm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sm.material_type.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesCourse = true;
      if (selectedCourseFilter !== "ALL") {
        if (sm.course_id) {
          matchesCourse = sm.course_id === selectedCourseFilter;
        } else if (sm.chapter_id) {
          const parentChapter = chapterMap.get(sm.chapter_id);
          matchesCourse = parentChapter?.course_id === selectedCourseFilter;
        } else {
          matchesCourse = false;
        }
      }

      const matchesChapter = selectedChapterFilter === "ALL" || sm.chapter_id === selectedChapterFilter;
      const matchesType = materialTypeFilter === "ALL" || sm.material_type === materialTypeFilter;
      const matchesStatus = statusFilter === "ALL" || sm.status === statusFilter;

      return matchesSearch && matchesCourse && matchesChapter && matchesType && matchesStatus;
    });
  }, [studyMaterials, searchQuery, selectedCourseFilter, selectedChapterFilter, materialTypeFilter, statusFilter, chapterMap]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              ACADEMIC DOCUMENTS VAULT
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              cms_study_materials
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-brand-orange" />
            <span>Study Materials & PDF Notes</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Manage downloadable PDF notes, formula sheets, NCERT solutions, and PYQ papers in private scoped storage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Upload Document
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by document title or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <select
              aria-label="Filter by course"
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
              aria-label="Filter by chapter"
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
              aria-label="Filter by material type"
              value={materialTypeFilter}
              onChange={(e) => setMaterialTypeFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Document Types</option>
              <option value="formula_sheet">Formula Sheets</option>
              <option value="notes">Revision Notes</option>
              <option value="ncert_solution">NCERT Solutions</option>
              <option value="pyq_paper">PYQ Papers</option>
            </select>
          </div>

          <div>
            <select
              aria-label="Filter by status"
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
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Curriculum Path</th>
                <th className="py-3 px-4 text-center">File Metrics</th>
                <th className="py-3 px-4 text-center">Downloads</th>
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
                    Loading study materials...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-brand-text-muted">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-full bg-brand-bg-peach flex items-center justify-center text-brand-orange">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-brand-text-primary">No study materials found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search filter." : "Click '+ Upload Document' to add your first study material."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((sm) => {
                  const parentChapter = sm.chapter_id ? chapterMap.get(sm.chapter_id) : null;
                  const parentCourseTitle = sm.course_id
                    ? courseMap.get(sm.course_id)
                    : parentChapter
                    ? courseMap.get(parentChapter.course_id)
                    : "General";

                  return (
                    <tr key={sm.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-brand-text-primary max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 shrink-0 rounded bg-red-50 text-red-600 border border-red-200 flex items-center justify-center">
                            <FileSpreadsheet className="h-4 w-4" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-brand-text-primary line-clamp-1">{sm.title}</p>
                            <p className="text-[11px] font-mono text-brand-text-muted truncate max-w-[200px]">{sm.file_url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center text-[10px] font-bold text-brand-orange bg-brand-bg-peach px-2 py-0.5 rounded-full border border-brand-orange-border/60">
                          {sm.material_type.replace(/_/g, " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-brand-text-primary line-clamp-1">{parentCourseTitle}</p>
                          <p className="text-[11px] text-brand-text-muted line-clamp-1">
                            {parentChapter ? `Ch ${parentChapter.chapter_number}: ${parentChapter.title}` : "Course-Wide"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-0.5 text-[11px]">
                          <span className="font-semibold text-brand-text-primary">{formatBytes(sm.file_size_bytes)}</span>
                          <span className="text-brand-text-muted">{sm.page_count ? `${sm.page_count} pages` : "PDF"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-brand-text-muted">
                          <Download className="h-3 w-3" /> {sm.download_count}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{sm.display_order}</td>
                      <td className="py-3.5 px-4 text-center">
                        {sm.is_visible ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <Eye className="h-3 w-3" /> Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            <EyeOff className="h-3 w-3" /> Hidden
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            sm.status === "PUBLISHED"
                              ? "success"
                              : sm.status === "DRAFT"
                              ? "neutral"
                              : "peach"
                          }
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {sm.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(sm)}
                            className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                            title="Edit Material"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {sm.status !== "ARCHIVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setArchiveTarget(sm)}
                              className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                              title="Archive Material"
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

      {/* 4. Create / Edit Study Material Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingMaterial ? "Edit Study Material" : "Upload Academic Study Material"}
        description="Configure PDF document metadata, syllabus chapter linking, and upload files to the private document vault."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveMaterial} className="space-y-4">
          {/* Relational Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Parent Course (Optional)</label>
              <select
                aria-label="Select course"
                value={formCourseId}
                onChange={(e) => handleCourseChangeInForm(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="">General / Independent Document</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Syllabus Chapter (Optional)</label>
              <select
                aria-label="Select chapter"
                value={formChapterId}
                onChange={(e) => setFormChapterId(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="">Entire Course / All Units</option>
                {formChaptersList.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Ch {ch.chapter_number}: {ch.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Input
                label="Document Title *"
                placeholder="e.g. Class 10 Trigonometry Formula Sheet & Cheatsheet"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                error={formErrors.title}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Material Type *</label>
              <select
                aria-label="Material type"
                value={formMaterialType}
                onChange={(e) => setFormMaterialType(e.target.value as "formula_sheet" | "notes" | "ncert_solution" | "pyq_paper")}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="formula_sheet">Formula Cheatsheet</option>
                <option value="notes">Revision Notes</option>
                <option value="ncert_solution">NCERT Solutions</option>
                <option value="pyq_paper">Previous Year Questions (PYQ)</option>
              </select>
            </div>
          </div>

          {/* Secure PDF Storage Vault Upload */}
          <div className="space-y-2.5 p-3.5 rounded-xl border border-brand-border bg-brand-surface">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-brand-text-primary flex items-center gap-1.5">
                <HardDrive className="h-4 w-4 text-brand-orange" />
                <span>PDF Document Upload (Private Bucket: study-materials)</span>
              </label>
              <span className="text-[10px] text-brand-text-muted">Max Limit: 50 MB (PDF Only)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Storage Scoped Path Reference *"
                placeholder="e.g. {author_id}/{material_id}/filename.pdf"
                value={formFileUrl}
                onChange={(e) => setFormFileUrl(e.target.value)}
                error={formErrors.fileUrl}
                disabled={isSaving}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-brand-text-primary">Select & Upload PDF</label>
                <label className="flex items-center justify-center gap-2 h-10 w-full rounded-lg border border-dashed border-brand-border bg-brand-bg-warm px-3 py-2 text-xs font-semibold text-brand-text-primary cursor-pointer hover:border-brand-orange transition-colors">
                  <Upload className="h-4 w-4 text-brand-orange" />
                  <span>{isUploadingPdf ? "Uploading PDF..." : "Choose Local PDF File"}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handlePdfUpload}
                    disabled={isSaving || isUploadingPdf}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {formErrors.file && <p className="text-[11px] text-red-500 font-medium">{formErrors.file}</p>}

            {signedDocPreview && (
              <div className="mt-2 flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                  <FileCheck className="h-4 w-4 text-emerald-600" />
                  <span>Encrypted upload verified: {formatBytes(formFileSizeBytes)}</span>
                </div>
                <a
                  href={signedDocPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-emerald-300 shadow-2xs"
                >
                  <Download className="h-3 w-3" /> Test Signed Download
                </a>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Page Count"
              type="number"
              placeholder="e.g. 12"
              value={formPageCount !== null ? formPageCount : ""}
              onChange={(e) => setFormPageCount(e.target.value ? Number(e.target.value) : null)}
              disabled={isSaving}
            />

            <Input
              label="Display Order"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
              disabled={isSaving}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Content Status</label>
              <select
                aria-label="Content status"
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
          </div>

          <div className="p-3 rounded-xl bg-brand-bg-warm/40 border border-brand-border flex items-center gap-2">
            <input
              type="checkbox"
              id="formIsVisibleMat"
              checked={formIsVisible}
              onChange={(e) => setFormIsVisible(e.target.checked)}
              disabled={isSaving}
              className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
            />
            <label htmlFor="formIsVisibleMat" className="text-xs font-semibold text-brand-text-primary cursor-pointer">
              Visible on Student Study Materials Portal
            </label>
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
              {isSaving ? "Saving..." : editingMaterial ? "Update Document" : "Publish Document"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Study Material?"
        description="Are you sure you want to archive this document? It will be hidden from student study material listings."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-peach/50 border border-brand-orange-border/60 text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.title}</p>
              <p className="text-brand-text-muted">Type: {archiveTarget.material_type} • File: {archiveTarget.file_url}</p>
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
    </div>
  );
}
