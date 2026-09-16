import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { validateAndNormalizePhone } from "@/lib/validation/auth";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "";

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Authentication service not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Please enter your mobile number and password." },
        { status: 400 }
      );
    }

    const phoneVal = validateAndNormalizePhone(phone);
    if (!phoneVal.isValid || !phoneVal.normalizedValue) {
      return NextResponse.json(
        { error: phoneVal.error || "Please enter a valid 10-digit Indian mobile number." },
        { status: 400 }
      );
    }

    const normalizedPhone = phoneVal.normalizedValue;

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    });

    // 1. Securely resolve phone to registered email via Security Definer RPC
    const { data: resolvedEmail, error: rpcError } = await supabase.rpc(
      "get_auth_email_by_phone",
      { p_phone: normalizedPhone }
    );

    if (rpcError || !resolvedEmail) {
      return NextResponse.json(
        { error: "Invalid mobile number or password. Please try again." },
        { status: 401 }
      );
    }

    // 2. Authenticate with Supabase Auth using the resolved account identity
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (authError || !authData?.session) {
      if (authError?.message?.toLowerCase().includes("email not confirmed")) {
        return NextResponse.json(
          { error: "Please verify your email before logging in. Check your inbox." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Invalid mobile number or password. Please try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: authData.session,
    });
  } catch (err: unknown) {
    console.error("[Phone Login API] Error:", err);
    return NextResponse.json(
      { error: "An unexpected authentication error occurred. Please try again." },
      { status: 500 }
    );
  }
}
