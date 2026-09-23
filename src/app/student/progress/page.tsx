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
  Loader2,
  Target,
  FileCheck,
  TrendingUp,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Subject Icon Resolver matching the Reference Visual Hierarchy
function getSubjectIconComponent(subjectName: string) {
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
      barColor: "bg-[#0284C7]", // Sky blue bar
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
      barColor: "bg-[#2563EB]", // Royal blue bar
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
  const coursesCompleted = summary?.coursesCompleted || 0;
  const lecturesWatched = summary?.lecturesWatched || 0;
  const testsAttempted = summary?.testsAttempted || 0;
  const quizzesAttempted = summary?.quizzesAttempted || 0;
  const subjectList = summary?.subjectProgress || [];
  const testResults = summary?.recentTestResults || [];
  const focusAreas = summary?.areasToImprove || [];

  // Radial progress circle math
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

        {/* Progress Tracker Canvas (Faithfully reproducing the reference image layout) */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1000px] w-full mx-auto space-y-7">
          {/* Header Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              My Progress
            </h1>
            <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
              Track your learning journey
            </p>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-6 animate-pulse py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="h-48 rounded-3xl bg-white border border-gray-100 p-6" />
                <div className="h-48 rounded-3xl bg-white border border-gray-100 p-6" />
              </div>
              <div className="h-64 rounded-3xl bg-white border border-gray-100 p-6" />
            </div>
          ) : (
            <>
              {/* TOP SECTION: Overall Progress & Metric Counters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Card 1: Overall Progress (Radial Circular Gauge) */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col items-center justify-between text-center relative overflow-hidden">
                  <h2 className="text-sm sm:text-base font-black text-brand-charcoal tracking-tight w-full text-left">
                    Overall Progress
                  </h2>

                  <div className="py-3 flex flex-col items-center justify-center relative">
                    <svg className="w-36 h-36 sm:w-40 sm:h-40 transform -rotate-90">
                      {/* Background track circle */}
                      <circle
                        cx="72"
                        cy="72"
                        r={radius}
                        className="stroke-[#EBF5F0]"
                        strokeWidth="11"
                        fill="transparent"
                      />
                      {/* Foreground progress arc */}
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

                    {/* Centered Percentage Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums tracking-tight">
                        {overallPercent}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-brand-text-muted">
                    Lecture-weighted completion rate across enrolled courses
                  </p>
                </div>

                {/* Card 2: High-Level Metric Counter List */}
                <div className="p-6 sm:p-7 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col justify-center space-y-4">
                  {/* Row 1: Courses Completed */}
                  <div className="flex items-center gap-4">
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums w-10 shrink-0 text-center">
                      {coursesCompleted}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-brand-text-muted/90">
                      Courses Completed
                    </span>
                  </div>

                  {/* Row 2: Lectures Watched */}
                  <div className="flex items-center gap-4">
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums w-10 shrink-0 text-center">
                      {lecturesWatched}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-brand-text-muted/90">
                      Lectures Watched
                    </span>
                  </div>

                  {/* Row 3: Tests Attempted */}
                  <div className="flex items-center gap-4">
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums w-10 shrink-0 text-center">
                      {testsAttempted}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-brand-text-muted/90">
                      Tests Attempted
                    </span>
                  </div>

                  {/* Row 4: Quizzes Attempted */}
                  <div className="flex items-center gap-4">
                    <span className="text-2xl sm:text-3xl font-black text-brand-charcoal tabular-nums w-10 shrink-0 text-center">
                      {quizzesAttempted}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-brand-text-muted/90">
                      Quizzes Attempted
                    </span>
                  </div>
                </div>
              </div>

              {/* MIDDLE SECTION: Subject-wise Progress */}
              <div className="space-y-3.5 pt-2">
                <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                  Subject-wise Progress
                </h2>

                {subjectList.length > 0 ? (
                  <div className="p-4 sm:p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-5">
                    {subjectList.map((sub) => {
                      const { Icon, badgeBg, barColor } = getSubjectIconComponent(sub.subjectName);

                      return (
                        <div
                          key={sub.subjectId}
                          className="flex items-center gap-3.5 sm:gap-5 justify-between"
                        >
                          {/* Left: Subject Icon & Title */}
                          <div className="flex items-center gap-3 w-32 sm:w-44 shrink-0">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-3xs",
                                badgeBg
                              )}
                            >
                              <Icon className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <span className="text-xs sm:text-sm font-bold text-brand-charcoal truncate">
                              {sub.subjectName}
                            </span>
                          </div>

                          {/* Center: Linear Progress Bar */}
                          <div className="flex-1 h-2 sm:h-2.5 rounded-full bg-gray-100 overflow-hidden relative max-w-md">
                            <div
                              className={cn("h-full rounded-full transition-all duration-700", barColor)}
                              style={{ width: `${Math.max(sub.progressPercent, 3)}%` }}
                            />
                          </div>

                          {/* Right: Percentage Text */}
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
                  /* Empty state for zero enrolled subjects */
                  <div className="p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs text-center space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-orange">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 max-w-sm mx-auto">
                      <p className="text-sm font-bold text-brand-charcoal">
                        No subject progress recorded yet
                      </p>
                      <p className="text-xs text-brand-text-muted">
                        Enroll in courses on TopVeda to begin tracking your subject-wise completion.
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

              {/* LOWER SECTION: Recent Test Results (Assessment Performance) */}
              <div className="space-y-3.5 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                    Recent Test Results
                  </h2>
                  <Link
                    href="/student/tests"
                    className="text-xs font-bold text-brand-orange hover:text-brand-orange-hover flex items-center gap-1 transition-colors"
                  >
                    <span>See All</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {testResults.length > 0 ? (
                  <div className="space-y-3">
                    {testResults.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-orange">
                            <FileCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-brand-charcoal">
                              {t.testTitle}
                            </h3>
                            <p className="text-[11px] font-semibold text-brand-text-muted">
                              Score: {t.scoreObtained}/{t.maxScore}
                            </p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                          Passed
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Polished Assessment Card (No fake numbers) */
                  <div className="p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                        <FileCheck className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-bold text-brand-charcoal">
                          Practice & Chapter Tests
                        </h3>
                        <p className="text-[11px] font-medium text-brand-text-muted">
                          Your test scores, scorecards, and accuracy analytics will appear here after attempting tests.
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/student/tests"
                      className="px-4 py-1.5 rounded-full border border-orange-200 hover:border-brand-orange text-xs font-bold text-brand-orange hover:bg-orange-50 transition-colors shrink-0"
                    >
                      Explore Tests
                    </Link>
                  </div>
                )}
              </div>

              {/* BOTTOM CARD: Areas to improve */}
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FFF8F5] via-[#FFF3EC] to-[#FFF6F0] border border-orange-200/70 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-brand-orange">
                  <Target className="h-4 w-4 stroke-[2.5]" />
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-charcoal">
                    Areas to improve
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {focusAreas.map((area, idx) => (
                    <span
                      key={idx}
                      className="px-3.5 py-1.5 rounded-full bg-white/90 border border-orange-200/80 text-brand-charcoal text-xs font-bold shadow-3xs"
                    >
                      {area}
                    </span>
                  ))}
                </div>
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
