"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import {
  User,
  KeyRound,
  Bell,
  Sliders,
  HelpCircle,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  GraduationCap,
  Building2,
  Sparkles,
  Phone,
  Mail,
  BookOpen,
  Send,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import {
  StudentProfileSummary,
  UpdateStudentProfilePayload,
  StudentNotificationPreferences,
} from "@/types/student-profile.types";
import { StudentSidebar } from "@/components/student/student-sidebar";
import { StudentHeader } from "@/components/student/student-header";
import { FloatingChatbot } from "@/components/student/floating-chatbot";
import { cn } from "@/lib/utils";

type ProfileTab = "personal" | "password" | "notifications" | "learning" | "help";

function StudentProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();

  const initialTab = (searchParams?.get("tab") as ProfileTab) || "personal";
  const [activeTab, setActiveTab] = React.useState<ProfileTab>(initialTab);

  const [profile, setProfile] = React.useState<StudentProfileSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);

  // Shell states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = React.useState(false);

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

  // Notifications toggles
  const [notifPrefs, setNotifPrefs] = React.useState<StudentNotificationPreferences>({
    live_reminders: true,
    lecture_updates: true,
    test_results: true,
    study_materials: true,
    announcements: true,
  });

  // Learning preferences state
  const [targetYear, setTargetYear] = React.useState<number>(new Date().getFullYear());
  const [dailyGoalMinutes, setDailyGoalMinutes] = React.useState<number>(60);
  const [feedbackMessage, setFeedbackMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch Student Profile from Database
  const fetchProfile = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/student/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data: StudentProfileSummary = await res.json();
      setProfile(data);

      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setQualification(data.qualification || "");
      setBio(data.bio || "");

      if (data.preferences) {
        setNotifPrefs(data.preferences.notification_preferences);
        setTargetYear(data.preferences.target_year || new Date().getFullYear());
        setDailyGoalMinutes(data.preferences.daily_goal_minutes || 60);
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Unable to load student profile data." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Update Personal Info
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedbackMessage(null);

      const payload: UpdateStudentProfilePayload = {
        full_name: fullName,
        phone: phone,
        qualification: qualification,
        bio: bio,
      };

      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }

      const updated = await res.json();
      setProfile(updated);
      setFeedbackMessage({ type: "success", text: "Personal information updated successfully!" });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedbackMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Change Password
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
      const res = await fetch("/api/student/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword || undefined,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
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

  // Toggle Notification Preference
  const handleToggleNotification = async (key: keyof StudentNotificationPreferences) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);

    try {
      await fetch("/api/student/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notification_preferences: updated,
        }),
      });
    } catch {
      // Revert if error
      setNotifPrefs(notifPrefs);
    }
  };

  // Save Learning Preferences
  const handleSaveLearningPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setFeedbackMessage(null);

      const res = await fetch("/api/student/profile/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_year: targetYear,
          daily_goal_minutes: dailyGoalMinutes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update learning preferences");
      }

      setFeedbackMessage({ type: "success", text: "Learning preferences saved successfully!" });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedbackMessage({ type: "error", text: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar Upload
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/student/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload avatar");
      }

      if (profile) {
        setProfile({ ...profile, avatar_url: data.avatarUrl });
      }
      setFeedbackMessage({ type: "success", text: "Profile picture updated!" });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setFeedbackMessage({ type: "error", text: error.message });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
        <StudentSidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-all duration-300",
            isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          )}
        >
          <StudentHeader
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            isSidebarCollapsed={isSidebarCollapsed}
          />
          <main className="flex-1 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
              <p className="text-xs font-bold text-brand-text-muted">Loading your student profile...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Derive academic subject from active enrollment or fallback to "Science"
  const academicSubject =
    profile?.active_enrollments?.[0]?.course_title
      ? profile.active_enrollments[0].course_title.replace(/^Class\s*\d+\s*/i, "").trim() || "Science"
      : "Science";

  return (
    <div className="min-h-screen bg-[#FDFDFC] text-brand-text-primary flex flex-col font-sans antialiased">
      {/* Student Left Sidebar */}
      <StudentSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Canvas Area */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
        )}
      >
        {/* Top Header */}
        <StudentHeader
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Profile Content Canvas */}
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1200px] w-full mx-auto space-y-6">
          {/* 1. PROFILE HERO HEADER */}
          <div className="bg-white rounded-3xl border border-brand-border/70 p-6 sm:p-8 shadow-2xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar Container with Upload Overlay */}
              <div className="relative group shrink-0">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-3xl overflow-hidden border-2 border-brand-orange-border/70 bg-brand-bg-peach shadow-xs flex items-center justify-center shrink-0">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  ) : (
                    <Image
                      src="/assets/student/student-avatar.jpg"
                      alt={profile?.full_name || "Student"}
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  )}
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 p-2 rounded-xl bg-brand-orange text-white shadow-md hover:bg-brand-orange-hover transition-transform group-hover:scale-105"
                  title="Change Profile Photo"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={handleAvatarFileSelect}
                />
              </div>

              {/* Student Info & Academic Tags */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="space-y-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-xl sm:text-2xl font-black text-brand-charcoal tracking-tight truncate">
                      {profile?.full_name || "Student"}
                    </h1>
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-brand-orange/10 text-brand-orange border border-brand-orange-border rounded-md shrink-0">
                      {profile?.role || "STUDENT"}
                    </span>
                  </div>

                  {/* Clean Email and Phone hierarchy on separate lines */}
                  <p className="text-xs sm:text-sm font-medium text-brand-text-muted">
                    {profile?.email || "student@topveda.in"}
                  </p>
                  <p className="text-xs sm:text-sm font-medium">
                    {profile?.phone?.trim() ? (
                      <span className="text-brand-text-muted">{profile.phone}</span>
                    ) : (
                      <span className="text-brand-text-subtle italic text-xs">Phone number not added</span>
                    )}
                  </p>
                </div>

                {/* Academic Chips (Cleaned: No Faculty / Teacher Name) */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-bg-warm border border-brand-border/70 text-xs font-bold text-brand-charcoal">
                    <GraduationCap className="h-3.5 w-3.5 text-brand-orange" />
                    <span>{profile?.display_class || "Class 10"} • {profile?.display_board || "CBSE"}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-bg-warm border border-brand-border/70 text-xs font-bold text-brand-charcoal">
                    <BookOpen className="h-3.5 w-3.5 text-brand-orange" />
                    <span>{academicSubject}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MAIN PROFILE GRID: MENU & TAB CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Profile Navigation Menu */}
            <div className="lg:col-span-1 space-y-1.5 bg-white rounded-3xl border border-brand-border/70 p-3 shadow-2xs h-fit">
              <button
                onClick={() => { setActiveTab("personal"); setFeedbackMessage(null); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                  activeTab === "personal"
                    ? "bg-brand-orange text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-bg-warm"
                )}
              >
                <User className="h-4 w-4 shrink-0" />
                <span>Personal Information</span>
              </button>

              <button
                onClick={() => { setActiveTab("password"); setFeedbackMessage(null); setPasswordMessage(null); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                  activeTab === "password"
                    ? "bg-brand-orange text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-bg-warm"
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
                    : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-bg-warm"
                )}
              >
                <Bell className="h-4 w-4 shrink-0" />
                <span>Notification Settings</span>
              </button>

              <button
                onClick={() => { setActiveTab("learning"); setFeedbackMessage(null); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                  activeTab === "learning"
                    ? "bg-brand-orange text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-bg-warm"
                )}
              >
                <Sliders className="h-4 w-4 shrink-0" />
                <span>Learning Preferences</span>
              </button>

              <button
                onClick={() => { setActiveTab("help"); setFeedbackMessage(null); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all text-left",
                  activeTab === "help"
                    ? "bg-brand-orange text-white shadow-xs"
                    : "text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-bg-warm"
                )}
              >
                <HelpCircle className="h-4 w-4 shrink-0" />
                <span>Help & Support</span>
              </button>

              <div className="pt-2 mt-2 border-t border-brand-border/60">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4 shrink-0 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="lg:col-span-3">
              {/* Global Feedback Banner */}
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

              {/* TAB 1: PERSONAL INFORMATION */}
              {activeTab === "personal" && (
                <div className="bg-white rounded-3xl border border-brand-border/70 p-6 sm:p-8 shadow-2xs">
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal mb-1">
                    Personal Information
                  </h2>
                  <p className="text-xs text-brand-text-muted mb-6">
                    Update your student profile contact details and academic qualification.
                  </p>

                  <form onSubmit={handleSavePersonalInfo} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          placeholder="e.g. +91 98765 43210"
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Email Address (Auth Protected)
                        </label>
                        <input
                          type="email"
                          disabled
                          value={profile?.email || ""}
                          className="w-full h-11 px-4 text-xs font-medium text-brand-text-muted bg-[#F2F4F7] border border-brand-border/60 rounded-xl cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                          Current Grade / Qualification
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 10th Standard / High School"
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                          className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        Bio / Learning Goals
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Tell your teachers a little about your study aspirations..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full p-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-orange-hover transition-colors disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: CHANGE PASSWORD */}
              {activeTab === "password" && (
                <div className="bg-white rounded-3xl border border-brand-border/70 p-6 sm:p-8 shadow-2xs">
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal mb-1">
                    Change Password
                  </h2>
                  <p className="text-xs text-brand-text-muted mb-6">
                    Ensure your account credentials are secure with a strong password.
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
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        Current Password (Optional)
                      </label>
                      <input
                        type="password"
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Minimum 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
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
                </div>
              )}

              {/* TAB 3: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="bg-white rounded-3xl border border-brand-border/70 p-6 sm:p-8 shadow-2xs">
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal mb-1">
                    Notification Preferences
                  </h2>
                  <p className="text-xs text-brand-text-muted mb-6">
                    Choose the types of platform alerts and reminders you wish to receive.
                  </p>

                  <div className="space-y-4">
                    {[
                      {
                        key: "live_reminders" as const,
                        title: "Live Class Reminders",
                        description: "Alerts when your scheduled teacher live classes are starting soon or rescheduled.",
                      },
                      {
                        key: "lecture_updates" as const,
                        title: "New Lecture Releases",
                        description: "Notifications when new recorded lectures are published for your enrolled courses.",
                      },
                      {
                        key: "test_results" as const,
                        title: "Test & Quiz Evaluations",
                        description: "Instant score analytics and completion notifications when test results are ready.",
                      },
                      {
                        key: "study_materials" as const,
                        title: "Study Material Additions",
                        description: "Alerts when new notes, formula sheets, or NCERT solutions are uploaded to your batch.",
                      },
                      {
                        key: "announcements" as const,
                        title: "TopVeda Announcements",
                        description: "Important academic alerts, exam dates, syllabus changes, and news bulletins.",
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between p-4 rounded-2xl bg-brand-bg-warm/50 border border-brand-border/60"
                      >
                        <div className="pr-4">
                          <h4 className="text-xs sm:text-sm font-bold text-brand-charcoal">{item.title}</h4>
                          <p className="text-xs text-brand-text-muted mt-0.5">{item.description}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleNotification(item.key)}
                          className={cn(
                            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                            notifPrefs[item.key] ? "bg-brand-orange" : "bg-gray-300"
                          )}
                        >
                          <span
                            className={cn(
                              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                              notifPrefs[item.key] ? "translate-x-5" : "translate-x-0"
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: LEARNING PREFERENCES */}
              {activeTab === "learning" && (
                <div className="bg-white rounded-3xl border border-brand-border/70 p-6 sm:p-8 shadow-2xs">
                  <h2 className="text-base sm:text-lg font-black text-brand-charcoal mb-1">
                    Learning Preferences
                  </h2>
                  <p className="text-xs text-brand-text-muted mb-6">
                    Configure your target exam year and daily study goals.
                  </p>

                  <form onSubmit={handleSaveLearningPreferences} className="space-y-4 max-w-lg">
                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        Target Board Examination Year
                      </label>
                      <select
                        value={targetYear}
                        onChange={(e) => setTargetYear(Number(e.target.value))}
                        className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                      >
                        {[2025, 2026, 2027, 2028].map((year) => (
                          <option key={year} value={year}>
                            {year} Board Examination
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-charcoal mb-1.5">
                        Daily Study Target (Minutes)
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={480}
                        step={15}
                        value={dailyGoalMinutes}
                        onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                        className="w-full h-11 px-4 text-xs font-medium text-brand-charcoal bg-brand-bg-warm/50 border border-brand-border rounded-xl focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10 outline-none"
                      />
                      <p className="text-[11px] text-brand-text-muted mt-1">
                        Recommended: 60 to 120 minutes of active learning per day.
                      </p>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-orange text-white text-xs font-bold rounded-xl shadow-xs hover:bg-brand-orange-hover transition-colors disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Preferences
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 5: HELP & SUPPORT */}
              {activeTab === "help" && (
                <div className="bg-white rounded-3xl border border-brand-border/70 p-6 sm:p-8 shadow-2xs space-y-6">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-brand-charcoal mb-1">
                      Help & Support Center
                    </h2>
                    <p className="text-xs text-brand-text-muted">
                      Have questions or need assistance with your TopVeda courses? We are here to help.
                    </p>
                  </div>

                  {/* 3 Support Options: Email Support, Student Helpline, Talk to an Agent */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 1. Email Support */}
                    <a
                      href="mailto:support@topveda.in?subject=TopVeda%20Student%20Support%20Request"
                      className="p-5 rounded-2xl bg-brand-orange/5 border border-brand-orange/20 hover:border-brand-orange/40 hover:bg-brand-orange/10 hover:shadow-2xs transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="p-2.5 rounded-xl bg-brand-orange/10 text-brand-orange border border-brand-orange/20 group-hover:scale-105 transition-transform shrink-0">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-brand-charcoal group-hover:text-brand-orange transition-colors">
                            Email Support
                          </h4>
                          <p className="text-xs font-medium text-brand-text-muted mt-0.5 truncate">
                            support@topveda.in
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-brand-orange font-semibold pt-2 border-t border-brand-orange/10">
                        <span>Average reply &lt; 2 hrs</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    </a>

                    {/* 2. Student Helpline */}
                    <a
                      href="tel:+919876543210"
                      className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-2xs transition-all flex flex-col justify-between group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="p-2.5 rounded-xl bg-emerald-100/80 text-emerald-700 border border-emerald-200 group-hover:scale-105 transition-transform shrink-0">
                          <Phone className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-brand-charcoal group-hover:text-emerald-700 transition-colors">
                            Student Helpline
                          </h4>
                          <p className="text-xs font-medium text-brand-text-muted mt-0.5 truncate">
                            +91 98765 43210
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-emerald-700 font-semibold pt-2 border-t border-emerald-100">
                        <span>10 AM - 7 PM (Mon-Sat)</span>
                        <Phone className="h-3.5 w-3.5" />
                      </div>
                    </a>

                    {/* 3. Talk to an Agent */}
                    <button
                      type="button"
                      onClick={() => setIsAgentModalOpen(true)}
                      className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 hover:border-blue-300 hover:bg-blue-50 hover:shadow-2xs transition-all flex flex-col justify-between text-left group cursor-pointer"
                    >
                      <div className="flex items-start gap-3.5 mb-3">
                        <div className="p-2.5 rounded-xl bg-blue-100/80 text-blue-700 border border-blue-200 group-hover:scale-105 transition-transform shrink-0">
                          <MessageCircle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-brand-charcoal group-hover:text-blue-700 transition-colors">
                            Talk to an Agent
                          </h4>
                          <p className="text-xs font-medium text-brand-text-muted mt-0.5 truncate">
                            AI Tutor & Academic Desk
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-blue-700 font-semibold pt-2 border-t border-blue-100 w-full">
                        <span>Instant Academic Help</span>
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  </div>

                  {/* Talk to an Agent Modal */}
                  {isAgentModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                      <div className="bg-white rounded-3xl border border-brand-border max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                              <MessageCircle className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-brand-charcoal">Talk to an Academic Agent</h3>
                              <p className="text-[11px] text-brand-text-muted">TopVeda Student Support & AI Desk</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setIsAgentModalOpen(false)}
                            className="p-1.5 rounded-xl text-brand-text-muted hover:text-brand-charcoal hover:bg-brand-bg-warm transition-colors"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-brand-bg-peach/60 border border-brand-orange-border/50 text-xs text-brand-text-muted leading-relaxed space-y-2">
                          <p className="font-bold text-brand-charcoal">
                            Need fast guidance on your syllabus or batch?
                          </p>
                          <p>
                            You can query our 24/7 TopVeda AI Tutor for instant concept clarifications, or route your question directly to our academic counselor team.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <a
                            href="mailto:support@topveda.in?subject=Academic%20Agent%20Assistance%20Request"
                            className="w-full py-2.5 px-4 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-brand-orange-hover transition-colors flex items-center justify-center gap-2"
                          >
                            <Mail className="h-4 w-4" />
                            <span>Email Academic Mentors (support@topveda.in)</span>
                          </a>
                          <a
                            href="tel:+919876543210"
                            className="w-full py-2.5 px-4 rounded-xl bg-white border border-brand-border text-brand-charcoal text-xs font-bold hover:bg-brand-bg-warm transition-colors flex items-center justify-center gap-2"
                          >
                            <Phone className="h-4 w-4 text-emerald-600" />
                            <span>Call Student Helpline (+91 98765 43210)</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FAQ Accordions */}
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-brand-text-muted mb-3">
                      Frequently Asked Questions
                    </h3>
                    <div className="space-y-3">
                      {[
                        {
                          q: "How do I access live classes?",
                          a: "Head to the Live Classes section in your dashboard. If a session is currently live or scheduled, click 'Join Class' to enter the interactive room.",
                        },
                        {
                          q: "Where can I download PDF study notes?",
                          a: "Visit the Study Materials tab. Choose your enrolled batch and subject to view and download chapter notes and NCERT solutions.",
                        },
                        {
                          q: "How are test scores evaluated?",
                          a: "Practice test questions are graded instantly upon submission. Detailed question-by-question analytics and solution rationales are provided immediately.",
                        },
                      ].map((faq, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-brand-bg-warm/40 border border-brand-border/60">
                          <h4 className="text-xs font-bold text-brand-charcoal mb-1">{faq.q}</h4>
                          <p className="text-xs text-brand-text-muted leading-relaxed">{faq.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Floating Chatbot Assistant */}
      <FloatingChatbot />
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-brand-bg-warm/30">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-brand-orange animate-spin" />
            <p className="text-xs font-bold text-brand-text-muted">Loading student profile...</p>
          </div>
        </div>
      }
    >
      <StudentProfileContent />
    </React.Suspense>
  );
}
