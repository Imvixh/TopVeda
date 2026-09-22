"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { CmsHubItem, ContentStatus, HubCategory } from "@/types/cms.types";
import { ContentStatusBadge } from "@/components/admin/cms/content-status-badge";
import { ScheduleStatusBadge, ScheduleSummaryText } from "@/components/admin/cms/schedule-status-badge";
import {
  PublishConfirmationDialog,
  PublishDialogTarget,
} from "@/components/admin/cms/publish-confirmation-dialog";
import { ContentPreviewModal, PreviewContentItem } from "@/components/admin/cms/content-preview-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  Megaphone,
  BookOpen,
  Video,
  Sparkles,
  Bell,
  Target,
  Plus,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Globe2,
  FileEdit,
  Archive,
  Calendar,
  ArrowRight,
} from "lucide-react";

export default function HubAnnouncementsCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [hubItems, setHubItems] = React.useState<CmsHubItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<CmsHubItem | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [formCategory, setFormCategory] = React.useState<HubCategory>("announcement");
  const [formBadgeText, setFormBadgeText] = React.useState("ANNOUNCEMENT");
  const [formBadgeVariant, setFormBadgeVariant] = React.useState("orange");
  const [formTitle, setFormTitle] = React.useState("");
  const [formDescription, setFormDescription] = React.useState("");
  const [formCtaText, setFormCtaText] = React.useState("Learn More →");
  const [formCtaLink, setFormCtaLink] = React.useState("#");
  const [formIconType, setFormIconType] = React.useState("Megaphone");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState<number>(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formEndsAt, setFormEndsAt] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Governance Targets
  const [archiveTarget, setArchiveTarget] = React.useState<CmsHubItem | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);
  const [publishTarget, setPublishTarget] = React.useState<PublishDialogTarget | null>(null);
  const [isPublishProcessing, setIsPublishProcessing] = React.useState(false);
  const [previewTarget, setPreviewTarget] = React.useState<PreviewContentItem | null>(null);

  // Manual Refresh
  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Helper to format ISO timestamp for datetime-local input
  const formatForDateTimeInput = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  // Load Hub Items
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await CmsService.getHubItems(supabase);
        if (!isMounted) return;
        setHubItems(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load hub items." });
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
    setEditingItem(null);
    setFormCategory("announcement");
    setFormBadgeText("ANNOUNCEMENT");
    setFormBadgeVariant("orange");
    setFormTitle("");
    setFormDescription("");
    setFormCtaText("Learn More →");
    setFormCtaLink("#");
    setFormIconType("Megaphone");
    setFormDisplayOrder(hubItems.length);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: CmsHubItem) => {
    setEditingItem(item);
    setFormCategory(item.category || "announcement");
    setFormBadgeText(item.badge_text || "ANNOUNCEMENT");
    setFormBadgeVariant(item.badge_variant || "orange");
    setFormTitle(item.title || "");
    setFormDescription(item.description || "");
    setFormCtaText(item.cta_text || "Learn More →");
    setFormCtaLink(item.cta_link || "#");
    setFormIconType(item.icon_type || "Megaphone");
    setFormDisplayOrder(item.display_order ?? 0);
    setFormIsVisible(item.is_visible);
    setFormStatus(item.status);
    setFormStartsAt(formatForDateTimeInput(item.starts_at));
    setFormEndsAt(formatForDateTimeInput(item.ends_at));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formTitle.trim()) errors.title = "Headline title is required";
    if (!formDescription.trim()) errors.description = "Teaser description is required";
    if (!formBadgeText.trim()) errors.badge_text = "Badge text is required";
    if (!formCtaText.trim()) errors.cta_text = "CTA label is required";
    if (!formCtaLink.trim()) errors.cta_link = "CTA redirect link is required";

    if (formStartsAt && formEndsAt) {
      if (new Date(formStartsAt) >= new Date(formEndsAt)) {
        errors.ends_at = "End date must be strictly after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Hub Item Handler
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsHubItem> = {
      ...(editingItem ? { id: editingItem.id } : {}),
      category: formCategory,
      badge_text: formBadgeText.trim(),
      badge_variant: formBadgeVariant,
      title: formTitle.trim(),
      description: formDescription.trim(),
      cta_text: formCtaText.trim(),
      cta_link: formCtaLink.trim(),
      icon_type: formIconType,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertHubItem(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save hub item." });
    } else {
      setFeedback({
        type: "success",
        message: editingItem ? "Hub item updated successfully." : "Hub item created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  // Fast Toggle Visibility
  const handleToggleVisibility = async (item: CmsHubItem) => {
    const nextVal = !item.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_hub_items", item.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `Hub item visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
      });
      handleManualRefresh();
    }
  };

  // Archive Confirm Handler
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_hub_items", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive hub item." });
    } else {
      setFeedback({ type: "success", message: `Hub item "${archiveTarget.title}" archived successfully.` });
      handleManualRefresh();
    }
  };

  // Publish Dialog Confirm
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
            entityType: "HUB",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish hub item." });
        } else {
          setFeedback({ type: "success", message: `Hub item "${publishTarget.title}" published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish hub item." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      // Unpublish action
      const { error } = await CmsService.unpublishContent(supabase, "HUB", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish hub item." });
      } else {
        setFeedback({ type: "success", message: `Hub item unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  // Render Icon Helper
  const renderItemIcon = (iconName: string) => {
    switch (iconName) {
      case "BookOpen":
        return <BookOpen className="h-4 w-4" />;
      case "Video":
        return <Video className="h-4 w-4" />;
      case "Sparkles":
        return <Sparkles className="h-4 w-4" />;
      case "Bell":
        return <Bell className="h-4 w-4" />;
      case "Target":
        return <Target className="h-4 w-4" />;
      case "Megaphone":
      default:
        return <Megaphone className="h-4 w-4" />;
    }
  };

  // Badge Variant Class Helper
  const getBadgeClass = (variant: string) => {
    switch (variant) {
      case "emerald":
      case "green":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "pink":
      case "rose":
        return "bg-pink-50 text-pink-700 border-pink-200";
      case "purple":
      case "indigo":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "orange":
      default:
        return "bg-orange-50 text-orange-700 border-orange-200";
    }
  };

  // Filtered List
  const filteredItems = React.useMemo(() => {
    return hubItems.filter((item) => {
      if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesBadge = item.badge_text.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesBadge) return false;
      }
      return true;
    });
  }, [hubItems, categoryFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-orange-50 text-brand-orange border border-orange-200 flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                Hub & Announcements
              </h1>
              <p className="text-xs text-brand-text-muted">
                Publish student updates, exam schedule alerts, study material releases, and platform tips to Student Home
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white shadow-2xs text-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>New Hub Item</span>
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : feedback.type === "info"
              ? "bg-sky-50 text-sky-800 border-sky-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
            <Input
              placeholder="Search by title, teaser, or badge..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-muted shrink-0">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Categories</option>
              <option value="announcement">Announcement</option>
              <option value="material">Study Material</option>
              <option value="live">Live Class</option>
              <option value="tip">Study Tip</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-brand-text-muted shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hub Items Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-extrabold text-sm text-brand-text-primary flex items-center gap-1.5">
            <span>Configured Hub Items</span>
            <span className="text-xs font-normal text-brand-text-muted">
              ({filteredItems.length} {filteredItems.length === 1 ? "item" : "items"})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
            <p className="text-xs font-medium text-brand-text-muted">Loading hub items...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 border border-orange-100 text-brand-orange flex items-center justify-center mx-auto">
              <Megaphone className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-brand-text-primary">No hub items found</h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                {searchQuery || categoryFilter !== "ALL" || statusFilter !== "ALL"
                  ? "Try changing your search terms, category, or status filter."
                  : "Add your first announcement or hub card for the Student Home Section 6."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3.5">Hub Card Title & Teaser</th>
                    <th className="p-3.5">Category & Badge</th>
                    <th className="p-3.5">CTA Target</th>
                    <th className="p-3.5">Order</th>
                    <th className="p-3.5">Schedule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-brand-bg-warm/30 transition-colors">
                      {/* Title & Teaser */}
                      <td className="p-3.5 space-y-1 max-w-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg bg-orange-50 border border-orange-200 text-brand-orange shrink-0 flex items-center justify-center">
                            {renderItemIcon(item.icon_type)}
                          </div>
                          <p className="font-bold text-brand-text-primary text-xs line-clamp-1">
                            {item.title}
                          </p>
                        </div>
                        <p className="text-[11px] text-brand-text-muted line-clamp-2 pl-9">
                          {item.description}
                        </p>
                      </td>

                      {/* Category & Badge */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border block w-fit ${getBadgeClass(item.badge_variant)}`}>
                          {item.badge_text || item.category}
                        </span>
                        <span className="text-[10px] font-mono text-brand-text-muted block pl-1">
                          {item.category} • {item.icon_type}
                        </span>
                      </td>

                      {/* CTA */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange bg-brand-bg-peach px-2 py-0.5 rounded border border-brand-orange-border/40">
                          {item.cta_text} <ArrowRight className="h-3 w-3" />
                        </span>
                        <span className="text-[10px] font-mono text-brand-text-muted block mt-0.5 truncate max-w-[120px]">
                          {item.cta_link}
                        </span>
                      </td>

                      {/* Display Order */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        #{item.display_order}
                      </td>

                      {/* Schedule */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ScheduleStatusBadge startsAt={item.starts_at} endsAt={item.ends_at} />
                        <div className="hidden lg:block">
                          <ScheduleSummaryText startsAt={item.starts_at} endsAt={item.ends_at} />
                        </div>
                      </td>

                      {/* Status & Visibility */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ContentStatusBadge status={item.status} size="sm" />
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            onClick={() => handleToggleVisibility(item)}
                            className="inline-flex items-center gap-1 font-semibold text-brand-text-muted hover:text-brand-text-primary transition-colors cursor-pointer"
                            title="Toggle Visibility"
                          >
                            {item.is_visible ? (
                              <span className="text-emerald-700 flex items-center gap-0.5">
                                <Eye className="h-3 w-3" /> Visible
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center gap-0.5">
                                <EyeOff className="h-3 w-3" /> Hidden
                              </span>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === "PUBLISHED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "HUB",
                                  entityId: item.id,
                                  title: item.title,
                                  currentStatus: item.status,
                                  isVisible: item.is_visible,
                                  startsAt: item.starts_at,
                                  endsAt: item.ends_at,
                                  displayOrder: item.display_order,
                                  action: "UNPUBLISH",
                                })
                              }
                              title="Unpublish"
                              className="h-8 px-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 border-amber-200"
                            >
                              <FileEdit className="h-3.5 w-3.5 mr-1 text-amber-600" /> Unpublish
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "HUB",
                                  entityId: item.id,
                                  title: item.title,
                                  currentStatus: item.status,
                                  isVisible: item.is_visible,
                                  startsAt: item.starts_at,
                                  endsAt: item.ends_at,
                                  displayOrder: item.display_order,
                                  action: "PUBLISH",
                                })
                              }
                              title="Publish to Student Portal"
                              className="h-8 px-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                            >
                              <Globe2 className="h-3.5 w-3.5 mr-1" /> Publish
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewTarget({ type: "HUB", data: item })}
                            title="Preview Simulation"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Hub Item"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            Edit
                          </Button>

                          {item.status !== "ARCHIVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setArchiveTarget(item)}
                              title="Archive Hub Item"
                              className="h-8 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border-rose-200"
                            >
                              <Archive className="h-3.5 w-3.5 text-rose-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Hub Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingItem ? "Edit Hub Announcement" : "Create Hub Announcement"}
        description="Configure announcement cards, badge highlights, and action navigation for Student Home Section 6."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Hub Category *
              </label>
              <select
                value={formCategory}
                onChange={(e) => {
                  const cat = e.target.value as HubCategory;
                  setFormCategory(cat);
                  // Update default badge text accordingly if creating new
                  if (!editingItem) {
                    if (cat === "announcement") setFormBadgeText("ANNOUNCEMENT");
                    else if (cat === "material") setFormBadgeText("NEW MATERIAL");
                    else if (cat === "live") setFormBadgeText("LIVE TODAY");
                    else if (cat === "tip") setFormBadgeText("STUDY TIP");
                  }
                }}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="announcement">Announcement</option>
                <option value="material">Study Material</option>
                <option value="live">Live Class Notice</option>
                <option value="tip">Study Tip & Guide</option>
              </select>
            </div>

            <Input
              label="Headline Title *"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. CBSE Class 10 Date Sheet Announced"
              error={formErrors.title}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Teaser Description *
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Board exams commence from Feb 15. Check complete subject-wise schedule and revision timetable."
              rows={2}
              disabled={isSaving}
              className={`w-full rounded-xl border bg-brand-surface p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 ${
                formErrors.description
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-brand-border focus:ring-brand-orange/20"
              }`}
            />
            {formErrors.description && (
              <p className="text-[11px] font-semibold text-rose-600">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Badge Text *"
              value={formBadgeText}
              onChange={(e) => setFormBadgeText(e.target.value)}
              placeholder="e.g. ANNOUNCEMENT"
              error={formErrors.badge_text}
              disabled={isSaving}
            />

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Badge Color Variant
              </label>
              <select
                value={formBadgeVariant}
                onChange={(e) => setFormBadgeVariant(e.target.value)}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="orange">Orange (Brand Peach)</option>
                <option value="emerald">Emerald Green (Success)</option>
                <option value="pink">Pink / Rose (Highlight)</option>
                <option value="purple">Purple / Indigo (Academic)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Icon Representation
              </label>
              <select
                value={formIconType}
                onChange={(e) => setFormIconType(e.target.value)}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="Megaphone">Megaphone (Announcement)</option>
                <option value="BookOpen">BookOpen (Material)</option>
                <option value="Video">Video (Live Session)</option>
                <option value="Sparkles">Sparkles (Tips & Gems)</option>
                <option value="Bell">Bell (Notification)</option>
                <option value="Target">Target (Goals)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="CTA Button Label *"
              value={formCtaText}
              onChange={(e) => setFormCtaText(e.target.value)}
              placeholder="e.g. Learn More →"
              error={formErrors.cta_text}
              disabled={isSaving}
            />

            <Input
              label="CTA Target Link *"
              value={formCtaLink}
              onChange={(e) => setFormCtaLink(e.target.value)}
              placeholder="e.g. /student/materials or /student/live"
              error={formErrors.cta_link}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Display Order Index"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(parseInt(e.target.value, 10) || 0)}
              disabled={isSaving}
            />

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">
                Content Status
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PENDING_REVIEW">PENDING_REVIEW</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          {/* Visibility Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formIsVisible}
                onChange={(e) => setFormIsVisible(e.target.checked)}
                disabled={isSaving}
                className="h-4 w-4 rounded text-brand-orange border-brand-border focus:ring-brand-orange"
              />
              <span className="text-xs font-bold text-brand-text-primary">
                Student Portal Visibility Flag (is_visible = true)
              </span>
            </label>
          </div>

          {/* Date Range Scheduling */}
          <div className="space-y-2 p-3.5 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-text-primary">
              <Calendar className="h-4 w-4 text-brand-orange" />
              <span>Time-Window Scheduling (Optional)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                  Starts At (Live from)
                </label>
                <input
                  type="datetime-local"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                  disabled={isSaving}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-brand-text-muted mb-1">
                  Ends At (Expires at)
                </label>
                <input
                  type="datetime-local"
                  value={formEndsAt}
                  onChange={(e) => setFormEndsAt(e.target.value)}
                  disabled={isSaving}
                  className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                />
              </div>
            </div>
            {formErrors.ends_at && (
              <p className="text-[11px] font-semibold text-rose-600">{formErrors.ends_at}</p>
            )}
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-brand-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSaving}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold"
            >
              {isSaving ? "Saving..." : editingItem ? "Save Changes" : "Create Hub Item"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Hub Announcement"
        description="Are you sure you want to archive this hub item? Archived items are removed from student display."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-warm border border-brand-border text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.title}</p>
              <p className="text-brand-text-muted line-clamp-2">{archiveTarget.description}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchiveTarget(null)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleArchiveConfirm}
              disabled={isArchiving}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isArchiving ? "Archiving..." : "Confirm Archive"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publishing Confirmation Dialog */}
      <PublishConfirmationDialog
        target={publishTarget}
        isOpen={!!publishTarget}
        onClose={() => !isPublishProcessing && setPublishTarget(null)}
        onConfirm={handlePublishConfirm}
        isProcessing={isPublishProcessing}
      />

      {/* Preview Modal */}
      <ContentPreviewModal
        item={previewTarget}
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
