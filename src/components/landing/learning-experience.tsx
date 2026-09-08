"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Video, 
  FileText, 
  CheckCircle, 
  HelpCircle, 
  ArrowUpRight,
  Sparkles,
  Award
} from "lucide-react";

export function LearningExperience() {
  return (
    <section className="py-16 md:py-24 bg-brand-bg-peach/30 border-y border-brand-border/60">
      <Container size="xl">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="peach" size="md">Student Dashboard Preview</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
            An Intuitive, Focus-Driven Learning Space
          </h2>
          <p className="text-base text-brand-text-muted">
            Everything a student needs in one place — live interactive sessions, personalized analytics, and instant mentor assistance.
          </p>
        </div>

        {/* Dashboard Preview Shell */}
        <div className="rounded-2xl border border-brand-border bg-brand-surface p-6 sm:p-8 lg:p-10 shadow-card">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Live Class & Syllabus Progress */}
            <div className="lg:col-span-7 space-y-6">
              {/* Upcoming Live Class Card */}
              <div className="rounded-xl border border-brand-orange-border/60 bg-brand-bg-peach/70 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-orange">
                    <Video className="h-4 w-4" />
                    <span>UPCOMING LIVE CLASS</span>
                  </div>
                  <Badge variant="primary" size="sm">Today, 5:00 PM</Badge>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-brand-text-primary">
                    Class 10 Science: Chemical Reactions & Equations
                  </h3>
                  <p className="text-xs text-brand-text-muted mt-1">
                    Live discussion on balancing equations, precipitation, and redox mechanisms.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-brand-orange-border/30 text-xs">
                  <span className="font-semibold text-brand-charcoal">Educator: Dr. R. Sharma</span>
                  <span className="text-brand-orange font-bold flex items-center gap-1 cursor-pointer hover:underline">
                    Join Session <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>

              {/* Ongoing Course Progress */}
              <div className="rounded-xl border border-brand-border bg-brand-bg-warm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-brand-orange" />
                    <span className="text-sm font-bold text-brand-text-primary">Mathematics Course Progress</span>
                  </div>
                  <span className="text-xs font-extrabold text-brand-orange">16 / 20 Chapters Done</span>
                </div>

                <div className="space-y-2">
                  <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-brand-orange h-full rounded-full w-[80%]" />
                  </div>
                  <div className="flex justify-between text-[11px] text-brand-text-muted">
                    <span>Target: Board Exam Mastery</span>
                    <span className="font-semibold text-brand-charcoal">80% Completed</span>
                  </div>
                </div>

                {/* Sub-item Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <div className="rounded-lg bg-brand-surface p-2.5 border border-brand-border flex items-center gap-2 text-xs">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-brand-text-primary truncate">Real Numbers & Proofs</span>
                  </div>
                  <div className="rounded-lg bg-brand-surface p-2.5 border border-brand-border flex items-center gap-2 text-xs">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-medium text-brand-text-primary truncate">Polynomials & Factorization</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Doubt Ticket & Notes Quick Access */}
            <div className="lg:col-span-5 space-y-6">
              {/* Doubt Assistant Card */}
              <div className="rounded-xl border border-brand-border bg-brand-bg-warm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-brand-orange" />
                    <span className="text-sm font-bold text-brand-text-primary">24×7 Doubt Ticket</span>
                  </div>
                  <Badge variant="success" size="sm">Answered</Badge>
                </div>

                <div className="rounded-lg bg-brand-surface p-3.5 border border-brand-border space-y-1.5">
                  <p className="text-xs font-semibold text-brand-text-primary">
                    Q: How do we apply the tangent secant theorem in circle proofs?
                  </p>
                  <p className="text-[11px] text-brand-text-muted leading-relaxed">
                    Mentor Answer: Apply the ratio of chord segments. Step-by-step diagram attached in the notes panel.
                  </p>
                </div>
              </div>

              {/* Study Materials & Formula Sheets */}
              <div className="rounded-xl border border-brand-border bg-brand-bg-warm p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-orange" />
                  <span className="text-sm font-bold text-brand-text-primary">Quick Revision Notes</span>
                </div>

                <div className="space-y-2">
                  <div className="rounded-lg bg-brand-surface p-2.5 border border-brand-border flex items-center justify-between text-xs hover:border-brand-orange-border/70 transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      <Sparkles className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                      <span className="font-medium text-brand-text-primary truncate">Class 10 Physics: Optics Formula Sheet</span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-orange">PDF (1.2 MB)</span>
                  </div>

                  <div className="rounded-lg bg-brand-surface p-2.5 border border-brand-border flex items-center justify-between text-xs hover:border-brand-orange-border/70 transition-colors">
                    <div className="flex items-center gap-2 truncate">
                      <Award className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                      <span className="font-medium text-brand-text-primary truncate">Official BSEB / CBSE Sample Papers 2026</span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-orange">PDF (2.4 MB)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </Container>
    </section>
  );
}
