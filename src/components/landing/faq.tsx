"use client";

import * as React from "react";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { landingConfig } from "@/config/landing.config";
import { ChevronDown } from "lucide-react";

export function FAQ() {
  const { faqs } = landingConfig;
  const [openId, setOpenId] = React.useState<string | null>(faqs[0]?.id || null);

  const toggleFaq = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="py-16 md:py-24 bg-brand-surface border-t border-brand-border/60">
      <Container size="lg">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="peach" size="md">Got Questions?</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-text-primary tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-brand-text-muted">
            Find answers to common questions regarding TopVeda courses, live classes, study materials, and doubt support.
          </p>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "border-brand-orange-border/80 bg-brand-bg-peach/30 shadow-subtle"
                    : "border-brand-border bg-brand-surface hover:border-brand-border"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                >
                  <span className="text-base font-bold text-brand-text-primary leading-snug">
                    {faq.question}
                  </span>
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? "bg-brand-orange text-white rotate-180"
                        : "bg-brand-bg-peach text-brand-orange"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${faq.id}`}
                    className="px-6 pb-6 pt-1 text-sm text-brand-text-muted leading-relaxed border-t border-brand-orange-border/20 animate-in fade-in-50 duration-150"
                  >
                    {faq.answer}
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
