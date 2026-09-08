"use client";

import * as React from "react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { landingConfig } from "@/config/landing.config";
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export interface HeroProps {
  onStartLearning: () => void;
}

export function Hero({ onStartLearning }: HeroProps) {
  const { hero } = landingConfig;
  const [currentSlide, setCurrentSlide] = React.useState(0);

  // 4 Final Approved Hero Slideshow Images
  const slides = [
    {
      id: "learning-journey",
      src: "/assets/hero/hero_slide_1.png",
      alt: "TopVeda Student Learning Journey — Happy student holding books with science and math concepts",
    },
    {
      id: "live-classes",
      src: "/assets/hero/hero_slide_2.png",
      alt: "TopVeda Live Interactive Classes — Educator teaching interactive live digital class",
    },
    {
      id: "structured-learning-path",
      src: "/assets/hero/hero_slide_3.png",
      alt: "TopVeda Structured Learning Path — Subject milestone roadmaps in Mathematics, Physics, Chemistry, Biology",
    },
    {
      id: "practice-test-excel",
      src: "/assets/hero/hero_slide_4.png",
      alt: "TopVeda Practice, Test & Excel — Student practicing exam questions with accuracy and achievement metrics",
    },
  ];

  // Auto-rotate 4 approved images every 5.5 seconds
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24">
      {/* Soft Ambient Background Glow */}
      <div 
        className="pointer-events-none absolute -top-28 right-1/3 translate-x-1/2 w-[750px] h-[450px] bg-gradient-to-br from-brand-bg-peach via-orange-100/30 to-transparent blur-3xl -z-10 rounded-full"
        aria-hidden="true" 
      />

      <Container size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Hero Headline & Actions (Approved Copy - Unchanged) */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange-border/60 bg-brand-bg-peach px-3.5 py-1.5 shadow-subtle">
              <Sparkles className="h-4 w-4 text-brand-orange" />
              <span className="text-xs font-semibold text-brand-orange">
                {hero.badge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-brand-text-primary leading-[1.1]">
              <span className="text-brand-orange block sm:inline">{hero.title.highlight}</span>{" "}
              <span>{hero.title.part2}</span>{" "}
              <span className="text-brand-charcoal">{hero.title.part3}</span>
            </h1>

            <p className="text-base sm:text-lg text-brand-text-muted max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {hero.subtitle}
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={onStartLearning}
                className="w-full sm:w-auto shadow-card hover:shadow-card-hover font-bold text-base px-7"
              >
                {hero.primaryCta.text}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              <a href={hero.secondaryCta.href} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto font-semibold text-base px-6 bg-brand-surface"
                >
                  {hero.secondaryCta.text}
                </Button>
              </a>
            </div>

            {/* Trust Points */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-brand-text-muted">
              {hero.trustPoints.map((point) => (
                <div key={point} className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Approved Visual Hero Slideshow */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-md sm:max-w-lg lg:max-w-none">
              
              {/* Slideshow Display Frame with Soft Seamless Blending */}
              <div className="group relative w-full aspect-[3/2] sm:aspect-[16/10] md:aspect-[3/2] rounded-2xl sm:rounded-3xl border border-brand-orange-border/30 bg-gradient-to-tr from-brand-bg-peach/60 via-white to-orange-50/40 shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex items-center justify-center">
                
                {/* 4 Approved Visual Slides */}
                {slides.map((slide, index) => {
                  const isActive = index === currentSlide;
                  return (
                    <div
                      key={slide.id}
                      className={`absolute inset-0 transition-all duration-700 ease-in-out flex items-center justify-center p-1 sm:p-2 ${
                        isActive
                          ? "opacity-100 scale-100 z-20 pointer-events-auto"
                          : "opacity-0 scale-98 z-0 pointer-events-none"
                      }`}
                      aria-hidden={!isActive}
                    >
                      <div className="relative h-full w-full rounded-xl sm:rounded-2xl overflow-hidden shadow-subtle">
                        <Image
                          src={slide.src}
                          alt={slide.alt}
                          fill
                          priority={index === 0}
                          className="object-contain object-center rounded-xl sm:rounded-2xl"
                          sizes="(max-width: 768px) 100vw, 600px"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Subtle Left / Right Navigation Arrows on Hover */}
                <button
                  type="button"
                  onClick={prevSlide}
                  className="absolute left-2.5 z-30 h-8 w-8 rounded-full bg-white/90 text-brand-charcoal shadow-md border border-brand-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-orange hover:text-white focus-visible:opacity-100 focus-visible:outline-none"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={nextSlide}
                  className="absolute right-2.5 z-30 h-8 w-8 rounded-full bg-white/90 text-brand-charcoal shadow-md border border-brand-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-brand-orange hover:text-white focus-visible:opacity-100 focus-visible:outline-none"
                  aria-label="Next slide"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Subtle Interactive Dot Indicators */}
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-brand-charcoal/20 backdrop-blur-xs px-3 py-1 rounded-full border border-white/30">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange ${
                        idx === currentSlide
                          ? "w-6 bg-brand-orange"
                          : "w-2 bg-white/80 hover:bg-brand-orange"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

              </div>

              {/* Floating Highlight Badge */}
              <div className="hidden sm:flex absolute -bottom-3 -left-3 rounded-xl border border-brand-border bg-brand-surface/95 backdrop-blur-sm px-4 py-2 shadow-card items-center gap-2.5 z-30">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-brand-text-primary">
                  Interactive Cohorts Active
                </span>
              </div>

            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
