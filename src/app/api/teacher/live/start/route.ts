import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StreamingService } from "@/lib/services/streaming.service";
import { getTMinus10TimeIST } from "@/lib/utils/timezone";

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

    const { liveClassId } = await request.json();

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
      .select("role")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.role === "SUPER_ADMIN";
    const isOwnerTeacher =
      liveClass.educator_id === user.id ||
      liveClass.created_by === user.id ||
      liveClass.submitted_by === user.id;

    if (!isSuperAdmin && !isOwnerTeacher) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to start this Live Class session." },
        { status: 403 }
      );
    }

    if (liveClass.live_status === "TERMINATED") {
      return NextResponse.json(
        { error: `This Live Class was terminated by Super Admin (Reason: ${liveClass.termination_reason || "Admin intervention"}). It cannot be restarted.` },
        { status: 400 }
      );
    }

    if (liveClass.live_status === "COMPLETED") {
      return NextResponse.json(
        { error: "This Live Class has already concluded." },
        { status: 400 }
      );
    }

    // 3. Teacher Early Access Window Rule Enforcement (Server-Side)
    // The Teacher may access/start the live session beginning exactly 10 minutes before scheduled_start.
    const nowMs = Date.now();
    const scheduledStartMs = new Date(liveClass.scheduled_start).getTime();
    const earlyAccessWindowMs = 10 * 60 * 1000; // 10 minutes

    if (!isSuperAdmin && nowMs < scheduledStartMs - earlyAccessWindowMs) {
      const minutesRemaining = Math.ceil((scheduledStartMs - earlyAccessWindowMs - nowMs) / 60000);
      const accessTime = getTMinus10TimeIST(liveClass.scheduled_start);

      return NextResponse.json(
        {
          error: `Teacher Early Access Window not yet open. You may enter the live preparation room at ${accessTime} (10 minutes prior to scheduled start). Please check back in ${minutesRemaining} minute${minutesRemaining > 1 ? "s" : ""}.`,
        },
        { status: 403 }
      );
    }

    // 4. Start provider session
    if (liveClass.provider_session_id) {
      await StreamingService.startLiveSession(liveClass.provider_session_id);
    }

    // 5. Update Database State to LIVE
    const nowIso = new Date().toISOString();
    const { data: updatedClass, error: updateErr } = await supabase
      .from("cms_live_classes")
      .update({
        live_status: "LIVE",
        is_live: true,
        status_text: "LIVE",
        cta_text: "Join Class",
        started_at: liveClass.started_at || nowIso,
        updated_at: nowIso,
      })
      .eq("id", liveClassId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Failed to activate live class." }, { status: 500 });
    }

    const broadcastId = updatedClass.provider_session_id;
    const isRealYt = broadcastId && !broadcastId.startsWith("dev_yt_");
    const studioPublishUrl = isRealYt ? "https://www.youtube.com/webcam" : null;
    const resolvedStreamRoomUrl = updatedClass.stream_room_url || studioPublishUrl || `/student/live/${updatedClass.id}`;

    const { stream_key: _internalKey, ...sanitizedClass } = updatedClass;

    return NextResponse.json({
      success: true,
      message: "Live Class session started successfully.",
      liveClass: sanitizedClass,
      streamRoomUrl: resolvedStreamRoomUrl,
      studioPublishUrl,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
