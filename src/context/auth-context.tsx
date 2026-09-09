"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  UserProfile,
  UserRole,
  AdminApplicationSubmission,
  DocumentUploadMetadata,
} from "@/types/auth.types";
import {
  validateFullName,
  validateEmail,
  validateAndNormalizePhone,
  validatePassword,
  validateConfirmPassword,
  validateTerms,
} from "@/lib/validation/auth";

export interface RegisterParams {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  termsAgreed: boolean;
  role?: "STUDENT" | "ADMIN";
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  requireVerification?: boolean;
  metadata?: DocumentUploadMetadata;
  role?: UserRole;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, expectedPortal?: "student" | "admin") => Promise<AuthResponse>;
  register: (params: RegisterParams) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResponse>;
  updatePassword: (password: string) => Promise<AuthResponse>;
  uploadAdminDocument: (file: File) => Promise<AuthResponse>;
  submitAdminApplication: (submission: AdminApplicationSubmission) => Promise<AuthResponse>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize client once
  const supabase = React.useMemo(() => createClient(), []);

  // Fetch application profile from public.profiles table
  const fetchProfile = React.useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, role, avatar_url, created_at, updated_at")
          .eq("id", userId)
          .single();

        if (error || !data) {
          return null;
        }

        return {
          id: data.id,
          fullName: data.full_name,
          email: data.email,
          phone: data.phone,
          role: data.role as UserRole,
          avatarUrl: data.avatar_url || undefined,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      } catch {
        return null;
      }
    },
    [supabase]
  );

  const refreshProfile = React.useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        const p = await fetchProfile(currentUser.id);
        setProfile(p);
      }
    } catch {
      // Ignore refresh error
    }
  }, [supabase, fetchProfile]);

  // Initial session & profile hydration + auth change listener
  React.useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (mounted) {
          if (currentUser) {
            setUser(currentUser);
            const userProfile = await fetchProfile(currentUser.id);
            if (mounted) setProfile(userProfile);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch {
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        const userProfile = await fetchProfile(sessionUser.id);
        if (mounted) setProfile(userProfile);
      } else {
        if (mounted) setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  // Login with Email (Gmail) or 10-digit Phone (+91), with authoritative server-side role verification
  const login = async (
    identifier: string,
    password: string,
    expectedPortal?: "student" | "admin"
  ): Promise<AuthResponse> => {
    const trimmedId = identifier.trim();

    if (!trimmedId) {
      return { success: false, error: "Please enter your email or mobile number." };
    }

    if (!password) {
      return { success: false, error: "Please enter your password." };
    }

    try {
      let authUser: User | null = null;

      if (trimmedId.includes("@")) {
        const emailValidation = validateEmail(trimmedId);
        if (!emailValidation.isValid) {
          return { success: false, error: emailValidation.error };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailValidation.normalizedValue!,
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) {
            return {
              success: false,
              error: "Please verify your email before logging in. Check your inbox.",
            };
          }
          return { success: false, error: "Invalid email or password. Please try again." };
        }

        authUser = data.user;
      } else {
        const phoneValidation = validateAndNormalizePhone(trimmedId);
        if (!phoneValidation.isValid) {
          return { success: false, error: phoneValidation.error };
        }

        const normalizedPhone = phoneValidation.normalizedValue!;

        const { data, error } = await supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password,
        });

        if (error) {
          return {
            success: false,
            error:
              "Unable to sign in with mobile number. Please sign in using your registered Gmail address.",
          };
        }

        authUser = data.user;
      }

      if (!authUser) {
        return { success: false, error: "Authentication failed. User session not found." };
      }

      // 2. Fetch authoritative database profile
      const userProfile = await fetchProfile(authUser.id);
      const userRole = userProfile?.role || "STUDENT";

      // 3. Authoritative Portal Enforcement
      if (expectedPortal === "student") {
        if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
          // Reject Admin / Super Admin attempting Student Login
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          return {
            success: false,
            error: "Invalid user. Please use Admin Sign In.",
          };
        }
      } else if (expectedPortal === "admin") {
        if (userRole === "STUDENT") {
          // Reject Student attempting Admin Login
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          return {
            success: false,
            error: "Invalid user. Please use Student Sign In.",
          };
        }

        if (userRole === "ADMIN") {
          // Verify admin application status
          const { data: latestApp } = await supabase
            .from("admin_applications")
            .select("status")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!latestApp) {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            return {
              success: false,
              error: "Your admin registration is pending approval.",
            };
          }

          if (latestApp.status === "PENDING") {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            return {
              success: false,
              error: "Your admin registration is pending approval.",
            };
          }

          if (latestApp.status === "REJECTED") {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            return {
              success: false,
              error: "Your admin registration was rejected.",
            };
          }

          if (latestApp.status !== "APPROVED") {
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
            return {
              success: false,
              error: "Your admin registration is pending approval.",
            };
          }
        }
        // SUPER_ADMIN is allowed immediately
      }

      // Successful, authorized login
      setUser(authUser);
      setProfile(userProfile);
      return { success: true, role: userRole };
    } catch {
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  };

  // Register a new Account (supports role STUDENT or ADMIN)
  const register = async (params: RegisterParams): Promise<AuthResponse> => {
    const nameVal = validateFullName(params.fullName);
    if (!nameVal.isValid) return { success: false, error: nameVal.error };

    const emailVal = validateEmail(params.email);
    if (!emailVal.isValid) return { success: false, error: emailVal.error };

    const phoneVal = validateAndNormalizePhone(params.phone);
    if (!phoneVal.isValid) return { success: false, error: phoneVal.error };

    const passVal = validatePassword(params.password);
    if (!passVal.isValid) return { success: false, error: passVal.error };

    const confirmVal = validateConfirmPassword(params.password, params.confirmPassword);
    if (!confirmVal.isValid) return { success: false, error: confirmVal.error };

    const termsVal = validateTerms(params.termsAgreed);
    if (!termsVal.isValid) return { success: false, error: termsVal.error };

    const normalizedEmail = emailVal.normalizedValue!;
    const normalizedPhone = phoneVal.normalizedValue!;
    const normalizedName = nameVal.normalizedValue!;
    const assignedRole = params.role === "ADMIN" ? "ADMIN" : "STUDENT";

    try {
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", normalizedPhone)
        .maybeSingle();

      if (existingPhone) {
        return {
          success: false,
          error: "This mobile number is already associated with an account.",
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: params.password,
        options: {
          data: {
            full_name: normalizedName,
            phone: normalizedPhone,
            role: assignedRole,
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback`
              : undefined,
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes("already registered") ||
          error.message.toLowerCase().includes("unique")
        ) {
          return {
            success: false,
            error: "An account with this email address already exists. Please sign in.",
          };
        }
        return { success: false, error: error.message };
      }

      const requireVerification = !data.session;

      return {
        success: true,
        requireVerification,
      };
    } catch {
      return { success: false, error: "Registration failed. Please try again later." };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  // Password Reset Request (Native Supabase Auth with Enumeration Protection)
  const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      return { success: false, error: emailVal.error };
    }

    try {
      const siteUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXT_PUBLIC_SITE_URL ||
            "http://localhost:3000";

      const redirectUrl = `${siteUrl}/auth/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        emailVal.normalizedValue!,
        {
          redirectTo: redirectUrl,
        }
      );

      if (error) {
        console.warn("Supabase resetPasswordForEmail notice:", error.message);
      }

      return { success: true };
    } catch {
      return { success: true };
    }
  };

  // Update Password (Only updates auth password and explicitly clears recovery session)
  const updatePassword = async (password: string): Promise<AuthResponse> => {
    const passVal = validatePassword(password);
    if (!passVal.isValid) {
      return { success: false, error: passVal.error };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Explicitly sign out recovery session so user must authenticate normally
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);

      return { success: true };
    } catch {
      return { success: false, error: "Failed to update password. Please try again." };
    }
  };

  // Upload Government / Identity Document to Private 'admin-documents' Bucket
  const uploadAdminDocument = async (file: File): Promise<AuthResponse> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return { success: false, error: "Please sign in to upload verification documents." };
    }

    const activeUser = session.user;

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${activeUser.id}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from("admin-documents")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      const metadata: DocumentUploadMetadata = {
        storagePath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      };

      return {
        success: true,
        metadata,
      };
    } catch {
      return { success: false, error: "Document upload failed. Please try again." };
    }
  };

  // Submit Admin Application via Server API Route
  const submitAdminApplication = async (
    submission: AdminApplicationSubmission
  ): Promise<AuthResponse> => {
    try {
      const res = await fetch("/api/admin/applications/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submission),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || "Failed to submit administrator application.",
        };
      }

      return { success: true };
    } catch {
      return {
        success: false,
        error: "Network error occurred while submitting application.",
      };
    }
  };

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    requestPasswordReset,
    updatePassword,
    uploadAdminDocument,
    submitAdminApplication,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
