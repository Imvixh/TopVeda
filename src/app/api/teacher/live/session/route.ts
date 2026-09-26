import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StreamingService } from "@/lib/services/streaming.service";
import { formatLiveTimeDisplay } from "@/lib/utils/timezone";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const liveClassId = searchParams.get("id");

    if (!liveClassId) {
      return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
    }

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Fetch Live Class Details
    const { data: liveClass, error: fetchErr } = await supabase
      .from("cms_live_classes")
      .select("*, profiles:educator_id(full_name, email, avatar_url)")
      .eq("id", liveClassId)
      .single();

    if (fetchErr || !liveClass) {
      return NextResponse.json({ error: "Live Class not found." }, { status: 404 });
    }

    let userRole: "SUPER_ADMIN" | "ADMIN" | "STUDENT" = "STUDENT";
    let isOwnerTeacher = false;
    let isSuperAdmin = false;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "SUPER_ADMIN") {
        userRole = "SUPER_ADMIN";
        isSuperAdmin = true;
      } else if (profile?.role === "ADMIN") {
        userRole = "ADMIN";
      }

      isOwnerTeacher =
        liveClass.educator_id === user.id ||
        liveClass.created_by === user.id ||
        liveClass.submitted_by === user.id;
    }

    const nowMs = Date.now();
    const scheduledStartMs = new Date(liveClass.scheduled_start).getTime();
    const scheduledEndMs = liveClass.scheduled_end
      ? new Date(liveClass.scheduled_end).getTime()
      : scheduledStartMs + 60 * 60 * 1000;
    const earlyAccessWindowMs = 10 * 60 * 1000; // 10 minutes

    // 3. Handle TERMINATED state: sever all access
    if (liveClass.live_status === "TERMINATED") {
      return NextResponse.json({
        id: liveClass.id,
        topic: liveClass.topic,
        subject: liveClass.subject,
        educatorName: liveClass.educator_name,
        liveStatus: "TERMINATED",
        canJoin: false,
        isTerminated: true,
        terminationReason: liveClass.termination_reason || "Session was terminated by administration.",
        message: "This live class session was terminated by Super Admin. Access has ended.",
      });
    }

    // 4. Handle COMPLETED state
    if (liveClass.live_status === "COMPLETED") {
      return NextResponse.json({
        id: liveClass.id,
        topic: liveClass.topic,
        subject: liveClass.subject,
        educatorName: liveClass.educator_name,
        liveStatus: "COMPLETED",
        canJoin: false,
        isCompleted: true,
        recordingUrl: liveClass.recording_url,
        recordingStatus: liveClass.recording_status,
        message: "This live class has concluded. Recording will be available once processed.",
      });
    }

    // 5. Access Rule Validation:
    // Teacher Early Access (scheduled_start - 10m): strictly for Teacher / Admin setup
    // Student Access: strictly blocked until now >= scheduled_start
    const isTeacherInPreparationWindow =
      (isOwnerTeacher || isSuperAdmin) &&
      nowMs >= scheduledStartMs - earlyAccessWindowMs &&
      nowMs < scheduledStartMs;

    const isStudentWindowOpen = nowMs >= scheduledStartMs;
    const isLiveActive = liveClass.live_status === "LIVE" || liveClass.is_live;
    const isStudentAllowed = !isOwnerTeacher && !isSuperAdmin && isStudentWindowOpen && isLiveActive;

    let canJoin = false;
    let accessMode: "TEACHER_PREPARATION" | "LIVE_BROADCAST" | "STUDENT_JOIN" | "WAITING_ROOM" = "WAITING_ROOM";
    let joinUrl: string | null = null;

    if (isSuperAdmin || isOwnerTeacher) {
      if (nowMs >= scheduledStartMs - earlyAccessWindowMs) {
        canJoin = true;
        accessMode = nowMs < scheduledStartMs ? "TEACHER_PREPARATION" : "LIVE_BROADCAST";
        joinUrl = await StreamingService.getJoinUrl({
          sessionId: liveClass.provider_session_id || `live_${liveClass.id}`,
          liveClassId: liveClass.id,
          userId: user?.id || "admin",
          userName: liveClass.educator_name,
          userRole: isSuperAdmin ? "SUPER_ADMIN" : "ADMIN",
        });
      }
    } else {
      // Student path: strictly blocked before scheduled_start
      if (isStudentAllowed) {
        canJoin = true;
        accessMode = "STUDENT_JOIN";
        joinUrl = await StreamingService.getJoinUrl({
          sessionId: liveClass.provider_session_id || `live_${liveClass.id}`,
          liveClassId: liveClass.id,
          userId: user?.id || "guest_student",
          userName: "Student",
          userRole: "STUDENT",
        });
      }
    }

    const isStudentInPreparation =
      !isOwnerTeacher &&
      !isSuperAdmin &&
      nowMs >= scheduledStartMs - earlyAccessWindowMs &&
      nowMs < scheduledStartMs;

    const isEffectiveLive =
      isOwnerTeacher || isSuperAdmin
        ? isLiveActive
        : isStudentAllowed;

    const playbackVideoId = liveClass.provider_session_id || null;
    const embedPlaybackUrl = playbackVideoId
      ? `https://www.youtube-nocookie.com/embed/${playbackVideoId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
      : null;

    const studioPublishUrl = isOwnerTeacher || isSuperAdmin
      ? playbackVideoId ? `https://studio.youtube.com/video/${playbackVideoId}/livestreaming` : null
      : null;

    const profileData = liveClass.profiles as { full_name?: string; email?: string; avatar_url?: string } | null;
    const resolvedEducatorName = profileData?.full_name || liveClass.educator_name || "Educator";
    const resolvedEducatorAvatar = profileData?.avatar_url || liveClass.educator_avatar_url || null;

    return NextResponse.json({
      id: liveClass.id,
      topic: liveClass.topic,
      subject: liveClass.subject,
      description: liveClass.description,
      educatorName: resolvedEducatorName,
      educatorAvatarUrl: resolvedEducatorAvatar,
      scheduledStart: liveClass.scheduled_start,
      scheduledEnd: liveClass.scheduled_end,
      timeDisplay: liveClass.scheduled_start ? formatLiveTimeDisplay(liveClass.scheduled_start, liveClass.scheduled_end) : liveClass.time_display,
      liveStatus: liveClass.live_status,
      streamProvider: liveClass.stream_provider,
      isLive: isEffectiveLive,
      canJoin,
      accessMode,
      joinUrl,
      playbackVideoId,
      embedPlaybackUrl,
      studioPublishUrl,
      isTeacher: isOwnerTeacher || isSuperAdmin,
      isPreparationWindow: isOwnerTeacher || isSuperAdmin ? isTeacherInPreparationWindow : isStudentInPreparation,
      secondsToStart: Math.max(0, Math.floor((scheduledStartMs - nowMs) / 1000)),
      secondsToTeacherEarlyAccess: Math.max(0, Math.floor((scheduledStartMs - earlyAccessWindowMs - nowMs) / 1000)),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
