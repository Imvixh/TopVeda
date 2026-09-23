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
import { TeacherStatistics, TeacherDirectoryItem } from "@/types/teacher.types";
import { LiveClassesTab } from "@/components/admin/teacher/live-classes-tab";
import { RecordedLecturesTab } from "@/components/admin/teacher/recorded-lectures-tab";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Users,
  Search,
  ChevronRight,
  ShieldCheck,
  GraduationCap,
  FileText,
  Eye,
} from "lucide-react";

export default function TeacherWorkspacePage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading, logout } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  // Super Admin Directory State
  const [teachers, setTeachers] = React.useState<TeacherDirectoryItem[]>([]);
  const [selectedTeacher, setSelectedTeacher] = React.useState<TeacherDirectoryItem | null>(null);
  const [teacherSearchQuery, setTeacherSearchQuery] = React.useState("");
  const [isTeachersLoading, setIsTeachersLoading] = React.useState(true);

  // Main Tab State: "LIVE_CLASSES" | "RECORDED_LECTURES"
  const [activeTab, setActiveTab] = React.useState<"LIVE_CLASSES" | "RECORDED_LECTURES">("LIVE_CLASSES");

  // Selected / Active Teacher Data States
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

  // Auth Guard: Block students
  React.useEffect(() => {
    if (!isAuthLoading && profile?.role === "STUDENT") {
      router.push("/student");
    }
  }, [isAuthLoading, profile?.role, router]);

  // Load Super Admin Teacher Directory
  React.useEffect(() => {
    let isMounted = true;

    async function loadTeachers() {
      if (!isSuperAdmin) return;
      try {
        setIsTeachersLoading(true);
        const data = await CmsService.getTeachersForSuperAdmin(supabase);
        if (isMounted) {
          setTeachers(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setFeedback({ type: "error", message: error.message || "Failed to load teacher directory." });
        }
      } finally {
        if (isMounted) {
          setIsTeachersLoading(false);
        }
      }
    }

    if (!isAuthLoading && isSuperAdmin) {
      void loadTeachers();
    }

    return () => {
      isMounted = false;
    };
  }, [supabase, isAuthLoading, isSuperAdmin, refreshTrigger]);

  // Determine target teacher ID to load workspace data for
  const activeTeacherId = isSuperAdmin ? selectedTeacher?.id : user?.id;

  // Load Active Teacher Workspace Data (when teacher is selected or when logged in as teacher)
  React.useEffect(() => {
    let isMounted = true;

    async function loadWorkspaceData() {
      if (!activeTeacherId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
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
          CmsService.getTeacherLiveClasses(supabase, activeTeacherId),
          CmsService.getTeacherLectures(supabase, activeTeacherId),
          CmsService.getBoards(supabase),
          CmsService.getClassLevels(supabase),
          CmsService.getSubjects(supabase),
          CmsService.getCourses(supabase),
          CmsService.getChapters(supabase),
          CmsService.getBatches(supabase),
          CmsService.getTeacherStatistics(supabase, activeTeacherId),
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

    if (!isAuthLoading && activeTeacherId) {
      void loadWorkspaceData();
    } else if (!isAuthLoading && isSuperAdmin && !selectedTeacher) {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [supabase, activeTeacherId, isAuthLoading, isSuperAdmin, selectedTeacher, refreshTrigger]);

  if (isAuthLoading || (isSuperAdmin && isTeachersLoading && !selectedTeacher)) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">
            {isSuperAdmin ? "Loading Teacher Directory..." : "Loading Teacher Workspace..."}
          </p>
        </div>
      </div>
    );
  }

  // Filter teachers in directory
  const filteredTeachers = teachers.filter((t) => {
    const q = teacherSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return t.fullName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
  });

  const unreadNotifications = notifications.filter((n) => !n.is_read);

  // Aggregate stats across all teachers for Super Admin directory view
  const aggregateStats = {
    totalTeachers: teachers.length,
    activeLive: teachers.reduce((acc, t) => acc + t.liveStats.liveNow, 0),
    upcomingLive: teachers.reduce((acc, t) => acc + t.liveStats.upcoming, 0),
    completedLive: teachers.reduce((acc, t) => acc + t.liveStats.completed, 0),
    pendingReviewLectures: teachers.reduce((acc, t) => acc + t.lectureStats.pendingReview, 0),
    publishedLectures: teachers.reduce((acc, t) => acc + t.lectureStats.published, 0),
  };

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
                <Badge
                  variant={isSuperAdmin ? "primary" : "peach"}
                  size="sm"
                  className="text-[10px] font-bold uppercase"
                >
                  {isSuperAdmin ? "Super Admin • Teacher Hub" : "Teacher Workspace"}
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

            {/* ========================================================================= */}
            {/* SUPER ADMIN VIEW: TEACHER DIRECTORY (When no teacher is selected)         */}
            {/* ========================================================================= */}
            {isSuperAdmin && !selectedTeacher && (
              <div className="space-y-6">
                {/* Super Admin Welcome & Aggregate Overview Banner */}
                <div className="bg-white p-6 rounded-3xl border border-brand-border/80 shadow-card space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-charcoal to-brand-navy text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                        <ShieldCheck className="h-7 w-7 text-brand-orange" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                            Teacher Workspace
                          </h1>
                          <Badge variant="primary" size="sm" className="text-[10px] uppercase font-bold">
                            Super Admin Central Directory
                          </Badge>
                        </div>
                        <p className="text-xs text-brand-text-muted mt-0.5">
                          Manage educator workspaces, monitor live broadcasts, audit lecture submissions, and review real-time faculty statistics.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Aggregate Factual Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-brand-border/60">
                    <div className="p-3 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/60">
                      <span className="text-[10px] font-bold text-brand-text-muted uppercase">Faculty</span>
                      <p className="text-xl font-black text-brand-charcoal">{aggregateStats.totalTeachers}</p>
                      <span className="text-[10px] text-brand-text-subtle font-medium">Teachers</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/60">
                      <span className="text-[10px] font-bold text-red-600 uppercase">Live Now</span>
                      <p className="text-xl font-black text-red-600">{aggregateStats.activeLive}</p>
                      <span className="text-[10px] text-brand-text-subtle font-medium">Broadcasting</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/60">
                      <span className="text-[10px] font-bold text-brand-orange uppercase">Upcoming</span>
                      <p className="text-xl font-black text-brand-charcoal">{aggregateStats.upcomingLive}</p>
                      <span className="text-[10px] text-brand-text-subtle font-medium">Scheduled</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/60">
                      <span className="text-[10px] font-bold text-amber-600 uppercase">In Review</span>
                      <p className="text-xl font-black text-amber-600">{aggregateStats.pendingReviewLectures}</p>
                      <span className="text-[10px] text-brand-text-subtle font-medium">Lectures</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/60">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Concluded</span>
                      <p className="text-xl font-black text-emerald-600">{aggregateStats.completedLive}</p>
                      <span className="text-[10px] text-brand-text-subtle font-medium">Live Sessions</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-brand-bg-warm/70 border border-brand-border/60">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase">Published</span>
                      <p className="text-xl font-black text-emerald-600">{aggregateStats.publishedLectures}</p>
                      <span className="text-[10px] text-brand-text-subtle font-medium">Recorded Videos</span>
                    </div>
                  </div>
                </div>

                {/* Teacher Directory Section Header & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-orange" />
                    <h2 className="text-lg font-black text-brand-charcoal">Current Teachers</h2>
                    <Badge variant="outline" size="sm" className="font-bold text-[10px]">
                      {filteredTeachers.length} {filteredTeachers.length === 1 ? "Teacher" : "Teachers"}
                    </Badge>
                  </div>

                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted" />
                    <Input
                      value={teacherSearchQuery}
                      onChange={(e) => setTeacherSearchQuery(e.target.value)}
                      placeholder="Search teacher by name or email..."
                      className="pl-9 h-10 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Teacher Cards Grid */}
                {filteredTeachers.length === 0 ? (
                  <Card className="p-12 text-center bg-white border border-dashed border-brand-border/80 rounded-3xl space-y-3">
                    <div className="h-14 w-14 rounded-full bg-brand-bg-warm text-brand-text-muted flex items-center justify-center mx-auto">
                      <GraduationCap className="h-7 w-7 text-brand-text-subtle" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-brand-charcoal">No Teachers Found</h3>
                      <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                        {teacherSearchQuery
                          ? `No educator profiles match "${teacherSearchQuery}". Try clearing the search filter.`
                          : "No authorized educator accounts are currently registered in the database. When users are assigned the Teacher role, they will appear in this central directory."}
                      </p>
                    </div>
                    {teacherSearchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTeacherSearchQuery("")}
                        className="text-xs"
                      >
                        Clear Search
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredTeachers.map((teacher) => {
                      const hasLiveNow = teacher.liveStats.liveNow > 0;
                      const hasPendingReview = teacher.lectureStats.pendingReview > 0;

                      return (
                        <Card
                          key={teacher.id}
                          onClick={() => setSelectedTeacher(teacher)}
                          className="group p-5 bg-white hover:bg-brand-bg-warm/30 rounded-3xl border border-brand-border/80 hover:border-brand-orange/60 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-4">
                            {/* Profile Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {teacher.avatarUrl ? (
                                  <img
                                    src={teacher.avatarUrl}
                                    alt={teacher.fullName}
                                    className="h-12 w-12 rounded-2xl object-cover border border-brand-border shadow-2xs"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-2xs shrink-0">
                                    {teacher.fullName.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="text-sm font-bold text-brand-charcoal group-hover:text-brand-orange transition-colors">
                                      {teacher.fullName}
                                    </h3>
                                    {hasLiveNow && (
                                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-brand-text-muted truncate max-w-[180px]">
                                    {teacher.email}
                                  </p>
                                </div>
                              </div>

                              <Badge variant="outline" size="sm" className="text-[10px] font-bold text-brand-charcoal bg-brand-bg-warm">
                                Teacher
                              </Badge>
                            </div>

                            {/* Live Classes Summary Strip */}
                            <div className="p-3 rounded-2xl bg-brand-bg-warm/60 border border-brand-border/50 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="flex items-center gap-1.5 text-brand-charcoal">
                                  <Radio className="h-3.5 w-3.5 text-brand-orange" />
                                  Live Classes
                                </span>
                                <span className="text-brand-text-muted text-[10px]">
                                  {teacher.liveStats.total} Total
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="px-2 py-0.5 rounded-md bg-white border border-brand-border/60 text-brand-charcoal font-semibold">
                                  {teacher.liveStats.upcoming} Upcoming
                                </span>
                                {teacher.liveStats.liveNow > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-red-500 text-white font-black animate-pulse">
                                    {teacher.liveStats.liveNow} LIVE
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-white border border-brand-border/60 text-emerald-700 font-semibold">
                                  {teacher.liveStats.completed} Completed
                                </span>
                                {teacher.liveStats.terminated > 0 && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                                    {teacher.liveStats.terminated} Terminated
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Recorded Lectures Summary Strip */}
                            <div className="p-3 rounded-2xl bg-brand-bg-warm/60 border border-brand-border/50 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="flex items-center gap-1.5 text-brand-charcoal">
                                  <Video className="h-3.5 w-3.5 text-brand-orange" />
                                  Recorded Lectures
                                </span>
                                <span className="text-brand-text-muted text-[10px]">
                                  {teacher.lectureStats.total} Total
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span className="px-2 py-0.5 rounded-md bg-white border border-brand-border/60 text-brand-charcoal font-semibold">
                                  {teacher.lectureStats.draft} Draft
                                </span>
                                {hasPendingReview ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold">
                                    {teacher.lectureStats.pendingReview} In Review
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-white border border-brand-border/60 text-brand-charcoal font-semibold">
                                    {teacher.lectureStats.pendingReview} In Review
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-white border border-brand-border/60 text-emerald-700 font-semibold">
                                  {teacher.lectureStats.approved} Approved
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-white border border-brand-border/60 text-emerald-700 font-semibold">
                                  {teacher.lectureStats.published} Published
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Action Link */}
                          <div className="pt-2 border-t border-brand-border/50 flex items-center justify-between text-xs font-bold text-brand-orange group-hover:translate-x-0.5 transition-transform">
                            <span>Open Teacher Workspace</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* INDIVIDUAL TEACHER WORKSPACE VIEW (Drill-down or Regular Teacher Login)   */}
            {/* ========================================================================= */}
            {(!isSuperAdmin || selectedTeacher) && (
              <div className="space-y-6">
                {/* Super Admin Drill-Down Back Navigation */}
                {isSuperAdmin && (
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTeacher(null)}
                      className="text-xs font-bold bg-white text-brand-charcoal hover:bg-brand-bg-warm"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1.5 text-brand-orange" />
                      Back to Teachers Directory
                    </Button>
                    <Badge variant="primary" size="sm" className="text-[10px] uppercase font-bold">
                      Super Admin Mode • Managing Faculty Data
                    </Badge>
                  </div>
                )}

                {/* Educator Profile & Welcome Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-border/80 shadow-card">
                  <div className="flex items-center gap-4">
                    {isSuperAdmin && selectedTeacher?.avatarUrl ? (
                      <img
                        src={selectedTeacher.avatarUrl}
                        alt={selectedTeacher.fullName}
                        className="h-14 w-14 rounded-2xl object-cover border border-brand-border shadow-md shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-orange to-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                        {isSuperAdmin
                          ? selectedTeacher?.fullName.charAt(0) || "T"
                          : profile?.fullName ? profile.fullName.charAt(0) : "T"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                          {isSuperAdmin
                            ? selectedTeacher?.fullName || "Educator"
                            : profile?.fullName || "Educator"}
                        </h1>
                        <Badge variant="primary" size="sm" className="text-[10px] uppercase font-bold">
                          {isSuperAdmin ? "Teacher" : (profile?.role || "ADMIN")}
                        </Badge>
                      </div>
                      <p className="text-xs text-brand-text-muted mt-0.5">
                        {isSuperAdmin
                          ? `${selectedTeacher?.email} • Live Classroom & Recorded Lecture Management`
                          : "Authorized Educator • Live Classroom Broadcasting & Recorded Lecture Studio"}
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
                {unreadNotifications.length > 0 && !isSuperAdmin && (
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

                {/* Tab Workspace Views */}
                {isLoading ? (
                  <div className="p-12 text-center bg-white rounded-3xl border border-brand-border">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-orange mx-auto mb-2" />
                    <p className="text-xs text-brand-text-muted">Loading workspace content...</p>
                  </div>
                ) : activeTab === "LIVE_CLASSES" ? (
                  <LiveClassesTab
                    teacherId={activeTeacherId || ""}
                    teacherName={isSuperAdmin ? (selectedTeacher?.fullName || "Educator") : (profile?.fullName || "Educator")}
                    liveClasses={liveClasses}
                    boards={boards}
                    classes={classes}
                    subjects={subjects}
                    courses={courses}
                    chapters={chapters}
                    isSuperAdmin={isSuperAdmin}
                    onRefresh={handleManualRefresh}
                    setFeedback={setFeedback}
                  />
                ) : (
                  <RecordedLecturesTab
                    teacherId={activeTeacherId || ""}
                    teacherName={isSuperAdmin ? (selectedTeacher?.fullName || "Educator") : (profile?.fullName || "Educator")}
                    lectures={lectures}
                    boards={boards}
                    classes={classes}
                    subjects={subjects}
                    courses={courses}
                    chapters={chapters}
                    batches={batches}
                    isSuperAdmin={isSuperAdmin}
                    onRefresh={handleManualRefresh}
                    setFeedback={setFeedback}
                  />
                )}
              </div>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
