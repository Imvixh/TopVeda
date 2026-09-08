"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { landingConfig } from "@/config/landing.config";
import { GraduationCap, BookOpenCheck, ArrowRight } from "lucide-react";

export interface LookingForProps {
  onStartLearning: () => void;
  onTeachClick: () => void;
}

export function LookingFor({ onStartLearning, onTeachClick }: LookingForProps) {
  const { lookingFor } = landingConfig;

  return (
    <section id="looking-for" className="py-16 md:py-20">
      <Container size="xl">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <Badge variant="peach" size="md">Customized Pathways</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
            What Are You Looking For?
          </h2>
          <p className="text-base text-brand-text-muted">
            Choose your learning or teaching journey with TopVeda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {lookingFor.map((card) => {
            const isStudent = card.id === "learn";
            return (
              <Card
                key={card.id}
                interactive
                className={`p-8 flex flex-col justify-between transition-all duration-200 ${
                  isStudent
                    ? "bg-brand-surface border-brand-orange-border/70 hover:border-brand-orange"
                    : "bg-[#FFF7F2] border-brand-orange-border/50 hover:border-brand-orange/70"
                }`}
              >
                <CardHeader className="p-0 space-y-4">
                  <div className="flex items-center justify-between">
                    <div
                      className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-subtle ${
                        isStudent
                          ? "bg-brand-bg-peach text-brand-orange border border-brand-orange-border/50"
                          : "bg-white/90 text-brand-charcoal border border-brand-orange-border/40"
                      }`}
                    >
                      {isStudent ? (
                        <GraduationCap className="h-7 w-7" />
                      ) : (
                        <BookOpenCheck className="h-7 w-7" />
                      )}
                    </div>
                    <Badge variant={isStudent ? "primary" : "neutral"} size="md">
                      {card.badge}
                    </Badge>
                  </div>

                  <CardTitle className="text-2xl font-extrabold text-brand-text-primary">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-base text-brand-text-muted leading-relaxed">
                    {card.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-0 mt-6 pt-4 border-t border-brand-border-subtle">
                  <p className="text-xs text-brand-text-muted">
                    {isStudent
                      ? "• Live interactive classes • NCERT syllabus • Test series • Doubt resolution"
                      : "• Educator onboarding • Curriculum collaboration • Digital teaching tools"}
                  </p>
                </CardContent>

                <CardFooter className="p-0 mt-6 border-0">
                  <Button
                    variant={isStudent ? "primary" : "secondary"}
                    size="lg"
                    onClick={isStudent ? onStartLearning : onTeachClick}
                    className="w-full sm:w-auto font-bold"
                  >
                    {card.ctaText}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
