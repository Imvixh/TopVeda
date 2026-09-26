"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { AdminApplication } from "@/types/auth.types";
import {
  ShieldCheck,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  User,
} from "lucide-react";

export default function SuperAdminApplicationsPage() {
  const router = useRouter();
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [applications, setApplications] = React.useState<AdminApplication[]>([]);
  const [isLoadingApps, setIsLoadingApps] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Modal Review States
  const [activeApp, setActiveApp] = React.useState<AdminApplication | null>(null);
  const [reviewMode, setReviewMode] = React.useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");
  const [isProcessingDecision, setIsProcessingDecision] = React.useState(false);

  // Document preview state
  const [isGeneratingDocUrl, setIsGeneratingDocUrl] = React.useState<string | null>(null);

  const fetchApplications = React.useCallback(async () => {
    setIsLoadingApps(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from("admin_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(error.message);
      } else {
        const formatted: AdminApplication[] = (data || []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          documentStoragePath: row.document_storage_path,
          documentFileName: row.document_file_name,
          documentFileSize: row.document_file_size,
          documentMimeType: row.document_mime_type,
          status: row.status,
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at,
          rejectionReason: row.rejection_reason,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
        setApplications(formatted);
      }
    } catch {
      setErrorMessage("Failed to load admin applications.");
    } finally {
      setIsLoadingApps(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    let isMounted = true;
    if (!isAuthLoading) {
      if (!user || profile?.role !== "SUPER_ADMIN") {
        router.push("/student");
      } else {
        (async () => {
          try {
            const { data, error } = await supabase
              .from("admin_applications")
              .select("*")
              .order("created_at", { ascending: false });

            if (!isMounted) return;
            if (error) {
              setErrorMessage(error.message);
            } else {
              const formatted: AdminApplication[] = (data || []).map((row) => ({
                id: row.id,
                userId: row.user_id,
                fullName: row.full_name,
                email: row.email,
                phone: row.phone,
                documentStoragePath: row.document_storage_path,
                documentFileName: row.document_file_name,
                documentFileSize: row.document_file_size,
                documentMimeType: row.document_mime_type,
                status: row.status,
                reviewedBy: row.reviewed_by,
                reviewedAt: row.reviewed_at,
                rejectionReason: row.rejection_reason,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
              }));
              setApplications(formatted);
            }
          } catch {
            if (isMounted) setErrorMessage("Failed to load admin applications.");
          } finally {
            if (isMounted) setIsLoadingApps(false);
          }
        })();
      }
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user, profile, router, supabase]);

  // Request 5-minute signed URL from Server API
  const handleViewDocument = async (app: AdminApplication) => {
    setIsGeneratingDocUrl(app.id);
    try {
      const res = await fetch("/api/admin/applications/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: app.documentStoragePath }),
      });

      const data = await res.json();
      if (!res.ok || !data.signedUrl) {
        alert(data.error || "Failed to generate secure document preview URL.");
      } else {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      alert("Error generating document preview link.");
    } finally {
      setIsGeneratingDocUrl(null);
    }
  };

  // Submit Approval / Rejection via Server API Route
  const handleDecisionSubmit = async () => {
    if (!activeApp || !reviewMode) return;
    setIsProcessingDecision(true);
    setActionSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/applications/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: activeApp.id,
          decision: reviewMode === "approve" ? "APPROVED" : "REJECTED",
          rejectionReason: reviewMode === "reject" ? rejectionReason : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "Failed to submit review decision.");
      } else {
        setActionSuccessMessage(
          `Application for ${activeApp.fullName} successfully ${
            reviewMode === "approve" ? "APPROVED" : "REJECTED"
          }.`
        );
        setActiveApp(null);
        setReviewMode(null);
        setRejectionReason("");
        await fetchApplications();
      }
    } catch {
      alert("Network exception occurred while processing decision.");
    } finally {
      setIsProcessingDecision(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
      </div>
    );
  }

  const pendingApps = applications.filter((a) => a.status === "PENDING");
  const processedApps = applications.filter((a) => a.status !== "PENDING");

  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-brand-surface border-b border-brand-border/80">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <BrandGlyph size={26} />
              <Wordmark size="sm" />
            </Link>

            <div className="flex items-center gap-3">
              <Link href="/admin/cms/profile">
                <Button variant="ghost" size="sm" className="text-xs font-semibold text-brand-text-primary hover:text-brand-orange">
                  <User className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
                  Profile
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Admin Overview
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg">
          <div className="space-y-6">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">SUPER ADMIN ONLY</Badge>
                  <Badge variant="peach" size="sm">Applications Review</Badge>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight">
                  Admin Applications & Verification Vault
                </h1>
                <p className="text-xs sm:text-sm text-brand-text-muted">
                  Review verified applicant credentials, inspect government identity documents, and approve administrator applications.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchApplications}
                disabled={isLoadingApps}
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoadingApps ? "animate-spin" : ""}`} />
                Refresh List
              </Button>
            </div>

            {/* Notification Banners */}
            {actionSuccessMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in-50">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PENDING APPLICATIONS SECTION */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-bold text-sm text-brand-text-primary">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Pending Review ({pendingApps.length})</span>
              </div>

              {isLoadingApps ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
                </div>
              ) : pendingApps.length === 0 ? (
                <Card className="p-8 text-center bg-brand-surface space-y-2">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-brand-text-primary">All Caught Up!</h3>
                  <p className="text-xs text-brand-text-muted">There are no pending administrator applications awaiting review.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pendingApps.map((app) => (
                    <Card key={app.id} className="p-5 sm:p-6 bg-brand-surface shadow-sm border border-brand-border hover:border-brand-orange-border/70 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Applicant Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-brand-text-primary">
                              {app.fullName}
                            </span>
                            <Badge variant="peach" size="sm">PENDING REVIEW</Badge>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-brand-text-muted">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                              <span className="truncate">{app.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                              <span>{app.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                              <span>{new Date(app.createdAt).toLocaleString("en-IN")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-brand-border-subtle">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(app)}
                            disabled={isGeneratingDocUrl === app.id}
                            className="text-xs"
                          >
                            {isGeneratingDocUrl === app.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
                            )}
                            Inspect ID Document
                            <ExternalLink className="h-3 w-3 ml-1.5 opacity-60" />
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setActiveApp(app);
                              setReviewMode("approve");
                            }}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Approve
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActiveApp(app);
                              setReviewMode("reject");
                              setRejectionReason("");
                            }}
                            className="text-xs text-red-600 hover:bg-red-50 border-red-200"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* APPLICATION HISTORY SECTION */}
            {processedApps.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-brand-border">
                <h2 className="font-bold text-sm text-brand-text-primary flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-orange" />
                  <span>Application History ({processedApps.length})</span>
                </h2>

                <div className="space-y-2.5">
                  {processedApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-4 rounded-xl bg-brand-surface border border-brand-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-text-primary text-sm">
                            {app.fullName}
                          </span>
                          <span className="text-brand-text-muted">({app.email})</span>
                          <Badge
                            variant={app.status === "APPROVED" ? "success" : "neutral"}
                            size="sm"
                            className={
                              app.status === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {app.status}
                          </Badge>
                        </div>
                        {app.rejectionReason && (
                          <p className="text-[11px] text-red-700">
                            <strong>Reason:</strong> {app.rejectionReason}
                          </p>
                        )}
                      </div>

                      <div className="text-right text-[11px] text-brand-text-muted">
                        Processed: {app.reviewedAt ? new Date(app.reviewedAt).toLocaleString("en-IN") : "Recent"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Container>
      </main>

      {/* APPROVAL / REJECTION CONFIRMATION MODAL */}
      <Modal
        isOpen={!!activeApp && !!reviewMode}
        onClose={() => {
          if (!isProcessingDecision) {
            setActiveApp(null);
            setReviewMode(null);
          }
        }}
        maxWidth="md"
      >
        <div className="space-y-5">
          <div className="text-center space-y-1">
            <div
              className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center border ${
                reviewMode === "approve"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-red-50 text-red-600 border-red-200"
              }`}
            >
              {reviewMode === "approve" ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <XCircle className="h-6 w-6" />
              )}
            </div>
            <h3 className="text-lg font-bold text-brand-text-primary">
              {reviewMode === "approve" ? "Approve Admin Application" : "Reject Admin Application"}
            </h3>
            <p className="text-xs text-brand-text-muted">
              Applicant: <span className="font-bold text-brand-text-primary">{activeApp?.fullName}</span> ({activeApp?.email})
            </p>
          </div>

          {reviewMode === "approve" ? (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <p className="font-semibold">Approve Admin Application:</p>
              <p>
                Approving this application will grant <strong className="font-bold">{activeApp?.fullName}</strong> ({activeApp?.email}) access to the TopVeda Admin Panel and dispatch an approval email.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-brand-text-muted">
                Provide an optional reason explaining why the application was rejected. This will be included in the applicant notification email.
              </p>
              <div>
                <label className="block text-xs font-semibold text-brand-text-primary mb-1">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Identity document unreadable, Please re-upload a clear government ID."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-brand-border bg-brand-surface focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 text-brand-text-primary"
                  disabled={isProcessingDecision}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveApp(null);
                setReviewMode(null);
              }}
              disabled={isProcessingDecision}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleDecisionSubmit}
              disabled={isProcessingDecision}
              className={
                reviewMode === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }
            >
              {isProcessingDecision ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Processing...
                </>
              ) : reviewMode === "approve" ? (
                "Confirm & Approve"
              ) : (
                "Confirm & Reject"
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
