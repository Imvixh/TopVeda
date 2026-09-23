"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { StudentBoardItem } from "@/types/board.types";
import {
  Award,
  BookOpen,
  GraduationCap,
  Target,
  ArrowRight,
  Layers,
  Sparkles,
  CheckCircle2,
  Users,
  Calendar,
  Loader2,
  ChevronRight,
  ShieldCheck,
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
  if (c.includes("ICSE")) {
    return {
      bgGradient: "from-purple-700 via-indigo-800 to-slate-900",
      iconBg: "bg-purple-500/20 text-purple-200 border-purple-400/30",
      badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
      accentColor: "text-purple-600",
    };
  }
  return {
    bgGradient: "from-amber-600 via-orange-700 to-slate-900",
    iconBg: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
    accentColor: "text-amber-600",
  };
}

export default function BoardsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [boards, setBoards] = React.useState<StudentBoardItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Layout states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const fetchBoards = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/student/boards");
      if (res.ok) {
        const data: StudentBoardItem[] = await res.json();
        setBoards(data);
      }
    } catch (err) {
      console.error("Failed to load boards:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchBoards();
    }
  }, [isAuthLoading, fetchBoards]);

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
        <StudentHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl w-full mx-auto space-y-8">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 mb-2">
                <Layers className="w-3.5 h-3.5" />
                <span>Academic Board Discovery</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Educational Boards
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Explore structured academic curriculums, syllabus blueprints, and specialized batch preparations across approved National & State Boards.
              </p>
            </div>

            <Link
              href="/student/study-material"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all shadow-sm self-start md:self-auto"
            >
              <BookOpen className="w-4 h-4 text-brand-orange" />
              <span>My Study Materials</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Highlights & Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-lg font-bold text-slate-900">{boards.length || 2}</span>
                <span className="text-xs text-slate-500 font-medium">Curriculums</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-lg font-bold text-slate-900">Class 10 - 12</span>
                <span className="text-xs text-slate-500 font-medium">Class Levels</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-lg font-bold text-slate-900">Daily Live</span>
                <span className="text-xs text-slate-500 font-medium">Expert Faculty</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-lg font-bold text-slate-900">100% NCERT</span>
                <span className="text-xs text-slate-500 font-medium">Mapped Syllabus</span>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <p className="text-xs text-slate-500 font-medium">
                Loading educational boards...
              </p>
            </div>
          )}

          {/* Boards Grid */}
          {!isLoading && boards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {boards.map((b) => {
                const Icon = getBoardIcon(b.iconName);
                const theme = getBoardTheme(b.code);

                return (
                  <div
                    key={b.id}
                    className="group bg-white rounded-3xl border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
                  >
                    {/* Top Hero Banner */}
                    <div className={cn("p-6 text-white bg-gradient-to-r relative overflow-hidden", theme.bgGradient)}>
                      <div className="relative z-10 flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="inline-flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/20 text-white backdrop-blur-sm border border-white/20">
                              {b.code}
                            </span>
                            {b.isEnrolled && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{b.enrolledBatchesCount} Enrolled</span>
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl font-bold tracking-tight text-white group-hover:text-amber-200 transition-colors">
                            {b.name}
                          </h2>
                        </div>

                        <div className={cn("w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner", theme.iconBg)}>
                          <Icon className="w-6 h-6" />
                        </div>
                      </div>

                      <p className="relative z-10 text-xs text-slate-200 mt-3 line-clamp-2 leading-relaxed">
                        {b.description}
                      </p>
                    </div>

                    {/* Middle Content */}
                    <div className="p-6 space-y-5 flex-1 flex flex-col justify-between bg-white">
                      <div className="space-y-4">
                        {/* Class Levels Offered */}
                        <div>
                          <span className="block text-[11px] font-bold uppercase text-slate-400 mb-2">
                            Classes Offered
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {b.classLevels.map((cls) => (
                              <span
                                key={cls.id}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold"
                              >
                                {cls.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Batch Stats & Curriculum highlight */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            <Layers className="w-4 h-4 text-brand-orange" />
                            {b.activeBatchesCount} Active Batches
                          </span>
                          <span className="text-slate-400">Target Session 2025-26</span>
                        </div>
                      </div>

                      {/* CTA Action */}
                      <Link
                        href={`/student/boards/${b.slug || b.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/10 transition-all group-hover:bg-brand-orange"
                      >
                        <span>Explore {b.code} Batches & Curriculum</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
