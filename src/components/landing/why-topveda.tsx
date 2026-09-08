"use client";

import * as React from "react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { landingConfig } from "@/config/landing.config";
import { 
  Tv, 
  CheckSquare, 
  BookOpen, 
  MessageSquare, 
  TrendingUp, 
  Building2
} from "lucide-react";

interface WhyCardTheme {
  src: string;
  alt: string;
  objectPosition: string;
  bgGradient: string;
  borderBase: string;
  borderHover: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  frameBorder: string;
}

// Coordinated color themes and tailored horizontal framing for all 6 approved illustrations
const cardThemes: Record<string, WhyCardTheme> = {
  "live-classes": {
    src: "/assets/why/why_live_classes.png",
    alt: "Daily Live Interactive Classroom with educator, smartboard, and real-time student engagement",
    objectPosition: "center 28%",
    bgGradient: "bg-gradient-to-b from-[#FFFDFB] via-[#FFF7F0] to-[#FFEFE2]",
    borderBase: "border-orange-100/90",
    borderHover: "hover:border-brand-orange/60 hover:shadow-orange-100/50",
    iconBg: "bg-orange-50 border-orange-200/70",
    iconColor: "text-brand-orange",
    badgeBg: "bg-orange-100/80",
    badgeText: "text-brand-orange",
    frameBorder: "border-orange-200/90",
  },
  "tests-practice": {
    src: "/assets/why/why_tests_practice.png",
    alt: "Student taking timed mock tests with performance accuracy score gauge",
    objectPosition: "center 26%",
    bgGradient: "bg-gradient-to-b from-[#FBFCFC] via-[#F1F9F4] to-[#E4F5EB]",
    borderBase: "border-emerald-100/90",
    borderHover: "hover:border-emerald-500/60 hover:shadow-emerald-100/50",
    iconBg: "bg-emerald-50 border-emerald-200/70",
    iconColor: "text-emerald-600",
    badgeBg: "bg-emerald-100/80",
    badgeText: "text-emerald-700",
    frameBorder: "border-emerald-200/90",
  },
  "notes-resources": {
    src: "/assets/why/why_notes_resources.png",
    alt: "Curated chapter notes, organic chemistry formulas, and study materials",
    objectPosition: "center 42%",
    bgGradient: "bg-gradient-to-b from-[#FFFDFB] via-[#FFF8EB] to-[#FFF1D6]",
    borderBase: "border-amber-100/90",
    borderHover: "hover:border-amber-500/60 hover:shadow-amber-100/50",
    iconBg: "bg-amber-50 border-amber-200/70",
    iconColor: "text-amber-700",
    badgeBg: "bg-amber-100/80",
    badgeText: "text-amber-800",
    frameBorder: "border-amber-200/90",
  },
  "doubt-support": {
    src: "/assets/why/why_doubt_solving.png",
    alt: "24x7 instant one-on-one doubt clearing with subject mentors",
    objectPosition: "center 32%",
    bgGradient: "bg-gradient-to-b from-[#FBFCFE] via-[#F2F5FF] to-[#E6EDFF]",
    borderBase: "border-indigo-100/90",
    borderHover: "hover:border-indigo-500/60 hover:shadow-indigo-100/50",
    iconBg: "bg-indigo-50 border-indigo-200/70",
    iconColor: "text-indigo-600",
    badgeBg: "bg-indigo-100/80",
    badgeText: "text-indigo-700",
    frameBorder: "border-indigo-200/90",
  },
  "progress-tracking": {
    src: "/assets/why/why_progress_tracking.png",
    alt: "Detailed academic analytics dashboard tracking syllabus completion and test scores",
    objectPosition: "center 26%",
    bgGradient: "bg-gradient-to-b from-[#FBFCFC] via-[#EFF9FA] to-[#E0F3F6]",
    borderBase: "border-teal-100/90",
    borderHover: "hover:border-teal-500/60 hover:shadow-teal-100/50",
    iconBg: "bg-teal-50 border-teal-200/70",
    iconColor: "text-teal-600",
    badgeBg: "bg-teal-100/80",
    badgeText: "text-teal-700",
    frameBorder: "border-teal-200/90",
  },
  "hybrid-approach": {
    src: "/assets/why/why_hybrid_synergy.png",
    alt: "Seamless blend of online live digital learning and offline textbooks with study notes",
    objectPosition: "center 38%",
    bgGradient: "bg-gradient-to-b from-[#FFFDFB] via-[#FFF1F4] to-[#FFE6ED]",
    borderBase: "border-rose-100/90",
    borderHover: "hover:border-rose-500/60 hover:shadow-rose-100/50",
    iconBg: "bg-rose-50 border-rose-200/70",
    iconColor: "text-rose-600",
    badgeBg: "bg-rose-100/80",
    badgeText: "text-rose-700",
    frameBorder: "border-rose-200/90",
  },
};

