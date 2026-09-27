"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import {
  StudentProgressSummary,
  SubjectProgressItem,
  CourseBatchProgressItem,
  RecentTestResultItem,
  FocusAreaItem,
} from "@/types/student-learning.types";
import {
  Calculator,
  FlaskConical,
  BookOpen,
  Atom,
  Tv,
  Globe,
  Sparkles,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  Target,
  FileCheck,
  TrendingUp,
  Award,
  Video,
  Layers,
  HelpCircle,
  Activity,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Subject Icon Resolver
function getSubjectIcon(subjectName: string) {
  const name = (subjectName || "").toLowerCase();

  if (name.includes("math")) {
    return {
      Icon: Calculator,
      badgeBg: "bg-[#FFE8EC] border border-[#FFD0D9] text-[#F43F5E]",
      barColor: "bg-[#059669]", // Emerald bar
    };
  }
  if (name.includes("sci") || name.includes("phy") || name.includes("chem") || name.includes("bio")) {
    return {
      Icon: FlaskConical,
      badgeBg: "bg-[#EBF3FF] border border-[#CFE2FE] text-[#2563EB]",
      barColor: "bg-[#0D9488]", // Teal bar
    };
  }
  if (name.includes("eng") || name.includes("lang")) {
    return {
      Icon: BookOpen,
      badgeBg: "bg-[#FFF4E8] border border-[#FFE2C2] text-[#F97316]",
      barColor: "bg-[#6366F1]", // Indigo bar
    };
  }
  if (name.includes("social") || name.includes("hist") || name.includes("geo") || name.includes("civ")) {
    return {
      Icon: Globe,
      badgeBg: "bg-[#F5EDFF] border border-[#E7D6FF] text-[#9333EA]",
      barColor: "bg-[#3B82F6]", // Blue bar
    };
  }
  if (name.includes("comp") || name.includes("tech") || name.includes("app")) {
    return {
      Icon: Tv,
      badgeBg: "bg-[#EAF5FF] border border-[#CCE5FE] text-[#0284C7]",
      barColor: "bg-[#0284C7]", // Sky blue bar
    };
  }

  return {
    Icon: Atom,
    badgeBg: "bg-[#FFF0EB] border border-[#FFD9CC] text-[#FF5722]",
    barColor: "bg-[#FF5722]",
  };
}

export default function ProgressTrackerPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [summary, setSummary] = React.useState<StudentProgressSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const fetchProgress = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/student/progress");
      if (res.ok) {
        const data: StudentProgressSummary = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to load student progress:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchProgress();
    }
  }, [isAuthLoading, fetchProgress]);

  const overallPercent = summary?.overallProgressPercent || 0;
  const enrolledCount = summary?.totalEnrolledCourses || 0;
  const completedCount = summary?.coursesCompleted || 0;
  const lecturesWatched = summary?.lecturesWatched || 0;
  const totalAccessibleLectures = summary?.totalAccessibleLectures || 0;
  const liveAttended = summary?.liveClassesAttended || 0;
  const totalLiveScheduled = summary?.totalLiveClassesScheduled || 0;
  const liveAttendancePct = summary?.liveAttendancePercent || 0;
  const testsAttempted = summary?.testsAttempted || 0;
  const quizzesAttempted = summary?.quizzesAttempted || 0;
  const avgTestScore = summary?.averageTestScorePercent;
  const bestTestScore = summary?.bestTestScorePercent;
  const courseList = summary?.courseProgress || [];
  const subjectList = summary?.subjectProgress || [];
  const testResults = summary?.recentTestResults || [];
  const focusAreas = summary?.detailedFocusAreas || [];
  const confidence = summary?.learningConfidence;

  // Radial progress gauge math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallPercent / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      {/* Student Left Sidebar */}
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Canvas Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Header */}
        <StudentHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Progress Tracker Canvas */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1120px] w-full mx-auto space-y-8">
          {/* Header Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              My Progress
            </h1>
            <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
              Factual, real-time performance analytics across your enrolled courses and assessments
            </p>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-6 animate-pulse py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-28 rounded-3xl bg-white border border-gray-100 p-4" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="h-56 rounded-3xl bg-white border border-gray-100 p-6" />
                <div className="h-56 rounded-3xl bg-white border border-gray-100 p-6" />
              </div>
            </div>
          ) : (
            <>
              {/* SECTION 1: TOP 6-METRIC SUMMARY CARDS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
                {/* Metric 1: Enrolled */}
                <div className="p-4 rounded-3xl bg-white border border-brand-border/80 shadow-3xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-brand-text-muted uppercase tracking-wider">
                      Enrolled
                    </span>
                    <GraduationCap className="h-4 w-4 text-brand-orange" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums">
                      {enrolledCount}
                    </span>
                    <p className="text-[10px] font-semibold text-brand-text-muted mt-0.5">
                      Active Courses &amp; Batches
                    </p>
                  </div>
                </div>

                {/* Metric 2: Completed */}
                <div className="p-4 rounded-3xl bg-white border border-brand-border/80 shadow-3xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                      Completed
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-700 tabular-nums">
                      {completedCount}
                    </span>
                    <p className="text-[10px] font-semibold text-brand-text-muted mt-0.5">
                      100% Finished
                    </p>
                  </div>
                </div>

                {/* Metric 3: Live Attendance */}
                <div className="p-4 rounded-3xl bg-white border border-brand-border/80 shadow-3xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      Attendance
                    </span>
                    <Video className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums">
                      {totalLiveScheduled > 0 ? `${liveAttendancePct}%` : "100%"}
                    </span>
                    <p className="text-[10px] font-semibold text-brand-text-muted mt-0.5">
                      {liveAttended} of {totalLiveScheduled || liveAttended} Sessions
                    </p>
                  </div>
                </div>

                {/* Metric 4: Lectures Completed */}
                <div className="p-4 rounded-3xl bg-white border border-brand-border/80 shadow-3xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                      Lectures
                    </span>
                    <PlayCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums">
                      {lecturesWatched}
                    </span>
                    <p className="text-[10px] font-semibold text-brand-text-muted mt-0.5">
                      of {totalAccessibleLectures} Published
                    </p>
                  </div>
                </div>

                {/* Metric 5: Live Classes Attended */}
                <div className="p-4 rounded-3xl bg-white border border-brand-border/80 shadow-3xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                      Live Classes
                    </span>
                    <Activity className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums">
                      {liveAttended}
                    </span>
                    <p className="text-[10px] font-semibold text-brand-text-muted mt-0.5">
                      Attended Live
                    </p>
                  </div>
                </div>

                {/* Metric 6: Tests Attempted */}
                <div className="p-4 rounded-3xl bg-white border border-brand-border/80 shadow-3xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                      Tests
                    </span>
                    <FileCheck className="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums">
                      {testsAttempted}
                    </span>
                    <p className="text-[10px] font-semibold text-brand-text-muted mt-0.5">
                      {quizzesAttempted} Quizzes
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: OVERALL PROGRESS & LEARNING CONFIDENCE BENCHMARK */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Radial Gauge: Overall Syllabus Progress */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <div className="w-full flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-black text-brand-charcoal tracking-tight">
                      Overall Progress
                    </h2>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Lecture-Weighted
                    </span>
                  </div>

                  <div className="py-4 flex flex-col items-center justify-center relative">
                    <svg className="w-36 h-36 sm:w-40 sm:h-40 transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        className="stroke-[#EBF5F0]"
                        strokeWidth="11"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        className="stroke-[#059669] transition-all duration-1000 ease-out"
                        strokeWidth="11"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-brand-charcoal tabular-nums tracking-tight">
                        {overallPercent}%
                      </span>
                      <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                        Covered
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-brand-text-muted">
                    {totalAccessibleLectures > 0
                      ? `${lecturesWatched} of ${totalAccessibleLectures} accessible lectures watched across enrolled courses`
                      : "Enroll in courses to start building your syllabus completion"}
                  </p>
                </div>

                {/* Learning Confidence & Performance Signal */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-brand-orange" />
                      <h2 className="text-sm sm:text-base font-black text-brand-charcoal tracking-tight">
                        Learning Confidence
                      </h2>
                    </div>

                    {confidence && (
                      <span
                        className={cn(
                          "px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border",
                          confidence.level === "HIGH" && "bg-emerald-50 border-emerald-200 text-emerald-800",
                          confidence.level === "MEDIUM" && "bg-blue-50 border-blue-200 text-blue-800",
                          confidence.level === "DEVELOPING" && "bg-amber-50 border-amber-200 text-amber-800",
                          confidence.level === "BUILDING_PROFILE" && "bg-gray-100 border-gray-200 text-gray-700"
                        )}
                      >
                        {confidence.label}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs sm:text-sm text-brand-charcoal/80 font-medium leading-relaxed">
                      {confidence?.description ||
                        "Your learning confidence signal is evaluated from lecture completion pace, live class attendance, and chapter test attempts on TopVeda."}
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-2xl bg-[#FDFDFC] border border-gray-100">
                        <span className="text-[10px] font-bold text-brand-text-muted uppercase">
                          Assessment Average
                        </span>
                        <div className="text-lg font-black text-brand-charcoal tabular-nums mt-0.5">
                          {avgTestScore !== null ? `${avgTestScore}%` : "No data yet"}
                        </div>
                      </div>

                      <div className="p-3 rounded-2xl bg-[#FDFDFC] border border-gray-100">
                        <span className="text-[10px] font-bold text-brand-text-muted uppercase">
                          Best Score
                        </span>
                        <div className="text-lg font-black text-brand-charcoal tabular-nums mt-0.5">
                          {bestTestScore !== null ? `${bestTestScore}%` : "No data yet"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-brand-text-subtle font-medium">
                    * TopVeda educational signal based strictly on verified study logs and test submissions.
                  </p>
                </div>
              </div>

              {/* SECTION 3: COURSE / BATCH PROGRESS BREAKDOWN */}
              {courseList.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                        Course &amp; Batch Breakdown
                      </h2>
                      <p className="text-xs text-brand-text-muted">
                        Detailed lecture, live session, and quiz progress per enrollment
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courseList.map((course) => (
                      <div
                        key={course.enrollmentId}
                        className="p-5 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-text-muted">
                              {course.boardLabel}
                            </span>
                            <h3 className="text-sm sm:text-base font-black text-brand-charcoal truncate">
                              {course.title}
                            </h3>
                            {course.educatorName && (
                              <p className="text-xs font-semibold text-brand-text-muted mt-0.5">
                                Faculty: {course.educatorName}
                              </p>
                            )}
                          </div>

                          <span
                            className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 border",
                              course.isCompleted
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-orange-50 border-orange-100 text-brand-orange"
                            )}
                          >
                            {course.isCompleted ? "Completed" : `${course.progressPercent}%`}
                          </span>
                        </div>

                        {/* Metrics Bar */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-brand-charcoal">
                            <span>Lectures: {course.completedLectures} / {course.totalLectures}</span>
                            <span className="tabular-nums font-bold">{course.progressPercent}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full bg-brand-orange rounded-full transition-all duration-700"
                              style={{ width: `${Math.max(course.progressPercent, 4)}%` }}
                            />
                          </div>
                        </div>

                        {/* Sub-metrics */}
                        <div className="flex items-center justify-between text-xs text-brand-text-muted pt-1 border-t border-gray-100">
                          <span>Live: {course.liveClassesAttended} attended</span>
                          <span>Tests: {course.testsAttempted} attempted</span>
                          <Link
                            href={course.resumeUrl}
                            className="font-bold text-brand-orange hover:underline flex items-center gap-0.5"
                          >
                            <span>Resume</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 4: SUBJECT-WISE PROGRESS */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                      Subject-wise Progress
                    </h2>
                    <p className="text-xs text-brand-text-muted">
                      Calculated from your watched lectures in each subject
                    </p>
                  </div>
                </div>

                {subjectList.length > 0 ? (
                  <div className="p-5 sm:p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-5">
                    {subjectList.map((sub) => {
                      const { Icon, badgeBg, barColor } = getSubjectIcon(sub.subjectName);

                      return (
                        <div
                          key={sub.subjectId}
                          className="flex items-center gap-3.5 sm:gap-5 justify-between"
                        >
                          {/* Left: Subject Icon & Title */}
                          <div className="flex items-center gap-3 w-36 sm:w-48 shrink-0">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-3xs",
                                badgeBg
                              )}
                            >
                              <Icon className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs sm:text-sm font-bold text-brand-charcoal truncate block">
                                {sub.subjectName}
                              </span>
                              <span className="text-[10px] font-semibold text-brand-text-muted tabular-nums">
                                {sub.completedLectures} / {sub.totalLectures} Lecs
                              </span>
                            </div>
                          </div>

                          {/* Center: Progress Bar */}
                          <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-gray-100 overflow-hidden relative max-w-md">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700", barColor)}
                              style={{ width: `${Math.max(sub.progressPercent, 3)}%` }}
                            />
                          </div>

                          {/* Right: Percentage */}
                          <div className="w-12 text-right shrink-0">
                            <span className="text-xs sm:text-sm font-extrabold text-brand-charcoal tabular-nums">
                              {sub.progressPercent}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-orange">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <p className="text-sm font-bold text-brand-charcoal">
                        No subject progress recorded yet
                      </p>
                      <p className="text-xs text-brand-text-muted">
                        Enroll in courses to begin tracking your subject-wise lecture completion.
                      </p>
                    </div>
                    <Link
                      href="/student/learning"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange hover:underline pt-1"
                    >
                      <span>Go to My Learning</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
              </div>

              {/* SECTION 5: RECENT TEST RESULTS */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                      Recent Test Results
                    </h2>
                    <p className="text-xs text-brand-text-muted">
                      Your evaluated scores and attempt performance
                    </p>
                  </div>
                  <Link
                    href="/student/tests"
                    className="text-xs font-bold text-brand-orange hover:text-brand-orange-hover flex items-center gap-1 transition-colors"
                  >
                    <span>Practice Tests</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {testResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {testResults.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <span className="text-[10px] font-extrabold uppercase text-brand-text-muted">
                              {t.subjectName}
                            </span>
                            <h3 className="text-xs sm:text-sm font-bold text-brand-charcoal truncate">
                              {t.testTitle}
                            </h3>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 border",
                              t.percentage >= 60
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-amber-50 border-amber-200 text-amber-800"
                            )}
                          >
                            {t.percentage}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-brand-text-muted pt-1 border-t border-gray-100">
                          <span className="font-semibold text-brand-charcoal">
                            Score: {t.scoreObtained}/{t.maxScore}
                          </span>
                          <span>
                            {new Date(t.attemptedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-brand-charcoal">
                          Not enough test data yet
                        </h3>
                        <p className="text-xs text-brand-text-muted">
                          Your scores, accuracy benchmarks, and scorecard analytics will populate here once you submit tests.
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/student/tests"
                      className="inline-flex items-center justify-center px-5 py-2 rounded-full bg-brand-orange text-white text-xs font-bold shadow-xs hover:bg-brand-orange-hover transition-colors shrink-0"
                    >
                      Take a Test
                    </Link>
                  </div>
                )}
              </div>

              {/* SECTION 6: AREAS TO IMPROVE (Constructive Learning Signals) */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FFF8F5] via-[#FFF3EC] to-[#FFF6F0] border border-orange-200/80 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-brand-orange">
                  <Target className="h-4 w-4 stroke-[2.5]" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-charcoal">
                    Areas to Improve
                  </h3>
                </div>

                {focusAreas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {focusAreas.map((area, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-white/90 border border-orange-200/80 shadow-3xs flex flex-col justify-between space-y-2"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-orange">
                            {area.subject}
                          </span>
                          <p className="text-xs font-semibold text-brand-charcoal leading-relaxed">
                            {area.reason}
                          </p>
                        </div>
                        <Link
                          href={area.actionUrl}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange hover:underline pt-1"
                        >
                          <span>{area.actionLabel}</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-brand-charcoal/80">
                    All enrolled coursework is progressing well. Keep maintaining your daily study habits!
                  </p>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Floating AI Chatbot Assistant */}
      <FloatingChatbot />
    </div>
  );
}
