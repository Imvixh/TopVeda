import { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export interface SuperAdminAAL2Result {
  authorized: boolean;
  user?: User;
  errorResponse?: NextResponse;
}

/**
 * Reusable server-side authorization helper for TopVeda Super Administrator operations.
 * 
 * Enforces:
 * 1. Valid authenticated Supabase user session
 * 2. Profile role is strictly 'SUPER_ADMIN'
 * 3. Authenticator Assurance Level is strictly 'aal2' (TOTP Multi-Factor Authentication)
 * 
 * Prevents AAL1 sessions from executing state-changing administrative operations.
 */
export async function requireSuperAdminAAL2(
  supabase: SupabaseClient
): Promise<SuperAdminAAL2Result> {
  // 1. Authenticate user session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Unauthorized. Authentication required." },
        { status: 401 }
      ),
    };
  }

  // 2. Authorize Super Admin role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "SUPER_ADMIN") {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { success: false, error: "Forbidden. Super Administrator privileges required." },
        { status: 403 }
      ),
    };
  }

  // 3. Verify Authenticator Assurance Level (AAL2 is mandatory for Super Admin)
  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  const currentLevel = aalData?.currentLevel;

  if (aalError || currentLevel !== "aal2") {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "Super Administrator Multi-Factor Authentication (AAL2) required.",
          code: "MFA_REQUIRED",
          currentLevel: currentLevel || "aal1",
        },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user,
  };
}
