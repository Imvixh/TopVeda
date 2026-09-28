"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
import { useAuth } from "@/hooks/use-auth";
import { 
  ShieldCheck, 
  User, 
  Mail, 
  LogOut, 
  ArrowLeft, 
  Loader2, 
  Layers,
  ArrowRight, 
  ClipboardCheck,
  Radio,
  FileCheck2,
  Power,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminFoundationPage() {
  const router = useRouter();
  const { user, profile, isLoading, logout } = useAuth();
  const [pendingAppsCount, setPendingAppsCount] = React.useState<number>(0);
  const [pendingReviewsCount, setPendingReviewsCount] = React.useState<number>(0);
  const [maintenance, setMaintenance] = React.useState<{
    isEnabled: boolean;
    updatedAt?: string;
    updatedBy?: string;
    message?: string;
  }>({ isEnabled: false });
  const [isConfirmModalOpen, setIsConfirmModalOpen] = React.useState(false);
  const [isTogglingMaintenance, setIsTogglingMaintenance] = React.useState(false);

  const isSuperAdmin = profile?.role === "SUPER_ADMIN";

  React.useEffect(() => {
    if (isSuperAdmin) {
      const supabase = createClient();
      
      // 1. Fetch pending admin applications count
      supabase
        .from("admin_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "PENDING")
        .then(({ count }) => {
          if (count !== null) setPendingAppsCount(count);
        });

      // 2. Fetch pending teacher review submissions count
      supabase
        .from("cms_pending_reviews_view")
        .select("entity_id", { count: "exact", head: true })
        .then(({ count }) => {
          if (count !== null) setPendingReviewsCount(count);
        });

      // 3. Fetch system maintenance mode status
      fetch("/api/admin/system/maintenance")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.maintenance) {
            setMaintenance(data.maintenance);
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [isSuperAdmin]);

  const handleToggleMaintenance = async () => {
    setIsTogglingMaintenance(true);
    try {
      const res = await fetch("/api/admin/system/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !maintenance.isEnabled }),
      });
      const data = await res.json();
      if (data.success && data.maintenance) {
        setMaintenance(data.maintenance);
      }
    } catch {
      // ignore
    } finally {
      setIsTogglingMaintenance(false);
      setIsConfirmModalOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-bg-warm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
          <p className="text-xs font-semibold text-brand-text-muted">Verifying Admin Authorization...</p>
        </div>
      </div>
    );
  }

  const profileHref = isSuperAdmin ? "/admin/cms/profile" : "/admin/profile";

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
              <Link href={profileHref}>
                <Button variant="ghost" size="sm" className="font-semibold text-brand-text-primary hover:text-brand-orange">
                  <User className="h-4 w-4 mr-1.5 text-brand-orange" />
                  Profile
                </Button>
              </Link>
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Homepage
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-10">
        <Container size="md">
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="peach" size="sm">RBAC Foundation</Badge>
                <Badge variant="primary" size="sm">
                  {isSuperAdmin ? "SUPER ADMIN" : "ADMINISTRATOR"}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-text-primary tracking-tight">
                {isSuperAdmin ? "Super Admin Account Foundation" : "Admin Authorization Foundation"}
              </h1>
              <p className="text-sm text-brand-text-muted">
                Server-side role verified. You have authorized administrative access to TopVeda.
              </p>
            </div>

            {/* SUPER ADMIN QUICK ACTION 1: CMS Suite */}
            {isSuperAdmin && (
              <Card className="p-5 sm:p-6 bg-gradient-to-br from-brand-surface via-brand-bg-peach/30 to-brand-bg-peach/50 border-2 border-brand-orange-border shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-brand-orange text-white flex items-center justify-center shadow-md">
                      <Layers className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-brand-text-primary">
                          Super Admin CMS Suite
                        </h3>
                        <Badge variant="peach" size="sm" className="text-[10px] uppercase font-bold">
                          Phase 4.1
                        </Badge>
                      </div>
                      <p className="text-xs text-brand-text-muted">
                        Manage hero banners, courses, batches, lectures, live classes, study materials, and AI Chatbot.
                      </p>
                    </div>
                  </div>

                  <Link href="/admin/cms">
                    <Button variant="primary" size="sm" className="shadow-subtle w-full sm:w-auto">
                      Open CMS Suite
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* SUPER ADMIN QUICK ACTION 2: Admin Applications Review */}
            {isSuperAdmin && (
              <Card className="p-5 sm:p-6 bg-gradient-to-br from-brand-surface via-sky-50/40 to-blue-50/40 border-2 border-sky-200/80 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-brand-text-primary">
                          Admin Applications & Verification Vault
                        </h3>
                        {pendingAppsCount > 0 ? (
                          <Badge variant="peach" size="sm" className="animate-pulse text-[10px] font-bold">
                            {pendingAppsCount} PENDING
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                            Up to Date
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-brand-text-muted">
                        Review verified educator credentials, inspect government ID documents, and grant administrator access.
                      </p>
                    </div>
                  </div>

                  <Link href="/admin/applications">
                    <Button variant="primary" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white shadow-subtle w-full sm:w-auto">
                      Review Applications
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* SUPER ADMIN QUICK ACTION 3 (NEW): Teacher Submissions & Review Queue */}
            {isSuperAdmin && (
              <Card className="p-5 sm:p-6 bg-gradient-to-br from-brand-surface via-emerald-50/40 to-teal-50/40 border-2 border-emerald-200/80 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                      <FileCheck2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-brand-text-primary">
                          Teacher Submissions & Review Queue
                        </h3>
                        {pendingReviewsCount > 0 ? (
                          <Badge variant="peach" size="sm" className="animate-pulse text-[10px] font-bold">
                            {pendingReviewsCount} PENDING
                          </Badge>
                        ) : (
                          <Badge variant="outline" size="sm" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200">
                            All Caught Up
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-brand-text-muted">
                        Review educator lecture videos, batches, and study notes awaiting Super Admin verification and publishing.
                      </p>
                    </div>
                  </div>

                  <Link href="/admin/cms/reviews">
                    <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-subtle w-full sm:w-auto">
                      Review Queue
                      {pendingReviewsCount > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-white text-emerald-700 rounded-full text-[10px] font-extrabold">
                          {pendingReviewsCount}
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* TEACHER WORKSPACE: LIVE CLASSES & RECORDED LECTURES */}
            <Card className="p-5 sm:p-6 bg-gradient-to-br from-brand-surface via-amber-50/40 to-orange-50/40 border-2 border-amber-200/80 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-brand-orange text-white flex items-center justify-center shadow-md">
                    <Radio className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-brand-text-primary">
                        Teacher Workspace: Live Classes & Recorded Lectures
                      </h3>
                      <Badge variant="peach" size="sm" className="text-[10px] uppercase font-bold">
                        Workspace
                      </Badge>
                    </div>
                    <p className="text-xs text-brand-text-muted">
                      Schedule live classes, enter preparation rooms 10 minutes early, broadcast live, and upload recorded lectures for Super Admin approval.
                    </p>
                  </div>
                </div>

                <Link href="/admin/content">
                  <Button variant="primary" size="sm" className="bg-brand-orange hover:bg-brand-orange-hover text-white shadow-subtle w-full sm:w-auto">
                    Open Workspace
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* SUPER ADMIN QUICK ACTION 4 (NEW): System Maintenance Mode */}
            {isSuperAdmin && (
              <Card
                className={`p-5 sm:p-6 border-2 transition-all shadow-md ${
                  maintenance.isEnabled
                    ? "bg-red-950/20 border-red-500/80 shadow-red-900/10"
                    : "bg-gradient-to-br from-brand-surface via-purple-50/40 to-indigo-50/40 border-purple-200/80 shadow-md"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                        maintenance.isEnabled ? "bg-red-600 text-white" : "bg-purple-600 text-white"
                      }`}
                    >
                      {maintenance.isEnabled ? (
                        <AlertTriangle className="h-6 w-6" />
                      ) : (
                        <Power className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-brand-text-primary">
                          System Maintenance Mode
                        </h3>
                        <Badge
                          variant={maintenance.isEnabled ? "peach" : "outline"}
                          size="sm"
                          className={`font-mono font-bold text-[10px] uppercase tracking-wider ${
                            maintenance.isEnabled
                              ? "bg-red-600 text-white border-red-700"
                              : "bg-purple-50 text-purple-700 border-purple-300"
                          }`}
                        >
                          [ {maintenance.isEnabled ? "ON" : "OFF"} ]
                        </Badge>
                      </div>
                      <p className="text-xs text-brand-text-muted mt-0.5">
                        {maintenance.isEnabled
                          ? "Public and student portals are locked with HTTP 503. Only Super Admin access is permitted."
                          : "System is operating normally. All student, teacher, and public portals are active."}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsConfirmModalOpen(true)}
                      className={`w-full sm:w-auto text-xs font-bold shadow-subtle ${
                        maintenance.isEnabled
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5 mr-1.5" />
                      {maintenance.isEnabled ? "Deactivate Maintenance Mode" : "Activate Maintenance Mode"}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Admin Profile Overview */}
            <Card className="p-6 sm:p-8 space-y-6 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border">
                <div className="flex items-center gap-4">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.fullName || "Admin"}
                      className="h-14 w-14 rounded-2xl object-cover border border-brand-border shadow-md shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-brand-charcoal text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                      <ShieldCheck className="h-7 w-7 text-brand-orange" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold text-brand-text-primary">
                      {profile?.fullName || (isSuperAdmin ? "Super Administrator" : "System Administrator")}
                    </h2>
                    <p className="text-xs text-brand-text-muted">
                      Role: <span className="font-bold text-brand-orange">{profile?.role || "ADMIN"}</span> • Session active
                    </p>
                  </div>
                </div>

                <Link href={profileHref}>
                  <Button variant="outline" size="sm" className="bg-white hover:bg-brand-bg-warm border-brand-border font-bold text-xs shadow-2xs">
                    <User className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
                    Edit Profile
                  </Button>
                </Link>
              </div>

              {/* Verified Claims Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl bg-brand-bg-warm/80 border border-brand-border/60 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-brand-text-muted font-medium">
                    <User className="h-4 w-4 text-brand-orange" />
                    <span>Administrator Name</span>
                  </div>
                  <p className="font-bold text-brand-text-primary text-sm">
                    {profile?.fullName || "Admin"}
                  </p>
                </div>

                <div className="rounded-xl bg-brand-bg-warm/80 border border-brand-border/60 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-brand-text-muted font-medium">
                    <Mail className="h-4 w-4 text-brand-orange" />
                    <span>Admin Email</span>
                  </div>
                  <p className="font-bold text-brand-text-primary text-sm truncate">
                    {user?.email || profile?.email || "admin@topveda.com"}
                  </p>
                </div>
              </div>

              {/* Profile Quick Action Banner */}
              <div className="rounded-xl bg-gradient-to-r from-brand-bg-warm to-brand-bg-peach/40 border border-brand-border/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-brand-text-primary">
                    {isSuperAdmin
                      ? "Manage Super Admin Profile & Credentials"
                      : "Manage Educator Profile & Qualifications"}
                  </p>
                  <p className="text-brand-text-muted text-[11px]">
                    {isSuperAdmin
                      ? "Update root administrator avatar, contact details, location, and platform security credentials."
                      : "Update your avatar picture, academic qualifications, location, contact info, and security credentials."}
                  </p>
                </div>
                <Link href={profileHref} className="shrink-0">
                  <Button variant="primary" size="sm" className="text-xs shadow-subtle w-full sm:w-auto">
                    Manage Profile
                    <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>

              {/* Upcoming CMS Notice */}
              <div className="rounded-xl bg-brand-bg-peach/60 border border-brand-orange-border/70 p-4 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-brand-orange font-bold">
                  <Layers className="h-4 w-4" />
                  <span>Phase 5 Roadmap Notice</span>
                </div>
                <p className="text-brand-text-muted leading-relaxed">
                  The complete Admin CMS & Course Management Panel (curriculum taxonomy, chapter uploads, test creator, and student analytics) will be developed in Phase 5.
                </p>
              </div>
            </Card>
          </div>
        </Container>
      </main>

      {/* MAINTENANCE MODE CONFIRMATION DIALOG */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-brand-surface max-w-md w-full rounded-2xl border border-brand-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  maintenance.isEnabled
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-text-primary">
                  {maintenance.isEnabled
                    ? "Deactivate Maintenance Mode?"
                    : "Activate Maintenance Mode?"}
                </h3>
              </div>
            </div>

            <p className="text-xs text-brand-text-muted leading-relaxed">
              {maintenance.isEnabled
                ? "This will restore normal TopVeda access for all students, teachers, administrators, and public visitors."
                : "This will temporarily block access to TopVeda for students, teachers, administrators and public users. Only Super Admin access will remain available."}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isTogglingMaintenance}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleToggleMaintenance}
                disabled={isTogglingMaintenance}
                className={`text-xs font-bold ${
                  maintenance.isEnabled
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {isTogglingMaintenance ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </span>
                ) : maintenance.isEnabled ? (
                  "Deactivate Maintenance"
                ) : (
                  "Activate Maintenance"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
