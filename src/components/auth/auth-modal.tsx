"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
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
  AlertCircle
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
  const { login, register, requestPasswordReset } = useAuth();

  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [requireEmailVerification, setRequireEmailVerification] = React.useState(false);

  // Password visibility states
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Login Form States
  const [loginIdentifier, setLoginIdentifier] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");

  // Register Form States
  const [registerName, setRegisterName] = React.useState("");
  const [registerEmail, setRegisterEmail] = React.useState("");
  const [registerPhone, setRegisterPhone] = React.useState("");
  const [registerPassword, setRegisterPassword] = React.useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = React.useState("");
  const [termsAgreed, setTermsAgreed] = React.useState(false);

  // Forgot Password Form State
  const [forgotEmail, setForgotEmail] = React.useState("");

  // Sync mode when initialMode changes
  const [prevInitialMode, setPrevInitialMode] = React.useState(initialMode);
  if (initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setRequireEmailVerification(false);
  }

  const resetFormState = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setRequireEmailVerification(false);
    setIsSubmitting(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetFormState();
  };

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  // Submit Handler for Login, Registration, and Forgot Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const res = await login(loginIdentifier, loginPassword);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to sign in. Please verify your credentials.");
        } else {
          setSuccessMessage("Welcome back to TopVeda!");
          setTimeout(() => {
            handleClose();
          }, 800);
        }
      } else if (mode === "register") {
        const res = await register({
          fullName: registerName,
          email: registerEmail,
          phone: registerPhone,
          password: registerPassword,
          confirmPassword: registerConfirmPassword,
          termsAgreed,
        });

        if (!res.success) {
          setErrorMessage(res.error || "Registration failed. Please check your information.");
        } else {
          if (res.requireVerification) {
            setRequireEmailVerification(true);
            setSuccessMessage("Registration successful! Please check your Gmail inbox to verify your account.");
          } else {
            setSuccessMessage("Account created successfully!");
            setTimeout(() => {
              handleClose();
            }, 1000);
          }
        }
      } else if (mode === "forgot-password") {
        const res = await requestPasswordReset(forgotEmail);
        if (!res.success) {
          setErrorMessage(res.error || "Failed to send reset link. Please try again.");
        } else {
          setSuccessMessage("Password reset instructions have been sent to your Gmail inbox.");
        }
      }
    } catch {
      setErrorMessage("A network or server error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth={mode === "register" ? "lg" : "md"}
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Wordmark size="md" className="justify-center" />
          <h2 className="text-xl font-bold text-brand-text-primary">
            {mode === "login" && "Welcome Back to TopVeda"}
            {mode === "register" && "Create Your TopVeda Account"}
            {mode === "forgot-password" && "Reset Your Password"}
          </h2>
          <p className="text-xs text-brand-text-muted">
            {mode === "login" && "Sign in to access your live classes, test series, and notes"}
            {mode === "register" && "Join thousands of students learning and preparing smarter"}
            {mode === "forgot-password" && "Enter your registered Gmail address to receive reset instructions"}
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
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  autoComplete="username"
                  required
                  disabled={isSubmitting}
                />
                <div className="relative">
                  <Input
                    label="Password"
                    placeholder="Enter your password"
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4" />}
                    autoComplete="current-password"
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

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-brand-text-muted">
                    Only <span className="font-semibold text-brand-text-primary">@gmail.com</span> addresses supported
                  </span>
                  <button
                    type="button"
                    onClick={() => switchMode("forgot-password")}
                    className="font-semibold text-brand-orange hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}

            {/* =========================================================
                2. REGISTER MODE FORM
               ========================================================= */}
            {mode === "register" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Full Name"
                    placeholder="e.g. Aarav Sharma"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    icon={<User className="h-4 w-4" />}
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Gmail Address"
                    placeholder="yourname@gmail.com"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    icon={<Mail className="h-4 w-4" />}
                    autoComplete="email"
                    hint="Must be @gmail.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text-primary mb-1">
                    Mobile Number (India) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex rounded-xl border border-brand-border bg-brand-surface focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/20 overflow-hidden">
                    <span className="inline-flex items-center px-3 text-xs font-bold text-brand-text-muted bg-brand-bg-warm border-r border-brand-border select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      placeholder="9876543210 (10 digits)"
                      value={registerPhone}
                      onChange={(e) => setRegisterPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full px-3 py-2.5 text-sm bg-transparent text-brand-text-primary placeholder:text-gray-400 focus:outline-none"
                      autoComplete="tel"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <Input
                      label="Create Password"
                      placeholder="Min 8 chars (Aa1@)"
                      type={showPassword ? "text" : "password"}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      icon={<Lock className="h-4 w-4" />}
                      autoComplete="new-password"
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
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      icon={<Lock className="h-4 w-4" />}
                      autoComplete="new-password"
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
                </div>

                <div className="rounded-lg bg-brand-bg-warm/80 p-2.5 text-[11px] text-brand-text-muted space-y-1 border border-brand-border/60">
                  <p className="font-semibold text-brand-text-primary">Password Requirements:</p>
                  <p>• At least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.</p>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-brand-text-muted pt-1">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-brand-border text-brand-orange focus:ring-brand-orange h-4 w-4"
                    required
                    disabled={isSubmitting}
                  />
                  <span className="leading-snug">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={onOpenTerms}
                      className="font-semibold text-brand-orange hover:underline focus:outline-none"
                    >
                      Terms & Conditions
                    </button>{" "}
                    and Privacy Policy.
                  </span>
                </label>
              </>
            )}

            {/* =========================================================
                3. FORGOT PASSWORD MODE FORM
               ========================================================= */}
            {mode === "forgot-password" && (
              <>
                <Input
                  label="Registered Gmail Address"
                  placeholder="yourname@gmail.com"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  autoComplete="email"
                  hint="Enter the Gmail address linked to your TopVeda account"
                  required
                  disabled={isSubmitting}
                />
              </>
            )}

            {/* Submit Action Button */}
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
                  Processing...
                </>
              ) : (
                <>
                  {mode === "login" && "Sign In"}
                  {mode === "register" && "Create Student Account"}
                  {mode === "forgot-password" && "Send Reset Link"}
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Modal Switch Footer */}
        <div className="border-t border-brand-border-subtle pt-4 text-center text-xs text-brand-text-muted">
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

