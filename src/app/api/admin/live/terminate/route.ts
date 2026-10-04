import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StreamingService } from "@/lib/services/streaming.service";
import { NotificationService } from "@/lib/services/notification.service";
import { requireSuperAdminAAL2 } from "@/lib/supabase/auth-helpers";

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

    // Authorize Super Admin with mandatory AAL2 MFA verification
    const authResult = await requireSuperAdminAAL2(supabase);
    if (!authResult.authorized || !authResult.user) {
      return authResult.errorResponse!;
    }
    const user = authResult.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const { liveClassId, terminationReason } = await request.json();

    if (!liveClassId) {
      return NextResponse.json({ error: "Missing liveClassId parameter." }, { status: 400 });
    }

    if (!terminationReason || terminationReason.trim().length < 5) {
      return NextResponse.json(
        { error: "A valid termination reason (minimum 5 characters) is mandatory for admin audit logs." },
        { status: 400 }
      );
    }

    // 3. Fetch Live Class with safe projection
    const { data: liveClass, error: fetchErr } = await supabase
      .from("cms_live_classes")
      .select(`
        id,
        topic,
        subject,
        educator_name,
        live_status,
        is_live,
        educator_id,
        created_by,
        submitted_by
      `)
      .eq("id", liveClassId)
      .single();

    if (fetchErr || !liveClass) {
      return NextResponse.json({ error: "Live Class not found." }, { status: 404 });
    }

    // Fetch private provider session id via admin client
    const { createAdminClient } = await import("@/lib/supabase/server");
    const adminClient = createAdminClient();
    const { data: privRow } = await adminClient
      .from("cms_live_classes")
      .select("provider_session_id")
      .eq("id", liveClassId)
      .single();

    // 4. Sever session at provider level
    if (privRow?.provider_session_id) {
      await StreamingService.terminateLiveSession(
        privRow.provider_session_id,
        terminationReason.trim()
      );
    }

    const nowIso = new Date().toISOString();

    // 5. Update Database Record to TERMINATED with Audit Logs and safe column projection
    const { data: terminatedClass, error: updateErr } = await supabase
      .from("cms_live_classes")
      .update({
        live_status: "TERMINATED",
        is_live: false,
        status_text: "TERMINATED",
        cta_text: "Terminated",
        terminated_at: nowIso,
        terminated_by: user.id,
        termination_reason: terminationReason.trim(),
        updated_at: nowIso,
      })
      .eq("id", liveClassId)
      .select(`
        id,
        topic,
        subject,
        educator_name,
        live_status,
        is_live,
        status_text,
        cta_text,
        terminated_at,
        terminated_by,
        termination_reason,
        updated_at
      `)
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Failed to terminate live class." }, { status: 500 });
    }

    // 6. Dispatch high-priority notification to Teacher
    const teacherId = liveClass.educator_id || liveClass.created_by;
    if (teacherId) {
      await NotificationService.notifyTeacherLiveClassTerminated(supabase, {
        teacherId,
        liveClassId: liveClass.id,
        title: liveClass.topic,
        terminationReason: terminationReason.trim(),
        adminName: profile?.full_name || "Super Administrator",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Live class session has been terminated and access severed.",
      liveClass: terminatedClass,
      auditLog: {
        terminatedBy: profile?.full_name || "Super Admin",
        terminatedAt: nowIso,
        reason: terminationReason.trim(),
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
