"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { useAuth } from "@/hooks/use-auth";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await updatePassword(password);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to update password.");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/student");
        }, 2000);
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
            Create a New Password
          </h1>
          <p className="text-sm text-brand-text-muted">
            Enter your new secure password for your TopVeda account
          </p>
        </div>

        <Card className="p-6 sm:p-8 shadow-card">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-brand-text-primary">
                Password Successfully Updated!
              </h2>
              <p className="text-xs text-brand-text-muted">
                Your password has been changed. Redirecting you to your account...
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push("/student")}
                className="mt-2"
              >
                Go to Student Area
              </Button>
            </div>
          ) : (
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
                  label="Confirm New Password"
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
                <p className="font-semibold text-brand-text-primary">Password Strength Rules:</p>
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
          )}
        </Card>
      </Container>
    </div>
  );
}
