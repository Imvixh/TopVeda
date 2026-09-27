"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import {
  CmsBatch,
  CmsBoard,
  CmsClassLevel,
  CmsSubject,
  CmsSectionSetting,
  BatchBadgeVariant,
} from "@/types/cms.types";
import { TeacherDirectoryItem } from "@/types/teacher.types";
import {
  Sparkles,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Settings2,
  Check,
  X,
  Layers,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  orange: "bg-orange-500 text-white",
  pink: "bg-pink-500 text-white",
  green: "bg-emerald-600 text-white",
  purple: "bg-purple-600 text-white",
};

const GRADIENT_PRESETS = [
  {
    label: "Sky Blue (Math)",
    bg: "from-sky-50/70 via-blue-50/40 to-indigo-50/30",
    border: "border-sky-100",
  },
  {
    label: "Rose Pink (Science)",
    bg: "from-rose-50/70 via-pink-50/40 to-red-50/30",
    border: "border-rose-100",
  },
  {
    label: "Emerald Green (Foundation)",
    bg: "from-emerald-50/70 via-teal-50/40 to-cyan-50/30",
    border: "border-emerald-100",
  },
  {
    label: "Royal Purple (NEET)",
    bg: "from-purple-50/70 via-violet-50/40 to-fuchsia-50/30",
    border: "border-purple-100",
  },
  {
    label: "Warm Amber (Commerce)",
    bg: "from-amber-50/70 via-orange-50/40 to-yellow-50/30",
    border: "border-amber-100",
  },
];

