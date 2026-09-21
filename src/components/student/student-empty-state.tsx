"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, LucideIcon } from "lucide-react";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { cn } from "@/lib/utils";

export interface StudentEmptyStateProps {
  title: string;
  categoryBadge: string;
  description: string;
  icon: LucideIcon;
  actionText?: string;
  actionHref?: string;
}

export function StudentPortalPageWrapper({
  title,
  categoryBadge,
  description,
  icon: Icon,
  actionText = "Back to Home",
  actionHref = "/student",
}: StudentEmptyStateProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  // Default to collapsed mode on inner pages for maximum reading/dashboard canvas
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      {/* Student Sidebar */}
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
      />

      {/* Main Canvas Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Header */}
        <StudentHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Inner Content Area with Polished Empty State */}
        <main className="flex-1 px-4 sm:px-8 py-8 sm:py-12 max-w-[1200px] w-full mx-auto flex flex-col items-center justify-center text-center">
          <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-white border border-brand-border/80 shadow-card space-y-6 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Category Pill */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg-peach border border-brand-orange-border/60 text-brand-orange text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" />
                {categoryBadge}
              </span>
            </div>

            {/* Icon Graphic */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-bg-peach to-orange-50 border border-brand-orange-border/70 flex items-center justify-center text-brand-orange shadow-xs">
              <Icon className="h-8 w-8" />
            </div>

            {/* Heading and Description */}
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                {title}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-brand-text-muted leading-relaxed">
                {description}
              </p>
            </div>

            {/* Action CTA */}
            <div className="pt-2">
              <Link
                href={actionHref}
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-150"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{actionText}</span>
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Floating Chatbot Assistant */}
      <FloatingChatbot />
    </div>
  );
}
