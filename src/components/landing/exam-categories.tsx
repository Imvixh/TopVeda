"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { landingConfig } from "@/config/landing.config";
import { Check, Layers } from "lucide-react";

export function ExamCategories() {
  // Principle: ONLY active/published categories are rendered
  const activeCategories = landingConfig.examCategories.filter((c) => c.isActive);

  return (
    <section id="exams" className="py-16 md:py-20 bg-brand-bg-peach/30 border-y border-brand-border/60">
      <Container size="xl">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="peach" size="md">Targeted Academic Preparation</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
            Curriculum & Exam Categories
          </h2>
          <p className="text-base text-brand-text-muted">
            Specialized learning tracks designed around official board patterns and exam guidelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {activeCategories.map((category) => (
            <Card
              key={category.id}
              className="bg-brand-surface border-brand-border hover:border-brand-orange-border/80 p-8 shadow-card hover:shadow-card-hover transition-all duration-200"
            >
              <CardHeader className="p-0 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-brand-bg-peach border border-brand-orange-border/50 flex items-center justify-center text-brand-orange font-bold text-base">
                      {category.code}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-brand-text-primary">
                        {category.title}
                      </CardTitle>
                      <p className="text-xs font-semibold text-brand-orange mt-0.5">
                        {category.subtitle}
                      </p>
                    </div>
                  </div>
                  <Badge variant="primary" size="sm">
                    {category.code}
                  </Badge>
                </div>

                <CardDescription className="text-sm text-brand-text-muted leading-relaxed pt-2">
                  {category.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 mt-6 pt-4 border-t border-brand-border-subtle">
                <p className="text-xs font-bold text-brand-text-primary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-brand-orange" />
                  Key Program Highlights
                </p>
                <ul className="space-y-2">
                  {category.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-brand-text-muted">
                      <div className="h-4 w-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  );
}
