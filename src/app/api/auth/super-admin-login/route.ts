import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SystemStateService } from "@/lib/services/system-state.service";
import { validateEmail } from "@/lib/validation/auth";
import { validateTurnstileToken } from "@/lib/utils/security";

export async function POST(request: NextRequest) {
  const response = NextResponse.next();

  try {
    const body = await request.json();
    const { email, password, turnstileToken } = body;

    // 1. Mandatory Server-Side Cloudflare Turnstile Verification
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const turnstileResult = await validateTurnstileToken(turnstileToken, clientIp);
    if (!turnstileResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: turnstileResult.error || "Turnstile security verification failed. Please try again.",
        },
        { status: 400 }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email.trim());
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error || "Invalid email address format." },
        { status: 400 }
      );
    }

    const normalizedEmail = emailValidation.normalizedValue!;

    // 2. CHECK DURATION & LOCKOUT STATE (3 failed attempts = 1 hour lock)
    const lockout = await SystemStateService.getLockoutState(normalizedEmail);
    if (lockout.isLocked) {
      const remainingMinutes = Math.max(1, Math.ceil(lockout.remainingLockMs / (60 * 1000)));
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          error: `Super Admin account is temporarily locked due to 3 consecutive failed attempts. Please try again in ${remainingMinutes} minute(s).`,
        },
        { status: 423 }
      );
    }

    // 2. Initialize Supabase Server Client with Cookie Handlers
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // 3. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      // Record failed attempt
      const attemptResult = await SystemStateService.recordFailedAttempt(normalizedEmail);

      if (attemptResult.isLocked) {
        return NextResponse.json(
          {
            success: false,
            isLocked: true,
            error: "Account locked for 1 hour due to 3 consecutive failed login attempts.",
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Invalid credentials. ${attemptResult.remainingAttempts} attempt(s) remaining before a 1-hour account lockout.`,
        },
        { status: 401 }
      );
    }

    // 4. Verify Server-Side Role (Must be SUPER_ADMIN)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name, email")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile || profile.role !== "SUPER_ADMIN") {
      // Revoke session if user is not SUPER_ADMIN
      await supabase.auth.signOut();

      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized. Super Administrator privileges required.",
        },
        { status: 403 }
      );
    }

    // 5. Successful Super Admin Authentication -> Clear Lockout State
    await SystemStateService.clearLockout(normalizedEmail);

    // 6. Inspect Supabase MFA Factors & Assurance Level
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedFactors = factorsData?.totp?.filter((f) => f.status === "verified") || [];
    const hasVerifiedFactor = verifiedFactors.length > 0;
    const factorId = hasVerifiedFactor ? verifiedFactors[0].id : null;

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const currentLevel = aalData?.currentLevel || "aal1";
    const nextLevel = aalData?.nextLevel || (hasVerifiedFactor ? "aal2" : "aal1");

    const jsonRes = NextResponse.json({
      success: true,
      mfaRequired: true,
      hasVerifiedFactor,
      factorId,
      currentLevel,
      nextLevel,
      session: authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role: profile.role,
        fullName: profile.full_name,
      },
    });

    // Copy auth cookies to JSON response
    response.cookies.getAll().forEach((c) => {
      jsonRes.cookies.set(c.name, c.value);
    });

    return jsonRes;
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected authentication error occurred." },
      { status: 500 }
    );
  }
}
