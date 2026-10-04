"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TopVedaLogo } from "@/components/brand/logo";
import { AdminApplicationFlow } from "@/components/auth/admin-application-flow";
import { TurnstileWidget, TurnstileWidgetRef } from "@/components/auth/turnstile-widget";
import { useAuth } from "@/hooks/use-auth";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  UserPlus,
  LogIn,
} from "lucide-react";

export interface AdminAuthViewProps {
  initialMode?: "login" | "register";
  onSuccess?: () => void;
}

export function AdminAuthView({ initialMode = "login", onSuccess }: AdminAuthViewProps) {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = React.useState<"login" | "register">(initialMode);
  const [loginIdentifier, setLoginIdentifier] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Turnstile verification token
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const turnstileTokenRef = React.useRef<string | null>(null);
  const isSubmittingRef = React.useRef(false);
  const turnstileRef = React.useRef<TurnstileWidgetRef>(null);

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    turnstileTokenRef.current = null;
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    resetFormState();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    const tokenToSubmit = turnstileTokenRef.current || turnstileToken;
    if (!tokenToSubmit) {
      setErrorMessage("Please complete the security verification challenge before submitting.");
      turnstileRef.current?.reset();
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    turnstileTokenRef.current = null;
    setTurnstileToken(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await login(loginIdentifier, loginPassword, "admin", tokenToSubmit);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to sign in. Please verify your credentials.");
      } else {
        setSuccessMessage("Welcome to the TopVeda Administrator Portal!");
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.refresh();
          }
        }, 500);
      }
    } catch {
      setErrorMessage("A network or server error occurred. Please try again.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      turnstileTokenRef.current = null;
      setTurnstileToken(null);
      turnstileRef.current?.reset();
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <TopVedaLogo size={42} />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-bg-peach border border-brand-orange-border text-brand-orange text-xs font-bold tracking-wide uppercase mt-1">
            <Shield className="h-3.5 w-3.5" />
            Administrator & Faculty Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight">
            {mode === "login" ? "Admin & Faculty Sign In" : "Administrator Application"}
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted max-w-md mx-auto">
            {mode === "login"
              ? "Sign in with your approved administrator or educator credentials to access course management, batch schedules, and live classrooms."
              : "Apply for administrator and educator privileges with institutional qualification and ID verification."}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl bg-red-50/90 border border-red-200 p-3.5 text-xs text-red-800 animate-in fade-in-50 duration-150 shadow-sm"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 p-3.5 text-xs text-emerald-900 animate-in fade-in-50 duration-150 shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="flex p-1 rounded-xl bg-brand-surface border border-brand-border text-xs font-semibold shadow-sm">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => switchMode("login")}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === "login"
                ? "bg-brand-bg-peach text-brand-orange shadow-sm font-bold border border-brand-orange-border"
                : "text-brand-text-muted hover:text-brand-text-primary"
            }`}
          >
            <LogIn className="h-4 w-4" />
            <span>Admin Sign In</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => switchMode("register")}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === "register"
                ? "bg-brand-bg-peach text-brand-orange shadow-sm font-bold border border-brand-orange-border"
                : "text-brand-text-muted hover:text-brand-text-primary"
            }`}
          >
            <UserPlus className="h-4 w-4" />
            <span>Admin Registration</span>
          </button>
        </div>

        {/* Main Content Card */}
        <Card className="p-6 sm:p-8 bg-brand-surface border border-brand-border/90 shadow-md">
          {mode === "register" ? (
            <AdminApplicationFlow
              onSuccess={() => {
                setSuccessMessage("Application submitted successfully! Please sign in once approved.");
                setTimeout(() => switchMode("login"), 1500);
              }}
              onSwitchToLogin={() => switchMode("login")}
            />
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-3.5">
                {/* Identifier Field */}
                <div>
                  <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                    Email Address or Registered Mobile <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="admin@topveda.com or 9876543210"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    icon={<Mail className="h-4 w-4 text-brand-text-muted" />}
                    className="h-11 text-xs sm:text-sm"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={isSubmitting}
                      placeholder="••••••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      icon={<Lock className="h-4 w-4 text-brand-text-muted" />}
                      className="h-11 text-xs sm:text-sm pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text-primary"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Cloudflare Turnstile Verification */}
              <div className="pt-1">
                <TurnstileWidget
                  ref={turnstileRef}
                  action="admin-login"
                  onVerify={(token) => {
                    turnstileTokenRef.current = token;
                    setTurnstileToken(token);
                    setErrorMessage(null);
                  }}
                  onExpire={() => {
                    turnstileTokenRef.current = null;
                    setTurnstileToken(null);
                  }}
                  onError={(err) => {
                    turnstileTokenRef.current = null;
                    setTurnstileToken(null);
                    setErrorMessage(`Security verification error: ${err}. Please try again.`);
                  }}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting || !turnstileToken}
                className="w-full h-11 text-xs sm:text-sm font-bold shadow-md shadow-brand-orange/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating Administrator...
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin Workspace</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              {/* Footer Helper Links */}
              <div className="pt-2 text-center text-xs text-brand-text-muted">
                Need to apply for educator access?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-bold text-brand-orange hover:underline"
                >
                  Submit Admin Application
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
