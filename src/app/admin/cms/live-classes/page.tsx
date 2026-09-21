"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import { CmsService } from "@/lib/services/cms.service";
import {
  CmsLiveClass,
  CmsBatch,
  ContentStatus,
  LiveClassStatus,
} from "@/types/cms.types";
import {
  Radio,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Archive,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Layers,
  Calendar,
  ExternalLink,
} from "lucide-react";

export default function LiveClassesCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  const [liveClasses, setLiveClasses] = React.useState<CmsLiveClass[]>([]);
  const [batches, setBatches] = React.useState<CmsBatch[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = React.useState<string>("ALL");
  const [liveStatusFilter, setLiveStatusFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingLiveClass, setEditingLiveClass] = React.useState<CmsLiveClass | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  // Archive Confirm Modal State
  const [archiveTarget, setArchiveTarget] = React.useState<CmsLiveClass | null>(null);
  const [isArchiving, setIsArchiving] = React.useState(false);

  // Form State
  const [formBatchId, setFormBatchId] = React.useState("");
  const [formSubject, setFormSubject] = React.useState("Mathematics");
  const [formTopic, setFormTopic] = React.useState("");
  const [formEducatorName, setFormEducatorName] = React.useState("Dr. Vandana Sharma");
  const [formEducatorAvatarUrl, setFormEducatorAvatarUrl] = React.useState("/avatars/doctor_female.jpg");
  const [formScheduledStart, setFormScheduledStart] = React.useState("");
  const [formScheduledEnd, setFormScheduledEnd] = React.useState("");
  const [formTimeDisplay, setFormTimeDisplay] = React.useState("");
  const [formLiveStatus, setFormLiveStatus] = React.useState<LiveClassStatus>("SCHEDULED");
  const [formStatusText, setFormStatusText] = React.useState("UPCOMING");
  const [formCtaText, setFormCtaText] = React.useState("Reminder");
  const [formStreamRoomUrl, setFormStreamRoomUrl] = React.useState("");
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
        const [bData, lcData] = await Promise.all([
          CmsService.getBatches(supabase),
          CmsService.getLiveClasses(supabase),
        ]);
        if (!isMounted) return;
        setBatches(bData);
        setLiveClasses(lcData);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load live classes and cohort dependencies." });
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

  // Helper to format ISO timestamp for datetime-local input
  const formatForDateTimeInput = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
      return localISOTime;
    } catch {
      return "";
    }
  };

  // Helper to automatically generate human-readable time display
  const generateTimeDisplay = (startStr: string, endStr?: string) => {
    if (!startStr) return "";
    try {
      const start = new Date(startStr);
      const startFormatted = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const dateFormatted = start.toLocaleDateString([], { month: "short", day: "numeric" });

      if (endStr) {
        const end = new Date(endStr);
        const endFormatted = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return `${dateFormatted}, ${startFormatted} - ${endFormatted}`;
      }
      return `${dateFormatted}, ${startFormatted}`;
    } catch {
      return "";
    }
  };

  const handleScheduledStartChange = (val: string) => {
    setFormScheduledStart(val);
    const autoDisplay = generateTimeDisplay(val, formScheduledEnd);
    if (autoDisplay) setFormTimeDisplay(autoDisplay);
  };

  const handleScheduledEndChange = (val: string) => {
    setFormScheduledEnd(val);
    const autoDisplay = generateTimeDisplay(formScheduledStart, val);
    if (autoDisplay) setFormTimeDisplay(autoDisplay);
  };

  const handleLiveStatusChange = (val: LiveClassStatus) => {
    setFormLiveStatus(val);
    if (val === "LIVE") {
      setFormStatusText("LIVE NOW");
      setFormCtaText("Join Live");
    } else if (val === "SCHEDULED") {
      setFormStatusText("UPCOMING");
      setFormCtaText("Reminder");
    } else if (val === "COMPLETED") {
      setFormStatusText("COMPLETED");
      setFormCtaText("View Recording");
    } else if (val === "CANCELLED") {
      setFormStatusText("CANCELLED");
      setFormCtaText("Cancelled");
    }
  };

  const handleOpenCreateModal = () => {
    setEditingLiveClass(null);
    setFormBatchId(batches[0]?.id || "");
    setFormSubject("Mathematics");
    setFormTopic("");
    setFormEducatorName("Dr. Vandana Sharma");
    setFormEducatorAvatarUrl("/avatars/doctor_female.jpg");

    const now = new Date();
    now.setHours(now.getHours() + 2);
    now.setMinutes(0);
    const defaultStart = formatForDateTimeInput(now.toISOString());

    const later = new Date(now);
    later.setHours(later.getHours() + 1);
    later.setMinutes(30);
    const defaultEnd = formatForDateTimeInput(later.toISOString());

    setFormScheduledStart(defaultStart);
    setFormScheduledEnd(defaultEnd);
    setFormTimeDisplay(generateTimeDisplay(defaultStart, defaultEnd));
    setFormLiveStatus("SCHEDULED");
    setFormStatusText("UPCOMING");
    setFormCtaText("Reminder");
    setFormStreamRoomUrl("https://meet.topveda.com/live/class-room");
    setFormDisplayOrder(liveClasses.length + 1);
    setFormIsVisible(true);
    setFormStatus("PUBLISHED");
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lc: CmsLiveClass) => {
    setEditingLiveClass(lc);
    setFormBatchId(lc.batch_id || "");
    setFormSubject(lc.subject);
    setFormTopic(lc.topic);
    setFormEducatorName(lc.educator_name);
    setFormEducatorAvatarUrl(lc.educator_avatar_url || "/avatars/doctor_female.jpg");
    setFormScheduledStart(formatForDateTimeInput(lc.scheduled_start));
    setFormScheduledEnd(formatForDateTimeInput(lc.scheduled_end));
    setFormTimeDisplay(lc.time_display);
    setFormLiveStatus(lc.live_status);
    setFormStatusText(lc.status_text);
    setFormCtaText(lc.cta_text);
    setFormStreamRoomUrl(lc.stream_room_url || "");
    setFormDisplayOrder(lc.display_order);
    setFormIsVisible(lc.is_visible);
    setFormStatus(lc.status);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formTopic.trim()) errors.topic = "Class topic title is required";
    if (!formSubject.trim()) errors.subject = "Subject is required";
    if (!formEducatorName.trim()) errors.educatorName = "Educator name is required";
    if (!formScheduledStart) errors.scheduledStart = "Scheduled start time is required";
    if (!formTimeDisplay.trim()) errors.timeDisplay = "Display time string is required";

    if (formScheduledStart && formScheduledEnd) {
      const startDate = new Date(formScheduledStart);
      const endDate = new Date(formScheduledEnd);
      if (endDate < startDate) {
        errors.scheduledEnd = "Scheduled end time must be after the start time";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveLiveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setFeedback(null);

    const payload: Partial<CmsLiveClass> = {
      ...(editingLiveClass ? { id: editingLiveClass.id } : {}),
      batch_id: formBatchId || null,
      subject: formSubject.trim(),
      topic: formTopic.trim(),
      educator_name: formEducatorName.trim(),
      educator_avatar_url: formEducatorAvatarUrl.trim() || "/avatars/doctor_female.jpg",
      scheduled_start: new Date(formScheduledStart).toISOString(),
      scheduled_end: formScheduledEnd ? new Date(formScheduledEnd).toISOString() : null,
      time_display: formTimeDisplay.trim(),
      is_live: formLiveStatus === "LIVE",
      status_text: formStatusText.trim() || "UPCOMING",
      live_status: formLiveStatus,
      cta_text: formCtaText.trim() || "Reminder",
      stream_room_url: formStreamRoomUrl.trim() || null,
      display_order: Number(formDisplayOrder) || 0,
      is_visible: formIsVisible,
      status: formStatus,
    };

    const { data, error } = await CmsService.upsertLiveClass(supabase, payload);

    setIsSaving(false);
    if (error || !data) {
      setFeedback({ type: "error", message: error?.message || "Failed to save live class." });
    } else {
      setFeedback({
        type: "success",
        message: editingLiveClass ? "Live class session updated successfully." : "Live class session scheduled successfully.",
      });
      setIsModalOpen(false);
      handleManualRefresh();
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    const { error } = await CmsService.archiveContent(supabase, "cms_live_classes", archiveTarget.id);
    setIsArchiving(false);
    setArchiveTarget(null);

    if (error) {
      setFeedback({ type: "error", message: error.message || "Failed to archive live class." });
    } else {
      setFeedback({ type: "success", message: `Live class "${archiveTarget.topic}" archived successfully.` });
      handleManualRefresh();
    }
  };

  // Batch Map for quick title lookup
  const batchMap = React.useMemo(() => {
    const map = new Map<string, CmsBatch>();
    for (const b of batches) {
      map.set(b.id, b);
    }
    return map;
  }, [batches]);

  // Filtered Live Classes
  const filteredLiveClasses = React.useMemo(() => {
    return liveClasses.filter((lc) => {
      const matchesSearch =
        searchQuery === "" ||
        lc.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lc.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lc.educator_name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesBatch = selectedBatchFilter === "ALL" || lc.batch_id === selectedBatchFilter;
      const matchesLiveStatus = liveStatusFilter === "ALL" || lc.live_status === liveStatusFilter;
      const matchesStatus = statusFilter === "ALL" || lc.status === statusFilter;

      return matchesSearch && matchesBatch && matchesLiveStatus && matchesStatus;
    });
  }, [liveClasses, searchQuery, selectedBatchFilter, liveStatusFilter, statusFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="peach" size="sm" className="font-bold text-[10px] uppercase tracking-wider">
              REAL-TIME BROADCASTS
            </Badge>
            <Badge variant="outline" size="sm" className="text-[10px] font-mono text-brand-text-muted">
              cms_live_classes
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight flex items-center gap-2.5">
            <Radio className="h-7 w-7 text-brand-orange" />
            <span>Live Interactive Classes</span>
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted">
            Schedule interactive live classes, assign educator hosts, configure stream rooms, and govern broadcast status.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isLoading} className="text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin text-brand-orange" : ""}`} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="text-xs shadow-2xs">
            <Plus className="h-4 w-4 mr-1.5" />
            Schedule Live Class
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search by topic, subject, or educator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <select
              aria-label="Filter by batch"
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Cohorts / Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.board_label})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter by live status"
              value={liveStatusFilter}
              onChange={(e) => setLiveStatusFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Broadcast States</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="LIVE">Live Now</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <select
              aria-label="Filter by publication status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full text-xs rounded-lg border border-brand-border bg-brand-surface px-3 py-1 font-medium text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            >
              <option value="ALL">All Content Statuses</option>
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
                <th className="py-3 px-4">Live Session / Topic</th>
                <th className="py-3 px-4">Educator & Cohort</th>
                <th className="py-3 px-4">Schedule & Timing</th>
                <th className="py-3 px-4 text-center">Broadcast State</th>
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
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-orange" />
                    Loading live class schedules...
                  </td>
                </tr>
              ) : filteredLiveClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-brand-text-muted">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="h-10 w-10 mx-auto rounded-full bg-brand-bg-peach flex items-center justify-center text-brand-orange">
                        <Radio className="h-5 w-5" />
                      </div>
                      <p className="font-bold text-brand-text-primary">No live classes found</p>
                      <p className="text-xs text-brand-text-muted">
                        {searchQuery ? "Try refining your search filter." : "Click '+ Schedule Live Class' to create a session."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLiveClasses.map((lc) => {
                  const linkedBatch = lc.batch_id ? batchMap.get(lc.batch_id) : null;

                  return (
                    <tr key={lc.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-brand-text-primary max-w-sm">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-brand-orange">{lc.subject}</span>
                            <span>•</span>
                            <span className="font-extrabold text-brand-text-primary line-clamp-1">{lc.topic}</span>
                          </div>
                          {lc.stream_room_url && (
                            <a
                              href={lc.stream_room_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 truncate"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="truncate">{lc.stream_room_url}</span>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-semibold text-brand-text-primary">
                            <User className="h-3.5 w-3.5 text-brand-orange" />
                            <span>{lc.educator_name}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-brand-text-muted">
                            <Layers className="h-3 w-3" />
                            <span>{linkedBatch ? linkedBatch.title : "Open Broadcast"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-brand-text-primary">
                            <Calendar className="h-3.5 w-3.5 text-brand-orange" />
                            <span>{lc.time_display}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-brand-text-muted">
                            <Clock className="h-3 w-3" />
                            <span>CTA: {lc.cta_text}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {lc.live_status === "LIVE" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 animate-pulse">
                            <Radio className="h-3 w-3" /> LIVE NOW
                          </span>
                        ) : lc.live_status === "SCHEDULED" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                            <Clock className="h-3 w-3" /> Scheduled
                          </span>
                        ) : lc.live_status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-brand-text-muted">{lc.display_order}</td>
                      <td className="py-3.5 px-4 text-center">
                        {lc.is_visible ? (
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
                            lc.status === "PUBLISHED"
                              ? "success"
                              : lc.status === "DRAFT"
                              ? "neutral"
                              : "peach"
                          }
                          size="sm"
                          className="font-bold text-[10px]"
                        >
                          {lc.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(lc)}
                            className="h-7 w-7 text-brand-text-muted hover:text-brand-orange"
                            title="Edit Live Class"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {lc.status !== "ARCHIVED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setArchiveTarget(lc)}
                              className="h-7 w-7 text-brand-text-muted hover:text-red-600"
                              title="Archive Live Class"
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

      {/* 4. Create / Edit Live Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingLiveClass ? "Edit Live Class Session" : "Schedule Live Class Session"}
        description="Configure class topic, scheduled start/end timing, educator assignment, and broadcast status."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveLiveClass} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Input
                label="Class Topic / Title *"
                placeholder="e.g. Masterclass: Vectors & 3D Geometry in One-Shot"
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                error={formErrors.topic}
                disabled={isSaving}
              />
            </div>

            <Input
              label="Academic Subject *"
              placeholder="e.g. Mathematics"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              error={formErrors.subject}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-brand-bg-warm/60 border border-brand-border">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Target Cohort / Batch (Optional)</label>
              <select
                aria-label="Select batch"
                value={formBatchId}
                onChange={(e) => setFormBatchId(e.target.value)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="">All Batches (Public Student Broadcast)</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} ({b.board_label})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-brand-text-primary">Broadcast Status Lifecycle *</label>
              <select
                aria-label="Broadcast lifecycle status"
                value={formLiveStatus}
                onChange={(e) => handleLiveStatusChange(e.target.value as LiveClassStatus)}
                disabled={isSaving}
                className="h-9 w-full rounded-lg border border-brand-border bg-brand-surface px-2.5 py-1 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              >
                <option value="SCHEDULED">SCHEDULED (Upcoming)</option>
                <option value="LIVE">LIVE (Broadcasting Now)</option>
                <option value="COMPLETED">COMPLETED (Recorded/Concluded)</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Educator Name *"
              placeholder="e.g. Dr. Vandana Sharma"
              value={formEducatorName}
              onChange={(e) => setFormEducatorName(e.target.value)}
              error={formErrors.educatorName}
              disabled={isSaving}
            />

            <Input
              label="Educator Avatar URL"
              placeholder="/avatars/doctor_female.jpg"
              value={formEducatorAvatarUrl}
              onChange={(e) => setFormEducatorAvatarUrl(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Scheduled Start *</label>
              <input
                type="datetime-local"
                value={formScheduledStart}
                onChange={(e) => handleScheduledStartChange(e.target.value)}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
              {formErrors.scheduledStart && <p className="text-[11px] text-red-500 font-medium">{formErrors.scheduledStart}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Scheduled End (Optional)</label>
              <input
                type="datetime-local"
                value={formScheduledEnd}
                onChange={(e) => handleScheduledEndChange(e.target.value)}
                disabled={isSaving}
                className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-xs font-semibold text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
              />
              {formErrors.scheduledEnd && <p className="text-[11px] text-red-500 font-medium">{formErrors.scheduledEnd}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Human-Friendly Time Display *"
              placeholder="e.g. Today, 6:00 PM - 7:30 PM"
              value={formTimeDisplay}
              onChange={(e) => setFormTimeDisplay(e.target.value)}
              error={formErrors.timeDisplay}
              disabled={isSaving}
            />

            <Input
              label="CTA Button Label"
              placeholder="e.g. Join Live or Reminder"
              value={formCtaText}
              onChange={(e) => setFormCtaText(e.target.value)}
              disabled={isSaving}
            />
          </div>

          <Input
            label="Stream Broadcast Room URL / Join Link"
            placeholder="e.g. https://meet.topveda.com/live/room-123"
            value={formStreamRoomUrl}
            onChange={(e) => setFormStreamRoomUrl(e.target.value)}
            disabled={isSaving}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-brand-text-primary">Visibility</label>
              <div className="flex items-center gap-2 h-10">
                <input
                  type="checkbox"
                  id="formIsVisibleLive"
                  checked={formIsVisible}
                  onChange={(e) => setFormIsVisible(e.target.checked)}
                  disabled={isSaving}
                  className="h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                />
                <label htmlFor="formIsVisibleLive" className="text-xs font-semibold text-brand-text-primary cursor-pointer">
                  Student Portal Visible
                </label>
              </div>
            </div>
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
              {isSaving ? "Saving..." : editingLiveClass ? "Update Live Class" : "Schedule Live Class"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Archive Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => !isArchiving && setArchiveTarget(null)}
        title="Archive Live Class?"
        description="Are you sure you want to archive this live class session? It will be marked cancelled and hidden from the student live schedule."
        maxWidth="sm"
      >
        <div className="space-y-4 pt-2">
          {archiveTarget && (
            <div className="p-3 rounded-xl bg-brand-bg-peach/50 border border-brand-orange-border/60 text-xs space-y-1">
              <p className="font-bold text-brand-text-primary">{archiveTarget.topic}</p>
              <p className="text-brand-text-muted">Educator: {archiveTarget.educator_name} • {archiveTarget.time_display}</p>
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
