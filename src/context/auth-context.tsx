"use client";

import * as React from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { UserProfile, UserRole } from "@/types/auth.types";
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
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  requireVerification?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<AuthResponse>;
  register: (params: RegisterParams) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResponse>;
  updatePassword: (password: string) => Promise<AuthResponse>;
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
    if (user?.id) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  }, [user, fetchProfile]);

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

  // Login with Email (Gmail) or 10-digit Phone (+91)
  const login = async (identifier: string, password: string): Promise<AuthResponse> => {
    const trimmedId = identifier.trim();

    if (!trimmedId) {
      return { success: false, error: "Please enter your email or mobile number." };
    }

    if (!password) {
      return { success: false, error: "Please enter your password." };
    }

    try {
      // Determine if identifier is an Email or Phone number
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

        setUser(data.user);
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
        return { success: true };
      } else {
        // Phone Authentication
        const phoneValidation = validateAndNormalizePhone(trimmedId);
        if (!phoneValidation.isValid) {
          return { success: false, error: phoneValidation.error };
        }

        const normalizedPhone = phoneValidation.normalizedValue!;

        // Attempt Supabase native phone password authentication
        const { data, error } = await supabase.auth.signInWithPassword({
          phone: normalizedPhone,
          password,
        });

        if (error) {
          // If phone auth is not natively enabled in Supabase project, provide friendly message
          return {
            success: false,
            error:
              "Unable to sign in with mobile number. Please sign in using your registered Gmail address.",
          };
        }

        setUser(data.user);
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
        return { success: true };
      }
    } catch {
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  };

  // Register a new Student Account
  const register = async (params: RegisterParams): Promise<AuthResponse> => {
    // 1. Validate Full Name
    const nameVal = validateFullName(params.fullName);
    if (!nameVal.isValid) return { success: false, error: nameVal.error };

    // 2. Validate Email (Strict Gmail)
    const emailVal = validateEmail(params.email);
    if (!emailVal.isValid) return { success: false, error: emailVal.error };

    // 3. Validate Mobile Number (+91 10-digit)
    const phoneVal = validateAndNormalizePhone(params.phone);
    if (!phoneVal.isValid) return { success: false, error: phoneVal.error };

    // 4. Validate Password Strength
    const passVal = validatePassword(params.password);
    if (!passVal.isValid) return { success: false, error: passVal.error };

    // 5. Validate Password Match
    const confirmVal = validateConfirmPassword(params.password, params.confirmPassword);
    if (!confirmVal.isValid) return { success: false, error: confirmVal.error };

    // 6. Validate Terms Acceptance
    const termsVal = validateTerms(params.termsAgreed);
    if (!termsVal.isValid) return { success: false, error: termsVal.error };

    const normalizedEmail = emailVal.normalizedValue!;
    const normalizedPhone = phoneVal.normalizedValue!;
    const normalizedName = nameVal.normalizedValue!;

    try {
      // 7. Check if phone number is already registered in profiles
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

      // 8. Call Supabase Auth SignUp
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: params.password,
        options: {
          data: {
            full_name: normalizedName,
            phone: normalizedPhone,
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

      // Check if email confirmation is required (no active session yet)
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

  // Password Reset Request
  const requestPasswordReset = async (email: string): Promise<AuthResponse> => {
    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      return { success: false, error: emailVal.error };
    }

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/reset-password`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(
        emailVal.normalizedValue!,
        {
          redirectTo: redirectUrl,
        }
      );

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch {
      return { success: false, error: "Failed to send reset link. Please try again." };
    }
  };

  // Update Password (when user clicks reset link or updates from session)
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

      return { success: true };
    } catch {
      return { success: false, error: "Failed to update password. Please try again." };
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
