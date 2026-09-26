import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StreamingService } from "@/lib/services/streaming.service";
import { YouTubeLiveService } from "@/lib/services/youtube-live.service";
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
      .select("*, profiles:educator_id(full_name, email, avatar_url), creator_profile:created_by(full_name, email, avatar_url)")
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

    // 5. Active YouTube Webcam Broadcast Discovery & Auto-Sync
    const isRealYt =
      liveClass.stream_provider === "youtube" &&
      liveClass.live_status !== "TERMINATED" &&
      liveClass.live_status !== "COMPLETED";

    let activeLiveBroadcastId: string | null = null;
    let isBroadcastConfirmedLive = false;

    if (isRealYt && nowMs >= scheduledStartMs - earlyAccessWindowMs) {
      try {
        const matchedBroadcast = await YouTubeLiveService.matchActiveBroadcast({
          topic: liveClass.topic,
          scheduledStart: liveClass.scheduled_start,
          currentBroadcastId: liveClass.provider_session_id,
          client: supabase,
        });

        if (matchedBroadcast) {
          activeLiveBroadcastId = matchedBroadcast.id;
          isBroadcastConfirmedLive = true;

          // If the matched active broadcast ID is different from current provider_session_id, safely update DB
          if (matchedBroadcast.id !== liveClass.provider_session_id) {
            await supabase
              .from("cms_live_classes")
              .update({
                provider_session_id: matchedBroadcast.id,
                live_status: "LIVE",
                is_live: true,
                status_text: "LIVE",
                cta_text: "Join Class",
                updated_at: new Date().toISOString(),
              })
              .eq("id", liveClass.id);

            liveClass.provider_session_id = matchedBroadcast.id;
            liveClass.live_status = "LIVE";
            liveClass.is_live = true;
          }
        }
      } catch (err) {
        console.warn(
          "[LiveSession] YouTube active broadcast auto-sync warning:",
          err instanceof Error ? err.message : String(err)
        );
      }
    }

    // 6. Access Rule Validation:
    // Teacher Early Access (scheduled_start - 10m): strictly for Teacher / Admin setup
    // Student Access: strictly blocked until now >= scheduled_start
    const isTeacherInPreparationWindow =
      (isOwnerTeacher || isSuperAdmin) &&
      nowMs >= scheduledStartMs - earlyAccessWindowMs &&
      nowMs < scheduledStartMs;

    const isStudentWindowOpen = nowMs >= scheduledStartMs;
    const isLiveActive = liveClass.live_status === "LIVE" || liveClass.is_live || isBroadcastConfirmedLive;

    // For YouTube streams, student receives live state only when window is open AND broadcast is actively live
    const isEffectiveStudentLive = isRealYt
      ? (isStudentWindowOpen && (isBroadcastConfirmedLive || liveClass.live_status === "LIVE"))
      : (isStudentWindowOpen && isLiveActive);

    const isStudentAllowed = !isOwnerTeacher && !isSuperAdmin && isEffectiveStudentLive;

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

    const resolvedPlaybackId = isBroadcastConfirmedLive
      ? activeLiveBroadcastId
      : (isOwnerTeacher || isSuperAdmin ? liveClass.provider_session_id : (isEffectiveStudentLive ? liveClass.provider_session_id : null));

    const embedPlaybackUrl = resolvedPlaybackId
      ? `https://www.youtube-nocookie.com/embed/${resolvedPlaybackId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
      : null;

    const studioPublishUrl = isOwnerTeacher || isSuperAdmin
      ? "https://www.youtube.com/webcam"
      : null;

    const formatAvatarUrl = (urlOrPath?: string | null): string | null => {
      if (!urlOrPath || urlOrPath === "undefined" || urlOrPath === "null") return null;
      const clean = urlOrPath.trim();
      if (!clean || clean.startsWith("/avatars/default_teacher.jpg")) return null;
      if (clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/")) {
        return clean;
      }
      const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      if (sUrl) {
        const normalizedPath = clean.startsWith("avatars/") ? clean.replace(/^avatars\//, "") : clean;
        return `${sUrl}/storage/v1/object/public/avatars/${normalizedPath}`;
      }
      return clean;
    };

    const profileData = (liveClass.profiles || liveClass.creator_profile) as { full_name?: string; email?: string; avatar_url?: string } | null;
    const resolvedEducatorName = profileData?.full_name || liveClass.educator_name || "Educator";
    const rawAvatar = profileData?.avatar_url || liveClass.educator_avatar_url || liveClass.thumbnail_url || null;
    const resolvedEducatorAvatar = formatAvatarUrl(rawAvatar);

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
      liveStatus: isBroadcastConfirmedLive ? "LIVE" : liveClass.live_status,
      streamProvider: liveClass.stream_provider,
      isLive: isEffectiveLive,
      canJoin,
      accessMode,
      joinUrl,
      playbackVideoId: resolvedPlaybackId,
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

