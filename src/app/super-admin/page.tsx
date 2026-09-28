"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BrandGlyph } from "@/components/brand/glyph";
import { Wordmark } from "@/components/brand/wordmark";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TurnstileWidget, TurnstileWidgetRef } from "@/components/auth/turnstile-widget";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  Shield,
  Lock,
  Mail,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  KeyRound,
  QrCode,
  Smartphone,
  Loader2,
  RotateCcw,
} from "lucide-react";

type AuthStep = "CREDENTIALS" | "TOTP_CHALLENGE" | "TOTP_ENROLL";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [step, setStep] = React.useState<AuthStep>("CREDENTIALS");

  // Step 1: Credentials State
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const turnstileRef = React.useRef<TurnstileWidgetRef>(null);

  // Step 2 / 3: MFA TOTP State
  const [totpCode, setTotpCode] = React.useState("");
  const [factorId, setFactorId] = React.useState<string | null>(null);
  const [challengeId, setChallengeId] = React.useState<string | null>(null);

  // Step 3: Enrollment State
  const [enrollFactorId, setEnrollFactorId] = React.useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = React.useState<string | null>(null);
  const [secretKey, setSecretKey] = React.useState<string | null>(null);

  // Status & Feedback States
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isLocked, setIsLocked] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Check if active session already has AAL2 on mount
  React.useEffect(() => {
    async function checkExistingMfa() {
      if (!isAuthLoading && user && profile?.role === "SUPER_ADMIN") {
        try {
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData?.currentLevel === "aal2") {
            router.replace("/admin");
            return;
          }

          // If session is at AAL1, initiate challenge or enrollment flow immediately
          const { data: factorsData } = await supabase.auth.mfa.listFactors();
          const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") || [];

          if (verifiedFactors.length > 0) {
            const currentFactor = verifiedFactors[0];
            setFactorId(currentFactor.id);
            setStep("TOTP_CHALLENGE");

            const { data: chData } = await supabase.auth.mfa.challenge({
              factorId: currentFactor.id,
            });
            if (chData) {
              setChallengeId(chData.id);
            }
          } else {
            // No verified factor -> Start mandatory enrollment
            await startEnrollmentFlow();
          }
        } catch {
          // Stay on credentials step if check fails
        }
      }
    }

    checkExistingMfa();
  }, [user, profile, isAuthLoading, router, supabase]);

  // Helper to start TOTP factor enrollment
  const startEnrollmentFlow = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { data: enrollData, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        issuer: "TopVeda",
        friendlyName: "TopVeda Super Admin",
      });

      if (enrollErr || !enrollData) {
        setErrorMessage("Failed to generate MFA enrollment QR code. Please try again.");
        return;
      }

      setEnrollFactorId(enrollData.id);
      setQrCodeUrl(enrollData.totp.qr_code);
      setSecretKey(enrollData.totp.secret);
      setStep("TOTP_ENROLL");
    } catch {
      setErrorMessage("An unexpected error occurred during MFA enrollment setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 1: Handle Initial Password & Turnstile Submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/super-admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          turnstileToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.isLocked) {
          setIsLocked(true);
        }
        setErrorMessage(data.error || "Authentication failed. Unauthorized access.");
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      } else {
        // Password verified successfully -> Proceed to Mandatory MFA Step
        if (data.hasVerifiedFactor && data.factorId) {
          setFactorId(data.factorId);
          setStep("TOTP_CHALLENGE");

          // Initialize MFA challenge with Supabase
          const { data: chData, error: chErr } = await supabase.auth.mfa.challenge({
            factorId: data.factorId,
          });

          if (!chErr && chData) {
            setChallengeId(chData.id);
          } else {
            setErrorMessage("Failed to initiate MFA challenge. Please retry.");
          }
        } else {
          // Super Admin has no enrolled TOTP factor -> Mandatory First-Time Enrollment
          await startEnrollmentFlow();
        }
      }
    } catch {
      setErrorMessage("A network error occurred during authentication. Please try again.");
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2: Handle TOTP Challenge Verification
  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const cleanCode = totpCode.replace(/\s/g, "").trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit authentication code.");
      setIsSubmitting(false);
      return;
    }

    try {
      let activeChallengeId = challengeId;

      if (!activeChallengeId && factorId) {
        const { data: freshChallenge } = await supabase.auth.mfa.challenge({
          factorId,
        });
        activeChallengeId = freshChallenge?.id || null;
        setChallengeId(activeChallengeId);
      }

      if (!factorId || !activeChallengeId) {
        setErrorMessage("Security challenge expired. Please retry.");
        setIsSubmitting(false);
        return;
      }

      const { data: verifyData, error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: activeChallengeId,
        code: cleanCode,
      });

      if (verifyErr || !verifyData) {
        setErrorMessage("Invalid authentication code. Please check your authenticator app and try again.");
        setTotpCode("");
        // Create fresh challenge for subsequent attempt
        const { data: nextCh } = await supabase.auth.mfa.challenge({ factorId });
        if (nextCh) setChallengeId(nextCh.id);
        setIsSubmitting(false);
        return;
      }

      // Verify assurance level reached AAL2
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel !== "aal2") {
        setErrorMessage("Assurance level verification failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Super Administrator authentication verified (AAL2). Redirecting...");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 600);
    } catch {
      setErrorMessage("An unexpected error occurred during code verification.");
      setIsSubmitting(false);
    }
  };

  // STEP 3: Handle First-Time TOTP Enrollment Verification
  const handleEnrollmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const cleanCode = totpCode.replace(/\s/g, "").trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage("Please enter the 6-digit code shown in your authenticator app.");
      setIsSubmitting(false);
      return;
    }

    if (!enrollFactorId) {
      setErrorMessage("Enrollment session expired. Please restart enrollment.");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: verifyData, error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollFactorId,
        code: cleanCode,
      });

      if (verifyErr || !verifyData) {
        setErrorMessage("Invalid verification code. Please check your app and try again.");
        setTotpCode("");
        setIsSubmitting(false);
        return;
      }

      // Confirm AAL2 elevation
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel !== "aal2") {
        setErrorMessage("Assurance level verification failed. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage("Two-factor authentication successfully configured (AAL2). Entering Root Console...");
      setTimeout(() => {
        window.location.href = "/admin";
      }, 600);
    } catch {
      setErrorMessage("An unexpected error occurred during enrollment verification.");
      setIsSubmitting(false);
    }
  };

  // Reset to credentials step
  const handleCancelMfa = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setStep("CREDENTIALS");
      setTotpCode("");
      setFactorId(null);
      setChallengeId(null);
      setEnrollFactorId(null);
      setQrCodeUrl(null);
      setSecretKey(null);
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2.5 mb-2">
            <BrandGlyph size={36} />
            <Wordmark size="md" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="peach" size="sm" className="font-mono text-[10px] tracking-wider uppercase font-bold">
              ROOT ACCESS
            </Badge>
            <Badge variant="outline" size="sm" className="font-mono text-[10px] tracking-wider uppercase">
              {step === "CREDENTIALS" ? "PORTAL 0" : "AAL2 REQUIRED"}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-brand-text-primary tracking-tight">
            {step === "CREDENTIALS" && "Super Admin Login"}
            {step === "TOTP_CHALLENGE" && "Two-Factor Verification"}
            {step === "TOTP_ENROLL" && "Set Up Authenticator (MFA)"}
          </h1>
          <p className="text-xs text-brand-text-muted">
            {step === "CREDENTIALS" && "Authorized administrative access only. All actions are cryptographically audited."}
            {step === "TOTP_CHALLENGE" && "Enter the 6-digit code from your authenticator app to verify identity."}
            {step === "TOTP_ENROLL" && "Super Administrator accounts require mandatory TOTP multi-factor authentication."}
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-6 sm:p-8 bg-brand-surface border border-brand-border shadow-xl space-y-5 rounded-2xl">
          {/* Lockout Banner */}
          {isLocked && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Security Lockout Active</p>
                <p className="text-[11px] text-red-700 mt-0.5 leading-relaxed">
                  This account is locked for 1 hour due to 3 consecutive failed login attempts.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && !isLocked && (
            <div className="p-3 bg-red-50/80 border border-red-200/80 rounded-xl flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* =========================================================================
              STEP 1: CREDENTIALS FORM (EMAIL + PASSWORD + TURNSTILE)
             ========================================================================= */}
          {step === "CREDENTIALS" && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-primary flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-brand-orange" />
                  Super Admin Email
                </label>
                <Input
                  type="email"
                  placeholder="superadmin@topveda.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting || isLocked}
                  required
                  className="text-xs h-10"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-primary flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-brand-orange" />
                  Super Admin Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting || isLocked}
                  required
                  className="text-xs h-10"
                  autoComplete="current-password"
                />
              </div>

              <TurnstileWidget
                ref={turnstileRef}
                onVerify={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
                action="super-admin-login"
              />

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || isLocked || !email || !password}
                className="w-full h-10 text-xs font-bold shadow-subtle mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying Root Credentials...
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    Continue to Security Challenge
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* =========================================================================
              STEP 2: TOTP MFA CHALLENGE VERIFICATION FORM
             ========================================================================= */}
          {step === "TOTP_CHALLENGE" && (
            <form onSubmit={handleChallengeSubmit} className="space-y-4">
              <div className="p-3 bg-brand-bg-warm/80 rounded-xl border border-brand-border/60 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-bg-peach text-brand-orange border border-brand-orange-border">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="text-xs space-y-0.5">
                  <p className="font-bold text-brand-text-primary">Authenticator App</p>
                  <p className="text-brand-text-muted text-[11px]">Open Google Authenticator, Authy, or 1Password</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-primary flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-brand-orange" />
                  6-Digit Verification Code
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isSubmitting}
                  required
                  autoFocus
                  className="text-center font-mono text-lg tracking-[0.25em] h-12 font-bold"
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || totpCode.length !== 6}
                className="w-full h-10 text-xs font-bold shadow-subtle mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying Code...
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    Verify & Enter Dashboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>

              <button
                type="button"
                onClick={handleCancelMfa}
                className="w-full text-center text-xs text-brand-text-muted hover:text-brand-text-primary flex items-center justify-center gap-1 pt-1 font-semibold"
              >
                <RotateCcw className="h-3 w-3" />
                Cancel & Sign In with Different Account
              </button>
            </form>
          )}

          {/* =========================================================================
              STEP 3: FIRST-TIME MANDATORY TOTP MFA ENROLLMENT FORM
             ========================================================================= */}
          {step === "TOTP_ENROLL" && (
            <form onSubmit={handleEnrollmentSubmit} className="space-y-4">
              <div className="text-center space-y-3">
                <p className="text-xs text-brand-text-muted leading-relaxed">
                  Scan this QR code with your authenticator application (Google Authenticator, Microsoft Authenticator, Authy):
                </p>

                {qrCodeUrl ? (
                  <div className="flex justify-center p-3 bg-white rounded-2xl border border-brand-border shadow-sm max-w-[200px] mx-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrCodeUrl}
                      alt="TOTP Enrollment QR Code"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex justify-center p-8 bg-brand-bg-warm rounded-2xl border border-brand-border">
                    <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
                  </div>
                )}

                {secretKey && (
                  <div className="p-2 bg-brand-bg-warm rounded-lg border border-brand-border text-[11px] font-mono text-brand-text-muted select-all">
                    Manual key: <span className="font-bold text-brand-text-primary">{secretKey}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-brand-text-primary flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-brand-orange" />
                  Confirm 6-Digit Code from App
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={isSubmitting}
                  required
                  className="text-center font-mono text-lg tracking-[0.25em] h-12 font-bold"
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || totpCode.length !== 6}
                className="w-full h-10 text-xs font-bold shadow-subtle mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying & Activating MFA...
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <QrCode className="h-4 w-4" />
                    Activate MFA & Enter Dashboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>

              <button
                type="button"
                onClick={handleCancelMfa}
                className="w-full text-center text-xs text-brand-text-muted hover:text-brand-text-primary flex items-center justify-center gap-1 pt-1 font-semibold"
              >
                <RotateCcw className="h-3 w-3" />
                Cancel & Return to Login
              </button>
            </form>
          )}
        </Card>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-[11px] text-brand-text-muted">
            3 consecutive failed password attempts trigger an automatic 1-hour account lockout.
          </p>
        </div>
      </div>
    </div>
  );
}
