"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Target, Atom, BookOpen, GraduationCap, Stethoscope } from "lucide-react";
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
}

export function OngoingBatchesSection({ batches }: OngoingBatchesSectionProps) {
  const activeBatches = batches !== undefined ? batches : ONGOING_BATCHES;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  if (activeBatches.length === 0) {
    return null;
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
          Ongoing Batches
        </h2>
        <Link
          href="/student/batches"
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
          className="flex items-stretch gap-3.5 overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {activeBatches.map((item: OngoingBatch) => {
            const IconComponent = ICON_MAP[item.iconType] || Target;
            const isLive = item.statusType === "live";

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between min-w-[220px] max-w-[240px] rounded-2xl bg-white border border-brand-border/80 p-4 shadow-2xs hover:shadow-card hover:border-brand-orange-border/70 transition-all duration-200 shrink-0"
              >
                {/* Top Row: Subject Icon + Title */}
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0",
                      item.iconBg
                    )}
                  >
                    <IconComponent className={cn("h-4 w-4", item.iconColor)} />
                  </div>

                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-brand-text-primary leading-tight">
                      {item.badge}
                    </p>
                    <p className="text-xs font-semibold text-brand-text-muted leading-tight">
                      {item.batchName}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] font-bold pt-0.5 flex items-center gap-1",
                        isLive ? "text-emerald-600" : "text-brand-text-muted"
                      )}
                    >
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {item.status}
                    </p>
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-3.5 pt-2 border-t border-brand-border/40 flex justify-end">
                  <Link
                    href={`/student/batches/${item.id}`}
                    className={cn(
                      "inline-flex items-center justify-center px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150",
                      isLive
                        ? "bg-brand-orange hover:bg-brand-orange-hover text-white shadow-xs"
                        : "bg-[#F4F6F8] hover:bg-[#EAEFF4] text-brand-text-primary"
                    )}
                  >
                    {item.ctaText}
                  </Link>
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
