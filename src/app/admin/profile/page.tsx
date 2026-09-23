"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  ShieldCheck,
  KeyRound,
  Bell,
  HelpCircle,
  LogOut,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Mail,
  Briefcase,
  Shield,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  AdminProfileSummary,
  UpdateAdminProfilePayload,
} from "@/types/student-profile.types";
import { cn } from "@/lib/utils";
import { CmsSidebar } from "@/components/admin/cms/cms-sidebar";
import { CmsTopbar } from "@/components/admin/cms/cms-topbar";

type AdminTab = "personal" | "password" | "notifications" | "help";

export default function AdminProfilePage() {
  const router = useRouter();
  const { user, profile: authProfile, logout } = useAuth();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const [activeTab, setActiveTab] = React.useState<AdminTab>("personal");
  const [adminProfile, setAdminProfile] = React.useState<AdminProfileSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form states
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [qualification, setQualification] = React.useState("");
  const [bio, setBio] = React.useState("");

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordMessage, setPasswordMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Feedback banner
  const [feedbackMessage, setFeedbackMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAdminProfile = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/profile");
      if (res.status === 401 || res.status === 403) {
        // Not authorized as admin
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load admin profile");
      const data: AdminProfileSummary = await res.json();
      setAdminProfile(data);

      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setQualification(data.qualification || "");
      setBio(data.bio || "");
    } catch {
      setFeedbackMessage({ type: "error", text: "Unable to load administrator profile." });
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedbackMessage(null);

      const payload: UpdateAdminProfilePayload = {
        full_name: fullName,
        phone: phone,
        qualification: qualification,
        bio: bio,
      };

      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update admin profile");
      }

      const updated = await res.json();
      setAdminProfile(updated);
      setFeedbackMessage({ type: "success", text: "Administrator profile updated successfully!" });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedbackMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/admin/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword || undefined,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update administrator password");
      }

      setPasswordMessage({ type: "success", text: "Administrator password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setPasswordMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-brand-bg-warm/30 overflow-hidden font-sans">
      {/* Admin CMS Sidebar */}
      <CmsSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <CmsTopbar onOpenMobile={() => setIsMobileOpen(true)} />

        <main className="p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
                <p className="text-xs font-bold text-brand-text-muted">Loading administrator profile...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Hero */}
              <div className="bg-brand-surface rounded-3xl border border-brand-border p-6 sm:p-8 shadow-2xs relative overflow-hidden">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  {/* Admin Avatar */}
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-brand-charcoal border-2 border-brand-orange text-white flex items-center justify-center shrink-0 shadow-md">
                    <ShieldCheck className="h-10 w-10 text-brand-orange" />
                  </div>

                  {/* Admin Details */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2.5">
                      <h1 className="text-xl sm:text-2xl font-black text-brand-text-primary tracking-tight">
                        {adminProfile?.full_name || "Administrator"}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-brand-orange/10 text-brand-orange border border-brand-orange-border rounded-lg">
                        <Shield className="h-3 w-3" />
                        {adminProfile?.role || "ADMIN"}
                      </span>
                    </div>
                    <p className="text-xs text-brand-text-muted mt-1">
                      {adminProfile?.email} • {adminProfile?.phone}
                    </p>
                    <p className="text-xs text-brand-text-muted mt-0.5">
                      Designation: {adminProfile?.qualification || "Platform Administrator"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Admin Menu Tabs */}
                <div className="lg:col-span-1 space-y-1.5 bg-brand-surface rounded-3xl border border-brand-border p-3 shadow-2xs h-fit">
                  <button
                    onClick={() => { setActiveTab("personal"); setFeedbackMessage(null); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                      activeTab === "personal"
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm"
                    )}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span>Personal Info</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("password"); setFeedbackMessage(null); setPasswordMessage(null); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                      activeTab === "password"
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm"
                    )}
                  >
                    <KeyRound className="h-4 w-4 shrink-0" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab("notifications"); setFeedbackMessage(null); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                      activeTab === "notifications"
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm"
                    )}
                  >
                    <Bell className="h-4 w-4 shrink-0" />
                    <span>System Alerts</span>
                    {adminProfile && adminProfile.unread_notifications_count > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-brand-orange text-white rounded-full">
                        {adminProfile.unread_notifications_count}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { setActiveTab("help"); setFeedbackMessage(null); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                      activeTab === "help"
                        ? "bg-brand-orange text-white shadow-xs"
                        : "text-brand-text-muted hover:text-brand-text-primary hover:bg-brand-bg-warm"
                    )}
                  >
                    <HelpCircle className="h-4 w-4 shrink-0" />
                    <span>Help & Docs</span>
                  </button>

                  <div className="pt-2 mt-2 border-t border-brand-border">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4 shrink-0 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3">
                  {feedbackMessage && (
                    <div
                      className={cn(
                        "p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2.5 shadow-2xs border",
                        feedbackMessage.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      )}
                    >
                      {feedbackMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                      )}
                      <span>{feedbackMessage.text}</span>
                    </div>
                  )}

                  {/* TAB 1: PERSONAL INFO */}
                  {activeTab === "personal" && (
                    <div className="bg-brand-surface rounded-3xl border border-brand-border p-6 sm:p-8 shadow-2xs">
                      <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                        Administrator Information
                      </h2>
                      <p className="text-xs text-brand-text-muted mb-6">
                        Manage your staff profile details and administrative contact information.
                      </p>

                      <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                              Full Name
                            </label>
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full h-11 px-4 text-xs font-medium text-brand-text-primary bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full h-11 px-4 text-xs font-medium text-brand-text-primary bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                              Email Address (Auth Protected)
                            </label>
                            <input
                              type="email"
                              disabled
                              value={adminProfile?.email || ""}
                              className="w-full h-11 px-4 text-xs font-medium text-brand-text-muted bg-[#F2F4F7] border border-brand-border/60 rounded-xl cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                              Designation / Responsibility
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Head of Mathematics / Super Admin"
                              value={qualification}
                              onChange={(e) => setQualification(e.target.value)}
                              className="w-full h-11 px-4 text-xs font-medium text-brand-text-primary bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                            Administrative Bio
                          </label>
                          <textarea
                            rows={3}
                            placeholder="Add administrative notes..."
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            className="w-full p-4 text-xs font-medium text-brand-text-primary bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                          />
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-orange-hover transition-colors disabled:opacity-50"
                          >
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Admin Profile
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* TAB 2: CHANGE PASSWORD */}
                  {activeTab === "password" && (
                    <div className="bg-brand-surface rounded-3xl border border-brand-border p-6 sm:p-8 shadow-2xs">
                      <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                        Change Administrator Password
                      </h2>
                      <p className="text-xs text-brand-text-muted mb-6">
                        Maintain highest platform security with an encrypted, high-strength password.
                      </p>

                      {passwordMessage && (
                        <div
                          className={cn(
                            "p-4 rounded-2xl mb-6 text-xs font-bold flex items-center gap-2.5 border",
                            passwordMessage.type === "success"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-red-50 text-red-800 border-red-200"
                          )}
                        >
                          {passwordMessage.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                          )}
                          <span>{passwordMessage.text}</span>
                        </div>
                      )}

                      <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                        <div>
                          <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                            Current Password
                          </label>
                          <input
                            type="password"
                            placeholder="Enter current password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full h-11 px-4 text-xs font-medium text-brand-text-primary bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                            New Password
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Minimum 6 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full h-11 px-4 text-xs font-medium text-brand-text-primary bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-brand-text-primary mb-1.5">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full h-11 px-4 text-xs font-medium text-brand-text-primary bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                          />
                        </div>

                        <div className="pt-4 flex justify-end">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-orange-hover transition-colors disabled:opacity-50"
                          >
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Update Admin Password
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* TAB 3: ADMIN NOTIFICATIONS */}
                  {activeTab === "notifications" && (
                    <div className="bg-brand-surface rounded-3xl border border-brand-border p-6 sm:p-8 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                            System Alerts & Reviews
                          </h2>
                          <p className="text-xs text-brand-text-muted">
                            Alerts for teacher lecture submissions, live class scheduling, and platform operations.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-brand-orange/10 text-brand-orange">
                            <Bell className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-brand-text-primary">CMS Verification Queue</h4>
                            <p className="text-xs text-brand-text-muted">
                              Pending lecture submissions are routed to the CMS Review queue.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push("/admin/cms/lectures/review")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-surface border border-brand-border text-brand-text-primary text-xs font-bold rounded-xl hover:bg-brand-bg-peach hover:text-brand-orange transition-colors"
                        >
                          Review Queue <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: HELP & DOCS */}
                  {activeTab === "help" && (
                    <div className="bg-brand-surface rounded-3xl border border-brand-border p-6 sm:p-8 shadow-2xs space-y-4">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                          Administrator Guidance & Policies
                        </h2>
                        <p className="text-xs text-brand-text-muted">
                          Operational workflows, CMS review protocols, and platform management guidelines.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60">
                          <h4 className="text-xs font-bold text-brand-text-primary mb-1">Lecture Publication Protocol</h4>
                          <p className="text-xs text-brand-text-muted leading-relaxed">
                            All educator-submitted recorded lectures must meet curriculum clarity, audio-video clarity, and taxonomy accuracy before being marked as PUBLISHED.
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60">
                          <h4 className="text-xs font-bold text-brand-text-primary mb-1">Live Class Overlap Guard</h4>
                          <p className="text-xs text-brand-text-muted leading-relaxed">
                            The database trigger automatically prevents teachers from scheduling overlapping live class slots to prevent scheduling conflicts.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
