"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TopVedaLogo } from "@/components/brand/logo";
import { TurnstileWidget, TurnstileWidgetRef } from "@/components/auth/turnstile-widget";
import { useAuth } from "@/hooks/use-auth";
import { AuthMode } from "@/types/auth.types";
import {
  Mail,
  Lock,
  User,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  GraduationCap,
} from "lucide-react";

export type { AuthMode };

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  onOpenTerms?: () => void;
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  onOpenTerms,
}: AuthModalProps) {
  const router = useRouter();
  const { login, register, requestPasswordReset } = useAuth();

  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [requireEmailVerification, setRequireEmailVerification] = React.useState(false);

  // Turnstile security verification token
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const turnstileTokenRef = React.useRef<string | null>(null);
  const isSubmittingRef = React.useRef(false);
  const turnstileRef = React.useRef<TurnstileWidgetRef>(null);

  // Password visibility states
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");

  // Register Form States (Student)
  const [registerName, setRegisterName] = React.useState("");
  const [registerEmail, setRegisterEmail] = React.useState("");
  const [registerPhone, setRegisterPhone] = React.useState("");
  const [registerPassword, setRegisterPassword] = React.useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = React.useState("");
  const [termsAgreed, setTermsAgreed] = React.useState(false);

  // Forgot Password Form State
  const [forgotEmail, setForgotEmail] = React.useState("");

  // Sync mode and reset state when isOpen or initialMode changes
  const [prevProps, setPrevProps] = React.useState({
    isOpen,
    initialMode,
  });

  if (isOpen !== prevProps.isOpen || initialMode !== prevProps.initialMode) {
    setPrevProps({
      isOpen,
      initialMode,
    });
    if (isOpen && !prevProps.isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setRequireEmailVerification(false);
      setIsSubmitting(false);
      setTurnstileToken(null);
    } else if (!isOpen && prevProps.isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      setIsSubmitting(false);
      setTurnstileToken(null);
    } else if (isOpen) {
      if (initialMode !== prevProps.initialMode) setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
      setTurnstileToken(null);
    }
  }

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setRequireEmailVerification(false);
    isSubmittingRef.current = false;
    setIsSubmitting(false);
    turnstileTokenRef.current = null;
    setTurnstileToken(null);
    turnstileRef.current?.reset();
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetFormState();
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  // Submit Handler for Student Registration, Login, and Forgot Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    // 1. Atomically claim the current token for this single submission
    const tokenToSubmit = turnstileTokenRef.current || turnstileToken;
    if (!tokenToSubmit) {
      setErrorMessage("Please complete the security verification challenge before submitting.");
      turnstileRef.current?.reset();
      return;
    }

    // 2. Immediately lock submission and invalidate stored token so it cannot be reused
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    turnstileTokenRef.current = null;
    setTurnstileToken(null);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === "login") {
        const res = await login(loginIdentifier, loginPassword, "student", tokenToSubmit);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to sign in. Please verify your credentials.");
        } else {
          setSuccessMessage("Welcome back to TopVeda!");
          setTimeout(() => {
            handleClose();
            router.push("/student");
          }, 600);
        }
      } else if (mode === "register") {
        const res = await register({
          fullName: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
          confirmPassword: registerConfirmPassword,
          termsAgreed,
          turnstileToken: tokenToSubmit,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Registration failed. Please check your information.");
        } else {
          if (res.requireVerification) {
            setRequireEmailVerification(true);
            setSuccessMessage("Registration successful! Please check your Gmail inbox to verify your account.");
          } else {
            setSuccessMessage("Student account created successfully!");
            setTimeout(() => {
              handleClose();
              router.push("/student");
            }, 1000);
          }
        }
      } else if (mode === "forgot-password") {
        const res = await requestPasswordReset(forgotEmail, tokenToSubmit);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to send reset link. Please try again.");
        } else {
          setSuccessMessage(
            "If an account exists for this email, we've sent a password reset link. Please check your email."
          );
        }
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth={mode === "register" ? "lg" : "md"}
    >
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <TopVedaLogo size={36} />
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-bg-peach border border-brand-orange-border text-brand-orange text-[11px] font-bold tracking-wide uppercase">
            <GraduationCap className="h-3.5 w-3.5" />
            Student Portal
          </div>
          <h2 className="text-xl font-bold text-brand-text-primary">
            {mode === "login" && "Student Sign In"}
            {mode === "register" && "Student Registration"}
            {mode === "forgot-password" && "Forgot Password?"}
          </h2>
          <p className="text-xs text-brand-text-muted">
            {mode === "login" && "Sign in to access your live classes, test series, and notes"}
            {mode === "register" && "Join thousands of students learning smarter with TopVeda"}
            {mode === "forgot-password" && "Enter your registered email address and we'll send you a password reset link."}
          </p>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div 
            role="alert" 
            className="flex items-start gap-2.5 rounded-xl bg-red-50/90 border border-red-200 p-3.5 text-xs text-red-800 animate-in fade-in-50 duration-150"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div 
            role="status" 
            className="flex items-start gap-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 p-3.5 text-xs text-emerald-900 animate-in fade-in-50 duration-150"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Email Verification State View */}
        {requireEmailVerification ? (
          <div className="py-4 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-bg-peach text-brand-orange border border-brand-orange-border">
              <Mail className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-brand-text-primary">
                Verify Your Gmail Address
              </h3>
              <p className="text-xs text-brand-text-muted max-w-sm mx-auto leading-relaxed">
                We have sent a verification link to <strong className="text-brand-text-primary">{registerEmail}</strong>. 
                Please open the email and click the confirmation link to activate your TopVeda student account.
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => switchMode("login")}
                className="w-full text-xs font-semibold"
              >
                Proceed to Sign In
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* =========================================================
                1. LOGIN MODE FORM
               ========================================================= */}
            {mode === "login" && (
              <>
                <Input
                  label="Email or Mobile Number"
                  placeholder="name@gmail.com or 10-digit mobile"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  icon={<Mail className="h-4 w-4 text-brand-text-muted" />}
                  autoComplete="username"
                />

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-brand-text-primary">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode("forgot-password")}
                      className="text-xs font-semibold text-brand-orange hover:underline focus:outline-none"
                      disabled={isSubmitting}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      required
                      disabled={isSubmitting}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      icon={<Lock className="h-4 w-4 text-brand-text-muted" />}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text-primary focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* =========================================================
                2. STUDENT REGISTRATION MODE FORM
               ========================================================= */}
            {mode === "register" && (
              <div className="space-y-3.5">
                <Input
                  label="Full Name"
                  placeholder="e.g. Rahul Sharma"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  icon={<User className="h-4 w-4 text-brand-text-muted" />}
                  autoComplete="name"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Input
                    label="Email Address"
                    placeholder="name@gmail.com"
                    type="email"
                    required
                    disabled={isSubmitting}
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    icon={<Mail className="h-4 w-4 text-brand-text-muted" />}
                    autoComplete="email"
                    hint="Strictly valid @gmail.com required"
                  />

                  <Input
                    label="Mobile Number"
                    placeholder="10-digit number"
                    type="tel"
                    required
                    disabled={isSubmitting}
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    autoComplete="tel"
                    hint="Indian 10-digit number (6-9 start)"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-brand-text-primary">
                      Create Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        required
                        disabled={isSubmitting}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        icon={<Lock className="h-4 w-4 text-brand-text-muted" />}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text-primary focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-brand-text-primary">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        required
                        disabled={isSubmitting}
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        icon={<Lock className="h-4 w-4 text-brand-text-muted" />}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-brand-text-primary focus:outline-none"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    required
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    disabled={isSubmitting}
                    className="mt-0.5 h-4 w-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                  />
                  <label htmlFor="terms-checkbox" className="text-xs text-brand-text-muted leading-tight">
                    I agree to the TopVeda{" "}
                    <button
                      type="button"
                      onClick={onOpenTerms}
                      className="font-semibold text-brand-orange hover:underline focus:outline-none"
                    >
                      Terms of Service &amp; Privacy Policy
                    </button>
                  </label>
                </div>
              </div>
            )}

            {/* =========================================================
                3. FORGOT PASSWORD MODE FORM
               ========================================================= */}
            {mode === "forgot-password" && (
              <>
                <Input
                  label="Registered Email Address"
                  placeholder="name@gmail.com"
                  type="email"
                  required
                  disabled={isSubmitting}
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4 text-brand-text-muted" />}
                  autoComplete="email"
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2 shadow-subtle"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Turnstile & Submit Action Button for Login & Student Register */}
            {mode !== "forgot-password" && (
              <>
                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={(token) => {
                    turnstileTokenRef.current = token;
                    setTurnstileToken(token);
                  }}
                  onExpire={() => {
                    turnstileTokenRef.current = null;
                    setTurnstileToken(null);
                  }}
                  onError={() => {
                    turnstileTokenRef.current = null;
                    setTurnstileToken(null);
                  }}
                  onTimeout={() => {
                    turnstileTokenRef.current = null;
                    setTurnstileToken(null);
                  }}
                  action={mode === "login" ? "student-login" : "student-register"}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2 shadow-subtle"
                  disabled={isSubmitting || !turnstileToken}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {mode === "login" && "Sign In as Student"}
                      {mode === "register" && "Create Student Account"}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </>
            )}
          </form>
        )}

        {/* Modal Switch Footer */}
        <div className="border-t border-brand-border-subtle pt-3.5 text-center text-xs text-brand-text-muted">
          {mode === "login" && (
            <p>
              New to TopVeda?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-semibold text-brand-orange hover:underline focus:outline-none"
                disabled={isSubmitting}
              >
                Create an account
              </button>
            </p>
          )}

          {mode === "register" && (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold text-brand-orange hover:underline focus:outline-none"
                disabled={isSubmitting}
              >
                Sign in
              </button>
            </p>
          )}

          {mode === "forgot-password" && (
            <p>
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold text-brand-orange hover:underline focus:outline-none"
                disabled={isSubmitting}
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
