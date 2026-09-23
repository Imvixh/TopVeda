"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import {
  MyLearningData,
  EnrolledCourseCardData,
  RecommendedCourseCardData,
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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Icon resolution helper for subject icons matching the reference visual style
function getSubjectIcon(category: string, iconType?: string) {
  const cat = (category || "").toLowerCase();
  const type = (iconType || "").toLowerCase();

  if (cat.includes("math") || type.includes("math") || type.includes("calc")) {
    return {
      Icon: Calculator,
      bg: "bg-[#EBF2FF] border border-[#D0E2FF] text-[#2F6BFF]",
      barColor: "bg-[#059669]", // Emerald bar like reference
    };
  }
  if (cat.includes("sci") || cat.includes("chem") || cat.includes("bio") || type.includes("flask")) {
    return {
      Icon: FlaskConical,
      bg: "bg-[#E6F8F0] border border-[#C1EED9] text-[#059669]",
      barColor: "bg-[#0D9488]", // Teal/emerald bar
    };
  }
  if (cat.includes("eng") || cat.includes("comm") || type.includes("book")) {
    return {
      Icon: BookOpen,
      bg: "bg-[#FFF4E8] border border-[#FFE2C2] text-[#F97316]",
      barColor: "bg-[#6366F1]", // Indigo bar
    };
  }
  if (cat.includes("comp") || cat.includes("applic") || type.includes("tech")) {
    return {
      Icon: Tv,
      bg: "bg-[#EAF5FF] border border-[#CDE7FE] text-[#0284C7]",
      barColor: "bg-[#0284C7]",
    };
  }
  if (cat.includes("social") || cat.includes("history") || cat.includes("geo")) {
    return {
      Icon: Globe,
      bg: "bg-[#F3E8FF] border border-[#E4CEFF] text-[#9333EA]",
      barColor: "bg-[#9333EA]",
    };
  }

  return {
    Icon: Atom,
    bg: "bg-[#FFF0EB] border border-[#FFD9CC] text-[#FF5722]",
    barColor: "bg-[#FF5722]",
  };
}

