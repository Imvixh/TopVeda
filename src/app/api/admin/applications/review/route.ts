import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { EmailService } from "@/lib/email/email-service";

export async function POST(request: NextRequest) {
  try {
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
        setAll() {},
      },
    });

    // 1. Verify authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify Super Admin authorization
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can review applications." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { applicationId, decision, rejectionReason } = body;

    if (!applicationId || !decision || (decision !== "APPROVED" && decision !== "REJECTED")) {
      return NextResponse.json(
        { error: "Invalid request. Must specify applicationId and decision (APPROVED or REJECTED)." },
        { status: 400 }
      );
    }

    // 3. Execute atomic PostgreSQL RPC function
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "review_admin_application",
      {
        p_application_id: applicationId,
        p_decision: decision,
        p_rejection_reason: rejectionReason || null,
      }
    );

    if (rpcError || !rpcResult?.success) {
      return NextResponse.json(
        { error: rpcError?.message || "Failed to process application review." },
        { status: 400 }
      );
    }

    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let emailSent = false;
    let emailError: string | undefined;

    // 4. Decoupled Transactional Email Dispatch
    try {
      if (decision === "APPROVED") {
        const emailRes = await EmailService.sendApplicantApprovedEmail({
          applicantName: rpcResult.full_name,
          applicantEmail: rpcResult.email,
          loginUrl: `${origin}/admin`,
        });
        emailSent = emailRes.success;
        if (!emailRes.success) emailError = emailRes.error;
      } else if (decision === "REJECTED") {
        const emailRes = await EmailService.sendApplicantRejectedEmail({
          applicantName: rpcResult.full_name,
          applicantEmail: rpcResult.email,
          rejectionReason,
        });
        emailSent = emailRes.success;
        if (!emailRes.success) emailError = emailRes.error;
      }
    } catch (err: unknown) {
      emailError = err instanceof Error ? err.message : "Email delivery network exception";
      console.error("[Review API] Email delivery error (DB state unchanged):", emailError);
    }

    return NextResponse.json({
      success: true,
      status: decision,
      applicationId,
      applicantEmail: rpcResult.email,
      emailSent,
      emailError,
    });
  } catch (err: unknown) {
    console.error("[Review API] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
