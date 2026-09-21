"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { HERO_SLIDES } from "@/config/student-home.config";
import { cn } from "@/lib/utils";

export function StudentHeroBanner() {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const totalSlides = HERO_SLIDES.length;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  const currentSlide = HERO_SLIDES[currentIndex];

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-r from-[#081326] via-[#0E2044] to-[#1B3A72] text-white shadow-md border border-slate-800/40">
      {/* Background Decorative Mesh & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(30,64,175,0.25),transparent_60%)] pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Grid */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between min-h-[260px] sm:min-h-[290px] px-8 sm:px-14 py-8 sm:py-6 gap-6">
        {/* Left Text Block */}
        <div className="space-y-4 max-w-lg text-center md:text-left z-10">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-none">
              {currentSlide.title}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              {currentSlide.subtitle}
            </p>
          </div>

          <div className="pt-2 flex justify-center md:justify-start">
            <Link
              href={currentSlide.ctaLink}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-orange hover:bg-brand-orange-hover text-white text-sm font-bold shadow-lg shadow-orange-950/40 hover:shadow-orange-950/60 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              {currentSlide.ctaText}
            </Link>
          </div>
        </div>

        {/* Right 3D Visual & Quote Area */}
        <div className="relative flex items-center justify-center md:justify-end w-full md:w-auto shrink-0">
          <div className="relative w-72 sm:w-80 h-48 sm:h-56 flex items-center justify-center">
            {/* 3D Student Illustration with circular clip / blend */}
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src={currentSlide.characterImage}
                alt="TopVeda Mentorship"
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                priority
                className="object-cover object-center"
              />
            </div>

            {/* Motivational Tag Overlay */}
            <div className="absolute -right-2 sm:-right-4 top-4 bg-black/40 backdrop-blur-md border border-white/15 px-3.5 py-2 rounded-xl hidden sm:flex flex-col items-start shadow-xl pointer-events-none">
              <span className="text-amber-300 font-serif italic text-xs font-semibold leading-tight">
                Better Students
              </span>
              <span className="text-white font-serif italic text-xs font-semibold leading-tight">
                Brighter Futures
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Prev / Next Slider Navigation Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md text-white flex items-center justify-center transition-all duration-150 z-20 shadow-md"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={handleNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/35 backdrop-blur-md text-white flex items-center justify-center transition-all duration-150 z-20 shadow-md"
        aria-label="Next Slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slider Pagination Indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
        {HERO_SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "h-2 rounded-full transition-all duration-200",
              idx === currentIndex ? "w-6 bg-brand-orange" : "w-2 bg-white/40 hover:bg-white/60"
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
