"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "@/types/cms.types";
import { TeacherDirectoryItem } from "@/types/teacher.types";
import {
  Layers,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Video,
  Users,
  Settings2,
  Sparkles,
  Check,
  Target,
  Atom,
  BookOpen,
  GraduationCap,
  Stethoscope,
  X,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  target: Target,
  atom: Atom,
  book: BookOpen,
  academy: GraduationCap,
  medical: Stethoscope,
};

const ONGOING_ICON_PRESETS = [
  {
    label: "Target (Green / Mathematics)",
    iconType: "target",
    iconBg: "bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    label: "Atom (Sky Blue / Science)",
    iconType: "atom",
    iconBg: "bg-sky-50 border-sky-100",
    iconColor: "text-sky-600",
  },
  {
    label: "Book (Amber / Commerce & Humanities)",
    iconType: "book",
    iconBg: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-600",
  },
  {
    label: "Graduation Cap (Indigo / JEE Foundation)",
    iconType: "academy",
    iconBg: "bg-indigo-50 border-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    label: "Stethoscope (Purple / NEET Medical)",
    iconType: "medical",
    iconBg: "bg-purple-50 border-purple-100",
    iconColor: "text-purple-600",
  },
];

export default function OngoingBatchesCmsPage() {
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
  const [formBadgeText, setFormBadgeText] = React.useState("");
  const [formBoardId, setFormBoardId] = React.useState("");
  const [formClassId, setFormClassId] = React.useState("");
  const [formSubjectId, setFormSubjectId] = React.useState("");
  const [formSelectedSubjectIds, setFormSelectedSubjectIds] = React.useState<string[]>([]);
  const [formPricingType, setFormPricingType] = React.useState<"FREE" | "PAID">("FREE");
  const [formPriceInr, setFormPriceInr] = React.useState<number | string>(0);
  const [formDiscountPercent, setFormDiscountPercent] = React.useState<number | string>(0);
  const [formDescription, setFormDescription] = React.useState("");
  const [formStatusType, setFormStatusType] = React.useState<"live" | "ongoing">("ongoing");
  const [formCtaText, setFormCtaText] = React.useState("View Details");
  const [formIconType, setFormIconType] = React.useState("target");
  const [formIconBg, setFormIconBg] = React.useState(ONGOING_ICON_PRESETS[0].iconBg);
  const [formIconColor, setFormIconColor] = React.useState(ONGOING_ICON_PRESETS[0].iconColor);
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
          CmsService.getOngoingBatches(supabase),
          CmsService.getTeachersForSuperAdmin(supabase),
          CmsService.getSectionSettings(supabase),
        ]);

        if (!isMounted) return;

        setBoards(bData.filter((b) => b.is_visible));
        setClassLevels(clData.filter((c) => c.is_visible));
        setSubjects(sData.filter((s) => s.is_visible));
        setBatches(batchesData);
        setTeachers(teachersData);

        const onSetting = settingsData.find((s) => s.section_key === "ongoing_batches");
        if (onSetting) {
          setSectionSetting(onSetting);
          setSettingTitle(onSetting.title);
          setSettingSubtitle(onSetting.subtitle || "");
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load ongoing batches." });
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

    setFormTitle("Mathematics");
    setFormBadgeText("Class 10 (CBSE)");
    setFormBoardId(defaultBoard);
    setFormClassId(defaultClass);
    setFormSubjectId(defaultSubject);
    setFormSelectedSubjectIds(defaultSubject ? [defaultSubject] : []);
    setFormPricingType("FREE");
    setFormPriceInr(0);
    setFormDiscountPercent(0);
    setFormDescription("");
    setFormStatusType("ongoing");
    setFormCtaText("View Details");
    setFormIconType(ONGOING_ICON_PRESETS[0].iconType);
    setFormIconBg(ONGOING_ICON_PRESETS[0].iconBg);
    setFormIconColor(ONGOING_ICON_PRESETS[0].iconColor);
    setFormSelectedTeacherIds(teachers[0] ? [teachers[0].id] : []);
    setFormDisplayOrder(batches.length + 1);
    setFormIsVisible(true);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (batch: CmsBatch) => {
    setEditingBatch(batch);
    setFormTitle(batch.title || "");
    setFormBadgeText(batch.badge_text || batch.board_label || "");
    setFormBoardId(batch.board_id || "");
    setFormClassId(batch.class_id || "");
    setFormSubjectId(batch.subject_id || "");

    const linkedSubIds = (batch.batch_subjects || [])
      .sort((x, y) => x.display_order - y.display_order)
      .map((bs) => bs.subject_id);
    setFormSelectedSubjectIds(linkedSubIds.length > 0 ? linkedSubIds : (batch.subject_id ? [batch.subject_id] : []));

    setFormPricingType(batch.pricing_type || "FREE");
    setFormPriceInr(batch.price_inr ?? 0);
    setFormDiscountPercent(batch.discount_percent ?? 0);

    setFormDescription(batch.description || "");
    setFormStatusType(batch.status_type || "ongoing");
    setFormCtaText(batch.cta_text || (batch.status_type === "live" ? "Join Now" : "View Details"));
    setFormIconType(batch.icon_type || "target");
    setFormIconBg(batch.icon_bg || ONGOING_ICON_PRESETS[0].iconBg);
    setFormIconColor(batch.icon_color || ONGOING_ICON_PRESETS[0].iconColor);

    const existingTeacherIds = (batch.batch_teachers || [])
      .sort((x, y) => x.display_order - y.display_order)
      .map((bt) => bt.teacher_id)
      .filter(Boolean);
    setFormSelectedTeacherIds(
      existingTeacherIds.length > 0
        ? existingTeacherIds
        : batch.lead_educator_id
        ? [batch.lead_educator_id]
        : []
    );

    setFormDisplayOrder(batch.display_order || 1);
    setFormIsVisible(batch.is_visible);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Academic Selector Change Helper
  const handleAcademicChange = (type: "board" | "class" | "subject", id: string) => {
    if (type === "board") setFormBoardId(id);
    if (type === "class") setFormClassId(id);
    if (type === "subject") setFormSubjectId(id);

    if (!editingBatch) {
      const bObj = type === "board" ? boards.find((b) => b.id === id) : boards.find((b) => b.id === formBoardId);
      const cObj = type === "class" ? classLevels.find((c) => c.id === id) : classLevels.find((c) => c.id === formClassId);
      const sObj = type === "subject" ? subjects.find((s) => s.id === id) : subjects.find((s) => s.id === formSubjectId);

      const badgeParts = [cObj?.name, bObj?.code ? `(${bObj.code})` : bObj?.name ? `(${bObj.name})` : ""].filter(Boolean);
      if (badgeParts.length > 0) {
        setFormBadgeText(badgeParts.join(" "));
      }
      if (sObj?.name) {
        setFormTitle(sObj.name);
      }
    }
  };

  // Preset selection helper
  const handlePresetSelect = (preset: typeof ONGOING_ICON_PRESETS[number]) => {
    setFormIconType(preset.iconType);
    setFormIconBg(preset.iconBg);
    setFormIconColor(preset.iconColor);
  };

  // Toggle teacher selection
  const handleToggleTeacher = (teacherId: string) => {
    setFormSelectedTeacherIds((prev) =>
      prev.includes(teacherId)
        ? prev.filter((id) => id !== teacherId)
        : [...prev, teacherId]
    );
  };

  // Save Batch (Create / Edit)
  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = "Batch title is required.";
    if (!formBadgeText.trim()) errors.badgeText = "Cohort / Board badge text is required.";
    if (!formBoardId) errors.boardId = "Please select an educational board.";
    if (!formClassId) errors.classId = "Please select an academic class.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const selectedBoard = boards.find((b) => b.id === formBoardId);
      const boardLabel = selectedBoard ? `${selectedBoard.name} Board` : formBadgeText.trim();
      const cleanSlug = `${formBadgeText}-${formTitle}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Find primary teacher for backward-compatible lead fields
      const primaryTeacher = teachers.find((t) => t.id === formSelectedTeacherIds[0]);

      const payload: Partial<CmsBatch> = {
        ...(editingBatch ? { id: editingBatch.id } : {}),
        title: formTitle.trim(),
        slug: editingBatch ? editingBatch.slug : `${cleanSlug}-${Date.now().toString().slice(-4)}`,
        board_id: formBoardId,
        class_id: formClassId,
        subject_id: formSelectedSubjectIds[0] || formSubjectId || null,
        pricing_type: formPricingType,
        price_inr: formPricingType === "PAID" ? Number(formPriceInr) || 0 : 0,
        discount_percent: formPricingType === "PAID" ? Number(formDiscountPercent) || 0 : 0,
        board_label: boardLabel,
        badge_text: formBadgeText.trim(),
        subtitle: editingBatch?.subtitle || "Daily Live Classes, Recorded Syllabus & Tests",
        description: formDescription.trim() || null,
        starts_at: editingBatch?.starts_at || new Date().toISOString(),
        is_visible: formIsVisible,
        status: "PUBLISHED",
        is_featured: false,
        is_ongoing: true,
        status_type: formStatusType,
        cta_text: formCtaText.trim() || (formStatusType === "live" ? "Join Now" : "View Details"),
        cta_link: "/student/batches",
        icon_type: formIconType,
        icon_bg: formIconBg,
        icon_color: formIconColor,
        display_order: Number(formDisplayOrder) || 1,
        educator_name: primaryTeacher?.fullName || "Faculty",
        educator_avatar_url: primaryTeacher?.avatarUrl || "/avatars/default_teacher.jpg",
        lead_educator_id: primaryTeacher?.id || null,
      };

      const result = await CmsService.upsertBatch(
        supabase,
        payload,
        formSelectedTeacherIds,
        formSelectedSubjectIds
      );
      if (result.error) throw result.error;

      setFeedback({
        type: "success",
        message: editingBatch
          ? `Ongoing batch "${formTitle}" updated successfully.`
          : `Ongoing batch "${formTitle}" created successfully.`,
      });

      setIsModalOpen(false);
      handleManualRefresh();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to save ongoing batch." });
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Visibility directly
  const handleToggleVisibility = async (batch: CmsBatch) => {
    try {
      const updatedVis = !batch.is_visible;
      const { error } = await supabase
        .from("cms_batches")
        .update({ is_visible: updatedVis, updated_at: new Date().toISOString() })
        .eq("id", batch.id);

      if (error) throw error;

      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, is_visible: updatedVis } : b))
      );

      setFeedback({
        type: "success",
        message: `Batch "${batch.title}" visibility set to ${updatedVis ? "ON (Visible)" : "OFF (Hidden)"}.`,
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
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
      setFeedback({ type: "error", message: error.message || "Failed to delete batch." });
    } finally {
      setIsDeleting(false);
    }
  };

  // Save Section Settings
  const handleSaveSectionSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingSetting(true);
      const res = await CmsService.updateSectionSetting(supabase, "ongoing_batches", {
        title: settingTitle.trim() || "Ongoing Batches",
        subtitle: settingSubtitle.trim(),
      });

      if (!res.success) throw new Error(res.error);

      setSectionSetting((prev) =>
        prev
          ? { ...prev, title: settingTitle.trim(), subtitle: settingSubtitle.trim() }
          : null
      );

      setFeedback({
        type: "success",
        message: "Section title updated. Student Home will now display the new title.",
      });
      setIsSettingModalOpen(false);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to update section title." });
    } finally {
      setIsSavingSetting(false);
    }
  };

  // Filtered Batches
  const filteredBatches = React.useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch =
        searchQuery === "" ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.board_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.badge_text && b.badge_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.subject?.name && b.subject.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [batches, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="sm" className="font-bold text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
              STUDENT HOME · SECTION 2
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              {batches.length} Batches
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-emerald-600" />
            <span>{sectionSetting?.title || "Ongoing Batches"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            {sectionSetting?.subtitle || "Active cohorts with live interactive classes, recorded syllabus, and student enrollments."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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
            Create Ongoing Batch
          </Button>
        </div>
      </div>

      {/* Tabs Navigation between Upcoming and Ongoing */}
      <div className="flex items-center gap-2 border-b border-brand-border">
        <Link
          href="/admin/cms/batches/upcoming"
          className="px-4 py-2 text-xs font-semibold text-brand-text-muted hover:text-brand-charcoal transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>New &amp; Featured Batches</span>
        </Link>
        <Link
          href="/admin/cms/batches/ongoing"
          className="px-4 py-2 text-xs font-bold border-b-2 border-emerald-600 text-emerald-700 flex items-center gap-1.5"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Ongoing Batches ({batches.length})</span>
        </Link>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-2xs border ${
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

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search ongoing batches by title, board, or subject..."
          className="pl-9 text-xs"
        />
      </div>

      {/* Batches Grid with EXACT Student Home Ongoing Batch Card Previews */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-semibold text-brand-text-muted">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
          Loading ongoing batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <Layers className="h-8 w-8 text-emerald-600 mx-auto opacity-70" />
          <p className="text-sm font-bold text-brand-charcoal">No Ongoing Batches Found</p>
          <p className="text-xs text-brand-text-muted">
            {searchQuery ? "No batches match your search query." : "Active ongoing batches will appear here."}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="mt-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create Ongoing Batch
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredBatches.map((b) => {
            const IconComponent = ICON_MAP[b.icon_type] || Target;
            const isLive = b.status_type === "live";
            const badgeText = b.badge_text || b.board_label;
            const batchTitle = b.title;
            const statusDisplay = isLive ? "● Live Now" : "Ongoing";
            const ctaDisplay = b.cta_text || (isLive ? "Join Now" : "View Details");

            return (
              <div
                key={b.id}
                className="flex flex-col justify-between rounded-3xl bg-white border border-brand-border/90 p-4 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                {/* Status Bar */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-brand-text-muted text-[11px]">#{b.display_order}</span>
                  <div className="flex items-center gap-1.5">
                    {b.lecture_count !== undefined && b.lecture_count > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                        <Video className="h-2.5 w-2.5" />
                        {b.lecture_count} Lec
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

                {/* EXACT STUDENT HOME ONGOING BATCH CARD PREVIEW */}
                <div className="flex flex-col justify-between w-full rounded-2xl bg-white border border-brand-border/80 p-4 shadow-2xs select-none min-h-[145px]">
                  {/* Top Row: Subject Icon + Title */}
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                        b.icon_bg || "bg-emerald-50 border-emerald-100"
                      )}
                    >
                      <IconComponent className={cn("h-4 w-4", b.icon_color || "text-emerald-600")} />
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-brand-text-primary leading-tight">
                        {badgeText}
                      </p>
                      <p className="text-xs font-semibold text-brand-text-muted leading-tight">
                        {batchTitle}
                      </p>
                      <p
                        className={cn(
                          "text-[11px] font-bold pt-0.5 flex items-center gap-1",
                          isLive ? "text-emerald-600" : "text-brand-text-muted"
                        )}
                      >
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {statusDisplay}
                      </p>
                    </div>
                  </div>

                  {/* Bottom CTA Button Preview */}
                  <div className="mt-3.5 pt-2 border-t border-brand-border/40 flex justify-end">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-bold pointer-events-none",
                        isLive
                          ? "bg-brand-orange text-white shadow-xs"
                          : "bg-[#F4F6F8] text-brand-text-primary"
                      )}
                    >
                      {ctaDisplay}
                    </span>
                  </div>
                </div>

                {/* Faculty Names snippet */}
                <div className="px-1 text-[11px] text-brand-text-muted flex items-center gap-1 truncate">
                  <Users className="h-3 w-3 text-brand-text-muted shrink-0" />
                  <span className="truncate">
                    {b.batch_teachers && b.batch_teachers.length > 0
                      ? b.batch_teachers.map((bt) => bt.teacher?.full_name).filter(Boolean).join(", ")
                      : b.educator_name || "Faculty"}
                  </span>
                </div>

                {/* Management Action Controls */}
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
                    title="Delete batch safely"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ONGOING BATCH MODAL */}
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
                  Ongoing Cohort
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                {editingBatch ? "Edit Ongoing Batch" : "Create Ongoing Batch"}
              </h3>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {/* Section 1: Batch Core Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                <span>1. Batch Core Information</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Cohort Badge (Line 1) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formBadgeText}
                  onChange={(e) => setFormBadgeText(e.target.value)}
                  placeholder="e.g. Class 10 (CBSE) or JEE 2027"
                  disabled={isSaving}
                  className={cn("text-xs h-9", formErrors.badgeText && "border-red-500")}
                />
                {formErrors.badgeText && <p className="text-[10px] text-red-500 font-medium">{formErrors.badgeText}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-brand-charcoal">
                  Batch Title (Line 2) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Mathematics or Science"
                  disabled={isSaving}
                  className={cn("text-xs h-9", formErrors.title && "border-red-500")}
                />
                {formErrors.title && <p className="text-[10px] text-red-500 font-medium">{formErrors.title}</p>}
              </div>
            </div>

            {/* Section 2: Academic Mapping & Subjects */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px]">
                  <GraduationCap className="h-3.5 w-3.5 text-brand-orange" />
                  <span>2. Academic Mapping &amp; Subjects</span>
                </div>
                <span className="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  {formSelectedSubjectIds.length} Subjects Included
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">
                    Board <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formBoardId}
                    onChange={(e) => handleAcademicChange("board", e.target.value)}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  {formErrors.boardId && <p className="text-[10px] text-red-500 font-medium">{formErrors.boardId}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formClassId}
                    onChange={(e) => handleAcademicChange("class", e.target.value)}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    {classLevels.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.classId && <p className="text-[10px] text-red-500 font-medium">{formErrors.classId}</p>}
                </div>
              </div>

              {/* Multi-Subject Selection Chips */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-brand-charcoal">
                    Included Batch Subjects <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormSelectedSubjectIds(subjects.map((s) => s.id))}
                      className="text-[10px] font-bold text-brand-orange hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormSelectedSubjectIds([])}
                      className="text-[10px] font-bold text-gray-500 hover:underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white border border-brand-border max-h-32 overflow-y-auto">
                  {subjects.map((s) => {
                    const isSelected = formSelectedSubjectIds.includes(s.id);
                    return (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => {
                          setFormSelectedSubjectIds((prev) =>
                            isSelected ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          );
                        }}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer",
                          isSelected
                            ? "bg-brand-orange text-white border-brand-orange shadow-2xs font-bold"
                            : "bg-gray-50 text-brand-charcoal border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 shrink-0" />}
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 3: Batch Pricing Model */}
            <div className="space-y-3 p-3.5 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-brand-orange" />
                <span>3. Batch Pricing Model</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormPricingType("FREE")}
                  className={cn(
                    "p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer",
                    formPricingType === "FREE"
                      ? "bg-emerald-500 text-white border-emerald-600 shadow-2xs"
                      : "bg-white text-brand-charcoal border-brand-border hover:bg-gray-50"
                  )}
                >
                  🎉 Free Batch
                </button>
                <button
                  type="button"
                  onClick={() => setFormPricingType("PAID")}
                  className={cn(
                    "p-2.5 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer",
                    formPricingType === "PAID"
                      ? "bg-brand-orange text-white border-brand-orange shadow-2xs"
                      : "bg-white text-brand-charcoal border-brand-border hover:bg-gray-50"
                  )}
                >
                  💳 Paid Batch
                </button>
              </div>

              {formPricingType === "PAID" && (
                <div className="grid grid-cols-2 gap-2.5 pt-1 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-charcoal">Original Price (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="e.g. 4999"
                      value={formPriceInr}
                      onChange={(e) => setFormPriceInr(e.target.value)}
                      disabled={isSaving}
                      className="text-xs h-9 bg-white font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-brand-charcoal">Discount (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      placeholder="e.g. 20"
                      value={formDiscountPercent}
                      onChange={(e) => setFormDiscountPercent(e.target.value)}
                      disabled={isSaving}
                      className="text-xs h-9 bg-white font-bold"
                    />
                  </div>

                  <div className="col-span-2 p-2 rounded-lg bg-orange-50 border border-orange-200 text-xs text-brand-charcoal font-semibold flex items-center justify-between">
                    <span>Effective Student Fee:</span>
                    <span className="font-extrabold text-brand-orange text-sm">
                      ₹{Math.max(0, Math.round(Number(formPriceInr) * (1 - (Number(formDiscountPercent) || 0) / 100)))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Status & Button Styling */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Layers className="h-3.5 w-3.5 text-brand-orange" />
                <span>3. Status &amp; CTA Style</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Card Status Style</label>
                  <select
                    value={formStatusType}
                    onChange={(e) => {
                      const val = e.target.value as "live" | "ongoing";
                      setFormStatusType(val);
                      setFormCtaText(val === "live" ? "Join Now" : "View Details");
                    }}
                    disabled={isSaving}
                    className="w-full h-9 px-2.5 rounded-xl border border-brand-border bg-white text-xs font-semibold text-brand-charcoal"
                  >
                    <option value="ongoing">Ongoing (Gray Button)</option>
                    <option value="live">Live Now (Orange Button)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Button CTA Text</label>
                  <Input
                    value={formCtaText}
                    onChange={(e) => setFormCtaText(e.target.value)}
                    placeholder="Join Now or View Details"
                    disabled={isSaving}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Card Icon & Color Style */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-brand-charcoal">Card Icon &amp; Color Style</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ONGOING_ICON_PRESETS.map((preset) => {
                  const IconComp = ICON_MAP[preset.iconType] || Target;
                  const isSelected = formIconType === preset.iconType;

                  return (
                    <button
                      type="button"
                      key={preset.iconType}
                      onClick={() => handlePresetSelect(preset)}
                      className={cn(
                        "p-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer",
                        isSelected
                          ? "bg-white border-brand-orange shadow-2xs ring-1 ring-brand-orange"
                          : "bg-white/70 border-brand-border/60 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn("w-7 h-7 rounded-lg border flex items-center justify-center shrink-0", preset.iconBg)}>
                          <IconComp className={cn("h-3.5 w-3.5", preset.iconColor)} />
                        </div>
                        <span className="text-xs font-bold text-brand-charcoal truncate">{preset.label}</span>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-brand-orange shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 5: Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-brand-charcoal">Batch Description</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Comprehensive syllabus coverage with daily live classes, formula sheets, mock tests, and revision notes."
                disabled={isSaving}
                className="w-full p-2.5 rounded-xl border border-brand-border bg-white text-xs text-brand-charcoal font-medium resize-none focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>

            {/* Section 6: Assigned Faculty / Teachers (Rectangular Card UI) */}
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
                  id="add-ongoing-teacher-select"
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

            {/* Section 7: Display Order & Visibility */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-charcoal uppercase tracking-wider text-[11px] pb-1 border-b border-gray-100">
                <Clock className="h-3.5 w-3.5 text-brand-orange" />
                <span>5. Display &amp; Visibility</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-brand-charcoal">Display Order</label>
                  <Input
                    type="number"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 1)}
                    min={1}
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

      {/* SECTION TITLE SETTINGS MODAL */}
      <Modal
        isOpen={isSettingModalOpen}
        onClose={() => !isSavingSetting && setIsSettingModalOpen(false)}
        title="Customize Ongoing Batches Title"
        description="Change how the Ongoing Batches section header appears on the Student Home page."
      >
        <form onSubmit={handleSaveSectionSetting} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Section Heading</label>
            <Input
              value={settingTitle}
              onChange={(e) => setSettingTitle(e.target.value)}
              placeholder="Ongoing Batches"
              disabled={isSavingSetting}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Subtitle / Description</label>
            <Input
              value={settingSubtitle}
              onChange={(e) => setSettingSubtitle(e.target.value)}
              placeholder="Active batches and daily live syllabus"
              disabled={isSavingSetting}
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
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

      {/* SAFE DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingBatch}
        onClose={() => !isDeleting && setDeletingBatch(null)}
        title="Delete Ongoing Batch"
        description="Are you sure you want to delete this batch? This action will remove the batch card and faculty associations."
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
            <p className="font-bold">Batch: {deletingBatch?.title}</p>
            <p className="text-[11px] text-red-700">Cohort: {deletingBatch?.badge_text || deletingBatch?.board_label}</p>
          </div>

          <div className="flex items-center justify-end gap-2">
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
