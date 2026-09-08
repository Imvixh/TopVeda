"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { landingConfig } from "@/config/landing.config";
import { ArrowDown } from "lucide-react";

/**
 * Bespoke Website-Style Artwork for the 4 Steps
 * Premium, colorful SVG illustrations designed for TopVeda (No childish emojis)
 */

// Step 1: Navigation Route & GPS Compass (Teal/Blue Accent)
function NavigationMapArt() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 drop-shadow-xs" fill="none">
      <circle cx="24" cy="24" r="22" fill="#F0FDFA" stroke="#99F6E4" strokeWidth="1.5" />
      {/* Curved map route */}
      <path d="M14 32 C18 24, 28 28, 34 16" stroke="#0D9488" strokeWidth="2.5" strokeDasharray="3 3" strokeLinecap="round" />
      {/* Destination Pin */}
      <path d="M34 10 C30.686 10 28 12.686 28 16 C28 20.5 34 26 34 26 C34 26 40 20.5 40 16 C40 12.686 37.314 10 34 10 Z" fill="#0F766E" />
      <circle cx="34" cy="15.5" r="2.5" fill="#FFFFFF" />
      {/* Start Compass Point */}
      <circle cx="14" cy="32" r="4" fill="#14B8A6" />
      <circle cx="14" cy="32" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

// Step 2: Live Video Classroom Screen (Warm Orange & Coral Accent)
function LiveClassroomArt() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 drop-shadow-xs" fill="none">
      <circle cx="24" cy="24" r="22" fill="#FFF7ED" stroke="#FED7AA" strokeWidth="1.5" />
      {/* Digital Screen Frame */}
      <rect x="11" y="13" width="26" height="18" rx="3" fill="#121417" />
      <rect x="13" y="15" width="22" height="14" rx="1.5" fill="#1E293B" />
      {/* Live Play Waveform / Triangle */}
      <polygon points="21,18 29,22 21,26" fill="#F4511E" />
      {/* Stand */}
      <path d="M20 31 L28 31" stroke="#F4511E" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 31 L24 35" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 35 L30 35" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
      {/* Red Live Dot */}
      <circle cx="31" cy="17" r="1.5" fill="#EF4444" />
    </svg>
  );
}

// Step 3: Practice Notebook & Writing Pen (Emerald & Amber Accent)
function PracticeNotebookArt() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 drop-shadow-xs" fill="none">
      <circle cx="24" cy="24" r="22" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" />
      {/* Notebook Paper Sheet */}
      <rect x="13" y="11" width="22" height="26" rx="2" fill="#FFFFFF" stroke="#059669" strokeWidth="1.5" />
      {/* Ruled Lines with Checkmark */}
      <line x1="18" y1="17" x2="30" y2="17" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="22" x2="28" y2="22" stroke="#6EE7B7" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="27" x2="26" y2="27" stroke="#6EE7B7" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M17 32 L20 35 L26 29" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Stylized Writing Pen */}
      <path d="M30 31 L37 24 L34 21 L27 28 L26 32 Z" fill="#F59E0B" />
      <path d="M34 21 L37 24" stroke="#B45309" strokeWidth="1" />
    </svg>
  );
}

// Step 4: Achievement Medal & Excellence Badge (Gold & Indigo Accent)
function AchievementMedalArt() {
  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 drop-shadow-xs" fill="none">
      <circle cx="24" cy="24" r="22" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1.5" />
      {/* Ribbon Banner */}
      <path d="M17 26 L13 40 L20 36 L24 40 L24 28" fill="#4F46E5" />
      <path d="M31 26 L35 40 L28 36 L24 40 L24 28" fill="#4338CA" />
      {/* Golden Medal Circle */}
      <circle cx="24" cy="20" r="11" fill="#FBBF24" stroke="#D97706" strokeWidth="1.5" />
      <circle cx="24" cy="20" r="8.5" fill="#F59E0B" />
      {/* Excellence Star */}
      <polygon points="24,14 26,18.5 30.5,19 27,22 28,26.5 24,24 20,26.5 21,22 17.5,19 22,18.5" fill="#FFFFFF" />
    </svg>
  );
}

