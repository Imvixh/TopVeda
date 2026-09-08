"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { landingConfig } from "@/config/landing.config";
import { ArrowRight, Sparkles } from "lucide-react";

export interface FinalCTAProps {
  onStartLearning: () => void;
}

export function FinalCTA({ onStartLearning }: FinalCTAProps) {
  const { finalCta } = landingConfig;

  return (
    <section className="py-16 md:py-24 bg-brand-bg-warm">
      <Container size="xl">
        <div className="rounded-3xl border border-brand-orange-border/60 bg-gradient-to-br from-brand-bg-peach via-brand-surface to-brand-bg-peach/80 p-8 sm:p-12 lg:p-16 text-center shadow-card relative overflow-hidden">
          {/* Subtle ambient circle */}
          <div 
            className="pointer-events-none absolute -bottom-20 -right-20 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl"
            aria-hidden="true" 
          />

          <div className="max-w-2xl mx-auto space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-orange-border/60 bg-brand-surface px-3.5 py-1.5 shadow-subtle">
              <Sparkles className="h-4 w-4 text-brand-orange" />
              <span className="text-xs font-semibold text-brand-orange">
                {finalCta.badge}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand-text-primary tracking-tight leading-tight">
              {finalCta.title}
            </h2>

            <p className="text-base sm:text-lg text-brand-text-muted leading-relaxed">
              {finalCta.subtitle}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={onStartLearning}
                className="w-full sm:w-auto font-bold text-base px-8 shadow-card hover:shadow-card-hover"
              >
                {finalCta.primaryButton.text}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              <a href={finalCta.secondaryButton.href} className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto font-semibold text-base px-6 bg-brand-surface"
                >
                  {finalCta.secondaryButton.text}
                </Button>
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
