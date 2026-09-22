"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FEATURED_BATCHES } from "@/config/student-home.config";
import { FeaturedBatch } from "@/types/student-home.types";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  orange: "bg-orange-500 text-white",
  pink: "bg-pink-500 text-white",
  green: "bg-emerald-600 text-white",
  purple: "bg-purple-600 text-white",
};

export interface FeaturedBatchesSectionProps {
  batches?: FeaturedBatch[];
}

export function FeaturedBatchesSection({ batches }: FeaturedBatchesSectionProps) {
  const activeBatches = batches !== undefined ? batches : FEATURED_BATCHES;
  const scrollRef = React.useRef<HTMLDivElement>(null);

  if (activeBatches.length === 0) {
    return null;
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-3.5" id="featured-batches">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
          New & Featured Batches
        </h2>
        <Link
          href="/student/batches"
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-brand-orange-hover transition-colors"
        >
          See All
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal Scroll Cards Row */}
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 overflow-x-auto pb-2 pt-1 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {activeBatches.map((batch: FeaturedBatch) => (
            <div
              key={batch.id}
              className={cn(
                "relative flex flex-col justify-between min-w-[275px] max-w-[285px] sm:min-w-[290px] rounded-2xl p-5 border bg-gradient-to-br transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 shrink-0 select-none",
                batch.bgGradient,
                batch.borderColor
              )}
            >
              {/* Top Badge & Board Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-2xs",
                      BADGE_STYLES[batch.badge.variant] || "bg-orange-500 text-white"
                    )}
                  >
                    {batch.badge.text}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-extrabold text-brand-charcoal leading-tight">
                    {batch.board}
                  </p>
                  <p className="text-sm font-black text-brand-text-primary leading-snug">
                    {batch.title}
                  </p>
                  <p className="text-[11px] font-medium text-brand-text-muted leading-tight">
                    {batch.subtitle}
                  </p>
                </div>
              </div>

              {/* Bottom Content: CTA Button + Educator Portrait */}
              <div className="flex items-end justify-between mt-4 pt-1">
                <Link
                  href={`/student/batches/${batch.id}`}
                  className="inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all duration-150"
                >
                  Explore →
                </Link>

                {/* Educator Avatar Graphic */}
                <div className="relative w-16 h-20 -mb-1 shrink-0">
                  <Image
                    src={batch.educatorAvatar}
                    alt={batch.educatorName}
                    width={64}
                    height={80}
                    className="w-full h-full object-cover rounded-xl shadow-xs border border-white/60"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Subtle Next Scroll Arrow on Hover */}
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
