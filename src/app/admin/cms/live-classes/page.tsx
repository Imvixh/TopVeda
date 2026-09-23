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
import { SuperAdminLiveControlData, LiveControlSessionItem } from "@/types/teacher.types";
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
  ShieldAlert,
  Loader2,
  Users,
  Video,
  Info,
  Download,
} from "lucide-react";

export default function LiveClassesCmsPage() {
  const supabase = React.useMemo(() => createClient(), []);

  // View Mode: "CONTROL_ROOM" | "ALL_CLASSES" | "TEACHER_STATS"
  const [viewMode, setViewMode] = React.useState<"CONTROL_ROOM" | "ALL_CLASSES" | "TEACHER_STATS">("CONTROL_ROOM");

  const [liveControlData, setLiveControlData] = React.useState<SuperAdminLiveControlData | null>(null);
  const [liveClasses, setLiveClasses] = React.useState<CmsLiveClass[]>([]);
  const [batches, setBatches] = React.useState<CmsBatch[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [liveStatusFilter, setLiveStatusFilter] = React.useState<string>("ALL");
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Terminate Modal State
  const [terminateTarget, setTerminateTarget] = React.useState<CmsLiveClass | null>(null);
  const [terminationReason, setTerminationReason] = React.useState("");
  const [isTerminating, setIsTerminating] = React.useState(false);
  const [terminateError, setTerminateError] = React.useState("");

  // Inspect Live Class Details Modal
  const [inspectTarget, setInspectTarget] = React.useState<CmsLiveClass | null>(null);

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingLiveClass, setEditingLiveClass] = React.useState<CmsLiveClass | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

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

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [controlData, bData, lcData] = await Promise.all([
          CmsService.getSuperAdminLiveControlData(supabase),
          CmsService.getBatches(supabase),
          CmsService.getLiveClasses(supabase),
        ]);
        if (!isMounted) return;
        setLiveControlData(controlData);
        setBatches(bData);
        setLiveClasses(lcData);
      } catch {
        if (!isMounted) return;
        setFeedback({ type: "error", message: "Failed to load Live Control Center data." });
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

  // Handle Emergency Terminate Live Class
  const handleConfirmTerminate = async () => {
    if (!terminateTarget) return;

    if (!terminationReason.trim() || terminationReason.trim().length < 5) {
      setTerminateError("A valid termination reason (minimum 5 characters) is required for admin audit logs.");
      return;
    }

    try {
      setIsTerminating(true);
      setTerminateError("");
      setFeedback(null);

      const res = await fetch("/api/admin/live/terminate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveClassId: terminateTarget.id,
          terminationReason: terminationReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setTerminateError(data.error || "Failed to terminate live class.");
      } else {
        setFeedback({
          type: "success",
          message: `Live class "${terminateTarget.topic}" has been terminated and access severed. Teacher notified.`,
        });
        setTerminateTarget(null);
        setTerminationReason("");
        handleManualRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setTerminateError(error.message);
    } finally {
      setIsTerminating(false);
    }
  };

  const filteredAllClasses = React.useMemo(() => {
    return liveClasses.filter((lc) => {
      const matchesSearch =
        lc.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lc.educator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lc.subject.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (liveStatusFilter === "ALL") return true;
      return lc.live_status === liveStatusFilter;
    });
  }, [liveClasses, searchQuery, liveStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight flex items-center gap-2">
              <Radio className="h-6 w-6 text-brand-orange animate-pulse" />
              Live Control Center
            </h1>
            <Badge variant="peach" size="sm" className="text-[10px] font-bold uppercase">
              Super Admin Control
            </Badge>
          </div>
          <p className="text-xs text-brand-text-muted mt-0.5">
            Monitor real-time broadcasts, inspect stream health, observe active classes, and execute emergency terminations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            className="text-xs text-brand-text-muted hover:text-brand-charcoal"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-brand-bg-warm/80 p-1 rounded-2xl border border-brand-border/80 text-xs">
            <button
              onClick={() => setViewMode("CONTROL_ROOM")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                viewMode === "CONTROL_ROOM"
                  ? "bg-brand-charcoal text-white shadow-xs"
                  : "text-brand-text-muted hover:text-brand-charcoal"
              }`}
            >
              Live Control
            </button>
            <button
              onClick={() => setViewMode("ALL_CLASSES")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                viewMode === "ALL_CLASSES"
                  ? "bg-brand-charcoal text-white shadow-xs"
                  : "text-brand-text-muted hover:text-brand-charcoal"
              }`}
            >
              All Classes ({liveClasses.length})
            </button>
            <button
              onClick={() => setViewMode("TEACHER_STATS")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                viewMode === "TEACHER_STATS"
                  ? "bg-brand-charcoal text-white shadow-xs"
                  : "text-brand-text-muted hover:text-brand-charcoal"
              }`}
            >
              Teacher Stats
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Metric Indicators Strip */}
      {liveControlData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wide flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              Live Now
            </span>
            <p className="text-2xl font-black text-red-600">{liveControlData.liveNow.length}</p>
            <span className="text-[10px] text-brand-text-subtle font-medium">Active Broadcasts</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-brand-orange uppercase tracking-wide">Upcoming</span>
            <p className="text-2xl font-black text-brand-charcoal">{liveControlData.upcoming.length}</p>
            <span className="text-[10px] text-brand-text-subtle font-medium">Scheduled Sessions</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Completed</span>
            <p className="text-2xl font-black text-emerald-600">{liveControlData.completed.length}</p>
            <span className="text-[10px] text-brand-text-subtle font-medium">Concluded Normally</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">Terminated</span>
            <p className="text-2xl font-black text-rose-600">{liveControlData.terminated.length}</p>
            <span className="text-[10px] text-brand-text-subtle font-medium">Emergency Severed</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Processing</span>
            <p className="text-2xl font-black text-amber-600">{liveControlData.recordingsProcessing.length}</p>
            <span className="text-[10px] text-brand-text-subtle font-medium">Recording Encoding</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wide">Review Queue</span>
            <p className="text-2xl font-black text-sky-600">{liveControlData.recordingsAwaitingReview.length}</p>
            <span className="text-[10px] text-brand-text-subtle font-medium">Awaiting Publishing</span>
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* VIEW MODE 1: CONTROL ROOM (Live Now & Critical Oversight) */}
      {viewMode === "CONTROL_ROOM" && liveControlData && (
        <div className="space-y-6">
          {/* Active Broadcasts Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-brand-charcoal flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                Live Broadcasts in Progress ({liveControlData.liveNow.length})
              </h2>
            </div>

            {liveControlData.liveNow.length === 0 ? (
              <Card className="p-8 text-center bg-white border border-brand-border/80 rounded-2xl space-y-2">
                <Radio className="h-8 w-8 text-brand-text-muted mx-auto" />
                <p className="text-xs font-bold text-brand-charcoal">No live classes are currently in session.</p>
                <p className="text-[11px] text-brand-text-muted">
                  When teachers start a live class, it will automatically appear here with real-time stream status.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveControlData.liveNow.map((item) => (
                  <Card
                    key={item.id}
                    className="p-5 rounded-2xl bg-white border-2 border-red-200 shadow-md space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          BROADCASTING LIVE
                        </span>
                        <h3 className="text-base font-black text-brand-charcoal">{item.topic}</h3>
                        <p className="text-xs text-brand-orange font-bold">{item.subject}</p>
                      </div>

                      <div className="text-right space-y-0.5">
                        <p className="text-xs font-bold text-brand-charcoal">{item.educator_name}</p>
                        <p className="text-[10px] text-brand-text-muted">{item.teacherEmail || "Educator"}</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-brand-bg-warm/80 border border-brand-border/60 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-brand-charcoal font-semibold">
                        <Clock className="h-3.5 w-3.5 text-brand-orange" />
                        <span>Started at: {item.started_at ? new Date(item.started_at).toLocaleTimeString() : item.time_display}</span>
                      </div>
                      <Badge variant="outline" size="sm" className="bg-white text-emerald-700 border-emerald-200 text-[10px] font-bold">
                        Stream Active
                      </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-brand-border/60">
                      <Button
                        size="sm"
                        onClick={() => window.open(item.stream_room_url || `/student/live/${item.id}`, "_blank")}
                        className="flex-1 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs shadow-xs"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        Join Live (Observer)
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setInspectTarget(item)}
                        className="bg-white text-brand-charcoal text-xs font-bold"
                      >
                        Details
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setTerminateTarget(item);
                          setTerminationReason("");
                          setTerminateError("");
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                      >
                        <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                        Terminate Live
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Live Sessions Section */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-brand-charcoal flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-orange" />
              Scheduled Upcoming Live Classes ({liveControlData.upcoming.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveControlData.upcoming.map((item) => (
                <Card key={item.id} className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-orange">{item.subject}</span>
                    <Badge variant="peach" size="sm" className="text-[10px] font-bold uppercase">
                      SCHEDULED
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-charcoal line-clamp-1">{item.topic}</h4>
                    <p className="text-[11px] text-brand-text-muted mt-0.5">Teacher: {item.educator_name}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-brand-bg-warm/60 border border-brand-border/40 text-[11px] flex items-center justify-between text-brand-charcoal">
                    <span>{new Date(item.scheduled_start).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                    <span className="font-bold">{new Date(item.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setInspectTarget(item)}
                      className="text-xs font-bold text-brand-orange hover:text-brand-orange-hover"
                    >
                      Inspect Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL CLASSES TABLE CRUD */}
      {viewMode === "ALL_CLASSES" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-brand-border/80 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {(["ALL", "SCHEDULED", "LIVE", "COMPLETED", "TERMINATED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setLiveStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    liveStatusFilter === s
                      ? "bg-brand-charcoal text-white shadow-xs"
                      : "bg-brand-bg-warm text-brand-text-muted hover:text-brand-charcoal"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search classes or teachers..."
                className="pl-8 h-8 text-xs rounded-xl bg-brand-bg-warm/50 border-brand-border/80"
              />
            </div>
          </div>

          {/* Table */}
          <Card className="rounded-2xl border border-brand-border/80 overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-brand-border/80 bg-brand-bg-warm/80 text-brand-text-muted font-bold">
                    <th className="py-3 px-4">Topic / Title</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Teacher</th>
                    <th className="py-3 px-4">Scheduled Start</th>
                    <th className="py-3 px-4">Live Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border/40">
                  {filteredAllClasses.map((lc) => (
                    <tr key={lc.id} className="hover:bg-brand-bg-warm/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-brand-charcoal">{lc.topic}</td>
                      <td className="py-3 px-4 text-brand-orange font-semibold">{lc.subject}</td>
                      <td className="py-3 px-4 text-brand-charcoal">{lc.educator_name}</td>
                      <td className="py-3 px-4 text-brand-text-muted">
                        {new Date(lc.scheduled_start).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {lc.live_status === "LIVE" && (
                          <Badge variant="primary" size="sm" className="bg-red-500 text-white font-bold animate-pulse">
                            LIVE NOW
                          </Badge>
                        )}
                        {lc.live_status === "SCHEDULED" && (
                          <Badge variant="peach" size="sm" className="font-bold">
                            SCHEDULED
                          </Badge>
                        )}
                        {lc.live_status === "COMPLETED" && (
                          <Badge variant="outline" size="sm" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                            COMPLETED
                          </Badge>
                        )}
                        {lc.live_status === "TERMINATED" && (
                          <Badge variant="outline" size="sm" className="bg-rose-50 text-rose-700 border-rose-200 font-bold">
                            TERMINATED
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setInspectTarget(lc)}
                          className="text-xs font-bold text-brand-orange hover:text-brand-orange-hover"
                        >
                          Inspect
                        </Button>
                        {lc.live_status === "LIVE" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setTerminateTarget(lc);
                              setTerminationReason("");
                              setTerminateError("");
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                          >
                            Terminate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW MODE 3: TEACHER STATISTICS OVERVIEW */}
      {viewMode === "TEACHER_STATS" && liveControlData && (
        <Card className="rounded-2xl border border-brand-border/80 overflow-hidden bg-white shadow-2xs">
          <div className="p-4 border-b border-brand-border/80 bg-brand-bg-warm/60">
            <h3 className="text-sm font-black text-brand-charcoal">Teacher Live & Recorded Lecture Breakdown</h3>
            <p className="text-xs text-brand-text-muted">Real-time aggregate data queried directly from database.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-brand-border/80 bg-brand-bg-warm/40 text-brand-text-muted font-bold">
                  <th className="py-3 px-4">Educator Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-center">Live Conducted</th>
                  <th className="py-3 px-4 text-center">Upcoming</th>
                  <th className="py-3 px-4 text-center">Terminated</th>
                  <th className="py-3 px-4 text-center">Lectures Submitted</th>
                  <th className="py-3 px-4 text-center">Pending Review</th>
                  <th className="py-3 px-4 text-center">Approved</th>
                  <th className="py-3 px-4 text-center">Revisions Req.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/40">
                {liveControlData.teacherStats.map((ts) => (
                  <tr key={ts.teacherId} className="hover:bg-brand-bg-warm/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-brand-charcoal">{ts.teacherName}</td>
                    <td className="py-3 px-4 text-brand-text-muted">{ts.teacherEmail}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">{ts.liveClassesConducted}</td>
                    <td className="py-3 px-4 text-center font-bold text-brand-orange">{ts.upcomingLiveClasses}</td>
                    <td className="py-3 px-4 text-center font-bold text-rose-600">{ts.terminatedLiveClasses}</td>
                    <td className="py-3 px-4 text-center font-bold text-brand-charcoal">{ts.recordedLecturesSubmitted}</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-600">{ts.pendingReviewLectures}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-600">{ts.approvedLectures}</td>
                    <td className="py-3 px-4 text-center font-bold text-rose-600">{ts.revisionRequestedLectures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* EMERGENCY TERMINATE LIVE CLASS MODAL */}
      <Modal
        isOpen={!!terminateTarget}
        onClose={() => setTerminateTarget(null)}
        title="Emergency Live Class Termination"
        description="Severs stream access immediately for the educator and all participating students."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-1.5">
            <p className="font-bold text-rose-900 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              Administrative Intervention Warning
            </p>
            <p className="text-rose-800 leading-relaxed">
              Terminating will immediately end the session in the streaming provider, disconnect all participants, change status to <span className="font-bold text-rose-900">TERMINATED</span>, and record an audit log entry.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">
              Termination Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={terminationReason}
              onChange={(e) => setTerminationReason(e.target.value)}
              placeholder="e.g. Inappropriate content, technical broadcast malfunction, or scheduling conflict..."
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-brand-border/80 text-xs text-brand-charcoal font-medium resize-none focus:ring-2 focus:ring-rose-500/30"
            />
            {terminateError && <p className="text-[11px] text-red-500">{terminateError}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTerminateTarget(null)}
              disabled={isTerminating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmTerminate}
              disabled={isTerminating}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
            >
              {isTerminating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Confirm Terminate
            </Button>
          </div>
        </div>
      </Modal>

      {/* INSPECT DETAILS MODAL */}
      <Modal
        isOpen={!!inspectTarget}
        onClose={() => setInspectTarget(null)}
        title="Live Class Audit Details"
        description="Comprehensive technical and schedule metadata."
        maxWidth="lg"
      >
        {inspectTarget && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-brand-bg-warm/70 border border-brand-border/60 space-y-1">
                <span className="text-brand-text-muted">Topic</span>
                <p className="font-bold text-brand-charcoal text-sm">{inspectTarget.topic}</p>
              </div>
              <div className="p-3 rounded-xl bg-brand-bg-warm/70 border border-brand-border/60 space-y-1">
                <span className="text-brand-text-muted">Subject & Educator</span>
                <p className="font-bold text-brand-charcoal text-sm">{inspectTarget.subject} • {inspectTarget.educator_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2.5 rounded-xl bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-text-muted">Live Status</span>
                <p className="font-bold text-brand-charcoal uppercase">{inspectTarget.live_status}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-text-muted">Recording Status</span>
                <p className="font-bold text-brand-charcoal uppercase">{inspectTarget.recording_status || "NONE"}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-text-muted">Provider</span>
                <p className="font-bold text-brand-charcoal uppercase">{inspectTarget.stream_provider || "Cloudflare"}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-brand-border/60">
                <span className="text-[10px] text-brand-text-muted">Visibility</span>
                <p className="font-bold text-brand-charcoal uppercase">{inspectTarget.is_visible ? "Visible" : "Hidden"}</p>
              </div>
            </div>

            {inspectTarget.termination_reason && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  Termination Record:
                </p>
                <p className="text-[11px] text-rose-700 italic">&ldquo;{inspectTarget.termination_reason}&rdquo;</p>
                <p className="text-[10px] text-rose-600 pt-0.5">Terminated At: {inspectTarget.terminated_at ? new Date(inspectTarget.terminated_at).toLocaleString() : "N/A"}</p>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-brand-border/60">
              <Button variant="outline" size="sm" onClick={() => setInspectTarget(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
