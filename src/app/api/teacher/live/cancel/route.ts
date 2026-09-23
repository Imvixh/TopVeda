import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { NotificationService } from "@/lib/services/notification.service";

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

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { liveClassId, reason } = await request.json();

    if (!liveClassId) {
      return NextResponse.json({ error: "Missing liveClassId parameter." }, { status: 400 });
    }

    // 2. Fetch Live Class & Check Ownership / Authorization
    const { data: liveClass, error: fetchErr } = await supabase
      .from("cms_live_classes")
      .select("*")
      .eq("id", liveClassId)
      .single();

    if (fetchErr || !liveClass) {
      return NextResponse.json({ error: "Live Class not found." }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.role === "SUPER_ADMIN";
    const isOwnerTeacher =
      liveClass.educator_id === user.id ||
      liveClass.created_by === user.id ||
      liveClass.submitted_by === user.id;

    if (!isSuperAdmin && !isOwnerTeacher) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to cancel this Live Class." },
        { status: 403 }
      );
    }

    // 3. Status Guard: ONLY SCHEDULED classes can be cancelled
    if (liveClass.live_status !== "SCHEDULED") {
      return NextResponse.json(
        {
          error: `Cannot cancel: Live Class is in "${liveClass.live_status}" status. Only scheduled sessions can be cancelled.`,
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // 4. Update status to CANCELLED (non-destructive lifecycle transition)
    const { data: cancelledClass, error: updateErr } = await supabase
      .from("cms_live_classes")
      .update({
        live_status: "CANCELLED",
        status_text: "CANCELLED",
        is_live: false,
        is_visible: false,
        updated_at: nowIso,
      })
      .eq("id", liveClassId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Failed to cancel live class." }, { status: 500 });
    }

    // 5. Dispatch notification to Super Admin
    await NotificationService.notifySuperAdminLiveClassCancelled(supabase, {
      teacherId: user.id,
      teacherName: profile?.full_name || liveClass.educator_name || "Educator",
      liveClassId: liveClass.id,
      title: liveClass.topic,
      scheduledStart: liveClass.scheduled_start,
      reason: reason?.trim() || undefined,
    });

    const { stream_key: _k, ...sanitizedResponse } = cancelledClass;

    return NextResponse.json({
      success: true,
      message: "Live class has been cancelled successfully.",
      liveClass: sanitizedResponse,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
