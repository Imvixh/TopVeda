"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock, Bell } from "lucide-react";
import { LIVE_CLASSES_TODAY } from "@/config/student-home.config";
import { LiveClass } from "@/types/student-home.types";
import { cn } from "@/lib/utils";

export interface LiveClassesSectionProps {
  liveClasses?: LiveClass[];
}

export function LiveClassesSection({ liveClasses }: LiveClassesSectionProps) {
  const activeLiveClasses = liveClasses !== undefined ? liveClasses : LIVE_CLASSES_TODAY;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [reminders, setReminders] = React.useState<Record<string, boolean>>({});

  if (activeLiveClasses.length === 0) {
    return null;
  }

  const toggleReminder = (id: string) => {
    setReminders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
          Live Classes (Today)
        </h2>
        <Link
          href="/student/live"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange-hover transition-colors"
        >
          See All
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal Cards Container */}
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {activeLiveClasses.map((item: LiveClass) => {
            const hasReminder = !!reminders[item.id];

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between min-w-[270px] max-w-[285px] sm:min-w-[285px] rounded-2xl bg-white border border-brand-border/80 p-4 shadow-2xs hover:shadow-card transition-all duration-200 shrink-0 select-none"
              >
                {/* Top Row: Badge & Educator Info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {item.isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold tracking-wide uppercase shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-100/80 text-sky-800 text-[10px] font-extrabold tracking-wide uppercase">
                        UPCOMING
                      </span>
                    )}

                    <div className="space-y-0.5 pt-0.5">
                      <p className="text-xs font-extrabold text-brand-charcoal leading-tight">
                        {item.subject}
                      </p>
                      <p className="text-xs font-medium text-brand-text-muted leading-tight">
                        {item.topic}
                      </p>
                      <p className="text-[11px] font-semibold text-brand-text-subtle pt-0.5">
                        {item.educatorName}
                      </p>
                    </div>
                  </div>

                  {/* Educator Avatar Graphic */}
                  <div className="relative w-12 h-14 shrink-0 overflow-hidden rounded-xl bg-brand-charcoal/5 border border-brand-border/60">
                    <img
                      src={item.educatorAvatar || "/assets/student/teacher-male-1.jpg"}
                      alt={item.educatorName || "Educator"}
                      className="w-full h-full object-cover rounded-xl shadow-xs"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = "/assets/student/teacher-male-1.jpg";
                      }}
                    />
                  </div>
                </div>

                {/* Bottom Row: Scheduled Time & CTA */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-border/40 gap-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-brand-text-muted">
                    <Clock className="h-3.5 w-3.5 text-brand-orange" />
                    <span>{item.time}</span>
                  </div>

                  {item.isLive ? (
                    <Link
                      href={`/student/live/${item.id}`}
                      className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold shadow-xs transition-all duration-150"
                    >
                      Join Class
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggleReminder(item.id)}
                      className={cn(
                        "inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
                        hasReminder
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-[#F4F6F8] hover:bg-[#EAEFF4] text-brand-charcoal"
                      )}
                    >
                      <Bell className={cn("h-3 w-3", hasReminder && "fill-emerald-600 text-emerald-600")} />
                      {hasReminder ? "Set" : "Reminder"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll right button */}
        <button
          onClick={scrollRight}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-brand-border/80 shadow-md text-brand-charcoal flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hover:bg-brand-bg-warm"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
