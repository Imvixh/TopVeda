"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Play, Clock, UserCheck } from "lucide-react";
import { LATEST_LECTURES } from "@/config/student-home.config";
import { Lecture } from "@/types/student-home.types";
import { cn } from "@/lib/utils";

export function LatestLecturesSection() {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-4" id="latest-lectures">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
          Latest Lectures
        </h2>
        <Link
          href="/student/lectures"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange-hover transition-colors"
        >
          See All
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal Cards Container — Larger, Balanced Rectangular Cards */}
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {LATEST_LECTURES.map((lecture: Lecture) => (
            <Link
              key={lecture.id}
              href={`/student/lectures/${lecture.id}`}
              className="flex flex-col min-w-[260px] max-w-[280px] sm:min-w-[275px] sm:max-w-[290px] rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card hover:border-brand-orange-border/70 hover:-translate-y-1 transition-all duration-200 group/card shrink-0 select-none overflow-hidden"
            >
              {/* Upper 55%: Prominent Video Thumbnail with Play Button */}
              <div
                className={cn(
                  "relative w-full h-36 sm:h-40 bg-gradient-to-br p-4 flex flex-col justify-between overflow-hidden",
                  lecture.thumbnailBg
                )}
              >
                {/* Background Pattern / Subject Banner Tag */}
                <div className="relative z-10">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-md text-[10px] font-black text-white tracking-wider uppercase drop-shadow-sm border border-white/20">
                    {lecture.categoryTag}
                  </span>
                </div>

                {/* Optional Teacher Avatar Graphic on Right */}
                {lecture.educatorAvatar && (
                  <div className="absolute right-3 bottom-2 w-14 h-16 opacity-85 pointer-events-none">
                    <Image
                      src={lecture.educatorAvatar}
                      alt={lecture.teacherName}
                      width={56}
                      height={64}
                      className="w-full h-full object-cover rounded-xl shadow-md border border-white/20"
                    />
                  </div>
                )}

                {/* Centered Play Button Overlay with Glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-brand-orange/90 group-hover/card:bg-brand-orange text-white flex items-center justify-center shadow-lg shadow-black/40 group-hover/card:scale-110 transition-all duration-200 border-2 border-white/40">
                    <Play className="h-4 w-4 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom Right Duration Chip */}
                <div className="relative z-10 self-end bg-black/75 backdrop-blur-xs px-2.5 py-0.5 rounded-md text-[10px] font-bold text-white tracking-wider border border-white/10">
                  {lecture.durationFormatted}
                </div>
              </div>

              {/* Lower 45%: Lecture Details */}
              <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between bg-white">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-brand-charcoal group-hover/card:text-brand-orange transition-colors line-clamp-1">
                    {lecture.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-text-muted">
                    <UserCheck className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                    <span className="truncate">{lecture.teacherName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-brand-border/50 text-[11px] font-semibold text-brand-text-subtle">
                  <span className="text-brand-charcoal/80 font-bold">{lecture.subject}</span>
                  <span className="flex items-center gap-1 text-brand-text-muted">
                    <Clock className="h-3 w-3 text-brand-orange" />
                    {lecture.duration}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Scroll Right Navigation Arrow */}
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
