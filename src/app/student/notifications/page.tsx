"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  BookOpen,
  Video,
  FileCheck2,
  Megaphone,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
} from "lucide-react";
import { CmsNotification, NotificationFilterCategory } from "@/types/cms.types";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { cn } from "@/lib/utils";

const TABS: { id: NotificationFilterCategory; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "CLASSES", label: "Classes & Lectures" },
  { id: "TESTS", label: "Tests & Practice" },
  { id: "ANNOUNCEMENTS", label: "Announcements" },
  { id: "STUDY_MATERIAL", label: "Study Materials" },
];

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Recently";
  }
}

function getNotificationIcon(type: string, entityType?: string | null) {
  if (type.includes("LIVE") || entityType === "LIVE_CLASS") {
    return { icon: Video, color: "text-brand-orange", bg: "bg-brand-orange/10 border-brand-orange/20" };
  }
  if (type.includes("LECTURE") || entityType === "LECTURE") {
    return { icon: BookOpen, color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20" };
  }
  if (type.includes("TEST") || entityType === "TEST") {
    return { icon: FileCheck2, color: "text-purple-600", bg: "bg-purple-500/10 border-purple-500/20" };
  }
  if (type.includes("STUDY_MATERIAL") || entityType === "STUDY_MATERIAL") {
    return { icon: FileText, color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" };
  }
  if (type.includes("ANNOUNCEMENT") || entityType === "ANNOUNCEMENT") {
    return { icon: Megaphone, color: "text-blue-600", bg: "bg-blue-500/10 border-blue-500/20" };
  }
  return { icon: Bell, color: "text-brand-charcoal", bg: "bg-brand-bg-warm border-brand-border" };
}

function getTargetUrl(notif: CmsNotification): string | null {
  if (notif.entity_type === "LIVE_CLASS" || notif.type.includes("LIVE")) {
    return "/student/live";
  }
  if (notif.entity_type === "LECTURE" || notif.type.includes("LECTURE")) {
    return notif.metadata?.courseId
      ? `/student/learning?courseId=${notif.metadata.courseId}`
      : "/student/learning";
  }
  if (notif.entity_type === "TEST" || notif.type.includes("TEST")) {
    return notif.entity_id ? `/student/tests` : "/student/tests";
  }
  if (notif.entity_type === "STUDY_MATERIAL" || notif.type.includes("STUDY_MATERIAL")) {
    return "/student/study-material";
  }
  if (notif.entity_type === "ANNOUNCEMENT" || notif.type.includes("ANNOUNCEMENT")) {
    return "/student";
  }
  return null;
}

export default function StudentNotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<NotificationFilterCategory>("ALL");
  const [notifications, setNotifications] = React.useState<CmsNotification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  const fetchNotifications = React.useCallback(async (category: NotificationFilterCategory) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/student/notifications?category=${category}`);
      if (!res.ok) throw new Error("Failed to load notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications(activeTab);
  }, [activeTab, fetchNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await fetch(`/api/student/notifications/${id}/read`, {
        method: "PATCH",
      });
    } catch {
      // Revert if needed
      fetchNotifications(activeTab);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAll(true);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      await fetch("/api/student/notifications/read-all", {
        method: "POST",
      });
    } catch {
      fetchNotifications(activeTab);
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNotificationClick = async (notif: CmsNotification) => {
    if (!notif.is_read) {
      await handleMarkAsRead(notif.id);
    }
    const target = getTargetUrl(notif);
    if (target) {
      router.push(target);
    }
  };

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

        {/* Notifications Canvas */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1200px] w-full mx-auto space-y-6">
          {/* Header Container */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight flex items-center gap-2.5">
                    Notifications
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold bg-brand-orange text-white rounded-full">
                        {unreadCount} unread
                      </span>
                    )}
                  </h1>
                  <p className="text-xs sm:text-sm text-brand-text-muted mt-0.5">
                    Stay updated with your live schedules, lecture releases, test alerts, and announcements.
                  </p>
                </div>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAll}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-brand-charcoal bg-white hover:bg-brand-bg-peach border border-brand-border rounded-xl shadow-2xs transition-all disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4 text-brand-orange" />
                {isMarkingAll ? "Marking..." : "Mark all as read"}
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border",
                    isActive
                      ? "bg-brand-charcoal text-white border-brand-charcoal shadow-xs"
                      : "bg-white text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm border-brand-border/70"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-20 rounded-2xl bg-white border border-brand-border/60 animate-pulse"
                />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-3xl border border-brand-border/70 p-10 sm:p-14 text-center max-w-lg mx-auto shadow-2xs my-8">
              <div className="h-14 w-14 rounded-2xl bg-brand-bg-warm border border-brand-border/80 flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                <Bell className="h-7 w-7 text-brand-text-subtle" />
              </div>
              <h3 className="text-base font-bold text-brand-charcoal mb-1">
                No notifications in this category
              </h3>
              <p className="text-xs text-brand-text-muted mb-6">
                When your teachers schedule live classes, release lectures, or publish test results, they will show up here.
              </p>
              {activeTab !== "ALL" && (
                <button
                  onClick={() => setActiveTab("ALL")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-orange-hover transition-colors"
                >
                  <Filter className="h-3.5 w-3.5" />
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => {
                const { icon: Icon, color, bg } = getNotificationIcon(notif.type, notif.entity_type);
                const target = getTargetUrl(notif);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "group relative rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer flex items-start gap-3.5 sm:gap-4",
                      notif.is_read
                        ? "bg-white/80 border-brand-border/60 hover:bg-white hover:border-brand-border hover:shadow-2xs"
                        : "bg-brand-orange/5 border-brand-orange/30 shadow-2xs hover:bg-brand-orange/10 hover:border-brand-orange/40"
                    )}
                  >
                    {/* Notification Icon */}
                    <div
                      className={cn(
                        "h-10 w-10 sm:h-11 sm:w-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        bg
                      )}
                    >
                      <Icon className={cn("h-5 w-5", color)} />
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className={cn(
                            "text-xs sm:text-sm font-bold text-brand-charcoal truncate",
                            !notif.is_read && "font-black text-brand-charcoal"
                          )}
                        >
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-brand-orange shrink-0 animate-pulse" />
                        )}
                      </div>

                      <p className="text-xs text-brand-text-muted leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-brand-text-subtle font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(notif.created_at)}
                        </span>

                        {notif.category && (
                          <>
                            <span>•</span>
                            <span className="uppercase tracking-wider font-semibold text-[10px] text-brand-text-muted">
                              {notif.category}
                            </span>
                          </>
                        )}

                        {target && (
                          <>
                            <span>•</span>
                            <span className="text-brand-orange font-semibold flex items-center gap-0.5 group-hover:underline">
                              View details <ChevronRight className="h-3 w-3" />
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Mark as read single button */}
                    {!notif.is_read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        className="p-1.5 rounded-lg text-brand-text-muted hover:text-brand-orange hover:bg-brand-orange/10 transition-colors shrink-0"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Floating Chatbot Assistant */}
      <FloatingChatbot />
    </div>
  );
}