export default function FeaturedBatchesCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [batches, setBatches] = React.useState<CmsBatch[]>([]);
  const [boards, setBoards] = React.useState<CmsBoard[]>([]);
  const [classLevels, setClassLevels] = React.useState<CmsClassLevel[]>([]);
  const [subjects, setSubjects] = React.useState<CmsSubject[]>([]);
  const [teachers, setTeachers] = React.useState<TeacherDirectoryItem[]>([]);
  const [sectionSetting, setSectionSetting] = React.useState<CmsSectionSetting | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Batch Form Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBatch, setEditingBatch] = React.useState<CmsBatch | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Delete Confirm Modal State
  const [deletingBatch, setDeletingBatch] = React.useState<CmsBatch | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Section Title Settings Modal State
  const [isSettingModalOpen, setIsSettingModalOpen] = React.useState(false);
  const [settingTitle, setSettingTitle] = React.useState("");
  const [settingSubtitle, setSettingSubtitle] = React.useState("");
  const [isSavingSetting, setIsSavingSetting] = React.useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = React.useState("");
  const [formBoardLabel, setFormBoardLabel] = React.useState("");
  const [formBoardId, setFormBoardId] = React.useState("");
  const [formClassId, setFormClassId] = React.useState("");
  const [formSubjectId, setFormSubjectId] = React.useState("");
  const [formSubtitle, setFormSubtitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formBadgeText, setFormBadgeText] = React.useState("New");
  const [formBadgeVariant, setFormBadgeVariant] = React.useState<BatchBadgeVariant>("orange");
  const [formBgGradient, setFormBgGradient] = React.useState(GRADIENT_PRESETS[0].bg);
  const [formBorderColor, setFormBorderColor] = React.useState(GRADIENT_PRESETS[0].border);
  const [formSelectedTeacherIds, setFormSelectedTeacherIds] = React.useState<string[]>([]);
  const [formDisplayOrder, setFormDisplayOrder] = React.useState(1);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [bData, clData, sData, batchesData, teachersData, settingsData] = await Promise.all([
          CmsService.getBoards(supabase),
          CmsService.getClassLevels(supabase),
          CmsService.getSubjects(supabase),
          CmsService.getUpcomingBatches(supabase),
          CmsService.getTeachersForSuperAdmin(supabase),
          CmsService.getSectionSettings(supabase),
        ]);

        if (!isMounted) return;

        setBoards(bData.filter((b) => b.is_visible));
        setClassLevels(clData.filter((c) => c.is_visible));
        setSubjects(sData.filter((s) => s.is_visible));
        setBatches(batchesData);
        setTeachers(teachersData);

        const upSetting = settingsData.find((s) => s.section_key === "upcoming_batches");
        if (upSetting) {
          setSectionSetting(upSetting);
          setSettingTitle(upSetting.title);
          setSettingSubtitle(upSetting.subtitle || "");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load batches." });
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
    setEditingBatch(null);
    const defaultBoard = boards[0]?.id || "";
    const defaultClass = classLevels[0]?.id || "";
    const defaultSubject = subjects[0]?.id || "";

    setFormTitle("");
    setFormBoardLabel("Class 10 CBSE");
    setFormBoardId(defaultBoard);
    setFormClassId(defaultClass);
    setFormSubjectId(defaultSubject);
    setFormSubtitle("");
    setFormDescription("");
    setFormStartsAt("");
    setFormBadgeText("New");
    setFormBadgeVariant("orange");
    setFormBgGradient(GRADIENT_PRESETS[0].bg);
    setFormBorderColor(GRADIENT_PRESETS[0].border);
    setFormSelectedTeacherIds(teachers[0] ? [teachers[0].id] : []);
    setFormDisplayOrder(batches.length + 1);
    setFormIsVisible(true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (b: CmsBatch) => {
    setEditingBatch(b);
    setFormTitle(b.title);
    setFormBoardLabel(b.board_label);
    setFormBoardId(b.board_id);
    setFormClassId(b.class_id);
    setFormSubjectId(b.subject_id || "");
    setFormSubtitle(b.subtitle || "");
    setFormDescription(b.description || "");

    if (b.starts_at) {
      try {
        const d = new Date(b.starts_at);
        const tzOffset = d.getTimezoneOffset() * 60000;
        setFormStartsAt(new Date(d.getTime() - tzOffset).toISOString().slice(0, 16));
      } catch {
        setFormStartsAt("");
      }
    } else {
      setFormStartsAt("");
    }

    setFormBadgeText(b.badge_text || "New");
    setFormBadgeVariant(b.badge_variant || "orange");
    setFormBgGradient(b.bg_gradient || GRADIENT_PRESETS[0].bg);
    setFormBorderColor(b.border_color || GRADIENT_PRESETS[0].border);

    // Extract relational teacher IDs or fallback
    const linkedIds = (b.batch_teachers || [])
      .sort((x, y) => x.display_order - y.display_order)
      .map((bt) => bt.teacher_id);
    setFormSelectedTeacherIds(linkedIds);

    setFormDisplayOrder(b.display_order || 1);
    setFormIsVisible(b.is_visible);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Toggle Visibility
  const handleToggleVisibility = async (b: CmsBatch) => {
    try {
      const nextVisible = !b.is_visible;
      const { error } = await supabase
        .from("cms_batches")
        .update({ is_visible: nextVisible, updated_at: new Date().toISOString() })
        .eq("id", b.id);

      if (error) throw error;

      setBatches((prev) => prev.map((item) => (item.id === b.id ? { ...item, is_visible: nextVisible } : item)));
      setFeedback({
        type: "success",
        message: `"${b.title}" visibility changed to ${nextVisible ? "Visible" : "Hidden"}.`,
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    }
  };

  // Safe Delete Batch
  const handleDeleteBatch = async () => {
    if (!deletingBatch) return;
    try {
      setIsDeleting(true);
      const res = await CmsService.deleteBatch(supabase, deletingBatch.id);
      if (!res.success) throw new Error(res.error || "Failed to delete batch.");

      setBatches((prev) => prev.filter((item) => item.id !== deletingBatch.id));
      setFeedback({ type: "success", message: `Batch "${deletingBatch.title}" deleted successfully.` });
      setDeletingBatch(null);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Save Batch Form
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formTitle.trim()) errors.title = "Batch title is required.";
    if (!formBoardLabel.trim()) errors.boardLabel = "Class / Board label is required.";
    if (!formBoardId) errors.boardId = "Please select a curriculum Board.";
    if (!formClassId) errors.classId = "Please select a Class Level.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      // Primary teacher info for single-source compatibility
      const primaryTeacher = teachers.find((t) => t.id === formSelectedTeacherIds[0]);
      const primaryTeacherName = primaryTeacher?.fullName || editingBatch?.educator_name || "Educator";
      const primaryTeacherAvatar = primaryTeacher?.avatarUrl || editingBatch?.educator_avatar_url || "/assets/student/teacher-male-1.jpg";

      const slug = editingBatch
        ? editingBatch.slug
        : `${formTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;

      const payload: Partial<CmsBatch> = {
        ...(editingBatch ? { id: editingBatch.id } : {}),
        title: formTitle.trim(),
        slug,
        board_label: formBoardLabel.trim(),
        board_id: formBoardId,
        class_id: formClassId,
        subject_id: formSubjectId || null,
        subtitle: formSubtitle.trim() || formTitle.trim(),
        description: formDescription.trim() || null,
        starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
        badge_text: formBadgeText.trim() || "New",
        badge_variant: formBadgeVariant,
        bg_gradient: formBgGradient,
        border_color: formBorderColor,
        is_featured: true,
        is_ongoing: false,
        status_type: "ongoing",
        educator_name: primaryTeacherName,
        educator_avatar_url: primaryTeacherAvatar,
        cta_text: "Explore →",
        cta_link: "/student/batches",
        display_order: Number(formDisplayOrder) || 1,
        is_visible: formIsVisible,
        status: "PUBLISHED",
      };

      const { data, error } = await CmsService.upsertBatch(supabase, payload, formSelectedTeacherIds);
      if (error || !data) throw error || new Error("Failed to save batch.");

      setFeedback({
        type: "success",
        message: `Batch "${formTitle.trim()}" saved successfully.`,
      });
      setIsModalOpen(false);
      handleManualRefresh();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Save Section Settings
  const handleSaveSectionSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSetting(true);
      const res = await CmsService.updateSectionSetting(supabase, "upcoming_batches", {
        title: settingTitle.trim() || "New & Featured Batches",
        subtitle: settingSubtitle.trim() || null,
      });

      if (!res.success) throw new Error(res.error || "Failed to update section title.");

      setSectionSetting((prev) =>
        prev
          ? { ...prev, title: settingTitle.trim(), subtitle: settingSubtitle.trim() }
          : { section_key: "upcoming_batches", title: settingTitle.trim(), subtitle: settingSubtitle.trim(), is_visible: true }
      );
      setFeedback({ type: "success", message: "Section title updated successfully." });
      setIsSettingModalOpen(false);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsSavingSetting(false);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.board_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.subtitle && b.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-brand-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-brand-orange" />
              <span>{sectionSetting?.title || "New & Featured Batches"}</span>
            </h1>
            <Badge variant="outline" size="sm" className="font-bold text-xs bg-orange-50 text-brand-orange border-orange-200">
              {batches.length} Batches
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-brand-text-muted mt-1">
            Manage the exact batch offerings displayed in the Student Home &quot;New &amp; Featured Batches&quot; section.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingModalOpen(true)}
            className="text-xs font-bold gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5 text-brand-orange" />
            Customize Title
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="text-xs font-bold gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-brand-orange")} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="text-xs font-bold gap-1.5 shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            Create Batch
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-brand-border">
        <Link
          href="/admin/cms/batches/upcoming"
          className="px-4 py-2 text-xs font-bold border-b-2 border-brand-orange text-brand-orange flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>New &amp; Featured Batches ({batches.length})</span>
        </Link>
        <Link
          href="/admin/cms/batches/ongoing"
          className="px-4 py-2 text-xs font-semibold text-brand-text-muted hover:text-brand-charcoal transition-colors flex items-center gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Ongoing Batches</span>
        </Link>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div
          className={cn(
            "p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200",
            feedback.type === "success"
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
              : "bg-red-50/80 border-red-200 text-red-800"
          )}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-brand-text-muted hover:text-brand-charcoal text-xs font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Search Filter */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
        <Input
          type="search"
          placeholder="Search by title, board, class..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-xs"
        />
      </div>

      {/* 3. Batch Cards Management Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-semibold text-brand-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
          Loading batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-brand-orange mx-auto opacity-70" />
          <p className="text-sm font-bold text-brand-charcoal">No Batches Found</p>
          <p className="text-xs text-brand-text-muted">
            {searchQuery ? "No batches matching your search query." : "Click '+ Create Batch' above to add your first batch."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredBatches.map((b) => {
            const avatarUrl =
              b.educator_avatar_url ||
              b.batch_teachers?.[0]?.teacher?.avatar_url ||
              "/assets/student/teacher-male-1.jpg";

            return (
              <div
                key={b.id}
                className="flex flex-col justify-between rounded-3xl bg-white border border-brand-border/90 p-4 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-brand-text-muted text-[11px]">#{b.display_order}</span>
                  <div className="flex items-center gap-1.5">
                    {b.starts_at && new Date(b.starts_at) > new Date() && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Upcoming
                      </span>
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        b.is_visible
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-gray-600 bg-gray-100 border-gray-200"
                      )}
                    >
                      {b.is_visible ? "Visible" : "Hidden"}
                    </span>
                  </div>
                </div>

                {/* EXACT STUDENT HOME CARD PREVIEW */}
                <div
                  className={cn(
                    "relative flex flex-col justify-between w-full rounded-2xl p-4 sm:p-5 border bg-gradient-to-br select-none min-h-[190px]",
                    b.bg_gradient || "from-sky-50/70 via-blue-50/40 to-indigo-50/30",
                    b.border_color || "border-sky-100"
                  )}
                >
                  {/* Top Badge & Board Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-2xs",
                          BADGE_STYLES[b.badge_variant] || "bg-orange-500 text-white"
                        )}
                      >
                        {b.badge_text || "New"}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs font-extrabold text-brand-charcoal leading-tight">
                        {b.board_label}
                      </p>
                      <p className="text-sm font-black text-brand-text-primary leading-snug">
                        {b.title}
                      </p>
                      <p className="text-[11px] font-medium text-brand-text-muted leading-tight line-clamp-2">
                        {b.subtitle || b.description}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Content: CTA Button + Educator Portrait */}
                  <div className="flex items-end justify-between mt-4 pt-1">
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-brand-orange text-white text-xs font-bold shadow-xs pointer-events-none">
                      {b.cta_text || "Explore →"}
                    </span>

                    {/* Educator Avatar Graphic */}
                    <div className="relative w-16 h-20 -mb-1 shrink-0 overflow-hidden rounded-xl shadow-xs border border-white/60 bg-white">
                      <img
                        src={avatarUrl}
                        alt={b.educator_name || "Educator"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Management Action Bar */}
                <div className="pt-2 border-t border-brand-border/60 flex items-center justify-between gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(b)}
                    className="flex-1 text-xs font-bold gap-1 h-8"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-brand-orange" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleVisibility(b)}
                    className="h-8 px-2.5 text-xs font-bold"
                    title={b.is_visible ? "Hide from students" : "Show to students"}
                  >
                    {b.is_visible ? (
                      <EyeOff className="h-3.5 w-3.5 text-gray-600" />
                    ) : (
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingBatch(b)}
                    className="h-8 px-2.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-200"
                    title="Delete batch"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. REDESIGNED COMPACT PORTRAIT BATCH FORM MODAL (FIX 1, 2, 3) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        className="max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <form onSubmit={handleSaveBatch} className="flex flex-col h-full max-h-[90vh]">
          {/* Fixed Modal Header */}
          <div className="p-4 sm:p-5 border-b border-brand-border bg-white flex items-center justify-between shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {editingBatch ? "Edit Mode" : "New Batch"}
                </span>
                <span className="text-[10px] text-brand-text-muted font-mono">
                  Featured / Upcoming
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                {editingBatch ? "Edit Batch Details" : "Create New Batch"}
              </h3>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Section 1: Batch Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                <span>1. Batch Core Information</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Batch Title <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Mathematics or Complete Preparation"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  disabled={isSaving}
                  className={cn("text-xs h-9", formErrors.title && "border-red-500")}
                />
                {formErrors.title && <p className="text-[10px] text-red-500 font-medium">{formErrors.title}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Cohort / Board Tag <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Class 10 CBSE or JEE 2027"
                  value={formBoardLabel}
                  onChange={(e) => setFormBoardLabel(e.target.value)}
                  disabled={isSaving}
                  className={cn("text-xs h-9", formErrors.boardLabel && "border-red-500")}
                />
                {formErrors.boardLabel && <p className="text-[10px] text-red-500 font-medium">{formErrors.boardLabel}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Subtitle / Highlights
                </label>
                <Input
                  placeholder="e.g. Complete Board Preparation or Full Syllabus"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  disabled={isSaving}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Section 2: Academic Hierarchy */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px]">
                <GraduationCap className="h-3.5 w-3.5 text-brand-orange" />
                <span>2. Academic Mapping</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Board <span className="text-red-500">*</span></label>
                  <select
                    value={formBoardId}
                    onChange={(e) => setFormBoardId(e.target.value)}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Class <span className="text-red-500">*</span></label>
                  <select
                    value={formClassId}
                    onChange={(e) => setFormClassId(e.target.value)}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    {classLevels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">Subject (Optional)</label>
                <select
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                  disabled={isSaving}
                  className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                >
                  <option value="">General / All Subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Section 3: Visual Theme & Badges */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Layers className="h-3.5 w-3.5 text-brand-orange" />
                <span>3. Card Styling &amp; Badges</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Badge Text</label>
                  <Input
                    placeholder="New / Popular"
                    value={formBadgeText}
                    onChange={(e) => setFormBadgeText(e.target.value)}
                    disabled={isSaving}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Badge Color</label>
                  <select
                    value={formBadgeVariant}
                    onChange={(e) => setFormBadgeVariant(e.target.value as BatchBadgeVariant)}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    <option value="orange">Orange</option>
                    <option value="pink">Pink</option>
                    <option value="green">Green</option>
                    <option value="purple">Purple</option>
                  </select>
                </div>
              </div>

              {/* Card Color Theme Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-charcoal">Card Gradient Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_PRESETS.map((preset) => {
                    const isSelected = formBgGradient === preset.bg;
                    return (
                      <button
                        type="button"
                        key={preset.label}
                        onClick={() => {
                          setFormBgGradient(preset.bg);
                          setFormBorderColor(preset.border);
                        }}
                        className={cn(
                          "p-2 rounded-xl border text-left text-xs font-semibold transition-all bg-gradient-to-br flex items-center justify-between cursor-pointer",
                          preset.bg,
                          preset.border,
                          isSelected && "ring-2 ring-brand-orange shadow-2xs font-bold"
                        )}
                      >
                        <span className="truncate">{preset.label}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-brand-orange shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 4: Batch Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-charcoal">Batch Description</label>
              <textarea
                placeholder="Comprehensive syllabus coverage with formulas, live interactive sessions, mock tests, and revision notes..."
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                disabled={isSaving}
                className="w-full p-2.5 rounded-xl border border-brand-border bg-white text-xs text-brand-charcoal font-medium resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>

            {/* Section 5: Assigned Faculty / Teachers (Rectangular Card UI) */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px]">
                  <Users className="h-3.5 w-3.5 text-brand-orange" />
                  <span>4. Assigned Faculty ({formSelectedTeacherIds.length})</span>
                </div>
              </div>

              {/* List of assigned rectangular teacher cards */}
              {formSelectedTeacherIds.length === 0 ? (
                <p className="text-[11px] text-brand-text-muted italic py-1">
                  No faculty assigned yet. Select a teacher below to assign to this batch.
                </p>
              ) : (
                <div className="space-y-2">
                  {formSelectedTeacherIds.map((tid, idx) => {
                    const teacherObj = teachers.find((t) => t.id === tid);
                    return (
                      <div
                        key={tid}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-brand-border shadow-2xs text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl overflow-hidden bg-brand-bg-peach border border-brand-border/60 shrink-0 flex items-center justify-center">
                            {teacherObj?.avatarUrl ? (
                              <img
                                src={teacherObj.avatarUrl}
                                alt={teacherObj.fullName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center font-bold text-brand-orange text-xs">
                                {teacherObj?.fullName?.charAt(0) || "T"}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-brand-charcoal text-xs truncate">
                              {idx + 1}. {teacherObj?.fullName || "Educator"}
                            </p>
                            <p className="text-[11px] text-brand-text-muted truncate">
                              {teacherObj?.qualification || teacherObj?.email || "Faculty Profile"}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setFormSelectedTeacherIds((prev) => prev.filter((id) => id !== tid))
                          }
                          className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                          title="Remove teacher"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Teacher Selector Dropdown to add */}
              <div className="pt-1">
                <select
                  id="add-teacher-select"
                  defaultValue=""
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val && !formSelectedTeacherIds.includes(val)) {
                      setFormSelectedTeacherIds((prev) => [...prev, val]);
                    }
                    e.target.value = "";
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                >
                  <option value="">+ Add Teacher to Batch...</option>
                  {teachers
                    .filter((t) => !formSelectedTeacherIds.includes(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.qualification || t.email || "Faculty"})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Section 6: Display & Timing */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Clock className="h-3.5 w-3.5 text-brand-orange" />
                <span>5. Display &amp; Timing</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">Batch Start Date</label>
                <input
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                  disabled={isSaving}
                  className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-medium text-brand-charcoal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Display Order</label>
                  <Input
                    type="number"
                    min="1"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    disabled={isSaving}
                    className="text-xs h-9"
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-brand-border self-end h-9">
                  <span className="text-xs font-bold text-brand-charcoal">Visible</span>
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
              {isSaving ? "Saving..." : editingBatch ? "Save Changes" : "Create Batch"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Section Title Settings Modal */}
      <Modal
        isOpen={isSettingModalOpen}
        onClose={() => !isSavingSetting && setIsSettingModalOpen(false)}
        title="Customize Section Title"
        description="Update the section title and description displayed on the Student Home page."
      >
        <form onSubmit={handleSaveSectionSetting} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Section Heading</label>
            <Input
              value={settingTitle}
              onChange={(e) => setSettingTitle(e.target.value)}
              placeholder="New & Featured Batches"
              disabled={isSavingSetting}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Subtitle / Description</label>
            <Input
              value={settingSubtitle}
              onChange={(e) => setSettingSubtitle(e.target.value)}
              placeholder="Upcoming academic batches with expert faculty"
              disabled={isSavingSetting}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSettingModalOpen(false)}
              disabled={isSavingSetting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingSetting}
              className="text-xs font-bold"
            >
              {isSavingSetting ? "Saving..." : "Save Title"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Safe Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingBatch}
        onClose={() => !isDeleting && setDeletingBatch(null)}
        title="Delete Batch"
        description="Are you sure you want to delete this batch? This action will remove the batch card and faculty associations."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
            <p className="font-bold">Batch: {deletingBatch?.title}</p>
            <p className="text-[11px] text-red-700">Board: {deletingBatch?.board_label}</p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-brand-border pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingBatch(null)}
              disabled={isDeleting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteBatch}
              disabled={isDeleting}
              className="text-xs font-bold"
            >
              {isDeleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
