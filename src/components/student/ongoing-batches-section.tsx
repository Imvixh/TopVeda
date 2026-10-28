"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Target, Atom, BookOpen, GraduationCap, Stethoscope } from "lucide-react";
import { ONGOING_BATCHES } from "@/config/student-home.config";
import { OngoingBatch } from "@/types/student-home.types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  target: Target,
  atom: Atom,
  book: BookOpen,
  academy: GraduationCap,
  medical: Stethoscope,
};

export interface OngoingBatchesSectionProps {
  batches?: OngoingBatch[];
  title?: string;
  subtitle?: string;
}

export function OngoingBatchesSection({
  batches,
  title = "Ongoing Batches",
  subtitle,
}: OngoingBatchesSectionProps) {
  const activeBatches = batches !== undefined ? batches : ONGOING_BATCHES;
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScrollability = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScrollability();
    el.addEventListener("scroll", checkScrollability, { passive: true });
    window.addEventListener("resize", checkScrollability);

    return () => {
      el.removeEventListener("scroll", checkScrollability);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [checkScrollability, activeBatches]);

  if (activeBatches.length === 0) {
    return null;
  }

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -260, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 260, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-brand-text-muted font-medium">{subtitle}</p>
          )}
        </div>
        <Link
          href="/student/batches"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange-hover transition-colors shrink-0"
        >
          See All
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal Cards Container */}
      <div className="relative group">
        {/* Scroll Left Button */}
        {canScrollLeft && (
          <button
            onClick={handleScrollLeft}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-brand-border/80 shadow-md text-brand-charcoal flex items-center justify-center transition-all duration-200 z-10 hover:bg-brand-bg-warm cursor-pointer -ml-2 sm:-ml-3"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex items-stretch gap-3.5 overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth px-0.5"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {activeBatches.map((item: OngoingBatch) => {
            const IconComponent = ICON_MAP[item.iconType] || Target;
            const isLive = item.statusType === "live";
            const leadTeacher = item.teachers && item.teachers.length > 0 ? item.teachers[0] : null;

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between min-w-[280px] max-w-[320px] rounded-3xl bg-white border border-brand-border/90 p-5 shadow-2xs hover:shadow-card hover:border-brand-orange/60 hover:-translate-y-0.5 transition-all duration-200 shrink-0"
              >
                <div className="space-y-3">
                  {/* Top Badges: Live / Ongoing indicator + Board tag */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border",
                        isLive
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : "bg-orange-50 border-orange-200 text-brand-orange"
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isLive ? "bg-emerald-500 animate-pulse" : "bg-brand-orange"
                        )}
                      />
                      {isLive ? "Live Cohort" : "Ongoing Batch"}
                    </span>

                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/70 truncate max-w-[120px]">
                      {item.badge || item.subject || "TopVeda"}
                    </span>
                  </div>

                  {/* Batch Title & Description */}
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-brand-charcoal group-hover:text-brand-orange transition-colors line-clamp-1 leading-snug">
                      {item.batchName}
                    </h3>
                    <p className="text-xs text-brand-text-muted line-clamp-2 mt-1 leading-relaxed">
                      {item.description || "Structured ongoing curriculum with live classes, study materials & doubt support."}
                    </p>
                  </div>

                  {/* Faculty Strip */}
                  <div className="flex items-center gap-2.5 pt-2 border-t border-brand-border/50">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-brand-bg-peach border border-brand-border/60 flex items-center justify-center shrink-0">
                      {leadTeacher?.avatarUrl ? (
                        <img
                          src={leadTeacher.avatarUrl}
                          alt={leadTeacher.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-brand-orange">
                          {leadTeacher ? leadTeacher.name.charAt(0) : "T"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-brand-charcoal truncate">
                        {leadTeacher ? leadTeacher.name : "TopVeda Faculty"}
                      </p>
                      <p className="text-[10px] text-brand-text-muted truncate">
                        {leadTeacher?.qualification || "Subject Specialist"}
                      </p>
                    </div>
                  </div>

                  {/* Curriculum Content Quick Stats */}
                  <div className="flex items-center gap-3 text-[11px] text-brand-text-muted font-medium pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      {item.lectureCount || 10}+ Lectures
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Notes &amp; PDFs
                    </span>
                  </div>
                </div>

                {/* Bottom CTA Button */}
                <div className="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    Free / Included
                  </span>

                  <Link
                    href={`/student/batches/${item.id}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-orange hover:bg-brand-orange-hover text-white shadow-xs group-hover:translate-x-0.5 transition-all duration-150"
                  >
                    <span>Explore Batch</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Scroll Right Button */}
        {canScrollRight && (
          <button
            onClick={handleScrollRight}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-brand-border/80 shadow-md text-brand-charcoal flex items-center justify-center transition-all duration-200 z-10 hover:bg-brand-bg-warm cursor-pointer -mr-2 sm:-mr-3"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
