"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Container } from "@/components/ui/container";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandGlyph } from "@/components/brand/glyph";
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
  Camera,
  Trash2,
  MapPin,
  GraduationCap,
  Home,
  ArrowLeft,
  Radio,
  Sparkles,
  Info,
  Shield,
  FileText,
} from "lucide-react";
import {
  AdminProfileSummary,
  UpdateAdminProfilePayload,
} from "@/types/student-profile.types";
import { cn } from "@/lib/utils";

type AdminTab = "personal" | "password" | "notifications" | "help";

export default function AdminProfilePage() {
  const router = useRouter();
  const { user, profile: authProfile, isLoading: isAuthLoading, logout } = useAuth();

  const [activeTab, setActiveTab] = React.useState<AdminTab>("personal");
  const [adminProfile, setAdminProfile] = React.useState<AdminProfileSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);

  // Form states
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [qualification, setQualification] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordMessage, setPasswordMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Feedback banner
  const [feedbackMessage, setFeedbackMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auth Guard: Block students
  React.useEffect(() => {
    if (!isAuthLoading && authProfile?.role === "STUDENT") {
      router.push("/student");
    }
  }, [isAuthLoading, authProfile?.role, router]);

  const fetchAdminProfile = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/profile");
      if (res.status === 401 || res.status === 403) {
        router.push("/auth/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to load educator profile");
      const data: AdminProfileSummary = await res.json();
      setAdminProfile(data);

      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setQualification(data.qualification || "");
      setLocation(data.location || "");
      setAddress(data.address || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || null);
    } catch {
      setFeedbackMessage({ type: "error", text: "Unable to load educator profile." });
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    fetchAdminProfile();
  }, [fetchAdminProfile]);

  // Handle Avatar Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setFeedbackMessage({
        type: "error",
        text: "Image size exceeds 2MB limit. Please choose an image under 2MB.",
      });
      return;
    }

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!validTypes.includes(file.type)) {
      setFeedbackMessage({
        type: "error",
        text: "Only JPEG, PNG, WebP, and AVIF formats are supported.",
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      setFeedbackMessage(null);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to upload avatar.");
      }

      setAvatarUrl(data.avatarUrl);
      if (adminProfile) {
        setAdminProfile({ ...adminProfile, avatar_url: data.avatarUrl });
      }
      setFeedbackMessage({ type: "success", text: "Profile picture updated successfully!" });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedbackMessage({ type: "error", text: error.message });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Avatar Removal
  const handleAvatarRemove = async () => {
    try {
      setIsUploadingAvatar(true);
      setFeedbackMessage(null);
      const res = await fetch("/api/admin/profile/avatar", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to remove avatar.");
      }

      setAvatarUrl(null);
      if (adminProfile) {
        setAdminProfile({ ...adminProfile, avatar_url: null });
      }
      setFeedbackMessage({ type: "success", text: "Profile picture removed successfully." });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedbackMessage({ type: "error", text: error.message });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedbackMessage(null);

      const payload: UpdateAdminProfilePayload = {
        full_name: fullName,
        phone: phone,
        qualification: qualification,
        location: location,
        address: address,
        bio: bio,
      };

      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }

      const updated = await res.json();
      setAdminProfile(updated);
      setFeedbackMessage({ type: "success", text: "Educator profile updated successfully!" });
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
        throw new Error(data.error || "Failed to update password");
      }

      setPasswordMessage({ type: "success", text: "Password updated successfully!" });
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

  const isSuperAdmin = authProfile?.role === "SUPER_ADMIN";

  return (
    <div className="min-h-screen bg-brand-bg-warm flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 w-full bg-brand-surface border-b border-brand-border/80 shadow-2xs">
        <Container size="xl">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <BrandGlyph size={26} />
                <Wordmark size="sm" />
              </Link>
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-brand-border">
                <Badge variant="peach" size="sm" className="text-[10px] font-bold uppercase">
                  Educator Profile
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link href="/admin/content">
                <Button variant="ghost" size="sm" className="text-xs font-semibold text-brand-charcoal hover:text-brand-orange">
                  <Radio className="h-3.5 w-3.5 mr-1.5 text-brand-orange" />
                  <span className="hidden sm:inline">Teacher Workspace</span>
                  <span className="sm:hidden">Workspace</span>
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-xs">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Admin Hub
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout} className="text-xs">
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-8 sm:py-10">
        <Container size="lg">
          <div className="space-y-6">
            {/* Super Admin Notice if viewing Teacher Profile */}
            {isSuperAdmin && (
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-sky-600 shrink-0" />
                  <span>
                    You are viewing the Teacher/Admin profile interface as a <strong>SUPER_ADMIN</strong>. For platform governance, access the dedicated CMS profile.
                  </span>
                </div>
                <Link href="/admin/cms/profile">
                  <Button variant="primary" size="sm" className="bg-sky-600 hover:bg-sky-700 text-white text-xs shrink-0 shadow-2xs">
                    Super Admin Profile →
                  </Button>
                </Link>
              </div>
            )}

            {/* Breadcrumb / Back button */}
            <div className="flex items-center justify-between">
              <Link href="/admin/content">
                <Button variant="ghost" size="sm" className="text-xs font-bold text-brand-text-muted hover:text-brand-charcoal -ml-2">
                  <ArrowLeft className="h-4 w-4 mr-1.5 text-brand-orange" />
                  Back to Teacher Workspace
                </Button>
              </Link>
              <Badge variant="primary" size="sm" className="text-[10px] font-bold uppercase">
                {authProfile?.role || "ADMIN"}
              </Badge>
            </div>

            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
                  <p className="text-xs font-bold text-brand-text-muted">Loading educator profile...</p>
                </div>
              </div>
            ) : (
              <>
                {/* Hero Profile Card */}
                <div className="bg-white rounded-3xl border border-brand-border p-6 sm:p-8 shadow-card relative overflow-hidden">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                    {/* Avatar with Upload/Remove Actions */}
                    <div className="relative group shrink-0">
                      <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-brand-charcoal border-2 border-brand-orange overflow-hidden text-white flex items-center justify-center shadow-md relative">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={adminProfile?.full_name || "Educator"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-2">
                            <User className="h-10 w-10 text-brand-orange mb-1" />
                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                              Educator
                            </span>
                          </div>
                        )}
                        {isUploadingAvatar && (
                          <div className="absolute inset-0 bg-brand-charcoal/70 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-brand-orange animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Photo Actions Overlay */}
                      <div className="mt-2.5 flex items-center justify-center gap-1.5">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                          id="teacher-avatar-upload"
                          disabled={isUploadingAvatar}
                        />
                        <label
                          htmlFor="teacher-avatar-upload"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-orange text-white text-[11px] font-bold cursor-pointer hover:bg-brand-orange-hover transition-colors shadow-2xs"
                        >
                          <Camera className="h-3 w-3" />
                          <span>{avatarUrl ? "Change" : "Upload"}</span>
                        </label>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={handleAvatarRemove}
                            disabled={isUploadingAvatar}
                            className="inline-flex items-center p-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200"
                            title="Remove Photo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Profile Identity Details */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight">
                              {adminProfile?.full_name || "Educator"}
                            </h1>
                            <CheckCircle2 className="h-5 w-5 text-brand-orange shrink-0" />
                          </div>
                          <p className="text-xs text-brand-text-muted mt-0.5">
                            {adminProfile?.email || user?.email}
                          </p>
                        </div>

                        <Badge variant="primary" size="sm" className="self-center sm:self-start text-[10px] font-bold uppercase">
                          Authorized Teacher
                        </Badge>
                      </div>

                      {/* Summary Chips */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                        {qualification && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-bg-warm text-brand-charcoal font-semibold border border-brand-border/60">
                            <GraduationCap className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                            <span>{qualification}</span>
                          </div>
                        )}
                        {location && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-bg-warm text-brand-charcoal font-semibold border border-brand-border/60">
                            <MapPin className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                            <span>{location}</span>
                          </div>
                        )}
                        {phone && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-bg-warm text-brand-charcoal font-semibold border border-brand-border/60">
                            <Phone className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                            <span>{phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feedback Notification Banner */}
                {feedbackMessage && (
                  <div
                    className={cn(
                      "p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 shadow-2xs animate-fade-in",
                      feedbackMessage.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {feedbackMessage.type === "success" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-semibold">{feedbackMessage.text}</span>
                    </div>
                    <button
                      onClick={() => setFeedbackMessage(null)}
                      className="text-xs font-bold opacity-60 hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Main Tabs Navigation */}
                <div className="flex flex-wrap items-center gap-2 border-b border-brand-border pb-1">
                  <button
                    onClick={() => setActiveTab("personal")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "personal"
                        ? "bg-brand-orange text-white shadow-sm"
                        : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-surface"
                    )}
                  >
                    <User className="h-4 w-4" />
                    Personal & Academic Info
                  </button>

                  <button
                    onClick={() => setActiveTab("password")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "password"
                        ? "bg-brand-orange text-white shadow-sm"
                        : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-surface"
                    )}
                  >
                    <KeyRound className="h-4 w-4" />
                    Security & Password
                  </button>

                  <button
                    onClick={() => setActiveTab("notifications")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "notifications"
                        ? "bg-brand-orange text-white shadow-sm"
                        : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-surface"
                    )}
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </button>

                  <button
                    onClick={() => setActiveTab("help")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all",
                      activeTab === "help"
                        ? "bg-brand-orange text-white shadow-sm"
                        : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-surface"
                    )}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Educator Guidelines
                  </button>
                </div>

                {/* Tab Content Panes */}
                <div className="space-y-6">
                  {/* TAB 1: PERSONAL & ACADEMIC INFO */}
                  {activeTab === "personal" && (
                    <Card className="p-6 sm:p-8 shadow-card space-y-6">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                          Personal & Academic Credentials
                        </h2>
                        <p className="text-xs text-brand-text-muted">
                          Update your teaching qualifications, regional location, address, and profile biography.
                        </p>
                      </div>

                      <form onSubmit={handleSavePersonalInfo} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Full Name (Read-only for security) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-brand-text-primary flex items-center justify-between">
                              <span>Full Name</span>
                              <span className="text-[10px] text-brand-text-muted font-normal">Verified identity</span>
                            </label>
                            <input
                              type="text"
                              value={fullName}
                              disabled
                              className="w-full px-3.5 py-2.5 bg-brand-bg-warm/80 border border-brand-border rounded-xl text-xs text-brand-text-primary font-medium cursor-not-allowed opacity-80"
                            />
                          </div>

                          {/* Email (Read-only for security) */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-brand-text-primary flex items-center justify-between">
                              <span>Email Address</span>
                              <span className="text-[10px] text-brand-text-muted font-normal">Verified auth email</span>
                            </label>
                            <input
                              type="email"
                              value={adminProfile?.email || user?.email || ""}
                              disabled
                              className="w-full px-3.5 py-2.5 bg-brand-bg-warm/80 border border-brand-border rounded-xl text-xs text-brand-text-primary font-medium cursor-not-allowed opacity-80"
                            />
                          </div>

                          {/* Phone */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-brand-text-primary">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+91 98765 43210"
                              className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                            />
                          </div>

                          {/* Qualification */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-brand-text-primary">
                              Academic Qualification
                            </label>
                            <input
                              type="text"
                              value={qualification}
                              onChange={(e) => setQualification(e.target.value)}
                              placeholder="e.g. B.Tech (IIT), M.Sc Physics, B.Ed"
                              className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                            />
                          </div>

                          {/* Location */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-brand-text-primary">
                              Location / City & State
                            </label>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="e.g. Patna, Bihar"
                              className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                            />
                          </div>

                          {/* Address */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-brand-text-primary">
                              Residential / Mailing Address
                            </label>
                            <textarea
                              rows={2}
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Full address for faculty documentation and records"
                              className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/40 resize-y"
                            />
                          </div>

                          {/* Bio */}
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-brand-text-primary">
                              Biography & Teaching Experience
                            </label>
                            <textarea
                              rows={3}
                              value={bio}
                              onChange={(e) => setBio(e.target.value)}
                              placeholder="Share your subject expertise, years of teaching experience, and achievements..."
                              className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-orange/40 resize-y"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-orange-hover transition-colors disabled:opacity-50"
                          >
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Profile Changes
                          </button>
                        </div>
                      </form>
                    </Card>
                  )}

                  {/* TAB 2: PASSWORD CHANGE */}
                  {activeTab === "password" && (
                    <Card className="p-6 sm:p-8 shadow-card space-y-6">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                          Security Credentials
                        </h2>
                        <p className="text-xs text-brand-text-muted">
                          Update your educator account password using secure Supabase authentication.
                        </p>
                      </div>

                      {passwordMessage && (
                        <div
                          className={cn(
                            "p-4 rounded-2xl border text-xs flex items-center gap-2 shadow-2xs",
                            passwordMessage.type === "success"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                              : "bg-rose-50 border-rose-200 text-rose-900"
                          )}
                        >
                          {passwordMessage.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                          )}
                          <span className="font-semibold">{passwordMessage.text}</span>
                        </div>
                      )}

                      <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-brand-text-primary">
                            Current Password (Optional if newly registered)
                          </label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-brand-text-primary">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-brand-text-primary">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter new password"
                            className="w-full px-3.5 py-2.5 bg-white border border-brand-border rounded-xl text-xs text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
                          />
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-orange-hover transition-colors disabled:opacity-50"
                          >
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Update Password
                          </button>
                        </div>
                      </form>
                    </Card>
                  )}

                  {/* TAB 3: NOTIFICATIONS */}
                  {activeTab === "notifications" && (
                    <Card className="p-6 sm:p-8 shadow-card space-y-4">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                          Teacher Notification Preferences
                        </h2>
                        <p className="text-xs text-brand-text-muted">
                          Manage alerts for live classes, lecture reviews, and student interactions.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-brand-orange/10 text-brand-orange">
                              <Radio className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-brand-text-primary">Live Classroom Reminders</h4>
                              <p className="text-xs text-brand-text-muted">
                                Receive email and dashboard reminders 15 minutes before scheduled live sessions.
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" size="sm" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]">
                            Active
                          </Badge>
                        </div>

                        <div className="p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-brand-text-primary">Lecture Review Status</h4>
                              <p className="text-xs text-brand-text-muted">
                                Instant notification when Super Admin approves or requests edits on uploaded lectures.
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" size="sm" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px]">
                            Active
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* TAB 4: EDUCATOR GUIDELINES */}
                  {activeTab === "help" && (
                    <Card className="p-6 sm:p-8 shadow-card space-y-4">
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-brand-text-primary mb-1">
                          Educator Guidance & Policies
                        </h2>
                        <p className="text-xs text-brand-text-muted">
                          Operational workflows, live broadcast protocols, and lecture publishing standards.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60">
                          <h4 className="text-xs font-bold text-brand-text-primary mb-1">Live Class Scheduling in IST</h4>
                          <p className="text-xs text-brand-text-muted leading-relaxed">
                            All live classes are scheduled in India Standard Time (Asia/Kolkata). T-10 early preparation room access begins exactly 10 minutes prior to scheduled start time.
                          </p>
                        </div>

                        <div className="p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60">
                          <h4 className="text-xs font-bold text-brand-text-primary mb-1">Lecture Publication Standards</h4>
                          <p className="text-xs text-brand-text-muted leading-relaxed">
                            All educator-submitted recorded lectures must meet curriculum clarity, audio-video clarity, and taxonomy accuracy before approval by Super Admin.
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>
        </Container>
      </main>
    </div>
  );
}
