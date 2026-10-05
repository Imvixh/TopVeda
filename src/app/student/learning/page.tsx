"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import {
  MyLearningData,
  EnrolledCourseCardData,
  RecommendedCourseCardData,
  ContinueLearningCheckpoint,
} from "@/types/student-learning.types";
import {
  Calculator,
  FlaskConical,
  BookOpen,
  Atom,
  Tv,
  Globe,
  Award,
  Sparkles,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  Loader2,
  User,
  Clock,
  Layers,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Subject Theme Helper
function getSubjectTheme(category: string, iconType?: string) {
  const cat = (category || "").toLowerCase();
  const type = (iconType || "").toLowerCase();

  if (cat.includes("math") || type.includes("math") || type.includes("calc")) {
    return {
      Icon: Calculator,
      badgeBg: "bg-[#EBF2FF] border-[#D0E2FF] text-[#2F6BFF]",
      barColor: "bg-[#059669]", // Emerald bar
      accentBorder: "hover:border-[#2F6BFF]/40",
    };
  }
  if (cat.includes("sci") || cat.includes("chem") || cat.includes("bio") || cat.includes("phy") || type.includes("flask")) {
    return {
      Icon: FlaskConical,
      badgeBg: "bg-[#E6F8F0] border-[#C1EED9] text-[#059669]",
      barColor: "bg-[#0D9488]",
      accentBorder: "hover:border-[#059669]/40",
    };
  }
  if (cat.includes("eng") || cat.includes("comm") || type.includes("book")) {
    return {
      Icon: BookOpen,
      badgeBg: "bg-[#FFF4E8] border-[#FFE2C2] text-[#F97316]",
      barColor: "bg-[#6366F1]",
      accentBorder: "hover:border-[#F97316]/40",
    };
  }
  if (cat.includes("comp") || cat.includes("applic") || type.includes("tech") || type.includes("tv")) {
    return {
      Icon: Tv,
      badgeBg: "bg-[#EAF5FF] border-[#CDE7FE] text-[#0284C7]",
      barColor: "bg-[#0284C7]",
      accentBorder: "hover:border-[#0284C7]/40",
    };
  }
  if (cat.includes("social") || cat.includes("history") || cat.includes("geo")) {
    return {
      Icon: Globe,
      badgeBg: "bg-[#F3E8FF] border-[#E4CEFF] text-[#9333EA]",
      barColor: "bg-[#9333EA]",
      accentBorder: "hover:border-[#9333EA]/40",
    };
  }

  return {
    Icon: Atom,
    badgeBg: "bg-[#FFF0EB] border-[#FFD9CC] text-[#FF5722]",
    barColor: "bg-[#FF5722]",
    accentBorder: "hover:border-[#FF5722]/40",
  };
}

export default function MyLearningPage() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = React.useState<"enrolled" | "completed">("enrolled");
  const [learningData, setLearningData] = React.useState<MyLearningData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isEnrollingId, setIsEnrollingId] = React.useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // Fetch real student learning data from server API
  const fetchMyLearning = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/student/learning");
      if (res.ok) {
        const data: MyLearningData = await res.json();
        setLearningData(data);
      }
    } catch (err) {
      console.error("Failed to load student learning data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchMyLearning();
    }
  }, [isAuthLoading, fetchMyLearning]);

  // Handle explicit enrollment action from Recommended section
  const handleEnrollItem = async (params: { courseId?: string; batchId?: string }) => {
    const targetKey = params.batchId || params.courseId;
    if (!targetKey) return;

    try {
      setIsEnrollingId(targetKey);
      const res = await fetch("/api/student/learning/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        await fetchMyLearning();
      } else {
        const err = await res.json();
        alert(err.error || "Enrollment failed. Please try again.");
      }
    } catch (err) {
      console.error("Enrollment error:", err);
    } finally {
      setIsEnrollingId(null);
    }
  };

  const enrolledCourses = learningData?.enrolledCourses || [];
  const completedCourses = learningData?.completedCourses || [];
  const recommendedCourses = learningData?.recommendedCourses || [];
  const continueItem = learningData?.continueLearningItem || null;

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

        {/* My Learning Canvas */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1120px] w-full mx-auto space-y-7">
          {/* Header Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              My Learning
            </h1>
            <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
              Your enrolled courses, batches, active checkpoints, and learning progress
            </p>
          </div>

          {/* Continue Learning Checkpoint Hero Card (If active lecture exists) */}
          {!isLoading && continueItem && (
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#FFF9F5] via-[#FFF3EC] to-[#FFEDE3] border border-orange-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-orange text-white text-[10px] font-extrabold uppercase tracking-wider shadow-3xs">
                    <Sparkles className="h-3 w-3" />
                    <span>Continue Learning</span>
                  </div>

                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal truncate">
                    {continueItem.courseTitle}
                  </h2>

                  <p className="text-xs sm:text-sm font-semibold text-brand-charcoal/80 flex items-center gap-2 truncate">
                    <PlayCircle className="h-4 w-4 text-brand-orange shrink-0" />
                    <span className="truncate">
                      {continueItem.chapterTitle ? `${continueItem.chapterTitle} • ` : ""}
                      {continueItem.lectureTitle}
                    </span>
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-brand-text-muted font-medium pt-0.5">
                    {continueItem.educatorName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-brand-text-subtle" />
                        {continueItem.educatorName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-brand-text-subtle" />
                      {continueItem.durationFormatted || "45 min"}
                    </span>
                    <span>{continueItem.boardName}</span>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end justify-center gap-2 shrink-0">
                  <Link
                    href={continueItem.resumeUrl}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-extrabold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <span>Resume Lecture</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <span className="text-[11px] font-bold text-brand-text-muted">
                    {continueItem.progressPercent > 0
                      ? `${continueItem.progressPercent}% Completed`
                      : "Ready to Start"}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 rounded-full bg-orange-200/50 overflow-hidden">
                <div
                  className="h-full bg-brand-orange rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(continueItem.progressPercent, 4)}%` }}
                />
              </div>
            </div>
          )}

          {/* Section Tabs: Enrolled Courses & Batches | Completed */}
          <div className="flex items-center gap-6 border-b border-gray-200/80 pt-1 pb-2">
            <button
              onClick={() => setActiveTab("enrolled")}
              className={cn(
                "relative pb-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center gap-2",
                activeTab === "enrolled"
                  ? "text-brand-orange"
                  : "text-brand-text-muted hover:text-brand-charcoal"
              )}
            >
              <span>Enrolled Courses &amp; Batches</span>
              {enrolledCourses.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-brand-orange">
                  {enrolledCourses.length}
                </span>
              )}
              {activeTab === "enrolled" && (
                <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-brand-orange rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("completed")}
              className={cn(
                "relative pb-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none flex items-center gap-2",
                activeTab === "completed"
                  ? "text-brand-orange"
                  : "text-brand-text-muted hover:text-brand-charcoal"
              )}
            >
              <span>Completed</span>
              {completedCourses.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                  {completedCourses.length}
                </span>
              )}
              {activeTab === "completed" && (
                <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-brand-orange rounded-full" />
              )}
            </button>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="p-5 rounded-3xl bg-white border border-gray-100 shadow-2xs space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                  <div className="h-3 bg-gray-100 rounded w-full" />
                  <div className="h-9 bg-gray-100 rounded-full w-full" />
                </div>
              ))}
            </div>
          )}

          {/* TAB 1: Enrolled Courses & Batches Grid */}
          {!isLoading && activeTab === "enrolled" && (
            <div>
              {enrolledCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {enrolledCourses.map((item) => {
                    const { Icon, badgeBg, barColor, accentBorder } = getSubjectTheme(
                      item.category,
                      item.iconType
                    );

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "group p-5 sm:p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card transition-all duration-200 flex flex-col justify-between space-y-5",
                          accentBorder
                        )}
                      >
                        {/* Top Card Header */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-3xs",
                                  badgeBg
                                )}
                              >
                                <Icon className="h-6 w-6 stroke-[2.2]" />
                              </div>
                              <div className="min-w-0">
                                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-brand-text-muted">
                                  {item.boardName}
                                </span>
                                <h3 className="text-sm sm:text-base font-black text-brand-charcoal truncate">
                                  {item.title}
                                </h3>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 border border-orange-100 text-brand-orange shrink-0">
                              Enrolled
                            </span>
                          </div>

                          {/* Subtitle / Batch Name */}
                          {(item.batchTitle || item.batchSubtitle) && (
                            <p className="text-xs font-semibold text-brand-text-muted line-clamp-1">
                              {item.batchTitle || item.batchSubtitle}
                            </p>
                          )}

                          {/* Lead Educator / Faculty */}
                          {item.educatorName && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-brand-charcoal/90 pt-0.5">
                              <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-brand-orange shrink-0">
                                {item.educatorName.charAt(0)}
                              </div>
                              <span className="text-[11px] text-brand-text-muted">Faculty:</span>
                              <span className="text-[11px] font-bold text-brand-charcoal truncate">
                                {item.educatorName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Progress Section */}
                        <div className="space-y-2 pt-1 border-t border-gray-100/90">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-brand-charcoal">
                              Progress: {item.progressPercent}%
                            </span>
                            <span className="font-semibold text-brand-text-muted tabular-nums">
                              {item.completedLectures} / {item.totalLectures} Lectures
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden relative">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", barColor)}
                              style={{ width: `${Math.max(item.progressPercent, 3)}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2.5 pt-1">
                          <Link
                            href={item.resumeUrl}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                          >
                            <span>Continue Learning</span>
                            <ChevronRight className="h-4 w-4" />
                          </Link>

                          <Link
                            href={item.detailsUrl}
                            className="px-4 py-2.5 rounded-full border border-gray-200 hover:border-brand-orange hover:bg-orange-50 text-xs font-bold text-brand-text-muted hover:text-brand-orange transition-colors"
                          >
                            Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty State for Enrolled Courses */
                <div className="p-8 sm:p-12 rounded-3xl bg-white border border-brand-border/80 shadow-2xs text-center space-y-4">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-orange">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                      You haven&apos;t enrolled in any courses yet
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
                      Explore our published curricula below and enroll to start your structured learning journey.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Completed Courses Section */}
          {!isLoading && activeTab === "completed" && (
            <div>
              {completedCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {completedCourses.map((item) => {
                    const { Icon, badgeBg } = getSubjectTheme(item.category, item.iconType);

                    return (
                      <div
                        key={item.id}
                        className="p-5 sm:p-6 rounded-3xl bg-white border border-emerald-200/80 shadow-2xs flex flex-col justify-between space-y-5"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-3xs",
                                  badgeBg
                                )}
                              >
                                <Icon className="h-6 w-6" />
                              </div>
                              <div className="min-w-0">
                                <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                                  {item.boardName}
                                </span>
                                <h3 className="text-sm sm:text-base font-black text-brand-charcoal truncate">
                                  {item.title}
                                </h3>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 border border-emerald-200 text-emerald-800 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />
                              100% Completed
                            </span>
                          </div>

                          {item.educatorName && (
                            <p className="text-xs font-semibold text-brand-text-muted">
                              Faculty: {item.educatorName}
                            </p>
                          )}
                        </div>

                        {/* 100% Progress Confirmation */}
                        <div className="space-y-1.5 pt-1 border-t border-emerald-100">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                            <span>Status: Completed</span>
                            <span>{item.totalLectures} / {item.totalLectures} Lectures</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-emerald-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full w-full" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Link
                            href={item.detailsUrl}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border border-gray-200 hover:border-brand-orange hover:bg-orange-50 text-xs sm:text-sm font-bold text-brand-charcoal hover:text-brand-orange transition-colors"
                          >
                            <span>Review Syllabus</span>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty State for Completed */
                <div className="p-8 sm:p-12 rounded-3xl bg-white border border-brand-border/80 shadow-2xs text-center space-y-4">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Award className="h-7 w-7" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                      No completed courses yet
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
                      Watch all published lectures in your enrolled courses to achieve 100% completion certificates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Recommended For You (Real Database Offerings) */}
          {!isLoading && recommendedCourses.length > 0 && (
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                    Recommended For You
                  </h2>
                  <p className="text-xs font-medium text-brand-text-muted">
                    Curated courses and batches available for enrollment
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedCourses.map((rec) => {
                  const { Icon, badgeBg, accentBorder } = getSubjectTheme(rec.category, rec.iconType);
                  const isEnrolling = isEnrollingId === (rec.courseId || rec.id);

                  return (
                    <div
                      key={rec.id}
                      className={cn(
                        "p-5 rounded-3xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card transition-all duration-200 flex flex-col justify-between space-y-4",
                        accentBorder
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 shadow-3xs",
                            badgeBg
                          )}
                        >
                          <Icon className="h-5 w-5 stroke-[2.2]" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-text-muted">
                            {rec.boardName}
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-brand-charcoal truncate">
                            {rec.title}
                          </h3>
                          <p className="text-xs font-medium text-brand-text-muted line-clamp-2">
                            {rec.topicsSubtitle || "Comprehensive curriculum coverage, notes & practice tests."}
                          </p>
                          {rec.educatorName && (
                            <p className="text-[11px] font-semibold text-brand-charcoal/80 pt-0.5">
                              Faculty: {rec.educatorName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                        {rec.accessTier === "FREE" ? (
                          <button
                            onClick={() => handleEnrollItem({ courseId: rec.courseId || undefined, batchId: rec.batchId || undefined })}
                            disabled={isEnrolling}
                            className={cn(
                              "inline-flex items-center justify-center px-5 py-2 rounded-full border border-orange-200 hover:border-brand-orange bg-white hover:bg-orange-50 text-brand-orange text-xs font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer",
                              isEnrolling && "opacity-70 cursor-wait"
                            )}
                          >
                            {isEnrolling ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                <span>Enrolling...</span>
                              </>
                            ) : (
                              <span>Enroll Now</span>
                            )}
                          </button>
                        ) : null}

                        <Link
                          href={rec.exploreUrl}
                          className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand-charcoal hover:bg-brand-charcoal/90 text-white text-xs font-bold transition-colors"
                        >
                          Explore
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Floating AI Chatbot Assistant */}
      <FloatingChatbot />
    </div>
  );
}
