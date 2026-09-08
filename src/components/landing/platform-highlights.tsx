"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { landingConfig } from "@/config/landing.config";
import { Video, FileText, HelpCircle } from "lucide-react";

const iconMap = {
  Video: Video,
  FileText: FileText,
  HelpCircle: HelpCircle,
};

export function PlatformHighlights() {
  const { platformHighlights } = landingConfig;

  return (
    <section className="py-12 md:py-16 bg-brand-surface border-y border-brand-border/60">
      <Container size="xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {platformHighlights.map((highlight) => {
            const IconComponent = iconMap[highlight.iconName];
            return (
              <Card
                key={highlight.id}
                interactive
                className="bg-brand-bg-warm hover:bg-brand-bg-peach/60 border-brand-border hover:border-brand-orange-border/70 p-6 transition-all duration-200"
              >
                <CardHeader className="p-0 space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-brand-bg-peach border border-brand-orange-border/50 flex items-center justify-center text-brand-orange shadow-subtle">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg font-bold text-brand-text-primary">
                    {highlight.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-brand-text-muted leading-relaxed">
                    {highlight.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
