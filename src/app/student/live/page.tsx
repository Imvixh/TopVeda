"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { StudentLiveClassCard, StudentLiveScheduleGroup } from "@/lib/services/student-live.service";
import {
  Radio,
  Clock,
  Calendar,
  ChevronRight,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  PlayCircle,
  Video,
  Users,
  ShieldAlert,
  Loader2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

function EducatorAvatarCircle({ avatarUrl, name }: { avatarUrl?: string; name: string }) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="w-7 h-7 rounded-full overflow-hidden border border-brand-border shrink-0 bg-brand-bg-warm flex items-center justify-center">
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[10px] font-black text-brand-orange">
          {name ? name.charAt(0).toUpperCase() : "E"}
        </span>
      )}
    </div>
  );
}

export default function StudentLiveClassesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [schedule, setSchedule] = React.useState<StudentLiveScheduleGroup>({
    liveNow: [],
    upcoming: [],
    completed: [],
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"all" | "live" | "upcoming" | "completed">("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const fetchLiveClasses = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/student/live");
      if (res.ok) {
        const data: StudentLiveScheduleGroup = await res.json();
        setSchedule(data);
      }
    } catch (err) {
      console.error("Failed to load live classes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAuthLoading) {
      fetchLiveClasses();
    }
  }, [isAuthLoading, fetchLiveClasses]);

  const totalLive = schedule.liveNow.length;
  const totalUpcoming = schedule.upcoming.length;
  const totalCompleted = schedule.completed.length;

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

        {/* Live Classes Content Canvas */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1000px] w-full mx-auto space-y-7">
          {/* Header Title & Subtitle */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
              Live Classes
            </h1>
            <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
              Interactive live classrooms & educator broadcasts
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
              All Sessions ({totalLive + totalUpcoming + totalCompleted})
            </button>
            <button
              onClick={() => setActiveTab("live")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                activeTab === "live"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-white text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-50 border border-brand-border/70"
              )}
            >
              {totalLive > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
              Live Now ({totalLive})
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                activeTab === "upcoming"
                  ? "bg-brand-orange text-white shadow-xs"
                  : "bg-white text-brand-text-muted hover:text-brand-charcoal hover:bg-gray-50 border border-brand-border/70"
              )}
            >
              Upcoming ({totalUpcoming})
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
              Completed ({totalCompleted})
            </button>
          </div>

          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="space-y-4 animate-pulse py-4">
              <div className="h-32 rounded-3xl bg-white border border-gray-100 p-6" />
              <div className="h-32 rounded-3xl bg-white border border-gray-100 p-6" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* SECTION 1: LIVE NOW SESSIONS */}
              {(activeTab === "all" || activeTab === "live") && schedule.liveNow.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                      Broadcasting Live Right Now
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {schedule.liveNow.map((liveClass) => (
                      <div
                        key={liveClass.id}
                        className="p-5 rounded-3xl bg-gradient-to-br from-[#FFF8F8] via-white to-[#FFF5F5] border border-red-200/80 shadow-2xs flex flex-col justify-between space-y-4 relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-[11px] font-black tracking-wide uppercase shadow-3xs">
                            <Radio className="h-3.5 w-3.5 animate-pulse" />
                            LIVE NOW
                          </span>
                          <span className="text-xs font-bold text-red-600/90 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full">
                            {liveClass.subject}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="text-sm sm:text-base font-black text-brand-charcoal leading-snug">
                            {liveClass.topic}
                          </h3>
                          <div className="flex items-center gap-2.5 pt-1">
                            <EducatorAvatarCircle
                              avatarUrl={liveClass.educatorAvatar}
                              name={liveClass.educatorName}
                            />
                            <span className="text-xs font-bold text-brand-text-muted">
                              {liveClass.educatorName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-red-100/80">
                          <span className="text-xs font-semibold text-brand-text-muted flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Started at {liveClass.timeDisplay}
                          </span>
                          <Link
                            href={`/student/live/${liveClass.id}`}
                            className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-black tracking-wide flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <span>Join Classroom</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: UPCOMING SCHEDULED SESSIONS */}
              {(activeTab === "all" || activeTab === "upcoming") && (
                <div className="space-y-4">
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                    Upcoming Live Classes
                  </h2>

                  {schedule.upcoming.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {schedule.upcoming.map((c) => (
                        <div
                          key={c.id}
                          className="p-5 rounded-3xl bg-white border border-brand-border/80 shadow-2xs flex flex-col justify-between space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-brand-orange text-[11px] font-bold">
                              {c.subject}
                            </span>
                            <span className="text-[11px] font-bold text-brand-text-muted flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {c.timeDisplay}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <h3 className="text-sm sm:text-base font-bold text-brand-charcoal leading-snug">
                              {c.topic}
                            </h3>
                            <div className="flex items-center gap-2.5 pt-1">
                              <EducatorAvatarCircle
                                avatarUrl={c.educatorAvatar}
                                name={c.educatorName}
                              />
                              <span className="text-xs font-bold text-brand-text-muted">
                                {c.educatorName}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-brand-border/40">
                            {c.isPreparationWindow ? (
                              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                Teacher Preparing...
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-brand-text-muted">
                                Starts in {Math.floor(c.secondsToStart / 60)} mins
                              </span>
                            )}

                            <Link
                              href={`/student/live/${c.id}`}
                              className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold transition-colors",
                                c.canJoin
                                  ? "bg-brand-orange text-white hover:bg-brand-orange-hover"
                                  : "border border-brand-border bg-gray-50 text-brand-text-muted hover:bg-gray-100"
                              )}
                            >
                              {c.canJoin ? "Enter Class" : "View Room"}
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    activeTab === "upcoming" && (
                      <div className="p-8 rounded-3xl bg-white border border-brand-border/80 text-center space-y-2">
                        <Calendar className="h-8 w-8 text-brand-text-muted mx-auto" />
                        <p className="text-sm font-bold text-brand-charcoal">No upcoming sessions scheduled right now</p>
                        <p className="text-xs text-brand-text-muted">Check back soon for new educator broadcasts.</p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* SECTION 3: RECENTLY COMPLETED CLASSES */}
              {(activeTab === "all" || activeTab === "completed") && (
                <div className="space-y-4">
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
                    Recently Completed Sessions
                  </h2>

                  {schedule.completed.length > 0 ? (
                    <div className="space-y-3">
                      {schedule.completed.map((comp) => (
                        <div
                          key={comp.id}
                          className="p-4 sm:p-5 rounded-2xl bg-white border border-brand-border/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-md">
                                  {comp.subject}
                                </span>
                                {comp.isAttended && (
                                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    Attended
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xs sm:text-sm font-bold text-brand-charcoal">
                                {comp.topic}
                              </h3>
                              <p className="text-[11px] font-medium text-brand-text-muted">
                                By {comp.educatorName} · {comp.timeDisplay}
                              </p>
                            </div>
                          </div>

                          <Link
                            href="/student/learning"
                            className="text-xs font-bold text-brand-orange hover:underline shrink-0"
                          >
                            Explore Recordings →
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    activeTab === "completed" && (
                      <div className="p-8 rounded-3xl bg-white border border-brand-border/80 text-center space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-brand-text-muted mx-auto" />
                        <p className="text-sm font-bold text-brand-charcoal">No completed classes to show</p>
                      </div>
                    )
                  )}
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
