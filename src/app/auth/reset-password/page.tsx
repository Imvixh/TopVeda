"use client";

import * as React from "react";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { validatePassword, validateConfirmPassword } from "@/lib/validation/auth";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();

  const [sessionStatus, setSessionStatus] = React.useState<"loading" | "valid" | "invalid">("loading");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Recovery Session Verification
  React.useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    // 1. Subscribe to auth state changes (catches PASSWORD_RECOVERY and SIGNED_IN events)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (session?.user && !success)) {
        setSessionStatus("valid");
      }
    });

    // 2. Check for URL parameters (code or errors) & active session
    async function verifyRecoverySession() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const errorParam = urlParams.get("error") || urlParams.get("error_description");

        if (errorParam) {
          if (mounted) setSessionStatus("invalid");
          return;
        }

        // If PKCE authorization code is present in query parameters, exchange it
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError || !data.session) {
            if (mounted) setSessionStatus("invalid");
            return;
          }
          if (mounted) setSessionStatus("valid");
          return;
        }

        // Check if session already exists (e.g. from server callback exchange)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          if (mounted) setSessionStatus("valid");
        } else {
          // If URL contains hash fragment (#access_token=...), wait for client hash processing
          if (window.location.hash.includes("access_token")) {
            setTimeout(async () => {
              if (!mounted) return;
              const {
                data: { session: hashSession },
              } = await supabase.auth.getSession();
              if (mounted) {
                setSessionStatus(hashSession?.user ? "valid" : "invalid");
              }
            }, 800);
          } else {
            if (mounted) setSessionStatus("invalid");
          }
        }
      } catch {
        if (mounted) setSessionStatus("invalid");
      }
    }

    verifyRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [success]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      setErrorMessage(passVal.error || "Password does not meet requirements.");
      return;
    }

    const confirmVal = validateConfirmPassword(password, confirmPassword);
    if (!confirmVal.isValid) {
      setErrorMessage(confirmVal.error || "Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updatePassword(password);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to update password. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Reset Password
          </h1>
          <p className="text-sm text-brand-text-muted">
            Enter your new secure password for your TopVeda account
          </p>
        </div>

        {/* 1. Loading State */}
        {sessionStatus === "loading" && (
          <Card className="p-8 text-center space-y-4 shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-bg-peach text-brand-orange">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h2 className="text-base font-bold text-brand-text-primary">
              Verifying Recovery Link...
            </h2>
            <p className="text-xs text-brand-text-muted">
              Please wait while we secure your password recovery session.
            </p>
          </Card>
        )}

        {/* 2. Invalid or Expired Session State */}
        {sessionStatus === "invalid" && !success && (
          <Card className="p-6 sm:p-8 text-center space-y-5 shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 border border-red-200">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-brand-text-primary">
                Invalid or Expired Link
              </h2>
              <p className="text-xs text-brand-text-muted leading-relaxed max-w-sm mx-auto">
                Your password reset link is invalid or has expired. Please request a new reset link.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Link href="/?auth=forgot-password" className="w-full">
                <Button variant="primary" size="md" className="w-full shadow-subtle">
                  Request New Reset Link
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
              <Link
                href="/"
                className="text-xs font-semibold text-brand-orange hover:underline pt-1"
              >
                ← Back to Homepage
              </Link>
            </div>
          </Card>
        )}

        {/* 3. Successful Update State */}
        {success && (
          <Card className="p-6 sm:p-8 text-center space-y-5 shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-brand-text-primary">
                Password Updated Successfully
              </h2>
              <p className="text-xs text-brand-text-muted leading-relaxed max-w-sm mx-auto">
                Password updated successfully. Please log in with your new password.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Link href="/?auth=login" className="w-full">
                <Button variant="primary" size="md" className="w-full shadow-subtle">
                  Continue to Login
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
              <Link
                href="/"
                className="text-xs font-semibold text-brand-orange hover:underline pt-1"
              >
                ← Back to Homepage
              </Link>
            </div>
          </Card>
        )}

        {/* 4. Valid Session - Password Reset Form */}
        {sessionStatus === "valid" && !success && (
          <Card className="p-6 sm:p-8 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

              <div className="relative">
                <Input
                  label="New Password"
                  placeholder="Min 8 chars (Aa1@)"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="relative">
                <Input
                  label="Confirm Password"
                  placeholder="Re-enter password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="rounded-lg bg-brand-bg-warm/80 p-3 text-[11px] text-brand-text-muted space-y-1 border border-brand-border/60">
                <p className="font-semibold text-brand-text-primary">Password Requirements:</p>
                <p>• At least 8 characters</p>
                <p>• At least 1 uppercase letter and 1 lowercase letter</p>
                <p>• At least 1 number and 1 special symbol (!@#$%^&*)</p>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full shadow-subtle mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    Update Password
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="text-center pt-2">
                <Link
                  href="/"
                  className="text-xs font-semibold text-brand-orange hover:underline"
                >
                  ← Back to Homepage
                </Link>
              </div>
            </form>
          </Card>
        )}
      </Container>
    </div>
  );
}