export function WhyTopVeda() {
  const { whyTopVeda } = landingConfig;

  const iconMap = {
    Tv,
    CheckSquare,
    BookOpen,
    MessageSquare,
    TrendingUp,
    Building2,
  };

  return (
    <section id="features" className="py-16 md:py-24 bg-brand-surface border-y border-brand-border/60">
      <Container size="xl">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="peach" size="md">Core Advantages</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
            Why Choose TopVeda?
          </h2>
          <p className="text-base text-brand-text-muted">
            Engineered from the ground up to give every learner structured guidance, consistent practice, and instant doubt clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {whyTopVeda.map((pillar) => {
            const IconComponent = iconMap[pillar.iconName];
            const theme = cardThemes[pillar.id];

            return (
              <div
                key={pillar.id}
                tabIndex={0}
                role="article"
                aria-label={pillar.title}
                className={`group relative rounded-2xl border ${theme?.borderBase || "border-brand-border"} ${theme?.bgGradient || "bg-brand-bg-warm"} p-6 sm:p-7 shadow-card hover:shadow-card-hover ${theme?.borderHover || "hover:border-brand-orange-border/80"} transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange flex flex-col justify-between overflow-hidden cursor-pointer h-[390px] sm:h-[400px]`}
              >
                {/* Clean Top Card Info (Remains visible always; smoothly shifts up on hover/focus) */}
                <div className="relative z-10 space-y-3.5 transition-transform duration-300 ease-out group-hover:-translate-y-2 group-focus-within:-translate-y-2 group-hover:scale-[0.98] group-focus-within:scale-[0.98] origin-top motion-reduce:transition-none motion-reduce:transform-none">
                  <div className="flex items-center justify-between">
                    <div className={`h-12 w-12 rounded-xl border flex items-center justify-center shadow-subtle group-hover:scale-105 group-hover:bg-brand-orange group-hover:text-white group-hover:border-brand-orange transition-all duration-200 ${theme?.iconBg || "bg-brand-bg-peach border-brand-orange-border/50"} ${theme?.iconColor || "text-brand-orange"}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <span className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 uppercase tracking-wider px-2.5 py-0.5 rounded-full ${theme?.badgeBg || "bg-brand-bg-peach"} ${theme?.badgeText || "text-brand-orange"}`}>
                      Feature Preview ↑
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-brand-text-primary leading-snug group-hover:text-brand-orange transition-colors duration-150">
                    {pillar.title}
                  </h3>

                  <p className="text-sm text-brand-text-muted leading-relaxed line-clamp-3">
                    {pillar.description}
                  </p>
                </div>

                {/* =========================================================
                    WIDE RECTANGULAR FEATURE VISUAL (BOTTOM EMERGENCE)
                    Integrated naturally with matching border, radius & tone
                   ========================================================= */}
                {theme && (
                  <div 
                    className="absolute inset-x-6 bottom-4 sm:inset-x-7 sm:bottom-5 h-[148px] sm:h-[156px] pointer-events-none overflow-hidden flex items-end justify-center"
                    aria-hidden="true"
                  >
                    <div className="relative w-full h-full transform translate-y-full opacity-0 scale-[0.96] group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:scale-100 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-0 motion-reduce:group-hover:opacity-100 motion-reduce:group-focus-within:opacity-100">
                      {/* Wide Rectangular Styled Container */}
                      <div className={`relative w-full h-full rounded-xl overflow-hidden border ${theme.frameBorder} bg-white shadow-md ring-1 ring-black/5`}>
                        <Image
                          src={theme.src}
                          alt={theme.alt}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                          style={{ objectPosition: theme.objectPosition }}
                        />
                        {/* Soft subtle top vignette for seamless edge blending */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-black/5 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
