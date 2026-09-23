"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { CmsLiveClass, CmsBoard, CmsClassLevel, CmsSubject, CmsCourse, CmsChapter } from "@/types/cms.types";
import {
  Radio,
  Plus,
  Search,
  Clock,
  Video,
  Play,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Loader2,
  Eye,
  Info,
  ShieldAlert,
  XCircle,
  Edit3,
} from "lucide-react";

interface LiveClassesTabProps {
  teacherId: string;
  teacherName: string;
  liveClasses: CmsLiveClass[];
  boards: CmsBoard[];
  classes: CmsClassLevel[];
  subjects: CmsSubject[];
  courses: CmsCourse[];
  chapters: CmsChapter[];
  isSuperAdmin?: boolean;
  onRefresh: () => void;
  setFeedback: (fb: { type: "success" | "error" | "info"; message: string } | null) => void;
}

export function LiveClassesTab({
  teacherId,
  teacherName,
  liveClasses,
  boards,
  classes,
  subjects,
  courses,
  chapters,
  isSuperAdmin = false,
  onRefresh,
  setFeedback,
}: LiveClassesTabProps) {
  const [filter, setFilter] = React.useState<"ALL" | "TODAY" | "UPCOMING" | "LIVE" | "COMPLETED" | "TERMINATED" | "CANCELLED">("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Create Modal State (No duration, no course mapping)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [createTopic, setCreateTopic] = React.useState("");
  const [createSubject, setCreateSubject] = React.useState("Mathematics");
  const [createDescription, setCreateDescription] = React.useState("");
  const [createDate, setCreateDate] = React.useState("");
  const [createStartTime, setCreateStartTime] = React.useState("10:00");
  const [createBoardId, setCreateBoardId] = React.useState("");
  const [createClassId, setCreateClassId] = React.useState("");
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = React.useState<CmsLiveClass | null>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleStartTime, setRescheduleStartTime] = React.useState("");
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const [rescheduleError, setRescheduleError] = React.useState("");

  // Cancel Modal State
  const [cancelTarget, setCancelTarget] = React.useState<CmsLiveClass | null>(null);
  const [cancelReason, setCancelReason] = React.useState("");
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Super Admin Terminate Live Modal State
  const [terminateTarget, setTerminateTarget] = React.useState<CmsLiveClass | null>(null);
  const [terminationReason, setTerminationReason] = React.useState("");
  const [isTerminating, setIsTerminating] = React.useState(false);
  const [terminateError, setTerminateError] = React.useState("");

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Preview Recording Modal State
  const [previewRecordingUrl, setPreviewRecordingUrl] = React.useState<string | null>(null);

  // End Class Confirmation Modal (Teacher only)
  const [endTarget, setEndTarget] = React.useState<CmsLiveClass | null>(null);
  const [isEnding, setIsEnding] = React.useState(false);

  // Current timestamp tick for real-time countdown / early access calculations
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000); // 10s tick
    return () => clearInterval(timer);
  }, []);

  // Filter logic
  const filteredClasses = React.useMemo(() => {
    return liveClasses.filter((lc) => {
      const matchesSearch =
        lc.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lc.subject.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const lcDate = new Date(lc.scheduled_start);
      const isToday = new Date().toDateString() === lcDate.toDateString();

      if (filter === "TODAY") return isToday;
      if (filter === "UPCOMING") return lc.live_status === "SCHEDULED";
      if (filter === "LIVE") return lc.live_status === "LIVE";
      if (filter === "COMPLETED") return lc.live_status === "COMPLETED";
      if (filter === "TERMINATED") return lc.live_status === "TERMINATED";
      if (filter === "CANCELLED") return lc.live_status === "CANCELLED";
      return true;
    });
  }, [liveClasses, filter, searchQuery]);

  // Handle Create Live Class (No duration input, no course mapping)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!createTopic.trim()) errors.topic = "Lecture title / topic is required.";
    if (!createDate) errors.date = "Date is required.";
    if (!createStartTime) errors.startTime = "Start time is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsCreating(true);
      setFeedback(null);

      const startDateTimeStr = `${createDate}T${createStartTime}:00`;
      const startDateTime = new Date(startDateTimeStr);
      // Backend collision detection default window (start + 60 min)
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

      const payload = {
        topic: createTopic.trim(),
        subject: createSubject,
        description: createDescription.trim() || undefined,
        scheduledStart: startDateTime.toISOString(),
        scheduledEnd: endDateTime.toISOString(),
        boardId: createBoardId || null,
        classId: createClassId || null,
      };

      const res = await fetch("/api/teacher/live/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFeedback({
          type: "error",
          message: data.error || "Failed to schedule live class.",
        });
      } else {
        setFeedback({
          type: "success",
          message: `Live Class "${createTopic}" scheduled successfully. Appears immediately for students according to scheduled time.`,
        });
        setIsCreateOpen(false);
        // Reset form
        setCreateTopic("");
        setCreateDescription("");
        setCreateDate("");
        onRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Reschedule Live Class
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleError("");

    if (!rescheduleTarget || !rescheduleDate || !rescheduleStartTime) {
      setRescheduleError("Please select both a new date and start time.");
      return;
    }

    try {
      setIsRescheduling(true);
      const startDateTimeStr = `${rescheduleDate}T${rescheduleStartTime}:00`;
      const startDateTime = new Date(startDateTimeStr);

      const res = await fetch("/api/teacher/live/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveClassId: rescheduleTarget.id,
          scheduledStart: startDateTime.toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setRescheduleError(data.error || "Failed to reschedule live class.");
      } else {
        setFeedback({
          type: "success",
          message: `Live Class "${rescheduleTarget.topic}" rescheduled successfully.`,
        });
        setRescheduleTarget(null);
        onRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setRescheduleError(error.message);
    } finally {
      setIsRescheduling(false);
    }
  };

  // Handle Cancel Live Class
  const handleCancelSubmit = async () => {
    if (!cancelTarget) return;

    try {
      setIsCancelling(true);
      setFeedback(null);

      const res = await fetch("/api/teacher/live/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          liveClassId: cancelTarget.id,
          reason: cancelReason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFeedback({ type: "error", message: data.error || "Failed to cancel live class." });
      } else {
        setFeedback({
          type: "success",
          message: `Live Class "${cancelTarget.topic}" has been cancelled.`,
        });
        setCancelTarget(null);
        setCancelReason("");
        onRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle Super Admin Terminate Live Session
  const handleTerminateSubmit = async () => {
    if (!terminateTarget) return;
    if (!terminationReason.trim() || terminationReason.trim().length < 5) {
      setTerminateError("A valid termination reason (minimum 5 characters) is required for audit logs.");
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
          message: `Live class "${terminateTarget.topic}" has been terminated and access severed.`,
        });
        setTerminateTarget(null);
        setTerminationReason("");
        onRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setTerminateError(error.message || "Failed to terminate live class.");
    } finally {
      setIsTerminating(false);
    }
  };

  // Handle Start Live Session (Teacher Early Access / Live)
  const handleStartLive = async (lc: CmsLiveClass) => {
    try {
      setActionLoadingId(lc.id);
      setFeedback(null);

      const res = await fetch("/api/teacher/live/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId: lc.id }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFeedback({ type: "error", message: data.error || "Failed to start live session." });
      } else {
        setFeedback({ type: "success", message: `Live class session started!` });
        onRefresh();
        if (data.streamRoomUrl) {
          window.open(data.streamRoomUrl, "_blank");
        }
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Confirm End Live Class
  const handleConfirmEnd = async () => {
    if (!endTarget) return;

    try {
      setIsEnding(true);
      setFeedback(null);

      const res = await fetch("/api/teacher/live/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveClassId: endTarget.id }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setFeedback({ type: "error", message: data.error || "Failed to conclude live class." });
      } else {
        setFeedback({
          type: "success",
          message: `Live class ended normally. Recording draft has been generated in your Recorded Lectures tab.`,
        });
        setEndTarget(null);
        onRefresh();
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Quick Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-brand-charcoal tracking-tight flex items-center gap-2">
            <Radio className="h-5 w-5 text-brand-orange animate-pulse" />
            Live Classes Workspace
          </h2>
          <p className="text-xs text-brand-text-muted">
            Directly schedule interactive sessions, enter preparation rooms 10 minutes early, and broadcast live.
          </p>
        </div>

        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs gap-2 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Schedule Live Class
        </Button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-brand-border/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(["ALL", "TODAY", "UPCOMING", "LIVE", "COMPLETED", "TERMINATED", "CANCELLED"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === tab
                  ? "bg-brand-charcoal text-white shadow-xs"
                  : "bg-brand-bg-warm/60 text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-bg-warm"
              }`}
            >
              {tab === "ALL"
                ? "All Classes"
                : tab === "TODAY"
                ? "Today"
                : tab === "UPCOMING"
                ? "Upcoming"
                : tab === "LIVE"
                ? "Live Now"
                : tab === "COMPLETED"
                ? "Completed"
                : tab === "TERMINATED"
                ? "Terminated"
                : "Cancelled"}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-text-subtle" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic or subject..."
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Live Classes Grid */}
      {filteredClasses.length === 0 ? (
        <Card className="p-12 text-center bg-white/60 border-dashed border-brand-border space-y-3 rounded-3xl">
          <div className="h-12 w-12 rounded-2xl bg-brand-orange/10 text-brand-orange flex items-center justify-center mx-auto">
            <Radio className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-brand-charcoal">No live classes found</h3>
          <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
            {searchQuery
              ? `No live sessions matching "${searchQuery}".`
              : filter !== "ALL"
              ? `No sessions currently matching filter "${filter}".`
              : "You haven't scheduled any live sessions yet. Click Schedule Live Class above to create one."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredClasses.map((lc) => {
            const scheduledStartMs = new Date(lc.scheduled_start).getTime();
            const earlyAccessOpensMs = scheduledStartMs - 10 * 60 * 1000; // 10 minutes prior
            const isWithinEarlyAccess = currentTime >= earlyAccessOpensMs;
            const isLive = lc.live_status === "LIVE";
            const isScheduled = lc.live_status === "SCHEDULED";
            const isCompleted = lc.live_status === "COMPLETED";
            const isTerminated = lc.live_status === "TERMINATED";
            const isCancelled = lc.live_status === "CANCELLED";

            const earlyAccessOpensAt = new Date(earlyAccessOpensMs).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card
                key={lc.id}
                className="p-5 bg-white border border-brand-border/80 hover:border-brand-orange/40 transition-all rounded-3xl shadow-2xs flex flex-col justify-between relative overflow-hidden group"
              >
                {/* Top Status & Subject Row */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" size="sm" className="bg-brand-bg-warm/70 text-brand-charcoal font-bold text-[10px] uppercase">
                      {lc.subject}
                    </Badge>

                    {isLive && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black tracking-wide uppercase shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        BROADCASTING LIVE
                      </span>
                    )}

                    {isScheduled && (
                      <Badge variant="peach" size="sm" className="text-[10px] font-bold">
                        Scheduled
                      </Badge>
                    )}

                    {isCompleted && (
                      <Badge variant="success" size="sm" className="text-[10px] font-bold">
                        Concluded
                      </Badge>
                    )}

                    {isTerminated && (
                      <Badge variant="outline" size="sm" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                        Terminated by Admin
                      </Badge>
                    )}

                    {isCancelled && (
                      <Badge variant="outline" size="sm" className="bg-gray-100 text-gray-700 border-gray-200 text-[10px] font-bold">
                        Cancelled
                      </Badge>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm font-bold text-brand-charcoal group-hover:text-brand-orange transition-colors line-clamp-2">
                      {lc.topic}
                    </h3>
                    {lc.description && (
                      <p className="text-[11px] text-brand-text-muted line-clamp-2 mt-1">
                        {lc.description}
                      </p>
                    )}
                  </div>

                  {/* Schedule Details Box */}
                  <div className="p-3 rounded-2xl bg-brand-bg-warm/60 border border-brand-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-brand-charcoal font-bold">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-brand-orange" />
                        <span>{new Date(lc.scheduled_start).toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" })}</span>
                      </div>
                      <div className="flex items-center gap-1 text-brand-text-muted font-semibold text-[11px]">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(lc.scheduled_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>

                    {isScheduled && !isWithinEarlyAccess && (
                      <p className="text-[10px] text-amber-700 pt-1 border-t border-brand-border/40">
                        Preparation setup opens at <span className="font-bold">{earlyAccessOpensAt}</span> (10 min prior)
                      </p>
                    )}

                    {isScheduled && isWithinEarlyAccess && (
                      <p className="text-[10px] text-emerald-700 font-bold pt-1 border-t border-brand-border/40 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-emerald-600" />
                        Early Access Ready (Setup Camera & Mic)
                      </p>
                    )}
                  </div>

                  {/* Termination Notice if Terminated */}
                  {isTerminated && lc.termination_reason && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                        <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                        <span>Terminated by Admin</span>
                      </div>
                      <p className="text-[11px] text-rose-700 italic">
                        &ldquo;{lc.termination_reason}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="pt-4 border-t border-brand-border/60 mt-4 flex flex-col gap-2">
                  {isScheduled && (
                    <>
                      {isWithinEarlyAccess ? (
                        <Button
                          size="sm"
                          onClick={() => handleStartLive(lc)}
                          disabled={actionLoadingId === lc.id}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                        >
                          {actionLoadingId === lc.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <Play className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Attend / Start Live
                        </Button>
                      ) : (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-brand-bg-warm border border-brand-border/60 text-xs text-brand-text-muted">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Clock className="h-3.5 w-3.5 text-brand-orange" />
                            Opens at {earlyAccessOpensAt}
                          </span>
                        </div>
                      )}

                      {/* Teacher Management: Reschedule & Cancel Actions */}
                      <div className="flex items-center gap-2 pt-1 border-t border-brand-border/40">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRescheduleTarget(lc);
                            const d = new Date(lc.scheduled_start);
                            const dateStr = d.toISOString().split("T")[0];
                            const timeStr = d.toTimeString().slice(0, 5);
                            setRescheduleDate(dateStr);
                            setRescheduleStartTime(timeStr);
                            setRescheduleError("");
                          }}
                          className="flex-1 text-xs font-bold text-brand-charcoal hover:bg-brand-bg-warm border-brand-border"
                        >
                          <Edit3 className="h-3.5 w-3.5 mr-1 text-brand-orange" />
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCancelTarget(lc);
                            setCancelReason("");
                          }}
                          className="text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}

                  {isLive && (
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        size="sm"
                        onClick={() => window.open(lc.stream_room_url || `/student/live/${lc.id}`, "_blank")}
                        className="flex-1 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs shadow-xs"
                      >
                        <Video className="h-3.5 w-3.5 mr-1.5" />
                        {isSuperAdmin ? "Monitor Room" : "Enter Room"}
                      </Button>
                      {isSuperAdmin ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTerminateTarget(lc);
                            setTerminationReason("");
                            setTerminateError("");
                          }}
                          className="bg-white hover:bg-rose-50 text-rose-600 border-rose-200 font-bold text-xs"
                        >
                          <ShieldAlert className="h-3.5 w-3.5 mr-1 text-rose-600" />
                          Terminate Live
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEndTarget(lc)}
                          className="bg-white hover:bg-rose-50 text-rose-600 border-rose-200 font-bold text-xs"
                        >
                          End Class
                        </Button>
                      )}
                    </div>
                  )}

                  {isCompleted && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Class Concluded
                      </span>
                      {lc.stream_room_url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPreviewRecordingUrl(lc.stream_room_url || null)}
                          className="text-brand-orange hover:text-brand-orange-hover text-xs font-bold"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Preview Recording
                        </Button>
                      )}
                    </div>
                  )}

                  {isTerminated && (
                    <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Session Severed
                    </span>
                  )}

                  {isCancelled && (
                    <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" />
                      Session Cancelled
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE LIVE CLASS MODAL (No duration input, no course mapping) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule New Live Class"
        description="Creates an interactive session directly for students with automatic conflict detection."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">
              Lecture Title / Topic <span className="text-red-500">*</span>
            </label>
            <Input
              value={createTopic}
              onChange={(e) => setCreateTopic(e.target.value)}
              placeholder="e.g. Masterclass: Quadratic Equations & Roots"
              className={formErrors.topic ? "border-red-500" : ""}
            />
            {formErrors.topic && <p className="text-[11px] text-red-500">{formErrors.topic}</p>}
          </div>

          {/* Academic Taxonomy Grid (Subject, Class Level, Board - No Course selector) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Subject *</label>
              <select
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium focus:ring-2 focus:ring-brand-orange/30"
              >
                {subjects.length > 0 ? (
                  subjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Science">Science</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Class Level</label>
              <select
                value={createClassId}
                onChange={(e) => setCreateClassId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium"
              >
                <option value="">Select Class (Optional)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">Board</label>
              <select
                value={createBoardId}
                onChange={(e) => setCreateBoardId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-brand-border/80 bg-white text-xs text-brand-charcoal font-medium"
              >
                <option value="">Select Board (Optional)</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule Date & Time Row (2 Columns - No Duration Input) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-brand-bg-warm/60 border border-brand-border/60">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">
                Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
                className={formErrors.date ? "border-red-500" : ""}
              />
              {formErrors.date && <p className="text-[11px] text-red-500">{formErrors.date}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">
                Start Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={createStartTime}
                onChange={(e) => setCreateStartTime(e.target.value)}
                className={formErrors.startTime ? "border-red-500" : ""}
              />
              {formErrors.startTime && <p className="text-[11px] text-red-500">{formErrors.startTime}</p>}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Description / Key Concepts</label>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              placeholder="Brief summary of concepts, formulas, or homework to be discussed..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-brand-border/80 text-xs text-brand-charcoal font-medium focus:ring-2 focus:ring-brand-orange/30 resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Info className="h-4 w-4 text-amber-600" />
              Direct Live Scheduling & Early Access
            </p>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              No Super Admin approval is required. You will be able to enter the session 10 minutes prior to scheduled start for camera/mic checks. Overlapping live classes are prohibited.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCreating}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Schedule Live Class
            </Button>
          </div>
        </form>
      </Modal>

      {/* RESCHEDULE LIVE CLASS MODAL */}
      <Modal
        isOpen={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule Live Class"
        description={`Set a new date and start time for "${rescheduleTarget?.topic}".`}
        maxWidth="md"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4 pt-2">
          {rescheduleError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {rescheduleError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-brand-bg-warm/60 border border-brand-border/60">
            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">New Date *</label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-brand-charcoal">New Start Time *</label>
              <Input
                type="time"
                value={rescheduleStartTime}
                onChange={(e) => setRescheduleStartTime(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="text-[11px] text-brand-text-muted">
            The new schedule will be updated immediately across student portals and notification will be dispatched to administration.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRescheduleTarget(null)}
              disabled={isRescheduling}
            >
              Close
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isRescheduling}
              className="bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-xs"
            >
              {isRescheduling && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Save Rescheduled Time
            </Button>
          </div>
        </form>
      </Modal>

      {/* CANCEL LIVE CLASS MODAL */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Scheduled Live Class"
        description="Cancels the upcoming session. It will be removed from student live schedules."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-brand-charcoal">
            Are you sure you want to cancel <span className="font-bold">&ldquo;{cancelTarget?.topic}&rdquo;</span>?
          </p>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">Cancellation Reason (Optional)</label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Rescheduled to next week due to faculty emergency..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelTarget(null)}
              disabled={isCancelling}
            >
              Keep Class
            </Button>
            <Button
              size="sm"
              onClick={handleCancelSubmit}
              disabled={isCancelling}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {isCancelling && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* END LIVE CLASS CONFIRMATION MODAL */}
      <Modal
        isOpen={!!endTarget}
        onClose={() => setEndTarget(null)}
        title="End Live Class"
        description="Concludes the live broadcast normally and generates an inherited recorded lecture draft."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-brand-charcoal">
            Are you sure you want to end <span className="font-bold">&ldquo;{endTarget?.topic}&rdquo;</span>?
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
            <p className="font-bold">Automated Recording Pipeline</p>
            <p className="text-[11px] text-emerald-700">
              The live stream will conclude for all connected students and an inherited lecture draft will be created in your Recorded Lectures tab for your review.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setEndTarget(null)} disabled={isEnding}>
              Keep Live
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmEnd}
              disabled={isEnding}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {isEnding && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              End Live Class
            </Button>
          </div>
        </div>
      </Modal>

      {/* PREVIEW RECORDING MODAL (No download button for teachers) */}
      <Modal
        isOpen={!!previewRecordingUrl}
        onClose={() => setPreviewRecordingUrl(null)}
        title="Completed Live Recording Preview"
        description="Inspect and review the recorded session stream. Teacher recording downloads are restricted."
        maxWidth="lg"
      >
        <div className="space-y-3 pt-2">
          <div className="aspect-video w-full rounded-xl bg-brand-charcoal flex items-center justify-center text-white border border-brand-border/60 overflow-hidden">
            <div className="text-center space-y-2 p-6">
              <Video className="h-10 w-10 text-brand-orange mx-auto animate-pulse" />
              <p className="text-xs font-bold">Live Stream Recording Stream Staged</p>
              <p className="text-[11px] text-brand-text-muted">
                URL: {previewRecordingUrl}
              </p>
            </div>
          </div>
          <p className="text-[11px] text-brand-text-muted text-center">
            Recording is available for educator preview. Governed by TopVeda storage security.
          </p>
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewRecordingUrl(null)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>
      {/* SUPER ADMIN TERMINATE LIVE MODAL */}
      <Modal
        isOpen={!!terminateTarget}
        onClose={() => {
          setTerminateTarget(null);
          setTerminationReason("");
          setTerminateError("");
        }}
        title="Super Admin: Emergency Terminate Live Session"
        description="Immediately shuts down the live broadcast and severs all connected student streams. This action is permanently audited."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              <span>Emergency Session Termination</span>
            </div>
            <p className="text-[11px] text-rose-700">
              Terminating &ldquo;{terminateTarget?.topic}&rdquo;. All student client connections will be immediately terminated.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-brand-charcoal">
              Termination Reason (Required) <span className="text-red-500">*</span>
            </label>
            <Input
              value={terminationReason}
              onChange={(e) => {
                setTerminationReason(e.target.value);
                if (terminateError) setTerminateError("");
              }}
              placeholder="e.g. Inappropriate content broadcasted, session breached platform guidelines..."
              className={terminateError ? "border-rose-500" : ""}
            />
            {terminateError && <p className="text-[11px] text-rose-600 font-semibold">{terminateError}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTerminateTarget(null);
                setTerminationReason("");
                setTerminateError("");
              }}
              disabled={isTerminating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTerminateSubmit}
              disabled={isTerminating}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
            >
              {isTerminating && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Confirm Termination
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
