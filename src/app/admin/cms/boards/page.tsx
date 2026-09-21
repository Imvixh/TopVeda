"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsBoard, ContentStatus } from "@/types/cms.types";
import {
  Landmark,
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

export default function BoardsCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [boards, setBoards] = React.useState<CmsBoard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBoard, setEditingBoard] = React.useState<CmsBoard | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsBoard | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Form State
  const [formName, setFormName] = React.useState("");
  const [formCode, setFormCode] = React.useState("");
  const [formSlug, setFormSlug] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formIconName, setFormIconName] = React.useState("landmark");
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
        const data = await CmsService.getBoards(supabase);
        if (!isMounted) return;
        setBoards(data);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load educational boards." });
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

  // Auto-generate slug from name if slug is empty
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormName(val);
    if (!editingBoard) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      setFormSlug(autoSlug);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingBoard(null);
    setFormName("");
    setFormCode("");
    setFormSlug("");
    setFormDescription("");
    setFormIconName("landmark");
    setFormDisplayOrder(boards.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (board: CmsBoard) => {
    setEditingBoard(board);
    setFormName(board.name);
    setFormCode(board.code);
    setFormSlug(board.slug);
    setFormDescription(board.description || "");
    setFormIconName(board.icon_name || "landmark");
    setFormDisplayOrder(board.display_order);
    setFormIsVisible(board.is_visible);
    setFormStatus(board.status);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = "Board name is required";
    if (!formCode.trim()) errors.code = "Board code is required (e.g. CBSE)";
    if (!formSlug.trim()) errors.slug = "URL slug is required (e.g. cbse)";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsBoard> = {
      ...(editingBoard ? { id: editingBoard.id } : {}),
      name: formName.trim(),
      code: formCode.trim().toUpperCase(),
      slug: formSlug.trim().toLowerCase(),
      description: formDescription.trim() || null,
      icon_name: formIconName.trim() || null,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
    };

    const { data, error } = await CmsService.upsertBoard(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save board." });
    } else {
      setFeedback({
        type: "success",
        message: editingBoard ? "Board updated successfully." : "Board created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_boards", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive board." });
    } else {
      setFeedback({ type: "success", message: `Board "${archiveTarget.name}" archived successfully.` });
      handleManualRefresh();
    }
  };

  // Filtered Boards List
  const filteredBoards = React.useMemo(() => {
    return boards.filter((b) => {
      const matchesSearch =
        searchQuery === "" ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [boards, searchQuery, statusFilter]);

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
              cms_boards
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <Landmark className="h-7 w-7 text-brand-orange" />
            <span>Educational Boards</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Manage national and state education boards (CBSE, ICSE, State Boards) linked to courses and batches.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Board
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
              placeholder="Search by board name, code (e.g. CBSE), or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              aria-label="Filter boards by status"
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
                <th className="py-3 px-4">Board Name & Code</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Order</th>
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
                      <span>Loading boards...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBoards.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-brand-text-muted">
                    <div className="space-y-2">
                      <Landmark className="h-8 w-8 text-brand-text-muted/50 mx-auto" />
                      <p className="font-bold text-brand-text-primary">No boards found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search filter." : "Click '+ Add Board' to create the first educational board."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBoards.map((board) => (
                  <tr key={board.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-brand-text-primary">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-brand-text-primary">{board.name}</span>
                        <Badge variant="outline" size="sm" className="font-mono text-[10px] bg-brand-bg-warm">
                          {board.code}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-brand-text-muted">{board.slug}</td>
                    <td className="py-3.5 px-4 text-brand-text-muted max-w-xs truncate">
                      {board.description || <span className="text-gray-400 italic">No description</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{board.display_order}</td>
                    <td className="py-3.5 px-4 text-center">
                      {board.is_visible ? (
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
                          board.status === "PUBLISHED"
                            ? "success"
                            : board.status === "DRAFT"
                            ? "neutral"
                            : "peach"
                        }
                        size="sm"
                        className="font-bold text-[10px]"
                      >
                        {board.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(board)}
                          className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                          title="Edit Board"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {board.status !== "ARCHIVED" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setArchiveTarget(board)}
                            className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                            title="Archive Board"
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

      {/* 4. Create / Edit Board Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingBoard ? "Edit Educational Board" : "Create Educational Board"}
        description="Configure board name, code, slug, and status."
        maxWidth="md"
      >
        <form onSubmit={handleSaveBoard} className="space-y-4">
          <Input
            label="Board Full Name *"
            placeholder="e.g. Central Board of Secondary Education"
            value={formName}
            onChange={handleNameChange}
            error={formErrors.name}
            disabled={isSaving}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Board Code *"
              placeholder="e.g. CBSE"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              error={formErrors.code}
              disabled={isSaving}
            />

            <Input
              label="URL Slug *"
              placeholder="e.g. cbse"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
              error={formErrors.slug}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-brand-text-primary">Description</label>
            <textarea
              placeholder="Optional overview or state details..."
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
                aria-label="Board status"
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
              id="formIsVisible"
              checked={formIsVisible}
              onChange={(e) => setFormIsVisible(e.target.checked)}
              disabled={isSaving}
              className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
            />
            <label htmlFor="formIsVisible" className="text-xs font-semibold text-brand-text-primary select-none cursor-pointer">
              Visible on Student Discovery Portal
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
              {isSaving ? "Saving..." : editingBoard ? "Update Board" : "Create Board"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Educational Board?"
        description="Are you sure you want to archive this board? It will no longer appear on live student discovery pages."
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
