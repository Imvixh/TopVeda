"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsClassLevel, ContentStatus } from "@/types/cms.types";
import {
  School,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Archive,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ClassesCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [classLevels, setClassLevels] = React.useState<CmsClassLevel[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<CmsClassLevel | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsClassLevel | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Form State
  const [formName, setFormName] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
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
        const data = await CmsService.getClassLevels(supabase);
        if (!isMounted) return;
        setClassLevels(data);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load class levels." });
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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormName(val);
    if (!editingClass) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormSlug(autoSlug);
      const autoCode = val
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setFormCode(autoCode);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setFormName("");
    setFormCode("");
    setFormSlug("");
    setFormDisplayOrder(classLevels.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cl: CmsClassLevel) => {
    setEditingClass(cl);
    setFormName(cl.name);
    setFormCode(cl.code);
    setFormSlug(cl.slug);
    setFormDisplayOrder(cl.display_order);
    setFormIsVisible(cl.is_visible);
    setFormStatus(cl.status);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Class name is required (e.g. Class 10)";
    if (!formCode.trim()) errors.code = "Class code is required (e.g. CLASS_10)";
    if (!formSlug.trim()) errors.slug = "URL slug is required (e.g. class-10)";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsClassLevel> = {
      ...(editingClass ? { id: editingClass.id } : {}),
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      slug: formSlug.trim().toLowerCase(),
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
    };

    const { data, error } = await CmsService.upsertClassLevel(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save class level." });
    } else {
      setFeedback({
        type: "success",
        message: editingClass ? "Class level updated successfully." : "Class level created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_class_levels", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive class level." });
    } else {
      setFeedback({ type: "success", message: `Class level "${archiveTarget.name}" archived successfully.` });
      handleManualRefresh();
    }
  };

  // Filtered Class Levels List
  const filteredClassLevels = React.useMemo(() => {
    return classLevels.filter((cl) => {
      const matchesSearch =
        searchQuery === "" ||
        cl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cl.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cl.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || cl.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [classLevels, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              ACADEMIC TAXONOMY
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              cms_class_levels
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <School className="h-7 w-7 text-brand-orange" />
            <span>Class Levels & Grades</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Manage student academic grades (Class 9, 10, 11, 12, Dropper) for course catalog categorization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Class Level
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
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:flex-1">
            <Input
              placeholder="Search by class name, code (e.g. CLASS_10), or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              aria-label="Filter classes by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
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
                <th className="py-3 px-4">Class / Grade Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4 text-center">Display Order</th>
                <th className="py-3 px-4 text-center">Visibility</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-text-muted">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-brand-orange" />
                      <span>Loading class levels...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClassLevels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-text-muted">
                    <div className="space-y-2">
                      <School className="h-8 w-8 text-brand-text-muted/50 mx-auto" />
                      <p className="font-bold text-brand-text-primary">No class levels found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search filter." : "Click '+ Add Class Level' to create the first academic grade."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClassLevels.map((cl) => (
                  <tr key={cl.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-brand-text-primary">
                      <span className="font-extrabold text-brand-text-primary">{cl.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-brand-text-primary">
                      <Badge variant="outline" size="sm" className="font-mono text-[10px] bg-brand-bg-warm">
                        {cl.code}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-brand-text-muted">{cl.slug}</td>
                    <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{cl.display_order}</td>
                    <td className="py-3.5 px-4 text-center">
                      {cl.is_visible ? (
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
                          cl.status === "PUBLISHED"
                            ? "success"
                            : cl.status === "DRAFT"
                            ? "neutral"
                            : "peach"
                        }
                        size="sm"
                        className="font-bold text-[10px]"
                      >
                        {cl.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(cl)}
                          className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                          title="Edit Class Level"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {cl.status !== "ARCHIVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setArchiveTarget(cl)}
                            className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                            title="Archive Class Level"
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

      {/* 4. Create / Edit Class Level Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingClass ? "Edit Class Level" : "Create Class Level"}
        description="Configure class name, identifier code, and URL slug."
        maxWidth="md"
      >
        <form onSubmit={handleSaveClass} className="space-y-4">
          <Input
            label="Class / Grade Name *"
            placeholder="e.g. Class 10"
            value={formName}
            onChange={handleNameChange}
            error={formErrors.name}
            disabled={isSaving}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Identifier Code *"
              placeholder="e.g. CLASS_10"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              error={formErrors.code}
              disabled={isSaving}
            />

            <Input
              label="URL Slug *"
              placeholder="e.g. class-10"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              error={formErrors.slug}
              disabled={isSaving}
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
                aria-label="Class level status"
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
              id="formIsVisibleClass"
              checked={formIsVisible}
              onChange={(e) => setFormIsVisible(e.target.checked)}
              disabled={isSaving}
              className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
            />
            <label htmlFor="formIsVisibleClass" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
              Visible in Academic Selectors
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
              {isSaving ? "Saving..." : editingClass ? "Update Class" : "Create Class"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Class Level?"
        description="Are you sure you want to archive this grade? Active courses linked to this grade may need updating."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-peach/50 border border-brand-orange-border/60 text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.name} ({archiveTarget.code})</p>
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
