"use client";

import * as React from "react";
import Link from "next/link";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { useAuth } from "@/hooks/use-auth";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Sparkles,
  ClipboardCheck,
  Video,
  Clock,
  ChevronDown,
  Lock,
  Layers,
  ArrowRight,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  testsAttempted: number;
  averageScore: number;
  passedCount: number;
  lecturesCompleted: number;
  watchMinutes: number;
  points: number;
  rank: number;
  isCurrentUser: boolean;
}

interface BatchOption {
  id: string;
  title: string;
  boardLabel: string;
}

export default function StudentLeaderboardPage() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const [selectedBatchId, setSelectedBatchId] = React.useState<string>("ALL");
  const [batches, setBatches] = React.useState<BatchOption[]>([]);
  const [top3, setTop3] = React.useState<LeaderboardEntry[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = React.useState<LeaderboardEntry | null>(null);
  const [isEnabled, setIsEnabled] = React.useState<boolean>(true);
  const [isLoading, setIsLoading] = React.useState(true);

  // Shell states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const fetchLeaderboard = React.useCallback(async (batchId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/student/leaderboard?batchId=${batchId}`);
      if (res.ok) {
        const data = await res.json();
        setIsEnabled(data.isEnabled !== false);
        setBatches(data.batches || []);
        setTop3(data.top3 || []);
        setLeaderboard(data.leaderboard || []);
        setCurrentUserRank(data.currentUserRank || null);
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchLeaderboard(selectedBatchId);
    }
  }, [isAuthLoading, selectedBatchId, fetchLeaderboard]);

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

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

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1100px] w-full mx-auto space-y-7">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-brand-peach border border-amber-200/80 shadow-2xs">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider">
                <Trophy className="h-3.5 w-3.5 text-amber-600" />
                TopVeda Hall of Fame
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-brand-charcoal tracking-tight">
                Student Leaderboard
              </h1>
              <p className="text-xs sm:text-sm text-brand-text-muted max-w-xl leading-relaxed">
                Compete with your peers, excel in tests, and track your conceptual mastery. Updated in real-time as you complete lectures and assessments.
              </p>
            </div>

            {/* Batch Filter Dropdown */}
            {isEnabled && (
              <div className="relative shrink-0">
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="appearance-none bg-white border border-brand-border/90 hover:border-brand-orange px-4 py-2.5 pr-9 rounded-2xl text-xs sm:text-sm font-bold text-brand-charcoal shadow-2xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                >
                  <option value="ALL">All Enrolled Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-text-muted pointer-events-none" />
              </div>
            )}
          </div>

          {/* PAUSED STATE BANNER */}
          {!isEnabled ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-brand-border shadow-2xs space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Lock className="h-8 w-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-lg font-black text-brand-charcoal">
                  Leaderboard Currently Paused
                </h3>
                <p className="text-xs text-brand-text-muted leading-relaxed">
                  The student leaderboard is currently under review or paused by the TopVeda administrative team. Check back soon for the next competitive cohort ranking!
                </p>
              </div>
              <Link
                href="/student/learning"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-brand-orange text-white text-xs font-bold hover:bg-brand-orange-hover transition-colors"
              >
                <span>Continue Learning</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : isLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
              <p className="text-xs font-semibold text-brand-text-muted">Loading live student rankings...</p>
            </div>
          ) : (
            <>
              {/* TOP 3 PODIUM */}
              {top3.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {/* Rank 2 (Silver) */}
                  {top3[1] && (
                    <div className="order-2 sm:order-1 flex flex-col items-center p-6 rounded-3xl bg-gradient-to-b from-slate-50 to-white border-2 border-slate-200 shadow-2xs text-center space-y-3 relative hover:scale-[1.01] transition-transform">
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 text-[10px] font-black uppercase">
                        2nd Place
                      </div>
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-300 bg-slate-100 flex items-center justify-center shadow-md">
                          {top3[1].avatarUrl ? (
                            <img src={top3[1].avatarUrl} alt={top3[1].fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-black text-slate-600">{top3[1].fullName.charAt(0)}</span>
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-400 text-white text-xs font-black flex items-center justify-center border-2 border-white shadow-xs">
                          🥈
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-brand-charcoal truncate max-w-[180px]">
                          {top3[1].fullName}
                        </h4>
                        <p className="text-[11px] font-bold text-brand-text-muted">{top3[1].email}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-black">
                        <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                        <span>{top3[1].points} Points</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-brand-text-muted pt-1 border-t border-slate-100 w-full justify-center">
                        <span>{top3[1].testsAttempted} Tests</span>
                        <span>•</span>
                        <span>{top3[1].averageScore}% Avg</span>
                      </div>
                    </div>
                  )}

                  {/* Rank 1 (Gold) */}
                  {top3[0] && (
                    <div className="order-1 sm:order-2 flex flex-col items-center p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-amber-50 via-orange-50/40 to-white border-2 border-amber-300 shadow-md text-center space-y-3.5 relative hover:scale-[1.02] transition-transform sm:-translate-y-2">
                      <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-black uppercase flex items-center gap-1 shadow-2xs">
                        <Crown className="h-3 w-3" />
                        <span>1st Champion</span>
                      </div>
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-amber-400 bg-amber-100 flex items-center justify-center shadow-lg ring-4 ring-amber-100">
                          {top3[0].avatarUrl ? (
                            <img src={top3[0].avatarUrl} alt={top3[0].fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-black text-amber-700">{top3[0].fullName.charAt(0)}</span>
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-white text-sm font-black flex items-center justify-center border-2 border-white shadow-xs">
                          🥇
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-base font-black text-brand-charcoal truncate max-w-[200px]">
                          {top3[0].fullName}
                        </h4>
                        <p className="text-[11px] font-bold text-brand-text-muted">{top3[0].email}</p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500 text-white text-sm font-black shadow-xs">
                        <Sparkles className="h-4 w-4" />
                        <span>{top3[0].points} Points</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-brand-charcoal pt-2 border-t border-amber-100 w-full justify-center">
                        <span className="flex items-center gap-1">
                          <ClipboardCheck className="h-3.5 w-3.5 text-brand-orange" />
                          {top3[0].testsAttempted} Tests
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-700 font-bold">
                          {top3[0].averageScore}% Avg
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 (Bronze) */}
                  {top3[2] && (
                    <div className="order-3 flex flex-col items-center p-6 rounded-3xl bg-gradient-to-b from-amber-50/50 to-white border-2 border-amber-200/70 shadow-2xs text-center space-y-3 relative hover:scale-[1.01] transition-transform">
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                        3rd Place
                      </div>
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-300 bg-amber-100 flex items-center justify-center shadow-md">
                          {top3[2].avatarUrl ? (
                            <img src={top3[2].avatarUrl} alt={top3[2].fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl font-black text-amber-800">{top3[2].fullName.charAt(0)}</span>
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center border-2 border-white shadow-xs">
                          🥉
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-brand-charcoal truncate max-w-[180px]">
                          {top3[2].fullName}
                        </h4>
                        <p className="text-[11px] font-bold text-brand-text-muted">{top3[2].email}</p>
                      </div>
                      <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-black">
                        <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                        <span>{top3[2].points} Points</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-brand-text-muted pt-1 border-t border-amber-100 w-full justify-center">
                        <span>{top3[2].testsAttempted} Tests</span>
                        <span>•</span>
                        <span>{top3[2].averageScore}% Avg</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CURRENT USER POSITION (FLOATING PILL OR BANNER) */}
              {currentUserRank && (
                <div className="p-4 sm:p-5 rounded-3xl bg-brand-charcoal text-white border border-black shadow-md flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-brand-orange text-white flex items-center justify-center text-base font-black shrink-0 shadow-xs">
                      #{currentUserRank.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-orange-200 font-bold uppercase tracking-wider">
                        Your Current Position
                      </p>
                      <h4 className="text-sm sm:text-base font-black truncate">
                        {currentUserRank.fullName} (You)
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                    <div>
                      <p className="text-[10px] text-slate-300 font-semibold uppercase">Total Points</p>
                      <p className="text-base sm:text-lg font-black text-brand-orange">
                        {currentUserRank.points}
                      </p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] text-slate-300 font-semibold uppercase">Average Score</p>
                      <p className="text-sm sm:text-base font-black text-emerald-400">
                        {currentUserRank.averageScore}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* COMPLETE LEADERBOARD LIST (RANKS 1 TO 50) */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-brand-border/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-bold text-brand-charcoal flex items-center gap-2">
                    <Medal className="h-4 w-4 text-brand-orange" />
                    Overall Cohort Rankings ({leaderboard.length})
                  </h3>
                  <span className="text-[11px] font-semibold text-brand-text-muted">
                    Based on verified test attempts &amp; lecture engagement
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {leaderboard.map((item) => {
                    const isTop1 = item.rank === 1;
                    const isTop2 = item.rank === 2;
                    const isTop3 = item.rank === 3;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "py-3.5 px-3 rounded-2xl flex items-center justify-between gap-3 transition-colors",
                          item.isCurrentUser
                            ? "bg-orange-50/60 border border-orange-200/80"
                            : "hover:bg-brand-bg-warm/50"
                        )}
                      >
                        {/* Rank & Profile */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          <span
                            className={cn(
                              "w-7 text-center font-black text-xs sm:text-sm shrink-0",
                              isTop1
                                ? "text-amber-500"
                                : isTop2
                                ? "text-slate-500"
                                : isTop3
                                ? "text-amber-700"
                                : "text-brand-text-muted"
                            )}
                          >
                            #{item.rank}
                          </span>

                          <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-bg-peach border border-brand-border flex items-center justify-center shrink-0">
                            {item.avatarUrl ? (
                              <img src={item.avatarUrl} alt={item.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-black text-brand-orange">
                                {item.fullName.charAt(0)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h5 className="text-xs sm:text-sm font-bold text-brand-charcoal truncate flex items-center gap-1.5">
                              <span>{item.fullName}</span>
                              {item.isCurrentUser && (
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-brand-orange text-white uppercase">
                                  You
                                </span>
                              )}
                            </h5>
                            <p className="text-[11px] text-brand-text-muted truncate mt-0.5">
                              {item.email}
                            </p>
                          </div>
                        </div>

                        {/* Performance Quick Badges */}
                        <div className="flex items-center gap-4 sm:gap-8 shrink-0 text-right">
                          <div className="hidden sm:block">
                            <span className="text-[10px] text-brand-text-muted block">Tests Taken</span>
                            <span className="text-xs font-bold text-brand-charcoal">
                              {item.testsAttempted} Tests ({item.passedCount} Passed)
                            </span>
                          </div>

                          <div className="hidden md:block">
                            <span className="text-[10px] text-brand-text-muted block">Avg Score</span>
                            <span className="text-xs font-bold text-emerald-700">
                              {item.averageScore}%
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-brand-text-muted block">Total Points</span>
                            <span className="text-xs sm:text-sm font-black text-brand-orange">
                              {item.points} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <FloatingChatbot />
    </div>
  );
}
