"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CmsService } from "@/lib/services/cms.service";
import {
  CmsLiveClass,
  CmsLecture,
  CmsBoard,
  CmsClassLevel,
  CmsSubject,
  CmsCourse,
  CmsChapter,
  CmsBatch,
  CmsNotification,
} from "@/types/cms.types";
import { TeacherStatistics } from "@/types/teacher.types";
import { LiveClassesTab } from "@/components/admin/teacher/live-classes-tab";
import { RecordedLecturesTab } from "@/components/admin/teacher/recorded-lectures-tab";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import {
  Radio,
  Video,
  Layers,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Loader2,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Lock,
  Sparkles,
  Info,
} from "lucide-react";

export default function TeacherWorkspacePage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading, logout } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  // Main Tab State: "LIVE_CLASSES" | "RECORDED_LECTURES"
  const [activeTab, setActiveTab] = React.useState<"LIVE_CLASSES" | "RECORDED_LECTURES">("LIVE_CLASSES");

  // Data States
  const [liveClasses, setLiveClasses] = React.useState<CmsLiveClass[]>([]);
  const [lectures, setLectures] = React.useState<CmsLecture[]>([]);
  const [boards, setBoards] = React.useState<CmsBoard[]>([]);
  const [classes, setClasses] = React.useState<CmsClassLevel[]>([]);
  const [subjects, setSubjects] = React.useState<CmsSubject[]>([]);
  const [courses, setCourses] = React.useState<CmsCourse[]>([]);
  const [chapters, setChapters] = React.useState<CmsChapter[]>([]);
  const [batches, setBatches] = React.useState<CmsBatch[]>([]);
  const [stats, setStats] = React.useState<TeacherStatistics | null>(null);
  const [notifications, setNotifications] = React.useState<CmsNotification[]>([]);

  const [isLoading, setIsLoading] = React.useState(true);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Feedback Notification State
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const handleManualRefresh = () => {
    setIsLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Load Teacher Workspace Data
  React.useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user?.id) return;
      try {
        const [
          liveData,
          lecData,
          boardsData,
          classesData,
          subjectsData,
          coursesData,
          chaptersData,
          batchesData,
          statsData,
        ] = await Promise.all([
          CmsService.getTeacherLiveClasses(supabase, user.id),
          CmsService.getTeacherLectures(supabase, user.id),
          CmsService.getBoards(supabase),
          CmsService.getClassLevels(supabase),
          CmsService.getSubjects(supabase),
          CmsService.getCourses(supabase),
          CmsService.getChapters(supabase),
          CmsService.getBatches(supabase),
          CmsService.getTeacherStatistics(supabase, user.id),
        ]);

        if (!isMounted) return;

        setLiveClasses(liveData);
        setLectures(lecData);
        setBoards(boardsData);
        setClasses(classesData);
        setSubjects(subjectsData);
        setCourses(coursesData);
        setChapters(chaptersData);
        setBatches(batchesData);
        setStats(statsData);

        // Fetch notifications
        fetch("/api/notifications")
          .then((res) => res.json())
          .then((d) => {
            if (isMounted && d.notifications) {
              setNotifications(d.notifications);
            }
          })
          .catch(() => {});
      } catch (err: unknown) {
        if (!isMounted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        setFeedback({ type: "error", message: error.message || "Failed to load teacher workspace." });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (!isAuthLoading) {
      void loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [supabase, user?.id, isAuthLoading, refreshTrigger]);

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">Loading Teacher Workspace...</p>
        </div>
      </div>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-brand-surface border-b border-brand-border/80 shadow-2xs">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <BrandGlyph size={26} />
                <Wordmark size="sm" />
              </Link>
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-brand-border">
                <Badge variant="peach" size="sm" className="text-[10px] font-bold uppercase">
                  Teacher Workspace
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                className="text-xs text-brand-text-muted hover:text-brand-charcoal"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-xs">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Admin Hub
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8">
        <Container size="xl">
          <div className="space-y-6">
            {/* Educator Profile & Welcome Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-border/80 shadow-card">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                  {profile?.fullName ? profile.fullName.charAt(0) : "T"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                      {profile?.fullName || "Educator"}
                    </h1>
                    <Badge variant="primary" size="sm" className="text-[10px] uppercase font-bold">
                      {profile?.role || "ADMIN"}
                    </Badge>
                  </div>
                  <p className="text-xs text-brand-text-muted mt-0.5">
                    Authorized Educator • Live Classroom Broadcasting & Recorded Lecture Studio
                  </p>
                </div>
              </div>

              {/* Workspace Navigation Switcher */}
              <div className="flex items-center bg-brand-bg-warm/80 p-1.5 rounded-2xl border border-brand-border/80">
                <button
                  onClick={() => setActiveTab("LIVE_CLASSES")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "LIVE_CLASSES"
                      ? "bg-brand-orange text-white shadow-sm"
                      : "text-brand-text-muted hover:text-brand-charcoal"
                  }`}
                >
                  <Radio className={`h-4 w-4 ${activeTab === "LIVE_CLASSES" ? "animate-pulse" : ""}`} />
                  Live Classes
                  {stats && stats.liveNowClasses > 0 && (
                    <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("RECORDED_LECTURES")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === "RECORDED_LECTURES"
                      ? "bg-brand-orange text-white shadow-sm"
                      : "text-brand-text-muted hover:text-brand-charcoal"
                  }`}
                >
                  <Video className="h-4 w-4" />
                  Recorded Lectures
                  {stats && stats.pendingReviewLectures > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-brand-bg-peach text-brand-orange text-[10px] font-black">
                      {stats.pendingReviewLectures}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Real Database Teacher Statistics Strip */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-brand-text-muted uppercase tracking-wide">Live Classes</span>
                  <p className="text-2xl font-black text-brand-charcoal">{stats.totalLiveClasses}</p>
                  <span className="text-[10px] text-brand-text-subtle font-medium">{stats.upcomingLiveClasses} Upcoming</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-red-600 uppercase tracking-wide">Live Now</span>
                  <p className="text-2xl font-black text-red-600">{stats.liveNowClasses}</p>
                  <span className="text-[10px] text-brand-text-subtle font-medium">{stats.completedLiveClasses} Completed</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-brand-text-muted uppercase tracking-wide">Lectures</span>
                  <p className="text-2xl font-black text-brand-charcoal">{stats.totalLecturesSubmitted}</p>
                  <span className="text-[10px] text-brand-text-subtle font-medium">{stats.draftLectures} Drafts</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide">In Review</span>
                  <p className="text-2xl font-black text-amber-600">{stats.pendingReviewLectures}</p>
                  <span className="text-[10px] text-brand-text-subtle font-medium">Awaiting Super Admin</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">Revisions</span>
                  <p className="text-2xl font-black text-rose-600">{stats.revisionRequestedLectures}</p>
                  <span className="text-[10px] text-brand-text-subtle font-medium">Changes Requested</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs space-y-1">
                  <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Published</span>
                  <p className="text-2xl font-black text-emerald-600">{stats.publishedLectures}</p>
                  <span className="text-[10px] text-brand-text-subtle font-medium">{stats.approvedLectures} Approved</span>
                </div>
              </div>
            )}

            {/* Unread Notifications Alert Banner */}
            {unreadNotifications.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Bell className="h-4 w-4 text-brand-orange animate-bounce" />
                    <span>Important Notifications ({unreadNotifications.length})</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {unreadNotifications.slice(0, 2).map((n) => (
                    <div key={n.id} className="flex items-center justify-between text-xs text-amber-800">
                      <span>• <span className="font-semibold">{n.title}:</span> {n.message}</span>
                      <button
                        onClick={async () => {
                          await fetch("/api/notifications", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ notificationId: n.id }),
                          });
                          setNotifications((prev) => prev.filter((item) => item.id !== n.id));
                        }}
                        className="text-[10px] font-bold text-brand-orange hover:underline shrink-0 ml-2"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-2xs animate-fade-in ${
                  feedback.type === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : feedback.type === "error"
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : "bg-sky-50 border-sky-200 text-sky-900"
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedback.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                  {feedback.type === "error" && <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />}
                  {feedback.type === "info" && <Info className="h-4 w-4 text-sky-600 shrink-0" />}
                  <span className="font-medium">{feedback.message}</span>
                </div>
                <button
                  onClick={() => setFeedback(null)}
                  className="text-xs font-bold opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Tab Workspace Views */}
            {activeTab === "LIVE_CLASSES" ? (
              <LiveClassesTab
                teacherId={user?.id || ""}
                teacherName={profile?.fullName || "Educator"}
                liveClasses={liveClasses}
                boards={boards}
                classes={classes}
                subjects={subjects}
                courses={courses}
                chapters={chapters}
                onRefresh={handleManualRefresh}
                setFeedback={setFeedback}
              />
            ) : (
              <RecordedLecturesTab
                teacherId={user?.id || ""}
                teacherName={profile?.fullName || "Educator"}
                lectures={lectures}
                boards={boards}
                classes={classes}
                subjects={subjects}
                courses={courses}
                chapters={chapters}
                batches={batches}
                onRefresh={handleManualRefresh}
                setFeedback={setFeedback}
              />
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
