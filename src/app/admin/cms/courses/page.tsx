"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import {
  CmsCourse,
  CmsBoard,
  CmsClassLevel,
  CmsSubject,
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
  GraduationCap,
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
  ListOrdered,
  Globe2,
  FileEdit,
} from "lucide-react";

export default function CoursesCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [courses, setCourses] = React.useState<CmsCourse[]>([]);
  const [boards, setBoards] = React.useState<CmsBoard[]>([]);
  const [classLevels, setClassLevels] = React.useState<CmsClassLevel[]>([]);
  const [subjects, setSubjects] = React.useState<CmsSubject[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBoardFilter, setSelectedBoardFilter] = React.useState<string>("ALL");
  const [selectedClassFilter, setSelectedClassFilter] = React.useState<string>("ALL");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<CmsCourse | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsCourse | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Publishing & Governance Dialog State
  const [publishTarget, setPublishTarget] = React.useState<PublishDialogTarget | null>(null);
  const [isPublishProcessing, setIsPublishProcessing] = React.useState(false);

  // Simulation Preview Modal State
  const [previewItem, setPreviewItem] = React.useState<PreviewContentItem | null>(null);

  // Form State (Academic Dependent Selectors)
  const [formBoardId, setFormBoardId] = React.useState("");
  const [formClassId, setFormClassId] = React.useState("");
  const [formSubjectId, setFormSubjectId] = React.useState("");
  const [formTitle, setFormTitle] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [formShortDescription, setFormShortDescription] = React.useState("");
  const [formThumbnailUrl, setFormThumbnailUrl] = React.useState("");
  const [formIconType, setFormIconType] = React.useState("school");
  const [formIconColor, setFormIconColor] = React.useState("text-brand-orange");
  const [formIconBg, setFormIconBg] = React.useState("bg-rose-50 border-rose-100");
  const [formIsFeatured, setFormIsFeatured] = React.useState(false);
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
        const [bData, clData, sData, cData] = await Promise.all([
          CmsService.getBoards(supabase),
          CmsService.getClassLevels(supabase),
          CmsService.getSubjects(supabase),
          CmsService.getCourses(supabase),
        ]);
        if (!isMounted) return;
        setBoards(bData);
        setClassLevels(clData);
        setSubjects(sData);
        setCourses(cData);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load courses or taxonomy dependencies." });
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
    if (!editingCourse) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormSlug(autoSlug);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingCourse(null);
    setFormBoardId(boards[0]?.id || "");
    setFormClassId(classLevels[0]?.id || "");
    setFormSubjectId(subjects[0]?.id || "");
    setFormTitle("");
    setFormCategory("Foundation Course");
    setFormSlug("");
    setFormShortDescription("");
    setFormThumbnailUrl("");
    setFormIconType("school");
    setFormIconColor("text-brand-orange");
    setFormIconBg("bg-rose-50 border-rose-100");
    setFormIsFeatured(false);
    setFormDisplayOrder(courses.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: CmsCourse) => {
    setEditingCourse(course);
    setFormBoardId(course.board_id);
    setFormClassId(course.class_id);
    setFormSubjectId(course.subject_id);
    setFormTitle(course.title);
    setFormCategory(course.category);
    setFormSlug(course.slug);
    setFormShortDescription(course.short_description || "");
    setFormThumbnailUrl(course.thumbnail_url || "");
    setFormIconType(course.icon_type || "school");
    setFormIconColor(course.icon_color || "text-brand-orange");
    setFormIconBg(course.icon_bg || "bg-rose-50 border-rose-100");
    setFormIsFeatured(course.is_featured);
    setFormDisplayOrder(course.display_order);
    setFormIsVisible(course.is_visible);
    setFormStatus(course.status);
    if (course.starts_at) {
      try {
        const d = new Date(course.starts_at);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setFormStartsAt(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch {
        setFormStartsAt("");
      }
    } else {
      setFormStartsAt("");
    }
    if (course.ends_at) {
      try {
        const d = new Date(course.ends_at);
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
    if (!formBoardId) errors.boardId = "Board is required";
    if (!formClassId) errors.classId = "Class level is required";
    if (!formSubjectId) errors.subjectId = "Subject is required";
    if (!formTitle.trim()) errors.title = "Course title is required";
    if (!formCategory.trim()) errors.category = "Category is required";
    if (!formSlug.trim()) errors.slug = "URL slug is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsCourse> = {
      ...(editingCourse ? { id: editingCourse.id } : {}),
      board_id: formBoardId,
      class_id: formClassId,
      subject_id: formSubjectId,
      title: formTitle.trim(),
      category: formCategory.trim(),
      slug: formSlug.trim().toLowerCase(),
      short_description: formShortDescription.trim() || null,
      thumbnail_url: formThumbnailUrl.trim() || null,
      icon_type: formIconType.trim() || "school",
      icon_color: formIconColor.trim() || "text-brand-orange",
      icon_bg: formIconBg.trim() || "bg-rose-50 border-rose-100",
      is_featured: formIsFeatured,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertCourse(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save course." });
    } else {
      setFeedback({
        type: "success",
        message: editingCourse ? "Course updated successfully." : "Course created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_courses", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive course." });
    } else {
      setFeedback({ type: "success", message: `Course "${archiveTarget.title}" archived successfully.` });
      handleManualRefresh();
    }
  };

  const handleToggleVisibility = async (course: CmsCourse) => {
    const nextVal = !course.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_courses", course.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `Course "${course.title}" visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
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
            entityType: "COURSE",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish course." });
        } else {
          setFeedback({ type: "success", message: `Course "${publishTarget.title}" published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish course." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      // Unpublish action
      const { error } = await CmsService.unpublishContent(supabase, "COURSE", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish course." });
      } else {
        setFeedback({ type: "success", message: `Course "${publishTarget.title}" unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  // Filtered Courses List
  const filteredCourses = React.useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        searchQuery === "" ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBoard = selectedBoardFilter === "ALL" || c.board_id === selectedBoardFilter;
      const matchesClass = selectedClassFilter === "ALL" || c.class_id === selectedClassFilter;
      const matchesSubject = selectedSubjectFilter === "ALL" || c.subject_id === selectedSubjectFilter;
      const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;

      return matchesSearch && matchesBoard && matchesClass && matchesSubject && matchesStatus;
    });
  }, [courses, searchQuery, selectedBoardFilter, selectedClassFilter, selectedSubjectFilter, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              ACADEMIC CURRICULUM
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              cms_courses
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <GraduationCap className="h-7 w-7 text-brand-orange" />
            <span>Courses Master Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Create and organize academic courses bound to Boards, Class Levels, and Subject taxonomies.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Course
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

      {/* 2. Search & Dependent Filters Toolbar */}
      <Card className="p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by course title, category, or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <select
              aria-label="Filter courses by board"
              value={selectedBoardFilter}
              onChange={(e) => setSelectedBoardFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter courses by class level"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Classes</option>
              {classLevels.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter courses by subject"
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter courses by content status"
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
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-brand-bg-warm/80 border-b border-brand-border text-brand-text-muted font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Course Title & Category</th>
                <th className="py-3 px-4">Hierarchy (Board / Class / Subject)</th>
                <th className="py-3 px-4 text-center">Schedule</th>
                <th className="py-3 px-4 text-center">Featured</th>
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
                      <span>Loading courses catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-brand-text-muted">
                    <div className="space-y-2">
                      <GraduationCap className="h-8 w-8 text-brand-text-muted/50 mx-auto" />
                      <p className="font-bold text-brand-text-primary">No courses found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search or filters." : "Click '+ Add Course' to create the first academic course."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-brand-text-primary max-w-sm">
                      <div className="space-y-0.5">
                        <p className="font-extrabold text-brand-text-primary line-clamp-1">{c.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-brand-text-muted">
                          <span className="font-medium text-brand-orange">{c.category}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px]">{c.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1 text-[10px] font-medium">
                        <Badge variant="outline" size="sm" className="bg-brand-surface font-semibold">
                          {c.board?.code || "Board"}
                        </Badge>
                        <Badge variant="outline" size="sm" className="bg-brand-surface font-semibold">
                          {c.class_level?.name || "Class"}
                        </Badge>
                        <Badge variant="peach" size="sm" className="font-bold text-brand-orange">
                          {c.subject?.name || "Subject"}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <ScheduleStatusBadge startsAt={c.starts_at} endsAt={c.ends_at} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {c.is_featured ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Featured
                        </span>
                      ) : (
                        <span className="text-[11px] text-brand-text-muted/60">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{c.display_order}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(c)}
                        title="Click to toggle visibility"
                        className="cursor-pointer focus:outline-none"
                      >
                        {c.is_visible ? (
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
                      <ContentStatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreviewItem({ type: "COURSE", data: c })}
                          className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                          title="Preview Student Experience"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {c.status !== "PUBLISHED" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setPublishTarget({
                                entityType: "COURSE",
                                entityId: c.id,
                                title: c.title,
                                currentStatus: c.status,
                                isVisible: c.is_visible,
                                startsAt: c.starts_at,
                                endsAt: c.ends_at,
                                displayOrder: c.display_order,
                                featuredNote: c.is_featured ? "Featured Course" : undefined,
                                action: "PUBLISH",
                              })
                            }
                            className="h-7 w-7 text-brand-text-muted hover:text-emerald-600"
                            title="Publish Course"
                          >
                            <Globe2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setPublishTarget({
                                entityType: "COURSE",
                                entityId: c.id,
                                title: c.title,
                                currentStatus: c.status,
                                isVisible: c.is_visible,
                                startsAt: c.starts_at,
                                endsAt: c.ends_at,
                                displayOrder: c.display_order,
                                featuredNote: c.is_featured ? "Featured Course" : undefined,
                                action: "UNPUBLISH",
                              })
                            }
                            className="h-7 w-7 text-brand-text-muted hover:text-amber-600"
                            title="Unpublish Course"
                          >
                            <FileEdit className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        <Link href={`/admin/cms/chapters?courseId=${c.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                            title="Manage Chapters"
                          >
                            <ListOrdered className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(c)}
                          className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                          title="Edit Course"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {c.status !== "ARCHIVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setArchiveTarget(c)}
                            className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                            title="Archive Course"
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

      {/* 4. Create / Edit Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingCourse ? "Edit Course" : "Create Academic Course"}
        description="Select educational board, class grade, subject, and curriculum details."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCourse} className="space-y-4">
          {/* Dependent Selectors Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">1. Board *</label>
              <select
                aria-label="Select board"
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
              <label className="block text-xs font-bold text-brand-text-primary">2. Class Level *</label>
              <select
                aria-label="Select class level"
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
              <label className="block text-xs font-bold text-brand-text-primary">3. Subject *</label>
              <select
                aria-label="Select subject"
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Course Title *"
              placeholder="e.g. CBSE Class 10 Mathematics Mastery"
              value={formTitle}
              onChange={handleTitleChange}
              error={formErrors.title}
              disabled={isSaving}
            />

            <Input
              label="Category Name *"
              placeholder="e.g. Board Exam Foundation"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              error={formErrors.category}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="URL Slug *"
              placeholder="e.g. cbse-class-10-mathematics"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              error={formErrors.slug}
              disabled={isSaving}
            />

            <Input
              label="Thumbnail Image URL"
              placeholder="https://... or Supabase Storage URL"
              value={formThumbnailUrl}
              onChange={(e) => setFormThumbnailUrl(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-brand-text-primary">Short Summary</label>
            <textarea
              placeholder="Brief course overview for Explore Courses card..."
              value={formShortDescription}
              onChange={(e) => setFormShortDescription(e.target.value)}
              rows={2}
              disabled={isSaving}
              className="w-full rounded-lg border border-brand-border bg-brand-surface p-2.5 text-xs text-brand-text-primary placeholder:text-brand-text-subtle focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Display Order"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
              disabled={isSaving}
            />

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm font-medium text-brand-text-primary">Status</label>
              <select
                aria-label="Course status"
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

          <div className="flex flex-col sm:flex-row gap-4 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsFeatured"
                checked={formIsFeatured}
                onChange={(e) => setFormIsFeatured(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
              />
              <label htmlFor="formIsFeatured" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
                Featured on Student Home
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="formIsVisibleCourse"
                checked={formIsVisible}
                onChange={(e) => setFormIsVisible(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
              />
              <label htmlFor="formIsVisibleCourse" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
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
              {isSaving ? "Saving..." : editingCourse ? "Update Course" : "Create Course"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Course?"
        description="Are you sure you want to archive this course? It will be hidden from student exploration and batch linking."
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
