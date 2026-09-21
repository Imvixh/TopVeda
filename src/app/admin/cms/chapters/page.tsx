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
import { CmsChapter, CmsCourse, CmsBatch, ContentStatus } from "@/types/cms.types";
import {
  ListOrdered,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Archive,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from "lucide-react";

export default function ChaptersCmsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-sm text-brand-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
          Loading chapters...
        </div>
      }
    >
      <ChaptersCmsContent />
    </React.Suspense>
  );
}

function ChaptersCmsContent() {
  const supabase = React.useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const initialCourseId = searchParams.get("courseId") || "ALL";

  const [chapters, setChapters] = React.useState<CmsChapter[]>([]);
  const [courses, setCourses] = React.useState<CmsCourse[]>([]);
  const [batches, setBatches] = React.useState<CmsBatch[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = React.useState<string>(initialCourseId);
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingChapter, setEditingChapter] = React.useState<CmsChapter | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsChapter | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Form State
  const [formCourseId, setFormCourseId] = React.useState("");
  const [formBatchId, setFormBatchId] = React.useState("");
  const [formChapterNumber, setFormChapterNumber] = React.useState(1);
  const [formTitle, setFormTitle] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [coursesData, batchesData, chaptersData] = await Promise.all([
          CmsService.getCourses(supabase),
          CmsService.getBatches(supabase),
          CmsService.getChapters(supabase),
        ]);
        if (!isMounted) return;
        setCourses(coursesData);
        setBatches(batchesData);
        setChapters(chaptersData);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load syllabus chapters." });
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
    if (!editingChapter) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormSlug(autoSlug);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingChapter(null);
    setFormCourseId(selectedCourseFilter !== "ALL" ? selectedCourseFilter : courses[0]?.id || "");
    setFormBatchId("");
    setFormChapterNumber(chapters.length + 1);
    setFormTitle("");
    setFormSlug("");
    setFormDescription("");
    setFormDisplayOrder(chapters.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ch: CmsChapter) => {
    setEditingChapter(ch);
    setFormCourseId(ch.course_id);
    setFormBatchId(ch.batch_id || "");
    setFormChapterNumber(ch.chapter_number);
    setFormTitle(ch.title);
    setFormSlug(ch.slug);
    setFormDescription(ch.description || "");
    setFormDisplayOrder(ch.display_order);
    setFormIsVisible(ch.is_visible);
    setFormStatus(ch.status);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formCourseId) errors.courseId = "Parent Course is required";
    if (!formTitle.trim()) errors.title = "Chapter title is required";
    if (!formSlug.trim()) errors.slug = "URL slug is required";
    if (formChapterNumber <= 0) errors.chapterNumber = "Chapter number must be greater than 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsChapter> = {
      ...(editingChapter ? { id: editingChapter.id } : {}),
      course_id: formCourseId,
      batch_id: formBatchId || null,
      chapter_number: Number(formChapterNumber) || 1,
      title: formTitle.trim(),
      slug: formSlug.trim().toLowerCase(),
      description: formDescription.trim() || null,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
    };

    const { data, error } = await CmsService.upsertChapter(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save chapter." });
    } else {
      setFeedback({
        type: "success",
        message: editingChapter ? "Chapter updated successfully." : "Chapter created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_chapters", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive chapter." });
    } else {
      setFeedback({ type: "success", message: `Chapter "${archiveTarget.title}" archived successfully.` });
      handleManualRefresh();
    }
  };

  // Map Course ID to Course Name for table display
  const courseMap = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) {
      map.set(c.id, c.title);
    }
    return map;
  }, [courses]);

  // Filtered Chapters List
  const filteredChapters = React.useMemo(() => {
    return chapters.filter((ch) => {
      const matchesSearch =
        searchQuery === "" ||
        ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCourse = selectedCourseFilter === "ALL" || ch.course_id === selectedCourseFilter;
      const matchesStatus = statusFilter === "ALL" || ch.status === statusFilter;

      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [chapters, searchQuery, selectedCourseFilter, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              SYLLABUS & LESSONS
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              cms_chapters
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <ListOrdered className="h-7 w-7 text-brand-orange" />
            <span>Syllabus Chapters & Units</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Organize chapter hierarchy and curriculum unit sequences bound to academic courses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Chapter
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

      {/* 2. Search & Course Filter Toolbar */}
      <Card className="p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Input
              placeholder="Search chapters by title or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <select
              aria-label="Filter chapters by course"
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Parent Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter chapters by status"
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
                <th className="py-3 px-4 text-center">Unit #</th>
                <th className="py-3 px-4">Chapter Title</th>
                <th className="py-3 px-4">Parent Course</th>
                <th className="py-3 px-4">Slug</th>
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
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-brand-orange" />
                      <span>Loading syllabus chapters...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredChapters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-brand-text-muted">
                    <div className="space-y-2">
                      <ListOrdered className="h-8 w-8 text-brand-text-muted/50 mx-auto" />
                      <p className="font-bold text-brand-text-primary">No chapters found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search filter." : "Click '+ Add Chapter' to create syllabus units for your courses."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredChapters.map((ch) => (
                  <tr key={ch.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                    <td className="py-3.5 px-4 text-center font-extrabold text-brand-orange">
                      <Badge variant="peach" size="sm" className="font-mono text-[10px]">
                        Ch {ch.chapter_number}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-brand-text-primary max-w-xs">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-brand-text-primary line-clamp-1">{ch.title}</p>
                        {ch.description && <p className="text-[11px] text-brand-text-muted line-clamp-1">{ch.description}</p>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-brand-text-muted max-w-xs truncate">
                      <div className="flex items-center gap-1.5 font-medium">
                        <BookOpen className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                        <span className="truncate">{courseMap.get(ch.course_id) || "Course"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-brand-text-muted">{ch.slug}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{ch.display_order}</td>
                    <td className="py-3.5 px-4 text-center">
                      {ch.is_visible ? (
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
                          ch.status === "PUBLISHED"
                            ? "success"
                            : ch.status === "DRAFT"
                            ? "neutral"
                            : "peach"
                        }
                        size="sm"
                        className="font-bold text-[10px]"
                      >
                        {ch.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(ch)}
                          className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                          title="Edit Chapter"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {ch.status !== "ARCHIVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setArchiveTarget(ch)}
                            className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                            title="Archive Chapter"
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

      {/* 4. Create / Edit Chapter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingChapter ? "Edit Chapter" : "Create Syllabus Chapter"}
        description="Configure parent course, unit number, chapter title, and syllabus sequence."
        maxWidth="md"
      >
        <form onSubmit={handleSaveChapter} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">Parent Course *</label>
            <select
              aria-label="Select parent course"
              value={formCourseId}
              onChange={(e) => setFormCourseId(e.target.value)}
              disabled={isSaving}
              className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">Cohort / Batch Association (Optional)</label>
            <select
              aria-label="Select cohort or batch"
              value={formBatchId}
              onChange={(e) => setFormBatchId(e.target.value)}
              disabled={isSaving}
              className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="">All Cohorts (General Syllabus)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.board_label})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Unit / Ch #"
              type="number"
              value={formChapterNumber}
              onChange={(e) => setFormChapterNumber(Number(e.target.value))}
              error={formErrors.chapterNumber}
              disabled={isSaving}
            />

            <div className="col-span-2">
              <Input
                label="Chapter Title *"
                placeholder="e.g. Real Numbers & Polynomials"
                value={formTitle}
                onChange={handleTitleChange}
                error={formErrors.title}
                disabled={isSaving}
              />
            </div>
          </div>

          <Input
            label="URL Slug *"
            placeholder="e.g. real-numbers-and-polynomials"
            value={formSlug}
            onChange={(e) => setFormSlug(e.target.value)}
            error={formErrors.slug}
            disabled={isSaving}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-brand-text-primary">Chapter Summary / Objectives</label>
            <textarea
              placeholder="Key concepts, syllabus topics covered..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              disabled={isSaving}
              className="w-full rounded-lg border border-brand-border bg-brand-surface p-2.5 text-xs text-brand-text-primary placeholder:text-brand-text-subtle focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                aria-label="Chapter status"
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

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="formIsVisibleChapter"
              checked={formIsVisible}
              onChange={(e) => setFormIsVisible(e.target.checked)}
              disabled={isSaving}
              className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
            />
            <label htmlFor="formIsVisibleChapter" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
              Visible in Student Chapter Syllabus
            </label>
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
              {isSaving ? "Saving..." : editingChapter ? "Update Chapter" : "Create Chapter"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Chapter?"
        description="Are you sure you want to archive this chapter? It will be hidden from student lecture syllabus exploration."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-peach/50 border border-brand-orange-border/60 text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">Ch {archiveTarget.chapter_number}: {archiveTarget.title}</p>
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
    </div>
  );
}
