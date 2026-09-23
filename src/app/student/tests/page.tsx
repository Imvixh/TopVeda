"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { StudentTestItem } from "@/types/assessment.types";
import {
  Calculator,
  FlaskConical,
  BookOpen,
  Atom,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Target,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Subject Icon Resolver matching TopVeda Brand Hierarchy
function getSubjectIcon(subjectName: string) {
  const name = (subjectName || "").toLowerCase();
  if (name.includes("math")) return Calculator;
  if (name.includes("sci") || name.includes("phy") || name.includes("chem") || name.includes("bio")) return FlaskConical;
  if (name.includes("eng") || name.includes("lang")) return BookOpen;
  return Atom;
}

export default function StudentTestsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tests, setTests] = React.useState<StudentTestItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"all" | "quiz" | "mock" | "completed">("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const fetchTests = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/student/tests");
      if (res.ok) {
        const data: StudentTestItem[] = await res.json();
        setTests(data);
      }
    } catch (err) {
      console.error("Failed to load tests:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchTests();
    }
  }, [isAuthLoading, fetchTests]);

  const filteredTests = React.useMemo(() => {
    if (activeTab === "quiz") {
      return tests.filter((t) => t.testType === "chapter_quiz" || t.testType === "practice_drill");
    }
    if (activeTab === "mock") {
      return tests.filter((t) => t.testType === "mock_exam" || t.testType === "sample_paper_test");
    }
    if (activeTab === "completed") {
      return tests.filter((t) => t.isAttempted);
    }
    return tests;
  }, [tests, activeTab]);

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

        {/* Tests & Practice Canvas */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1000px] w-full mx-auto space-y-7">
          {/* Header Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              Tests & Practice
            </h1>
            <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
              Chapter drills, question banks & full-length board mock exams
            </p>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-brand-border/60 pb-3 overflow-x-auto select-none no-scrollbar">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === "all"
                  ? "bg-brand-charcoal text-white shadow-xs"
                  : "bg-white text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-50 border border-brand-border/70"
              )}
            >
              All Tests ({tests.length})
            </button>
            <button
              onClick={() => setActiveTab("quiz")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === "quiz"
                  ? "bg-brand-orange text-white shadow-xs"
                  : "bg-white text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-50 border border-brand-border/70"
              )}
            >
              Chapter Drills ({tests.filter((t) => t.testType === "chapter_quiz" || t.testType === "practice_drill").length})
            </button>
            <button
              onClick={() => setActiveTab("mock")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === "mock"
                  ? "bg-purple-700 text-white shadow-xs"
                  : "bg-white text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-50 border border-brand-border/70"
              )}
            >
              Mock Exams ({tests.filter((t) => t.testType === "mock_exam" || t.testType === "sample_paper_test").length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === "completed"
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-white text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-50 border border-brand-border/70"
              )}
            >
              Attempted ({tests.filter((t) => t.isAttempted).length})
            </button>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse py-4">
              <div className="h-44 rounded-3xl bg-white border border-gray-100 p-6" />
              <div className="h-44 rounded-3xl bg-white border border-gray-100 p-6" />
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTests.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredTests.map((test) => {
                    const SubjectIcon = getSubjectIcon(test.subjectName);

                    return (
                      <div
                        key={test.id}
                        className="p-5 sm:p-6 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-xs transition-shadow"
                      >
                        {/* Top Metadata Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", test.iconBg)}>
                              <SubjectIcon className={cn("h-4 w-4 stroke-[2.2]", test.iconColor)} />
                            </div>
                            <span className="text-xs font-bold text-brand-charcoal">
                              {test.subjectName}
                            </span>
                          </div>

                          {test.isAttempted ? (
                            <span className={cn(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border",
                              test.lastPassed
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {test.lastPassed ? "Passed" : "Needs Review"} · {test.lastPercentage}%
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-brand-orange border border-orange-200 uppercase tracking-wide">
                              {test.testType === "mock_exam" ? "Mock Exam" : "Practice Drill"}
                            </span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-1">
                          <h3 className="text-sm sm:text-base font-black text-brand-charcoal leading-snug">
                            {test.title}
                          </h3>
                          {test.description && (
                            <p className="text-xs text-brand-text-muted line-clamp-2 leading-relaxed">
                              {test.description}
                            </p>
                          )}
                        </div>

                        {/* Test Parameters Badge Row */}
                        <div className="flex items-center gap-3 text-[11px] font-semibold text-brand-text-muted pt-2 border-t border-brand-border/40">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-brand-orange" />
                            {test.durationMinutes} mins
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3.5 w-3.5 text-emerald-600" />
                            {test.totalQuestions} Questions
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Award className="h-3.5 w-3.5 text-purple-600" />
                            {test.totalMarks} Marks
                          </span>
                        </div>

                        {/* Action CTA */}
                        <div className="pt-2">
                          <Link
                            href={`/student/tests/${test.id}`}
                            className={cn(
                              "w-full py-2.5 rounded-2xl text-xs font-black tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-3xs",
                              test.isAttempted
                                ? "bg-[#FFF4EE] text-brand-orange border border-orange-200 hover:bg-[#FFEAE0]"
                                : "bg-brand-orange hover:bg-brand-orange-hover text-white shadow-xs"
                            )}
                          >
                            <span>{test.isAttempted ? "Review Scorecard & Retake" : "Start Test"}</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-white border border-brand-border/80 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-brand-orange mx-auto">
                    <FileCheck className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <p className="text-sm font-bold text-brand-charcoal">No tests found in this category</p>
                    <p className="text-xs text-brand-text-muted">
                      Explore other tabs or check back soon as educators publish new chapter drills.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating AI Chatbot Assistant */}
      <FloatingChatbot />
    </div>
  );
}
