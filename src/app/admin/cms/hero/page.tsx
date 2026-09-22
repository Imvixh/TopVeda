"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import { StorageService } from "@/lib/services/storage.service";
import { CmsHeroBanner, ContentStatus } from "@/types/cms.types";
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
  GalleryHorizontal,
  Plus,
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Globe2,
  FileEdit,
  Archive,
  Upload,
  ArrowRight,
} from "lucide-react";

export default function HeroBannersCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // State
  const [banners, setBanners] = React.useState<CmsHeroBanner[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingBanner, setEditingBanner] = React.useState<CmsHeroBanner | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form State
  const [formTagline, setFormTagline] = React.useState("TOPVEDA ACADEMIC DISCOVERY");
  const [formTitle, setFormTitle] = React.useState("");
  const [formSubtitle, setFormSubtitle] = React.useState("");
  const [formCtaText, setFormCtaText] = React.useState("Keep Learning →");
  const [formCtaLink, setFormCtaLink] = React.useState("#featured-batches");
  const [formQuoteText, setFormQuoteText] = React.useState("Better Students\nBrighter Futures");
  const [formCharacterImageUrl, setFormCharacterImageUrl] = React.useState("/avatars/doctor_female.jpg");
  const [formBgGradient, setFormBgGradient] = React.useState("from-[#081326] via-[#0E2044] to-[#1B3A72]");
  const [formDisplayOrder, setFormDisplayOrder] = React.useState<number>(0);
  const [formIsVisible, setFormIsVisible] = React.useState(true);
  const [formStatus, setFormStatus] = React.useState<ContentStatus>("PUBLISHED");
  const [formStartsAt, setFormStartsAt] = React.useState("");
  const [formEndsAt, setFormEndsAt] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Image Upload State
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Governance Targets
  const [archiveTarget, setArchiveTarget] = React.useState<CmsHeroBanner | null>(null);
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

  // Load Banners
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await CmsService.getHeroBanners(supabase);
        if (!isMounted) return;
        setBanners(data);
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load hero banners." });
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
    setEditingBanner(null);
    setFormTagline("TOPVEDA ACADEMIC DISCOVERY");
    setFormTitle("");
    setFormSubtitle("");
    setFormCtaText("Keep Learning →");
    setFormCtaLink("#featured-batches");
    setFormQuoteText("Better Students\nBrighter Futures");
    setFormCharacterImageUrl("/avatars/doctor_female.jpg");
    setFormBgGradient("from-[#081326] via-[#0E2044] to-[#1B3A72]");
    setFormDisplayOrder(banners.length);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormStartsAt("");
    setFormEndsAt("");
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (b: CmsHeroBanner) => {
    setEditingBanner(b);
    setFormTagline(b.tagline || "TOPVEDA ACADEMIC DISCOVERY");
    setFormTitle(b.title || "");
    setFormSubtitle(b.subtitle || "");
    setFormCtaText(b.cta_text || "Keep Learning →");
    setFormCtaLink(b.cta_link || "#featured-batches");
    setFormQuoteText(b.quote_text || "");
    setFormCharacterImageUrl(b.character_image_url || "/avatars/doctor_female.jpg");
    setFormBgGradient(b.bg_gradient || "from-[#081326] via-[#0E2044] to-[#1B3A72]");
    setFormDisplayOrder(b.display_order ?? 0);
    setFormIsVisible(b.is_visible);
    setFormStatus(b.status);
    setFormStartsAt(formatForDateTimeInput(b.starts_at));
    setFormEndsAt(formatForDateTimeInput(b.ends_at));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Handle Character Image File Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: "error", message: "Image size exceeds maximum limit of 5 MB." });
      return;
    }

    // Validate MIME type
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/avif"];
    if (!validMimes.includes(file.type)) {
      setFeedback({ type: "error", message: "Invalid image format. Supported formats: JPG, PNG, WebP, SVG, AVIF." });
      return;
    }

    setIsUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const authorId = user?.id || "super-admin";
      const entityId = editingBanner?.id || "banner-" + Date.now();
      const path = StorageService.generateScopedPath(authorId, entityId, file.name);

      const { path: uploadedPath, error } = await StorageService.uploadFile(
        supabase,
        "cms-banners",
        path,
        file,
        { contentType: file.type, upsert: true }
      );

      if (error || !uploadedPath) {
        setFeedback({ type: "error", message: error?.message || "Failed to upload banner image." });
      } else {
        const publicUrl = StorageService.getPublicUrl(supabase, "cms-banners", uploadedPath);
        setFormCharacterImageUrl(publicUrl);
        setFeedback({ type: "success", message: "Banner graphic uploaded successfully to public CDN." });
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message || "Failed to upload image." });
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formTagline.trim()) errors.tagline = "Tagline is required";
    if (!formTitle.trim()) errors.title = "Hero title is required";
    if (!formSubtitle.trim()) errors.subtitle = "Subtitle is required";
    if (!formCtaText.trim()) errors.cta_text = "CTA text is required";
    if (!formCtaLink.trim()) errors.cta_link = "CTA target link is required";
    if (!formCharacterImageUrl.trim()) errors.character_image_url = "Character image is required";

    if (formStartsAt && formEndsAt) {
      if (new Date(formStartsAt) >= new Date(formEndsAt)) {
        errors.ends_at = "End date must be strictly after start date";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Banner Handler
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsHeroBanner> = {
      ...(editingBanner ? { id: editingBanner.id } : {}),
      tagline: formTagline.trim(),
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      cta_text: formCtaText.trim(),
      cta_link: formCtaLink.trim(),
      quote_text: formQuoteText.trim(),
      character_image_url: formCharacterImageUrl.trim(),
      bg_gradient: formBgGradient.trim() || "from-[#081326] via-[#0E2044] to-[#1B3A72]",
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
      starts_at: formStartsAt ? new Date(formStartsAt).toISOString() : null,
      ends_at: formEndsAt ? new Date(formEndsAt).toISOString() : null,
    };

    const { data, error } = await CmsService.upsertHeroBanner(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save hero banner." });
    } else {
      setFeedback({
        type: "success",
        message: editingBanner ? "Hero banner slide updated successfully." : "Hero banner slide created successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  // Archive Confirm Handler
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_hero_banners", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive hero banner." });
    } else {
      setFeedback({ type: "success", message: `Hero banner "${archiveTarget.title}" archived successfully.` });
      handleManualRefresh();
    }
  };

  // Quick Toggle Visibility
  const handleToggleVisibility = async (b: CmsHeroBanner) => {
    const nextVal = !b.is_visible;
    const { error } = await CmsService.toggleVisibility(supabase, "cms_hero_banners", b.id, nextVal);
    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to update visibility." });
    } else {
      setFeedback({
        type: "success",
        message: `Banner "${b.title}" visibility is now ${nextVal ? "Visible" : "Hidden"}.`,
      });
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
            entityType: "HERO",
            entityId: publishTarget.entityId,
            displayOrder: options.displayOrder,
            startsAt: options.startsAt,
            endsAt: options.endsAt,
          }),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          setFeedback({ type: "error", message: result.error || "Failed to publish hero banner." });
        } else {
          setFeedback({ type: "success", message: `Hero banner "${publishTarget.title}" published successfully.` });
          setPublishTarget(null);
          handleManualRefresh();
        }
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to publish hero banner." });
      } finally {
        setIsPublishProcessing(false);
      }
    } else {
      // Unpublish action
      const { error } = await CmsService.unpublishContent(supabase, "HERO", publishTarget.entityId);
      setIsPublishProcessing(false);
      if (error) {
        setFeedback({ type: "error", message: error.message || "Failed to unpublish hero banner." });
      } else {
        setFeedback({ type: "success", message: `Hero banner "${publishTarget.title}" unpublished and returned to draft.` });
        setPublishTarget(null);
        handleManualRefresh();
      }
    }
  };

  // Filtered List
  const filteredBanners = React.useMemo(() => {
    return banners.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = b.title.toLowerCase().includes(q);
        const matchesTagline = b.tagline.toLowerCase().includes(q);
        const matchesSubtitle = b.subtitle.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTagline && !matchesSubtitle) return false;
      }
      return true;
    });
  }, [banners, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-brand-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-brand-orange border border-rose-100 flex items-center justify-center">
              <GalleryHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-2xl text-brand-text-primary tracking-tight">
                Hero Banners & Carousel
              </h1>
              <p className="text-xs text-brand-text-muted">
                Manage student portal landing banners, promotional carousels, CTA buttons, and character artwork
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
            <span>New Hero Slide</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-text-muted" />
            <Input
              placeholder="Search by tagline, title, or subtitle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
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

      {/* Hero Banners Table / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-extrabold text-sm text-brand-text-primary flex items-center gap-1.5">
            <span>Configured Hero Slides</span>
            <span className="text-xs font-normal text-brand-text-muted">
              ({filteredBanners.length} {filteredBanners.length === 1 ? "slide" : "slides"})
            </span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 rounded-2xl border border-brand-border bg-brand-surface text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-brand-orange animate-spin mx-auto" />
            <p className="text-xs font-medium text-brand-text-muted">Loading hero banners...</p>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-brand-border bg-brand-bg-warm/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 text-brand-orange flex items-center justify-center mx-auto">
              <GalleryHorizontal className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-brand-text-primary">No hero banners found</h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try changing your search terms or status filter."
                  : "Create your first home carousel banner slide to engage students on the landing page."}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-bg-warm/70 text-brand-text-muted font-bold text-[10px] uppercase tracking-wider">
                    <th className="p-3.5">Banner Preview & Title</th>
                    <th className="p-3.5">Tagline & Subtitle</th>
                    <th className="p-3.5">CTA Redirect</th>
                    <th className="p-3.5">Order</th>
                    <th className="p-3.5">Schedule</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/60">
                  {filteredBanners.map((b) => (
                    <tr key={b.id} className="hover:bg-brand-bg-warm/30 transition-colors">
                      {/* Banner Preview & Title */}
                      <td className="p-3.5 space-y-1.5 max-w-xs">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 rounded-lg overflow-hidden border border-brand-border bg-slate-900 shrink-0 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={b.character_image_url}
                              alt={b.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-brand-text-primary text-xs line-clamp-1">
                              {b.title}
                            </p>
                            {b.quote_text && (
                              <p className="text-[10px] text-brand-text-muted italic line-clamp-1">
                                &ldquo;{b.quote_text}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tagline & Subtitle */}
                      <td className="p-3.5 max-w-xs">
                        <span className="text-[9px] font-mono uppercase font-bold text-brand-orange block">
                          {b.tagline}
                        </span>
                        <p className="text-[11px] text-brand-text-muted line-clamp-2">
                          {b.subtitle}
                        </p>
                      </td>

                      {/* CTA */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange bg-brand-bg-peach px-2 py-0.5 rounded border border-brand-orange-border/40">
                          {b.cta_text} <ArrowRight className="h-3 w-3" />
                        </span>
                        <span className="text-[10px] font-mono text-brand-text-muted block mt-0.5 truncate max-w-[120px]">
                          {b.cta_link}
                        </span>
                      </td>

                      {/* Display Order */}
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px]">
                        #{b.display_order}
                      </td>

                      {/* Schedule */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ScheduleStatusBadge startsAt={b.starts_at} endsAt={b.ends_at} />
                        <div className="hidden lg:block">
                          <ScheduleSummaryText startsAt={b.starts_at} endsAt={b.ends_at} />
                        </div>
                      </td>

                      {/* Status & Visibility */}
                      <td className="p-3.5 whitespace-nowrap space-y-1">
                        <ContentStatusBadge status={b.status} size="sm" />
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            onClick={() => handleToggleVisibility(b)}
                            className="inline-flex items-center gap-1 font-semibold text-brand-text-muted hover:text-brand-text-primary transition-colors cursor-pointer"
                            title="Toggle Visibility"
                          >
                            {b.is_visible ? (
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
                          {b.status === "PUBLISHED" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPublishTarget({
                                  entityType: "HERO",
                                  entityId: b.id,
                                  title: b.title,
                                  currentStatus: b.status,
                                  isVisible: b.is_visible,
                                  startsAt: b.starts_at,
                                  endsAt: b.ends_at,
                                  displayOrder: b.display_order,
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
                                  entityType: "HERO",
                                  entityId: b.id,
                                  title: b.title,
                                  currentStatus: b.status,
                                  isVisible: b.is_visible,
                                  startsAt: b.starts_at,
                                  endsAt: b.ends_at,
                                  displayOrder: b.display_order,
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
                            onClick={() => setPreviewTarget({ type: "HERO", data: b })}
                            title="Preview Simulation"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-600" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(b)}
                            title="Edit Banner"
                            className="h-8 px-2 text-xs font-semibold"
                          >
                            Edit
                          </Button>

                          {b.status !== "ARCHIVED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setArchiveTarget(b)}
                              title="Archive Banner"
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

      {/* Create / Edit Hero Banner Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingBanner ? "Edit Hero Banner Slide" : "Create Hero Banner Slide"}
        description="Configure carousel content, CTA button navigation, and character artwork for student home hero."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBanner} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Tagline Category Badge"
              value={formTagline}
              onChange={(e) => setFormTagline(e.target.value)}
              placeholder="e.g. TOPVEDA ACADEMIC DISCOVERY"
              error={formErrors.tagline}
              disabled={isSaving}
            />

            <Input
              label="Hero Headline Title *"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Complete Class 10 Board Preparation"
              error={formErrors.title}
              disabled={isSaving}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-brand-text-primary">
              Subtitle Description *
            </label>
            <textarea
              value={formSubtitle}
              onChange={(e) => setFormSubtitle(e.target.value)}
              placeholder="e.g. Master NCERT syllabus with daily live sessions, chapter notes, and question banks."
              rows={2}
              disabled={isSaving}
              className={`w-full rounded-xl border bg-brand-surface p-2.5 text-xs text-brand-text-primary focus:outline-none focus:ring-2 ${
                formErrors.subtitle
                  ? "border-rose-400 focus:ring-rose-200"
                  : "border-brand-border focus:ring-brand-orange/20"
              }`}
            />
            {formErrors.subtitle && (
              <p className="text-[11px] font-semibold text-rose-600">{formErrors.subtitle}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="CTA Button Text *"
              value={formCtaText}
              onChange={(e) => setFormCtaText(e.target.value)}
              placeholder="e.g. Keep Learning →"
              error={formErrors.cta_text}
              disabled={isSaving}
            />

            <Input
              label="CTA Redirect Target Link *"
              value={formCtaLink}
              onChange={(e) => setFormCtaLink(e.target.value)}
              placeholder="e.g. /student/batches or #featured-batches"
              error={formErrors.cta_link}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Inspirational Quote Text (Optional)"
              value={formQuoteText}
              onChange={(e) => setFormQuoteText(e.target.value)}
              placeholder="e.g. Better Students\nBrighter Futures"
              disabled={isSaving}
            />

            <Input
              label="Background CSS Gradient"
              value={formBgGradient}
              onChange={(e) => setFormBgGradient(e.target.value)}
              placeholder="from-[#081326] via-[#0E2044] to-[#1B3A72]"
              disabled={isSaving}
            />
          </div>

          {/* Character Image Upload & URL */}
          <div className="space-y-2 p-3.5 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-brand-text-primary">
                Character Artwork / Banner Graphic *
              </label>
              <span className="text-[10px] text-brand-text-muted">Max 5MB (JPG, PNG, WebP)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-16 w-20 rounded-xl overflow-hidden border border-brand-border bg-slate-900 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={formCharacterImageUrl}
                  alt="Character Artwork"
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <Input
                  value={formCharacterImageUrl}
                  onChange={(e) => setFormCharacterImageUrl(e.target.value)}
                  placeholder="https://... or /avatars/doctor_female.jpg"
                  error={formErrors.character_image_url}
                  disabled={isSaving || isUploadingImage}
                  className="text-xs"
                />

                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/jpeg,image/png,image/webp,image/svg+xml,image/avif"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving || isUploadingImage}
                    className="text-xs flex items-center gap-1.5 h-8"
                  >
                    <Upload className="h-3.5 w-3.5 text-brand-orange" />
                    <span>{isUploadingImage ? "Uploading to CDN..." : "Upload New Graphic"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Display Order (Sequence)"
              type="number"
              value={formDisplayOrder}
              onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
              disabled={isSaving}
            />

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                disabled={isSaving}
                className="h-10 w-full rounded-xl border border-brand-border bg-brand-surface px-3 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="PUBLISHED">Published</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="flex items-center pt-5">
              <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-text-primary">
                <input
                  type="checkbox"
                  checked={formIsVisible}
                  onChange={(e) => setFormIsVisible(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange/20"
                />
                <span>Visible on Portal</span>
              </label>
            </div>
          </div>

          {/* Optional Schedule Bounds */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-brand-border/60">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-brand-text-primary">Starts At (Optional)</label>
              <input
                type="datetime-local"
                value={formStartsAt}
                onChange={(e) => setFormStartsAt(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-brand-text-primary">Ends At (Optional)</label>
              <input
                type="datetime-local"
                value={formEndsAt}
                onChange={(e) => setFormEndsAt(e.target.value)}
                disabled={isSaving}
                className={`h-9 w-full rounded-lg border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 ${
                  formErrors.ends_at
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-brand-border focus:ring-brand-orange/20"
                }`}
              />
              {formErrors.ends_at && (
                <p className="text-[11px] font-semibold text-rose-600">{formErrors.ends_at}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-brand-border">
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
              disabled={isSaving || isUploadingImage}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white shadow-2xs font-bold"
            >
              {isSaving ? "Saving..." : editingBanner ? "Update Slide" : "Create Slide"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Dialog */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Hero Banner Slide"
        description="Non-destructively retire this hero slide from student portal discovery."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-brand-text-muted leading-relaxed">
            Are you sure you want to archive banner <strong className="text-brand-text-primary font-bold">{archiveTarget?.title}</strong>? It will remain in the database with status <strong className="font-semibold text-slate-800">ARCHIVED</strong> and will be hidden from student carousels.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border">
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
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs"
            >
              {isArchiving ? "Archiving..." : "Confirm Archive"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Publish Confirmation Dialog */}
      <PublishConfirmationDialog
        target={publishTarget}
        isOpen={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={handlePublishConfirm}
        isProcessing={isPublishProcessing}
      />

      {/* Student Simulation Preview Modal */}
      <ContentPreviewModal
        item={previewTarget}
        isOpen={!!previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
