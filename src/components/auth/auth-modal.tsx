"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { Mail, Lock, User, Phone, CheckCircle2, ArrowRight } from "lucide-react";

export type AuthMode = "login" | "register";

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
  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [submitted, setSubmitted] = React.useState(false);

  // Form states
  const [loginIdentifier, setLoginIdentifier] = React.useState("");
  const [loginPassword, setLoginPassword] = React.useState("");

  const [registerName, setRegisterName] = React.useState("");
  const [registerEmail, setRegisterEmail] = React.useState("");
  const [registerPhone, setRegisterPhone] = React.useState("");
  const [registerPassword, setRegisterPassword] = React.useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = React.useState("");
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  // Sync mode when initialMode changes
  const [prevInitialMode, setPrevInitialMode] = React.useState(initialMode);
  if (initialMode !== prevInitialMode) {
    setPrevInitialMode(initialMode);
    setMode(initialMode);
    setSubmitted(false);
    setFormError("");
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (mode === "login") {
      if (!loginIdentifier.trim() || !loginPassword.trim()) {
        setFormError("Please enter your email/phone and password.");
        return;
      }
    } else {
      if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
        setFormError("Please fill in all required fields.");
        return;
      }
      if (registerPassword !== registerConfirmPassword) {
        setFormError("Passwords do not match.");
        return;
      }
      if (!termsAgreed) {
        setFormError("Please agree to the Terms & Conditions.");
        return;
      }
    }

    // Phase 2 UI Simulation (Real Supabase Auth will be wired in Phase 3)
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setSubmitted(false);
    setFormError("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={mode === "login" ? "md" : "lg"}
    >
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Wordmark size="md" className="justify-center" />
          <h2 className="text-xl font-bold text-brand-text-primary">
            {mode === "login" ? "Welcome Back to TopVeda" : "Create Your TopVeda Account"}
          </h2>
          <p className="text-xs text-brand-text-muted">
            {mode === "login"
              ? "Sign in to access your live classes, test series, and notes"
              : "Join thousands of students learning and preparing smarter"}
          </p>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3 animate-in fade-in-50 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-brand-text-primary">
              {mode === "login" ? "Welcome Back!" : "Registration Successful!"}
            </h3>
            <p className="text-xs text-brand-text-muted max-w-xs mx-auto">
              {mode === "login"
                ? "Connecting to your student dashboard..."
                : "Your student profile is being prepared..."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
                {formError}
              </div>
            )}

            {mode === "login" ? (
              // Login Fields
              <>
                <Input
                  label="Email or Phone Number"
                  placeholder="name@example.com or 10-digit mobile"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  icon={<Mail className="h-4 w-4" />}
                  required
                />
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  icon={<Lock className="h-4 w-4" />}
                  required
                />
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-brand-text-muted">
                    <input
                      type="checkbox"
                      className="rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                    />
                    <span>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert("Password reset functionality will be available in Phase 3.")}
                    className="font-medium text-brand-orange hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            ) : (
              // Registration Fields
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Full Name"
                    placeholder="Enter full name"
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    icon={<User className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="Email Address"
                    placeholder="student@example.com"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    icon={<Mail className="h-4 w-4" />}
                    required
                  />
                </div>
                <Input
                  label="Phone Number"
                  placeholder="10-digit mobile number"
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  icon={<Phone className="h-4 w-4" />}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Create Password"
                    placeholder="Min 6 characters"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="Confirm Password"
                    placeholder="Re-enter password"
                    type="password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4" />}
                    required
                  />
                </div>
                <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-brand-text-muted pt-1">
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-brand-border text-brand-orange focus:ring-brand-orange"
                  />
                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={onOpenTerms}
                      className="font-semibold text-brand-orange hover:underline"
                    >
                      Terms & Conditions
                    </button>{" "}
                    and Privacy Policy.
                  </span>
                </label>
              </>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
            >
              {mode === "login" ? "Sign In" : "Create Account"}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </form>
        )}

        {/* Mode Switch Footer */}
        <div className="border-t border-brand-border-subtle pt-4 text-center text-xs text-brand-text-muted">
          {mode === "login" ? (
            <p>
              New to TopVeda?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-semibold text-brand-orange hover:underline focus:outline-none"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-semibold text-brand-orange hover:underline focus:outline-none"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
