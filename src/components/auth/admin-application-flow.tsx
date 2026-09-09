"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DocumentUploader } from "@/components/auth/document-uploader";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  validateFullName,
  validateEmail,
  validateAndNormalizePhone,
  validatePassword,
  validateConfirmPassword,
  validateTerms,
  validateDocumentFile,
} from "@/lib/validation/auth";
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  FileCheck,
  Clock,
  LogIn,
  FileText,
  Shield,
  Check,
} from "lucide-react";
import { DocumentUploadMetadata } from "@/types/auth.types";

export interface AdminApplicationFlowProps {
  onSuccess: () => void;
  onOpenTerms?: () => void;
  onSwitchToLogin: () => void;
}

type AdminStep = 1 | 2 | 3 | 4 | 5;

export function AdminApplicationFlow({
  onSuccess,
  onOpenTerms,
  onSwitchToLogin,
}: AdminApplicationFlowProps) {
  const {
    user,
    profile,
    register,
    uploadAdminDocument,
    submitAdminApplication,
    refreshProfile,
  } = useAuth();

  const supabase = React.useMemo(() => createClient(), []);

  // Determine starting step based on authenticated user state
  const determineInitialStep = (): AdminStep => {
    if (!user) return 1;
    if (!user.email_confirmed_at) return 2;
    return 3;
  };

  const [step, setStep] = React.useState<AdminStep>(determineInitialStep);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = React.useState(false);

  // Local email verification override
  const [localEmailVerified, setLocalEmailVerified] = React.useState(false);
  const emailIsVerified = Boolean(user?.email_confirmed_at) || localEmailVerified;

  // Form Fields (Step 1: Account)
  const [fullName, setFullName] = React.useState(
    () => profile?.fullName || (user?.user_metadata?.full_name as string) || ""
  );
  const [email, setEmail] = React.useState(() => user?.email || "");
  const [phone, setPhone] = React.useState(
    () => profile?.phone || (user?.user_metadata?.phone as string) || ""
  );
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Step 3: Document Upload State
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadedDocMetadata, setUploadedDocMetadata] = React.useState<DocumentUploadMetadata | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = React.useState(false);

  // Derived fallbacks for display and submission
  const effectiveFullName = fullName || profile?.fullName || (user?.user_metadata?.full_name as string) || "";
  const effectiveEmail = email || user?.email || "";
  const effectivePhone = phone || profile?.phone || (user?.user_metadata?.phone as string) || "";

  // =========================================================================
  // STEP 1: Submit Admin Registration Form (Account)
  // =========================================================================
  const handleStep1Register = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const nameVal = validateFullName(fullName);
    if (!nameVal.isValid) return setErrorMessage(nameVal.error || "Invalid name.");

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) return setErrorMessage(emailVal.error || "Invalid Gmail address.");

    const phoneVal = validateAndNormalizePhone(phone);
    if (!phoneVal.isValid) return setErrorMessage(phoneVal.error || "Invalid phone number.");

    const passVal = validatePassword(password);
    if (!passVal.isValid) return setErrorMessage(passVal.error || "Weak password.");

    const confirmVal = validateConfirmPassword(password, confirmPassword);
    if (!confirmVal.isValid) return setErrorMessage(confirmVal.error || "Passwords do not match.");

    const termsVal = validateTerms(termsAgreed);
    if (!termsVal.isValid) return setErrorMessage(termsVal.error || "Please accept the terms.");

    setIsSubmitting(true);
    try {
      const res = await register({
        fullName: nameVal.normalizedValue!,
        email: emailVal.normalizedValue!,
        phone: phoneVal.normalizedValue!,
        password,
        confirmPassword,
        termsAgreed,
        role: "ADMIN",
      });

      if (!res.success) {
        setErrorMessage(res.error || "Registration failed. Please try again.");
      } else {
        // Step 2: Email Verification
        setStep(2);
      }
    } catch {
      setErrorMessage("Network error occurred during registration. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // STEP 2: Check Email Verification Status (Live Session Refresh)
  // =========================================================================
  const handleCheckEmailStatus = async () => {
    setIsCheckingEmail(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // 1. Check existing session
      const { data: sessionData } = await supabase.auth.getSession();
      let activeUser = sessionData?.session?.user;

      // 2. If session exists in this tab, refresh to get latest server-side user data
      if (activeUser) {
        const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
        if (!refreshErr && refreshed?.user) {
          activeUser = refreshed.user;
        } else {
          const { data: latestUser } = await supabase.auth.getUser();
          if (latestUser?.user) activeUser = latestUser.user;
        }
      } else {
        // 3. If no session exists in this tab (e.g. email verified in another tab or mobile),
        // authenticate with credentials from Step 1 if available
        const loginEmail = email.trim() || user?.email;
        if (loginEmail && password) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: loginEmail.toLowerCase(),
            password,
          });
          if (!signInErr && signInData?.user) {
            activeUser = signInData.user;
          }
        }
      }

      if (!activeUser) {
        setErrorMessage("Your session has expired. Please return to the verification link and continue.");
        return;
      }

      // 4. Verify email confirmation state on refreshed user
      if (activeUser.email_confirmed_at) {
        setLocalEmailVerified(true);
        await refreshProfile();
        setSuccessMessage("Your email has been verified successfully.");
      } else {
        setErrorMessage(
          "Email not verified yet. Please click the verification link in your email, then click Check for Verification again."
        );
      }
    } catch {
      setErrorMessage("Failed to check verification status. Please retry.");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // =========================================================================
  // STEP 3: Government Document Upload
  // =========================================================================
  const handleUploadDocument = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const docVal = validateDocumentFile(selectedFile);
    if (!docVal.isValid) {
      setErrorMessage(docVal.error || "Please select a valid document (PDF, JPG, PNG under 10MB).");
      return;
    }

    setIsUploadingDoc(true);
    try {
      const res = await uploadAdminDocument(selectedFile!);
      if (!res.success || !res.metadata) {
        setErrorMessage(res.error || "Document upload failed. Please try again.");
      } else {
        setUploadedDocMetadata(res.metadata);
        setSuccessMessage("Government ID uploaded successfully!");
      }
    } catch {
      setErrorMessage("Failed to upload document to encrypted storage.");
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // =========================================================================
  // STEP 4 -> 5: Complete Registration (Server-side Application Submit)
  // =========================================================================
  const handleCompleteRegistration = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setErrorMessage("Please sign in to complete your Admin Registration.");
        setIsSubmitting(false);
        return;
      }

      if (!currentUser.email_confirmed_at) {
        setErrorMessage("Email must be verified before completing registration.");
        setStep(2);
        setIsSubmitting(false);
        return;
      }

      if (!uploadedDocMetadata) {
        setErrorMessage("Please upload your government identity document first.");
        setStep(3);
        setIsSubmitting(false);
        return;
      }

      // Submit application record to server API
      const res = await submitAdminApplication({
        fullName: effectiveFullName || "Admin Applicant",
        email: effectiveEmail || currentUser.email || "",
        phone: effectivePhone || currentUser.phone || "",
        documentStoragePath: uploadedDocMetadata.storagePath,
        documentFileName: uploadedDocMetadata.fileName,
        documentFileSize: uploadedDocMetadata.fileSize,
        documentMimeType: uploadedDocMetadata.mimeType,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to complete registration.");
      } else {
        // Transition to Step 5: Application Submitted / Waiting for Approval
        setStep(5);
      }
    } catch {
      setErrorMessage("A network error occurred while submitting your application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for human-readable file size in Review step
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Error Banner */}
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
      {successMessage && step !== 5 && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 p-3.5 text-xs text-emerald-900 animate-in fade-in-50 duration-150"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1 font-medium">{successMessage}</div>
        </div>
      )}

      {/* SEQUENTIAL 4-STEP PROGRESS INDICATOR BAR */}
      {step !== 5 && (
        <div className="grid grid-cols-4 gap-1 px-2 py-2 rounded-xl bg-brand-bg-warm/80 border border-brand-border text-[10px] sm:text-[11px] font-semibold text-center">
          <div className={step === 1 ? "text-brand-orange font-bold border-b-2 border-brand-orange pb-0.5" : "text-brand-text-muted"}>
            1 Account
          </div>
          <div className={step === 2 ? "text-brand-orange font-bold border-b-2 border-brand-orange pb-0.5" : "text-brand-text-muted"}>
            2 Email
          </div>
          <div className={step === 3 ? "text-brand-orange font-bold border-b-2 border-brand-orange pb-0.5" : "text-brand-text-muted"}>
            3 Gov ID
          </div>
          <div className={step === 4 ? "text-brand-orange font-bold border-b-2 border-brand-orange pb-0.5" : "text-brand-text-muted"}>
            4 Review
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 1: ACCOUNT FORM
          ===================================================================== */}
      {step === 1 && (
        <form onSubmit={handleStep1Register} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Full Name / Admin Name"
              placeholder="e.g. Rahul Sharma"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={<User className="h-4 w-4" />}
              autoComplete="name"
              required
              disabled={isSubmitting}
            />
            <Input
              label="Gmail Address"
              placeholder="name@gmail.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            <p className="font-semibold text-brand-text-primary">Admin Registration Requirements:</p>
            <p>• Creates an Administrator Applicant account pending email & government document review.</p>
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
              and understand administrator applications require identity verification.
            </span>
          </label>

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
                Registering Admin Account...
              </>
            ) : (
              <>
                Register as Admin
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </form>
      )}

      {/* =====================================================================
          STEP 2: EMAIL VERIFICATION (Mandatory Check)
          ===================================================================== */}
      {step === 2 && (
        <div className="py-4 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-bg-peach text-brand-orange border border-brand-orange-border shadow-sm">
            <Mail className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-brand-text-primary">
              Email Verification
            </h3>
            <p className="text-xs text-brand-text-muted max-w-sm mx-auto leading-relaxed">
              Email verification is required before proceeding.
              <br />
              We have sent a verification link to your registered Gmail address:
              <br />
              <strong className="text-brand-text-primary">{email || user?.email}</strong>
              <br />
              <br />
              Please check your inbox and click the verification link.
            </p>
          </div>

          {emailIsVerified ? (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center justify-center gap-2 animate-in fade-in-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-left">
                  <p className="font-bold">Email Verified ✓</p>
                  <p className="text-[11px] font-normal text-emerald-700">Your email has been verified successfully.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => setStep(3)}
                className="w-full shadow-subtle text-xs font-semibold"
              >
                Continue to Government ID
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={handleCheckEmailStatus}
                disabled={isCheckingEmail}
                className="w-full shadow-subtle text-xs font-semibold"
              >
                {isCheckingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking for Verification...
                  </>
                ) : (
                  <>
                    Check for Verification
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-xs text-brand-text-muted hover:text-brand-orange hover:underline font-medium"
                >
                  Already verified? Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          STEP 3: GOVERNMENT ID / DOCUMENTS
          ===================================================================== */}
      {step === 3 && (
        <div className="space-y-4">
          {!user ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
                <LogIn className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-brand-text-primary">
                  Authentication Required
                </h4>
                <p className="text-xs text-brand-text-muted">
                  Please sign in to continue your Admin Registration.
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={onSwitchToLogin}
                className="w-full text-xs font-semibold"
              >
                Sign In to Continue
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-bg-peach text-brand-orange border border-brand-orange-border">
                  <FileCheck className="h-7 w-7" />
                </div>
                <h4 className="text-base font-bold text-brand-text-primary">
                  Government ID
                </h4>
                <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
                  Upload your document (PDF, JPG, JPEG, PNG under 10MB).
                </p>
              </div>

              {!uploadedDocMetadata ? (
                <div className="space-y-3">
                  <DocumentUploader
                    selectedFile={selectedFile}
                    onFileSelect={(f) => setSelectedFile(f)}
                    onClear={() => setSelectedFile(null)}
                    disabled={isUploadingDoc}
                  />

                  <div className="rounded-xl bg-brand-bg-warm/80 border border-brand-border/60 p-3 text-[11px] text-brand-text-muted space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-brand-text-primary">
                      <ShieldCheck className="h-4 w-4 text-brand-orange" />
                      <span>Private & Encrypted Storage</span>
                    </div>
                    <p>
                      Documents are stored in a private vault with no public URL and reviewed exclusively by the Super Administrator.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full shadow-subtle"
                    onClick={handleUploadDocument}
                    disabled={!selectedFile || isUploadingDoc}
                  >
                    {isUploadingDoc ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading Document...
                      </>
                    ) : (
                      <>
                        Upload Document
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="py-2 text-center space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Government ID Uploaded ✓</span>
                    </div>
                    <p className="text-emerald-700">
                      File: <strong>{uploadedDocMetadata.fileName}</strong> ({formatFileSize(uploadedDocMetadata.fileSize)})
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full shadow-subtle"
                    onClick={() => setStep(4)}
                  >
                    Continue to Review
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          STEP 4: REVIEW REGISTRATION
          ===================================================================== */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-bg-peach text-brand-orange border border-brand-orange-border">
              <Shield className="h-7 w-7" />
            </div>
            <h4 className="text-base font-bold text-brand-text-primary">
              Review Registration
            </h4>
            <p className="text-xs text-brand-text-muted max-w-sm mx-auto">
              Please review your registration details before final submission.
            </p>
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-surface p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-brand-border-subtle">
              <span className="text-brand-text-muted">Applicant Name:</span>
              <span className="font-bold text-brand-text-primary">{effectiveFullName}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-brand-border-subtle">
              <span className="text-brand-text-muted">Gmail Address:</span>
              <div className="flex items-center gap-1.5 font-bold text-brand-text-primary">
                <span>{effectiveEmail}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <Check className="h-3 w-3 mr-0.5" /> Email Verified
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-brand-border-subtle">
              <span className="text-brand-text-muted">Mobile Number:</span>
              <span className="font-bold text-brand-text-primary">{effectivePhone}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-brand-text-muted">Government Document:</span>
              <div className="flex items-center gap-1.5 font-bold text-brand-text-primary">
                <FileText className="h-3.5 w-3.5 text-brand-orange" />
                <span className="truncate max-w-[140px]">{uploadedDocMetadata?.fileName}</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <Check className="h-3 w-3 mr-0.5" /> Uploaded
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-[11px] text-amber-900 space-y-1">
            <p className="font-semibold">Notice regarding Administrator approval:</p>
            <p>
              Submitting your application will place it in <strong>PENDING</strong> status. An administrator must approve your application before admin portal access is granted.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full shadow-subtle"
            onClick={handleCompleteRegistration}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                Complete Registration
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* =====================================================================
          STEP 5: COMPLETE / SUBMISSION (PENDING)
          ===================================================================== */}
      {step === 5 && (
        <div className="py-6 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
            <Clock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-brand-text-primary">
              Registration Complete
            </h3>
            <div className="text-xs text-brand-text-muted max-w-md mx-auto leading-relaxed space-y-2">
              <p className="text-sm font-semibold text-brand-text-primary">
                Your application has been submitted.
                <br />
                Now wait for the TopVeda administration approval.
              </p>
              <p>
                You will receive an email once your application has been reviewed.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              variant="primary"
              size="lg"
              onClick={onSuccess}
              className="w-full shadow-subtle text-xs font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
