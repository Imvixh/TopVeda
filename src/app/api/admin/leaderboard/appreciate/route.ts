import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only Super Administrators can send official appreciation awards." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentId, title, message, awardType } = body;

    if (!studentId || !title || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (studentId, title, message)." },
        { status: 400 }
      );
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    // Verify recipient student exists
    const { data: student, error: sErr } = await adminClient
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", studentId)
      .single();

    if (sErr || !student) {
      return NextResponse.json(
        { success: false, error: "Student not found." },
        { status: 404 }
      );
    }

    // Insert direct in-app appreciation notification
    const { data: notification, error: nErr } = await adminClient
      .from("cms_notifications")
      .insert({
        recipient_id: student.id,
        recipient_role: "STUDENT",
        sender_id: user.id,
        type: "LEADERBOARD_APPRECIATION",
        category: "ANNOUNCEMENTS",
        title: title.trim(),
        message: message.trim(),
        entity_type: "SYSTEM",
        metadata: {
          awardType: awardType || "LEADERBOARD_EXCELLENCE",
          awardedBy: profile.full_name || "Super Administration",
          senderId: user.id,
          sentAt: new Date().toISOString(),
        },
        is_read: false,
      })
      .select()
      .single();

    if (nErr) {
      return NextResponse.json(
        { success: false, error: nErr.message || "Failed to deliver appreciation notification." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notificationId: notification.id,
      recipientName: student.full_name,
      message: "Appreciation message successfully delivered to student inbox.",
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

