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

    const { liveClassId, scheduledStart, scheduledEnd } = await request.json();

    if (!liveClassId || !scheduledStart) {
      return NextResponse.json(
        { error: "Missing required parameters: liveClassId and scheduledStart are mandatory." },
        { status: 400 }
      );
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
        { error: "Forbidden: You are not authorized to reschedule this Live Class." },
        { status: 403 }
      );
    }

    // 3. Status Guard: ONLY SCHEDULED classes can be rescheduled
    if (liveClass.live_status !== "SCHEDULED") {
      return NextResponse.json(
        {
          error: `Cannot reschedule: This Live Class is currently in "${liveClass.live_status}" status. Only scheduled sessions that have not started can be rescheduled.`,
        },
        { status: 400 }
      );
    }

    // 4. Validate Start Time is in the future
    const startTimestamp = new Date(scheduledStart).getTime();
    if (isNaN(startTimestamp)) {
      return NextResponse.json({ error: "Invalid scheduled start timestamp format." }, { status: 400 });
    }

    const nowMs = Date.now();
    if (startTimestamp <= nowMs) {
      return NextResponse.json(
        { error: "Reschedule time must be in the future." },
        { status: 400 }
      );
    }

    const endTimestamp = scheduledEnd
      ? new Date(scheduledEnd).getTime()
      : startTimestamp + 60 * 60 * 1000;

    if (endTimestamp <= startTimestamp) {
      return NextResponse.json({ error: "Scheduled end time must be after scheduled start time." }, { status: 400 });
    }

    // 5. Server-side Overlap Protection
    const effectiveTeacherId = liveClass.educator_id || liveClass.created_by || user.id;
    const { data: existingClasses, error: overlapErr } = await supabase
      .from("cms_live_classes")
      .select("id, topic, scheduled_start, scheduled_end")
      .or(`educator_id.eq.${effectiveTeacherId},created_by.eq.${effectiveTeacherId}`)
      .neq("id", liveClassId)
      .in("live_status", ["SCHEDULED", "LIVE"])
      .neq("status", "ARCHIVED");

    if (overlapErr) {
      return NextResponse.json({ error: "Failed to verify schedule conflicts." }, { status: 500 });
    }

    if (existingClasses && existingClasses.length > 0) {
      for (const ec of existingClasses) {
        const ecStart = new Date(ec.scheduled_start).getTime();
        const ecEnd = ec.scheduled_end ? new Date(ec.scheduled_end).getTime() : ecStart + 60 * 60 * 1000;

        if (startTimestamp < ecEnd && endTimestamp > ecStart) {
          const conflictStartFormatted = new Date(ec.scheduled_start).toLocaleString();
          const conflictEndFormatted = new Date(ecEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return NextResponse.json(
            {
              error: `Schedule Conflict: You already have another Live Class ("${ec.topic}") scheduled during this window (${conflictStartFormatted} – ${conflictEndFormatted}).`,
            },
            { status: 409 }
          );
        }
      }
    }

    // 6. Format human time display
    const formattedTimeDisplay = `${new Date(startTimestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })} • ${new Date(startTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const nowIso = new Date().toISOString();

    // 7. Update Live Class Record
    const { data: updatedClass, error: updateErr } = await supabase
      .from("cms_live_classes")
      .update({
        scheduled_start: new Date(startTimestamp).toISOString(),
        scheduled_end: new Date(endTimestamp).toISOString(),
        time_display: formattedTimeDisplay,
        updated_at: nowIso,
      })
      .eq("id", liveClassId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Failed to reschedule live class." }, { status: 500 });
    }

    // 8. Dispatch notification to Super Admin
    await NotificationService.notifySuperAdminLiveClassRescheduled(supabase, {
      teacherId: user.id,
      teacherName: profile?.full_name || liveClass.educator_name || "Educator",
      liveClassId: updatedClass.id,
      title: updatedClass.topic,
      newStart: updatedClass.scheduled_start,
    });

    const { stream_key: _k, ...sanitizedResponse } = updatedClass;

    return NextResponse.json({
      success: true,
      message: `Live class rescheduled to ${formattedTimeDisplay}.`,
      liveClass: sanitizedResponse,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
