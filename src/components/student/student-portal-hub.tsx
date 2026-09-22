"use client";

import * as React from "react";
import Link from "next/link";
import { Megaphone, BookOpen, Target, Lightbulb, ArrowUpRight, Sparkles } from "lucide-react";
import { WHATS_HAPPENING_ITEMS } from "@/config/student-home.config";
import { HubItem } from "@/types/student-home.types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  megaphone: Megaphone,
  book: BookOpen,
  target: Target,
  lightbulb: Lightbulb,
};

const BADGE_THEMES: Record<string, { bg: string; text: string; border: string }> = {
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  sky: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

export interface StudentPortalHubProps {
  items?: HubItem[];
}

export function StudentPortalHub({ items }: StudentPortalHubProps) {
  const activeItems = items !== undefined ? items : WHATS_HAPPENING_ITEMS;

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 pt-8 pb-10 border-t border-brand-border/70 space-y-5" id="student-hub">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-orange/10 text-brand-orange">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
              What&apos;s Happening on TopVeda?
            </h2>
          </div>
          <p className="text-xs font-medium text-brand-text-muted">
            Latest platform announcements, newly published materials &amp; academic alerts.
          </p>
        </div>
      </div>

      {/* Grid of Interactive Hub Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeItems.map((item: HubItem) => {
          const IconComponent = ICON_MAP[item.iconType] || Megaphone;
          const theme = BADGE_THEMES[item.badgeVariant] || BADGE_THEMES.orange;

          return (
            <div
              key={item.id}
              className="flex flex-col justify-between p-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card hover:border-brand-orange-border/70 transition-all duration-200 group"
            >
              <div className="space-y-3">
                {/* Category Badge & Icon */}
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border",
                      theme.bg,
                      theme.text,
                      theme.border
                    )}
                  >
                    {item.badgeText}
                  </span>

                  <div className="w-8 h-8 rounded-xl bg-brand-bg-warm flex items-center justify-center text-brand-text-muted group-hover:text-brand-orange transition-colors">
                    <IconComponent className="h-4 w-4" />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-black text-brand-charcoal leading-snug group-hover:text-brand-orange transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs font-medium text-brand-text-muted leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Bottom Action CTA */}
              <div className="pt-3 mt-3 border-t border-brand-border/40">
                <Link
                  href={item.ctaLink}
                  className="inline-flex items-center justify-between w-full text-xs font-bold text-brand-orange hover:text-brand-orange-hover transition-colors"
                >
                  <span>{item.ctaText}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
