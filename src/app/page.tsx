"use client";

import * as React from "react";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Container } from "@/components/ui/container";
import { 
  CheckCircle2, 
  Palette, 
  Type, 
  Sliders, 
  ShieldCheck, 
  Eye, 
  Search, 
  ArrowRight,
  Code
} from "lucide-react";

export default function Phase1ShowcasePage() {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [testInputVal, setTestInputVal] = React.useState("");

  return (
    <div className="min-h-screen bg-brand-bg-warm py-12 px-4 sm:px-6 lg:px-8 text-brand-text-primary">
      <Container size="lg" className="space-y-12">
        
        {/* Foundation Header */}
        <header className="border-b border-brand-border pb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandGlyph size={36} />
              <Wordmark size="lg" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="md">Phase 1 Foundation</Badge>
              <Badge variant="neutral" size="md">Next.js 15 + TypeScript</Badge>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="text-2xl font-bold tracking-tight text-brand-text-primary sm:text-3xl">
              Design System & Architectural Showcase
            </h1>
            <p className="mt-2 text-sm text-brand-text-muted max-w-3xl leading-relaxed">
              This page verifies the design tokens, component primitives, responsive behavior, 
              and foundational architecture for TopVeda. It is a technical foundation sandbox 
              and not the final consumer landing page.
            </p>
          </div>
        </header>

        {/* 1. Brand Identity & Tokens */}
        <section className="space-y-6" aria-labelledby="brand-section-heading">
          <div className="flex items-center gap-2 border-b border-brand-border pb-2">
            <Palette className="h-5 w-5 text-brand-orange" />
            <h2 id="brand-section-heading" className="text-xl font-bold">
              1. Brand Identity & Color Tokens
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Warm Orange */}
            <div className="rounded-xl border border-brand-border bg-brand-surface p-4 shadow-subtle space-y-3">
              <div className="h-20 w-full rounded-lg bg-brand-orange flex items-end p-3 text-white font-mono text-xs font-bold">
                #F4511E
              </div>
              <div>
                <p className="font-semibold text-sm">Primary Brand Accent</p>
                <p className="text-xs text-brand-text-muted">Warm Orange / Orange-Red</p>
                <p className="text-[11px] text-brand-text-subtle mt-1 font-mono">--color-brand-orange</p>
              </div>
            </div>

            {/* Deep Charcoal */}
            <div className="rounded-xl border border-brand-border bg-brand-surface p-4 shadow-subtle space-y-3">
              <div className="h-20 w-full rounded-lg bg-brand-charcoal flex items-end p-3 text-white font-mono text-xs font-bold">
                #121417
              </div>
              <div>
                <p className="font-semibold text-sm">Secondary / Base</p>
                <p className="text-xs text-brand-text-muted">Deep Charcoal / Near-Black</p>
                <p className="text-[11px] text-brand-text-subtle mt-1 font-mono">--color-brand-charcoal</p>
              </div>
            </div>

            {/* Warm Off-White */}
            <div className="rounded-xl border border-brand-border bg-brand-surface p-4 shadow-subtle space-y-3">
              <div className="h-20 w-full rounded-lg bg-brand-bg-warm border border-brand-border flex items-end p-3 text-brand-text-primary font-mono text-xs font-bold">
                #FAFAF7
              </div>
              <div>
                <p className="font-semibold text-sm">Page Background</p>
                <p className="text-xs text-brand-text-muted">Warm Off-White / Cream</p>
                <p className="text-[11px] text-brand-text-subtle mt-1 font-mono">--color-brand-bg-warm</p>
              </div>
            </div>

            {/* Warm Peach */}
            <div className="rounded-xl border border-brand-border bg-brand-surface p-4 shadow-subtle space-y-3">
              <div className="h-20 w-full rounded-lg bg-brand-bg-peach border border-brand-orange-border/40 flex items-end p-3 text-brand-orange font-mono text-xs font-bold">
                #FFF7F2
              </div>
              <div>
                <p className="font-semibold text-sm">Secondary Background</p>
                <p className="text-xs text-brand-text-muted">Subtle Warm Peach Tint</p>
                <p className="text-[11px] text-brand-text-subtle mt-1 font-mono">--color-brand-bg-peach</p>
              </div>
            </div>
          </div>

          {/* Wordmark Sizes & Surfaces */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-brand-border bg-brand-surface p-6 space-y-4">
              <p className="text-xs font-semibold text-brand-text-muted uppercase tracking-wider">
                Wordmark on Light Surface
              </p>
              <div className="flex flex-wrap items-baseline gap-6 pt-2">
                <Wordmark size="sm" />
                <Wordmark size="md" />
                <Wordmark size="lg" />
                <Wordmark size="xl" />
              </div>
            </div>

            <div className="rounded-xl border border-brand-charcoal bg-brand-charcoal p-6 space-y-4 text-white">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Wordmark on Dark / High-Contrast Surface
              </p>
              <div className="flex flex-wrap items-baseline gap-6 pt-2">
                <Wordmark size="sm" inverseVeda />
                <Wordmark size="md" inverseVeda />
                <Wordmark size="lg" inverseVeda />
                <Wordmark size="xl" inverseVeda />
              </div>
            </div>
          </div>
        </section>

        {/* 2. Typography Hierarchy */}
        <section className="space-y-6" aria-labelledby="typography-heading">
          <div className="flex items-center gap-2 border-b border-brand-border pb-2">
            <Type className="h-5 w-5 text-brand-orange" />
            <h2 id="typography-heading" className="text-xl font-bold">
              2. Typography Hierarchy (Plus Jakarta Sans & Inter)
            </h2>
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 divide-y divide-brand-border-subtle space-y-4">
            <div className="pt-2">
              <span className="text-xs font-mono text-brand-text-subtle">Display / 40px ExtraBold</span>
              <p className="text-4xl font-extrabold text-brand-text-primary tracking-tight">
                Empowering Modern Education
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs font-mono text-brand-text-subtle">H1 / 32px Bold</span>
              <p className="text-3xl font-bold text-brand-text-primary tracking-tight">
                Structured Learning Taxonomy
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs font-mono text-brand-text-subtle">H2 / 24px Bold</span>
              <p className="text-2xl font-bold text-brand-text-primary">
                Interactive Classes & Adaptive Tests
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs font-mono text-brand-text-subtle">H3 / 20px SemiBold</span>
              <p className="text-xl font-semibold text-brand-text-primary">
                Comprehensive Progress Analytics & Insights
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs font-mono text-brand-text-subtle">Body Regular / 16px</span>
              <p className="text-base text-brand-text-primary leading-relaxed">
                TopVeda provides an extensible, modern learning environment engineered for high-performance delivery across all screen sizes and learning paths.
              </p>
            </div>
            <div className="pt-4">
              <span className="text-xs font-mono text-brand-text-subtle">Body Muted / 14px</span>
              <p className="text-sm text-brand-text-muted leading-normal">
                Subtle helper copy, timestamps, and secondary educational metadata.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Component Primitives */}
        <section className="space-y-6" aria-labelledby="components-heading">
          <div className="flex items-center gap-2 border-b border-brand-border pb-2">
            <Sliders className="h-5 w-5 text-brand-orange" />
            <h2 id="components-heading" className="text-xl font-bold">
              3. Interactive Component Primitives
            </h2>
          </div>

          {/* Buttons Showcase */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-text-muted">
              Button Variants & Micro-Interactions
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="md">
                Primary Button <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="secondary" size="md">
                Secondary Dark
              </Button>
              <Button variant="outline" size="md">
                Outline Surface
              </Button>
              <Button variant="peach" size="md">
                Peach Accent
              </Button>
              <Button variant="ghost" size="md">
                Ghost Action
              </Button>
              <Button variant="primary" size="sm">
                Small (sm)
              </Button>
              <Button variant="primary" size="lg">
                Large (lg)
              </Button>
              <Button variant="primary" disabled>
                Disabled State
              </Button>
            </div>
          </div>

          {/* Badges Showcase */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-text-muted">
              Badge & Tag Primitives
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary">Brand Accent</Badge>
              <Badge variant="peach">Peach Tag</Badge>
              <Badge variant="default">Charcoal Tag</Badge>
              <Badge variant="outline">Outline Badge</Badge>
              <Badge variant="neutral">Neutral System</Badge>
              <Badge variant="success">Success State</Badge>
            </div>
          </div>

          {/* Cards Showcase */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-text-muted">
              Card Primitives (Static vs Interactive Hover Elevation)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Static Card */}
              <Card>
                <CardHeader>
                  <Badge variant="neutral" className="w-fit mb-2">Static Card</Badge>
                  <CardTitle>Standard Surface Card</CardTitle>
                  <CardDescription>
                    Base container with soft border and subtle elevation shadow.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-brand-text-muted">
                    Static component for layout structures and general content groupings.
                  </p>
                </CardContent>
              </Card>

              {/* Interactive Card */}
              <Card interactive>
                <CardHeader>
                  <Badge variant="peach" className="w-fit mb-2">Interactive (Hover me)</Badge>
                  <CardTitle>Elevated Hover Card</CardTitle>
                  <CardDescription>
                    Subtle -1px translation and deep soft shadow on hover.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-brand-text-muted">
                    Features smooth transition with accessible reduced-motion support.
                  </p>
                </CardContent>
                <CardFooter>
                  <span className="text-xs font-semibold text-brand-orange inline-flex items-center gap-1">
                    Explore Item <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardFooter>
              </Card>

              {/* Peach Tone Card */}
              <Card className="bg-brand-bg-peach border-brand-orange-border/40" interactive>
                <CardHeader>
                  <Badge variant="primary" className="w-fit mb-2">Featured Style</Badge>
                  <CardTitle>Tinted Surface Card</CardTitle>
                  <CardDescription>
                    Warm peach tint for callouts and priority highlighted elements.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-brand-text-muted">
                    Harmonious contrast with deep charcoal typography.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Form Input Primitives */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-text-muted">
              Input Field Primitives & Focus States
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input
                label="Standard Input"
                placeholder="Enter educational board or course..."
                value={testInputVal}
                onChange={(e) => setTestInputVal(e.target.value)}
                hint="Demonstrating warm orange focus ring"
              />
              <Input
                label="Input with Icon"
                placeholder="Search resources..."
                icon={<Search className="h-4 w-4" />}
                hint="Includes leading icon slot"
              />
              <Input
                label="Validation Error State"
                defaultValue="invalid_input_format"
                error="Please enter a valid format."
              />
            </div>
          </div>

          {/* Modal Primitive Demonstration */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-brand-text-primary">
                  Modal Primitive & Backdrop Blur
                </h3>
                <p className="text-xs text-brand-text-muted mt-1">
                  Accessible dialog primitive with keyboard ESC support, backdrop dimming, and focus isolation (for future auth and preview dialogs).
                </p>
              </div>
              <Button
                variant="peach"
                onClick={() => setIsModalOpen(true)}
              >
                <Eye className="h-4 w-4 mr-1.5" /> Test Modal Primitive
              </Button>
            </div>
          </div>
        </section>

        {/* 4. Architecture Health & Readiness */}
        <section className="space-y-6" aria-labelledby="architecture-heading">
          <div className="flex items-center gap-2 border-b border-brand-border pb-2">
            <ShieldCheck className="h-5 w-5 text-brand-orange" />
            <h2 id="architecture-heading" className="text-xl font-bold">
              4. Architecture & Domain Model Verification
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Extensible Educational Taxonomy</span>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Domain models designed for database-driven scaling: Board → Class → Subject → Course → Chapter → Lesson → Resource. No hardcoded academic tiers in core logic.
              </p>
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Role-Based Access Control Model</span>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Roles established for STUDENT and ADMIN with documented permission contracts, server-side route guards, and Row-Level Security policies.
              </p>
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Assessment & Testing Schema</span>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Full schema blueprint for Tests, Questions, Options, Attempts, and Automated Results evaluation.
              </p>
            </div>

            <div className="rounded-xl border border-brand-border bg-brand-surface p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="h-4 w-4" />
                <span>Admin CMS Dynamic Content</span>
              </div>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Configurable models for featured courses, exam categories, FAQs, and social links without code modification.
              </p>
            </div>
          </div>
        </section>

        {/* Footer info */}
        <footer className="border-t border-brand-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-brand-text-muted">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-brand-orange" />
            <span>TopVeda Architecture — Phase 1 Complete</span>
          </div>
          <p>Awaiting explicit Phase 1 confirmation before proceeding to Phase 2.</p>
        </footer>

      </Container>

      {/* Modal Demonstration Dialog */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Modal Primitive Demonstration"
        description="This modal validates backdrop blur, focus trapping, and accessibility transitions."
      >
        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-brand-bg-peach p-4 border border-brand-orange-border/50 text-xs text-brand-text-primary space-y-1">
            <p className="font-semibold text-brand-orange">Accessibility & UX Features:</p>
            <ul className="list-disc list-inside space-y-0.5 text-brand-text-muted">
              <li>Press <kbd className="px-1 py-0.5 rounded bg-white border border-brand-border text-[10px] font-mono">ESC</kbd> to close</li>
              <li>Body scroll automatically disabled when open</li>
              <li>Subtle background dimming & backdrop blur</li>
              <li>Prepared for upcoming authentication flows in Phase 3</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Confirm & Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
