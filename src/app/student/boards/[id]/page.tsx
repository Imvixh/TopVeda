"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { StudentBoardDetail } from "@/types/board.types";
import {
  Award,
  BookOpen,
  GraduationCap,
  Target,
  ArrowRight,
  ArrowLeft,
  Layers,
  Sparkles,
  CheckCircle2,
  Users,
  Calendar,
  Loader2,
  ChevronRight,
  FileText,
  Video,
  Radio,
  FileCheck,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getBoardIcon(iconName: string) {
  switch ((iconName || "").toLowerCase()) {
    case "award":
      return Award;
    case "bookopen":
    case "book-open":
      return BookOpen;
    case "graduationcap":
    case "graduation-cap":
      return GraduationCap;
    case "target":
      return Target;
    default:
      return Award;
  }
}

function getBoardTheme(code: string) {
  const c = (code || "").toUpperCase();
  if (c.includes("CBSE")) {
    return {
      bgGradient: "from-blue-600 via-indigo-600 to-slate-900",
      iconBg: "bg-blue-500/20 text-blue-200 border-blue-400/30",
      badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
      accentColor: "text-blue-600",
    };
  }
  if (c.includes("BSEB") || c.includes("BIHAR")) {
    return {
      bgGradient: "from-emerald-700 via-teal-800 to-slate-900",
      iconBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentColor: "text-emerald-600",
    };
  }
  return {
    bgGradient: "from-amber-600 via-orange-700 to-slate-900",
    iconBg: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    accentColor: "text-amber-600",
  };
}

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params?.id as string;
  const { user, isLoading: isAuthLoading } = useAuth();

  const [detail, setDetail] = React.useState<StudentBoardDetail | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedClassId, setSelectedClassId] = React.useState<string>("all");

  // Layout states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const fetchDetail = React.useCallback(async () => {
    if (!boardId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/student/boards/${boardId}`);
      if (res.ok) {
        const data: StudentBoardDetail = await res.json();
        setDetail(data);
      } else {
        console.error("Failed to load board details");
      }
    } catch (err) {
      console.error("Board detail error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchDetail();
    }
  }, [isAuthLoading, fetchDetail]);

  // Filter batches by selected class level
  const filteredAvailableBatches = React.useMemo(() => {
    if (!detail) return [];
    if (selectedClassId === "all") return detail.availableBatches;
    return detail.availableBatches.filter((b) => b.classId === selectedClassId);
  }, [detail, selectedClassId]);

  const filteredEnrolledBatches = React.useMemo(() => {
    if (!detail) return [];
    if (selectedClassId === "all") return detail.enrolledBatches;
    return detail.enrolledBatches.filter((b) => b.classId === selectedClassId);
  }, [detail, selectedClassId]);

  const filteredCourses = React.useMemo(() => {
    if (!detail) return [];
    if (selectedClassId === "all") return detail.courses;
    // Map classId to className
    const targetClass = detail.classLevels.find((c) => c.id === selectedClassId);
    if (!targetClass) return detail.courses;
    return detail.courses.filter((c) => c.classLevel.includes(targetClass.name));
  }, [detail, selectedClassId]);

  const theme = getBoardTheme(detail?.board.code || "CBSE");
  const Icon = getBoardIcon(detail?.board.iconName || "Award");

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      {/* Student Sidebar */}
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Canvas */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        <StudentHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Back link & breadcrumb */}
          <div>
            <Link
              href="/student/boards"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Boards</span>
            </Link>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <p className="text-xs text-slate-500 font-medium">
                Loading board curriculum & batch details...
              </p>
            </div>
          )}

          {/* Board Detail Canvas */}
          {!isLoading && detail && (
            <>
              {/* Board Hero Header */}
              <div
                className={cn(
                  "rounded-3xl p-6 sm:p-8 text-white bg-gradient-to-r relative overflow-hidden shadow-lg",
                  theme.bgGradient
                )}
              >
                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div className="space-y-3 max-w-2xl">
                    <div className="inline-flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase bg-white/20 text-white backdrop-blur-sm border border-white/20">
                        {detail.board.code} Curriculum
                      </span>
                      {detail.board.isEnrolled && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enrolled in {detail.board.enrolledBatchesCount} Batches</span>
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                      {detail.board.name}
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {detail.board.description}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col gap-3 self-start md:self-auto">
                    <Link
                      href="/student/study-material"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-md hover:bg-slate-100 transition-all"
                    >
                      <FileText className="w-4 h-4 text-brand-orange" />
                      <span>Batch Study Materials</span>
                    </Link>

                    <Link
                      href="/student/tests"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all"
                    >
                      <FileCheck className="w-4 h-4 text-amber-300" />
                      <span>Take Practice Tests</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Class Level Selector Tabs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Filter by Class Level
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing all batches & courses
                  </span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedClassId("all")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm",
                      selectedClassId === "all"
                        ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/10"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    All Classes
                  </button>
                  {detail.classLevels.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClassId(cls.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm",
                        selectedClassId === cls.id
                          ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/10"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 1: Enrolled Batches (If Any) */}
              {filteredEnrolledBatches.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-base font-bold text-slate-900">
                      Your Enrolled Batches
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      {filteredEnrolledBatches.length} Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredEnrolledBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-5 space-y-4 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Enrolled
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {batch.className}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900">
                              {batch.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Faculty: {batch.educatorName}
                            </p>
                          </div>
                        </div>

                        {/* Quick Jump Links */}
                        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
                          <Link
                            href="/student/learning"
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex flex-col items-center gap-1 transition-all"
                          >
                            <Video className="w-4 h-4 text-blue-600" />
                            <span className="text-[11px]">Lectures</span>
                          </Link>

                          <Link
                            href={`/student/study-material?batchId=${batch.id}`}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex flex-col items-center gap-1 transition-all"
                          >
                            <FileText className="w-4 h-4 text-rose-600" />
                            <span className="text-[11px]">Notes ({batch.materialsCount})</span>
                          </Link>

                          <Link
                            href="/student/tests"
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex flex-col items-center gap-1 transition-all"
                          >
                            <FileCheck className="w-4 h-4 text-purple-600" />
                            <span className="text-[11px]">Tests</span>
                          </Link>

                          <Link
                            href="/student/live"
                            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex flex-col items-center gap-1 transition-all"
                          >
                            <Radio className="w-4 h-4 text-emerald-600" />
                            <span className="text-[11px]">Live Class</span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: Available Batches for Enrollment */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-orange" />
                    <h2 className="text-base font-bold text-slate-900">
                      Available Batches for {detail.board.code}
                    </h2>
                  </div>
                  <span className="text-xs text-slate-500">
                    {filteredAvailableBatches.length} Available
                  </span>
                </div>

                {filteredAvailableBatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredAvailableBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {batch.className}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {batch.accessTier}
                            </span>
                          </div>

                          <div>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                              {batch.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {batch.subtitle}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                            <span className="font-medium">Faculty: {batch.educatorName}</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-slate-500">
                            {batch.lecturesCount} Lectures • {batch.materialsCount} Docs
                          </span>

                          <Link
                            href={batch.courseId ? `/student/courses/${batch.courseId}` : "/student/learning"}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold shadow-sm transition-all"
                          >
                            <span>Enroll</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                    No available batches found for the selected class. Check back soon or select &quot;All Classes&quot;.
                  </div>
                )}
              </div>

              {/* SECTION 3: Subject Tracks & Curriculum Navigation */}
              {filteredCourses.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-blue-600" />
                      <h2 className="text-base font-bold text-slate-900">
                        Subject Curriculum Tracks ({detail.board.code})
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCourses.map((c) => (
                      <Link
                        key={c.id}
                        href={`/student/courses/${c.id}`}
                        className="group bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 hover:shadow-sm p-4 flex items-center justify-between transition-all"
                      >
                        <div className="space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                            {c.subjectName}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-orange transition-colors">
                            {c.title}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {c.classLevel}
                          </span>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-orange group-hover:translate-x-0.5 transition-all" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