export default function MyLearningPage() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

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

  // Handle explicit enrollment action from Recommended for You section
  const handleEnrollCourse = async (courseId: string) => {
    try {
      setIsEnrollingId(courseId);
      const res = await fetch("/api/student/learning/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      if (res.ok) {
        // Refresh learning data to reflect new enrollment
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

        {/* My Learning Canvas (Faithfully reproducing the reference image layout) */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1000px] w-full mx-auto space-y-6">
          {/* Header Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              My Learning
            </h1>
            <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
              Your enrolled courses and learning progress
            </p>
          </div>

          {/* Tabs: Enrolled Courses & Completed */}
          <div className="flex items-center gap-6 border-b border-gray-200/80 pt-1 pb-2">
            <button
              onClick={() => setActiveTab("enrolled")}
              className={cn(
                "relative pb-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none",
                activeTab === "enrolled"
                  ? "text-brand-orange"
                  : "text-brand-text-muted hover:text-brand-charcoal"
              )}
            >
              <span>Enrolled Courses</span>
              {enrolledCourses.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-brand-orange">
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
                "relative pb-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer select-none",
                activeTab === "completed"
                  ? "text-brand-orange"
                  : "text-brand-text-muted hover:text-brand-charcoal"
              )}
            >
              <span>Completed</span>
              {completedCourses.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-700">
                  {completedCourses.length}
                </span>
              )}
              {activeTab === "completed" && (
                <span className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-brand-orange rounded-full" />
              )}
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-4 py-8">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="p-5 rounded-2xl bg-white border border-gray-100 shadow-2xs flex items-center justify-between gap-4 animate-pulse"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gray-100" />
                    <div className="space-y-2 flex-1 max-w-md">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/4" />
                      <div className="h-2 bg-gray-100 rounded w-3/4 mt-2" />
                    </div>
                  </div>
                  <div className="w-24 h-9 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {/* Active Tab 1: Enrolled Courses List */}
          {!isLoading && activeTab === "enrolled" && (
            <div className="space-y-4">
              {enrolledCourses.length > 0 ? (
                enrolledCourses.map((course) => {
                  const { Icon, bg, barColor } = getSubjectIcon(course.category, course.iconType);

                  return (
                    <div
                      key={course.id}
                      className="group p-4 sm:p-5 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card hover:border-brand-orange/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left: Subject Icon & Course Info */}
                      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                        {/* Square Subject Icon Badge */}
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                            bg
                          )}
                        >
                          <Icon className="h-6 w-6 stroke-[2.2]" />
                        </div>

                        {/* Title, Board, Progress */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <Link
                            href={course.detailsUrl}
                            className="group/title inline-flex items-center gap-1 text-sm sm:text-base font-black text-brand-charcoal hover:text-brand-orange transition-colors truncate max-w-full"
                          >
                            <span className="truncate">{course.title}</span>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover/title:text-brand-orange transition-transform group-hover/title:translate-x-0.5 shrink-0" />
                          </Link>

                          <p className="text-[11px] sm:text-xs font-semibold text-brand-text-muted/90">
                            {course.boardName}
                            {course.batchTitle ? ` · ${course.batchTitle}` : ""}
                          </p>

                          {/* Progress Row */}
                          <div className="pt-1.5 flex items-center gap-3 max-w-sm sm:max-w-md">
                            <span className="text-[11px] font-bold text-brand-text-muted/80 shrink-0">
                              Progress
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden relative">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", barColor)}
                                style={{ width: `${Math.max(course.progressPercent, 4)}%` }}
                              />
                            </div>
                            <span className="text-xs font-extrabold text-brand-charcoal tabular-nums shrink-0">
                              {course.progressPercent}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Continue & View Details Actions */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <Link
                          href={course.resumeUrl}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center px-6 py-2 sm:py-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-[0.98]"
                        >
                          Continue
                        </Link>

                        <Link
                          href={course.detailsUrl}
                          className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold text-brand-text-muted hover:text-brand-orange hover:bg-orange-50 transition-colors"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty State for Enrolled Courses */
                <div className="p-8 sm:p-12 rounded-3xl bg-white border border-brand-border/80 shadow-2xs text-center space-y-4">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-orange">
                    <GraduationCap className="h-7 w-7" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                      You haven&apos;t enrolled in any courses yet
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
                      Explore our published board curricula below and enroll with a single click to start learning.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Tab 2: Completed Courses List */}
          {!isLoading && activeTab === "completed" && (
            <div className="space-y-4">
              {completedCourses.length > 0 ? (
                completedCourses.map((course) => {
                  const { Icon, bg } = getSubjectIcon(course.category, course.iconType);

                  return (
                    <div
                      key={course.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                            bg
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm sm:text-base font-black text-brand-charcoal truncate">
                              {course.title}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 shrink-0">
                              <CheckCircle2 className="h-3 w-3" />
                              Completed
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-brand-text-muted">
                            {course.boardName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={course.detailsUrl}
                          className="px-5 py-2 rounded-full border border-gray-200 hover:border-brand-orange text-xs font-bold text-brand-text-primary hover:text-brand-orange transition-colors"
                        >
                          Review Syllabus
                        </Link>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty State for Completed Courses */
                <div className="p-8 sm:p-12 rounded-3xl bg-white border border-brand-border/80 shadow-2xs text-center space-y-4">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <Award className="h-7 w-7" />
                  </div>
                  <div className="space-y-1 max-w-md mx-auto">
                    <h3 className="text-base sm:text-lg font-black text-brand-charcoal">
                      No completed courses yet
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
                      Watch all published lectures in your enrolled courses to achieve 100% completion.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section: Recommended for You (Faithful to Reference Image Layout) */}
          {!isLoading && recommendedCourses.length > 0 && (
            <div className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                  Recommended for You
                </h2>
                <span className="text-[11px] font-semibold text-brand-text-muted">
                  Based on your academic profile
                </span>
              </div>

              <div className="space-y-3.5">
                {recommendedCourses.map((rec) => {
                  const { Icon, bg } = getSubjectIcon(rec.category, rec.iconType);
                  const isEnrolling = isEnrollingId === rec.id;

                  return (
                    <div
                      key={rec.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card hover:border-brand-orange/30 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Left: Icon & Info */}
                      <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                        <div
                          className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs",
                            bg
                          )}
                        >
                          <Icon className="h-6 w-6 stroke-[2.2]" />
                        </div>

                        <div className="space-y-0.5 flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-brand-charcoal truncate">
                            {rec.title}
                          </h3>
                          <p className="text-[11px] sm:text-xs font-medium text-brand-text-muted truncate">
                            {rec.topicsSubtitle || rec.boardName}
                          </p>
                        </div>
                      </div>

                      {/* Right: Explore / Enroll Action Button */}
                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          onClick={() => handleEnrollCourse(rec.id)}
                          disabled={isEnrolling}
                          className={cn(
                            "inline-flex items-center justify-center px-6 py-2 rounded-full border border-orange-200 hover:border-brand-orange bg-white hover:bg-orange-50 text-brand-orange text-xs sm:text-sm font-bold shadow-2xs transition-all active:scale-[0.98] cursor-pointer",
                            isEnrolling && "opacity-70 cursor-wait"
                          )}
                        >
                          {isEnrolling ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                              <span>Enrolling...</span>
                            </>
                          ) : (
                            <span>Explore</span>
                          )}
                        </button>
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
