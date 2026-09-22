"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { STUDENT_NAV_ITEMS, DAILY_MOTIVATION_QUOTE } from "@/config/student-home.config";
import { DailyQuote } from "@/types/student-home.types";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  GraduationCap,
  TrendingUp,
  PlaySquare,
  ClipboardCheck,
  FileText,
  Award,
  Bell,
  User,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  GraduationCap,
  TrendingUp,
  PlaySquare,
  ClipboardCheck,
  FileText,
  Award,
  Bell,
  User,
};

export interface StudentSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
  dailyQuote?: DailyQuote;
}

export function StudentSidebar({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  className,
  dailyQuote,
}: StudentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const activeQuote = dailyQuote !== undefined ? dailyQuote : DAILY_MOTIVATION_QUOTE;

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const displayName = profile?.fullName || "Abhay Kumar";
  const displayEmail = user?.email || profile?.email || "student@gmail.com";

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-brand-border/70 transition-all duration-300 ease-in-out lg:translate-x-0 overflow-y-auto select-none",
          isCollapsed ? "lg:w-20" : "lg:w-64",
          isOpen ? "translate-x-0 w-64 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* Top Header with Brand & Compact Toggle Button */}
        <div
          className={cn(
            "flex items-center pt-5 pb-3 border-b border-brand-border/40 transition-all",
            isCollapsed ? "flex-col gap-2 px-2" : "justify-between px-5"
          )}
        >
          <Link href="/student" className="flex flex-col group">
            <div className="flex items-center gap-2">
              <BrandGlyph size={26} />
              {!isCollapsed && <Wordmark size="sm" />}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-medium text-brand-text-muted/80 tracking-normal pl-8 -mt-0.5">
                Learn Today · Build Tomorrow
              </span>
            )}
          </Link>

          {/* Desktop Compact Icon-Only Toggle Button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-[#F8F9FA] hover:bg-brand-bg-peach text-brand-text-muted hover:text-brand-orange border border-brand-border/70 transition-colors shrink-0"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Mobile Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-brand-text-muted hover:bg-brand-bg-warm transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className={cn("py-3 space-y-1", isCollapsed ? "px-2" : "px-3.5")}>
          {STUDENT_NAV_ITEMS.map((item) => {
            const IconComponent = ICON_MAP[item.iconName] || Home;
            const isActive =
              item.id === "home" ? pathname === "/student" : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150",
                  isCollapsed
                    ? "justify-center p-3"
                    : "justify-between px-3.5 py-2.5",
                  isActive
                    ? "bg-[#FFF4EE] text-brand-orange font-bold shadow-xs"
                    : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm/80"
                )}
              >
                <div className="flex items-center gap-3">
                  <IconComponent
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform group-hover:scale-105",
                      isActive
                        ? "text-brand-orange"
                        : "text-brand-text-muted group-hover:text-brand-text-primary"
                    )}
                  />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.badgeCount && item.badgeCount > 0 && (
                  <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-brand-orange text-white text-[10px] font-bold">
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Middle/Lower Area: Daily Motivational Quote */}
        {activeQuote.active !== false && (
          !isCollapsed ? (
            <div className="px-3.5 py-2 mt-auto">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-[#FFF9F5] via-[#FFF5EE] to-[#FFF0E6] border border-orange-200/70 shadow-2xs space-y-1.5 select-none">
                <div className="flex items-center gap-1.5 text-brand-orange">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    Daily Motivation
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-brand-charcoal italic leading-relaxed">
                  &ldquo;{activeQuote.quote}&rdquo;
                </p>
                <p className="text-[10px] font-bold text-brand-text-muted text-right">
                  — {activeQuote.author}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="py-2 px-2 mt-auto flex justify-center"
              title={`Daily Motivation: "${activeQuote.quote}" — ${activeQuote.author}`}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FFF9F5] to-[#FFF0E6] border border-orange-200/70 flex items-center justify-center text-brand-orange shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          )
        )}

        {/* Bottom Area: Student Profile + Direct Logout Button */}
        {!isCollapsed ? (
          <div className="p-2.5 mx-3 mb-3 mt-2 rounded-2xl bg-[#F8F9FA] border border-brand-border/70 flex items-center justify-between gap-2">
            <Link
              href="/student/profile"
              className="flex items-center gap-2.5 min-w-0 flex-1 group"
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-brand-orange-border/70 bg-brand-bg-peach flex items-center justify-center shrink-0">
                <Image
                  src="/assets/student/student-avatar.jpg"
                  alt={displayName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-brand-charcoal truncate group-hover:text-brand-orange transition-colors">
                  {displayName}
                </p>
                <p className="text-[10px] font-medium text-brand-text-muted truncate">
                  {displayEmail}
                </p>
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-brand-text-muted hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="p-2 mx-1.5 mb-3 mt-2 rounded-2xl bg-[#F8F9FA] border border-brand-border/70 flex flex-col items-center gap-2">
            <Link href="/student/profile" title={displayName} className="group">
              <div className="relative w-8 h-8 rounded-full overflow-hidden border border-brand-orange-border/70 bg-brand-bg-peach flex items-center justify-center">
                <Image
                  src="/assets/student/student-avatar.jpg"
                  alt={displayName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            </Link>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-brand-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