const artworkComponents = [
  NavigationMapArt,
  LiveClassroomArt,
  PracticeNotebookArt,
  AchievementMedalArt,
];

export function HowItWorks() {
  const { howItWorks } = landingConfig;

  // Desktop Alternating Zig-Zag Offsets:
  // Step 1: High (translate-y-0)
  // Step 2: Low (translate-y-12)
  // Step 3: High (translate-y-0)
  // Step 4: Low (translate-y-12)
  const zigZagOffsets = [
    "lg:translate-y-0",
    "lg:translate-y-12",
    "lg:translate-y-0",
    "lg:translate-y-12",
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-28 overflow-hidden">
      <Container size="xl">
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20 space-y-3">
          <Badge variant="peach" size="md">Progressive Pathway</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
            How TopVeda Works
          </h2>
          <p className="text-base text-brand-text-muted">
            A structured, 4-step organic pathway turning regular study into measurable academic confidence.
          </p>
        </div>

        {/* Desktop Zig-Zag Pathway with Curved Connector */}
        <div className="relative pb-12 lg:pb-16">
          
          {/* Decorative Curved Connecting Path (Desktop Only) */}
          <svg
            className="hidden lg:block absolute top-24 left-0 right-0 w-full h-36 pointer-events-none z-0"
            viewBox="0 0 1200 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Wavy curve connecting Step 1 (top) -> Step 2 (bottom) -> Step 3 (top) -> Step 4 (bottom) */}
            <path
              d="M 150 25 C 270 25, 330 115, 450 115 C 570 115, 630 25, 750 25 C 870 25, 930 115, 1050 115"
              stroke="#E5E7EB"
              strokeWidth="2.5"
              strokeDasharray="6 6"
            />
            {/* Orange Directional Accent Line */}
            <path
              d="M 150 25 C 270 25, 330 115, 450 115 C 570 115, 630 25, 750 25 C 870 25, 930 115, 1050 115"
              stroke="#F4511E"
              strokeWidth="2"
              strokeDasharray="10 10"
              strokeOpacity="0.45"
            />
          </svg>

          {/* 4 Equal-Size Cards Grid with Enhanced Horizontal Spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8 relative z-10">
            {howItWorks.map((step, index) => {
              const Artwork = artworkComponents[index];
              const offsetClass = zigZagOffsets[index] || "lg:translate-y-0";

              return (
                <div key={step.stepNumber} className="relative flex flex-col items-center">
                  
                  {/* Step Card: Strictly Equal Height (h-[280px]) and Flex Layout */}
                  <div
                    tabIndex={0}
                    className={`group w-full h-[280px] rounded-2xl border border-brand-border bg-brand-surface p-7 shadow-card hover:shadow-card-hover hover:border-brand-orange-border/80 transition-all duration-300 flex flex-col justify-between items-center text-center cursor-pointer hover:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${offsetClass}`}
                  >
                    {/* Top Step Badge & Bespoke Artwork */}
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-brand-bg-warm border border-brand-border flex items-center justify-center shadow-subtle group-hover:scale-110 group-hover:border-brand-orange-border/70 transition-all duration-200">
                        <Artwork />
                      </div>
                      <div className="absolute -top-2.5 -right-2.5 h-7 w-7 rounded-full bg-brand-charcoal text-white text-xs font-extrabold flex items-center justify-center shadow-subtle group-hover:bg-brand-orange transition-colors">
                        0{step.stepNumber}
                      </div>
                    </div>

                    {/* Step Title */}
                    <h3 className="text-base font-bold text-brand-text-primary group-hover:text-brand-orange transition-colors leading-snug">
                      {step.title}
                    </h3>

                    {/* Step Description */}
                    <p className="text-xs text-brand-text-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>

                  {/* Mobile-only vertical connector arrow */}
                  {index < howItWorks.length - 1 && (
                    <div className="lg:hidden flex items-center justify-center my-3 text-brand-orange/60" aria-hidden="true">
                      <ArrowDown className="h-5 w-5 animate-bounce" />
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
