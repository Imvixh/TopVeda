"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronRight,
  School,
  FlaskConical,
  BookOpen,
  Atom,
  Shield,
  Briefcase,
  TestTube,
  Stethoscope,
} from "lucide-react";
import { EXPLORE_COURSES } from "@/config/student-home.config";
import { CourseItem } from "@/types/student-home.types";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  school: School,
  flask: FlaskConical,
  book: BookOpen,
  atom: Atom,
  shield: Shield,
  briefcase: Briefcase,
  "test-tube": TestTube,
  stethoscope: Stethoscope,
};

export function ExploreCoursesSection() {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  return (
    <section className="space-y-4" id="explore-courses">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">
          Explore Courses
        </h2>
      </div>

      {/* Horizontal Cards Container — Wider, Taller & Better Spaced */}
      <div className="relative group">
        <div
          ref={scrollRef}
          className="flex items-center gap-4 sm:gap-4.5 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {EXPLORE_COURSES.map((course: CourseItem) => {
            const IconComponent = ICON_MAP[course.iconType] || School;

            return (
              <Link
                key={course.id}
                href={`/student/courses?category=${encodeURIComponent(course.category)}`}
                className="flex items-center gap-3.5 px-5 py-4 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:shadow-card hover:border-brand-orange-border/70 hover:-translate-y-0.5 transition-all duration-200 shrink-0 select-none min-w-[210px] sm:min-w-[225px]"
              >
                {/* Colored Icon Pill */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                    course.iconBg
                  )}
                >
                  <IconComponent className={cn("h-5 w-5", course.iconColor)} />
                </div>

                {/* Course Category Text */}
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-brand-text-muted leading-tight">
                    {course.title}
                  </p>
                  <p className="text-sm sm:text-[15px] font-black text-brand-charcoal leading-snug">
                    {course.category}
                  </p>
                </div>
              </Link>
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
