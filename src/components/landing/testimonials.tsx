"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquareQuote, Sparkles } from "lucide-react";

/**
 * Testimonial Section Framework
 * Architectural placeholder ensuring zero fabricated data. Real student stories will populate dynamically in Phase 5.
 */
export function Testimonials() {
  return (
    <section className="py-16 md:py-20">
      <Container size="xl">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <Badge variant="peach" size="md">Community & Trust</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
            Student Success & Learning Community
          </h2>
          <p className="text-base text-brand-text-muted">
            Designed to empower students across CBSE and Bihar Board with transparent learning and dedicated academic mentorship.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Card className="bg-brand-surface border-brand-orange-border/50 p-8 text-center space-y-4 shadow-card">
            <div className="h-12 w-12 rounded-full bg-brand-bg-peach border border-brand-orange-border/40 mx-auto flex items-center justify-center text-brand-orange">
              <MessageSquareQuote className="h-6 w-6" />
            </div>
            <CardHeader className="p-0 space-y-2">
              <CardTitle className="text-xl font-bold text-brand-text-primary">
                Dedicated to Genuine Academic Excellence
              </CardTitle>
              <CardDescription className="text-sm text-brand-text-muted leading-relaxed max-w-xl mx-auto">
                TopVeda does not publish unverified or simulated reviews. As our enrolled cohorts complete their board assessments, verified student stories and outcomes will be shared here.
              </CardDescription>
            </CardHeader>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange bg-brand-bg-peach px-3 py-1 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                Empowering Learners Nationwide
              </span>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
}
