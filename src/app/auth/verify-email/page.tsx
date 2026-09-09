"use client";

import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Container size="sm">
        {/* Header Branding */}
        <div className="text-center space-y-3 mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <BrandGlyph size={32} />
            <Wordmark size="lg" />
          </Link>
          <h1 className="text-2xl font-bold text-brand-text-primary tracking-tight">
            Verify Your Email
          </h1>
          <p className="text-sm text-brand-text-muted">
            Check your Gmail inbox to activate your TopVeda account
          </p>
        </div>

        <Card className="p-6 sm:p-8 text-center space-y-5 shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-bg-peach text-brand-orange border border-brand-orange-border">
            <Mail className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-brand-text-primary">
              Verification Link Sent
            </h2>
            <p className="text-xs text-brand-text-muted leading-relaxed max-w-sm mx-auto">
              We have sent an activation link to your registered Gmail address.
              Please click the link inside the email to verify your email and access your courses.
            </p>
          </div>

          <div className="rounded-xl bg-brand-bg-warm/90 border border-brand-border p-3.5 text-left text-xs text-brand-text-muted space-y-1.5">
            <p className="font-bold text-brand-text-primary flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              Helpful Tips:
            </p>
            <p>• If you don&apos;t see the email, check your Spam or Promotions tab.</p>
            <p>• Verification links are valid for 24 hours.</p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/?auth=login" className="w-full">
              <Button variant="primary" size="md" className="w-full">
                Go to Sign In
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </Container>
    </div>
  );
}
