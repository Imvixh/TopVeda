import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { StreamingService } from "@/lib/services/streaming.service";
import { LiveInstanceManager } from "@/lib/services/live-instance.service";
import { YouTubeLiveService } from "@/lib/services/youtube-live.service";
import { ContentAccessService } from "@/lib/services/content-access.service";
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
    const liveClassId = searchParams.get("id") || searchParams.get("classId");

    if (!liveClassId) {
      return NextResponse.json({ error: "Missing id parameter." }, { status: 400 });
    }

    // 1. Authenticate user (caller context) - STRICT REJECTION IF UNAUTHENTICATED
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Authentication required to access live class session.",
          canJoin: false,
          playbackVideoId: null,
          embedPlaybackUrl: null,
        },
        { status: 401 }
      );
    }

    // 2. Fetch Live Class Details with safe projection under RLS
    const { data: liveClass, error: fetchErr } = await supabase
      .from("cms_live_classes")
      .select(`
        id,
        topic,
        subject,
        description,
        board_id,
        class_id,
        subject_id,
        course_id,
        batch_id,
        educator_name,
        educator_avatar_url,
        thumbnail_url,
        scheduled_start,
        scheduled_end,
        time_display,
        live_status,
        is_live,
        stream_provider,
        recording_status,
        termination_reason,
        terminated_by,
        educator_id,
        created_by,
        submitted_by,
        profiles:educator_id(full_name, email, avatar_url),
        creator_profile:created_by(full_name, email, avatar_url)
      `)
      .eq("id", liveClassId)
      .single();

    if (fetchErr || !liveClass) {
      return NextResponse.json({ error: "Live Class not found." }, { status: 404 });
    }

    let isOwnerTeacher = false;
    let isSuperAdmin = false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    if (profile?.role === "SUPER_ADMIN") {
      isSuperAdmin = true;
    }

    if (profile?.role === "ADMIN" || profile?.role === "SUPER_ADMIN") {
      isOwnerTeacher =
        liveClass.educator_id === user.id ||
        liveClass.created_by === user.id ||
        liveClass.submitted_by === user.id;

      if (!isOwnerTeacher && !isSuperAdmin && liveClass.batch_id) {
        const { data: isAssigned } = await supabase.rpc("is_batch_subject_teacher", {
          p_batch_id: liveClass.batch_id,
          p_subject_id: liveClass.subject_id || null,
        });
        if (isAssigned) {
          isOwnerTeacher = true;
        }
      }
    }

    // 3. Strict Enrollment / Access Control Gate for Student Callers
    if (!isSuperAdmin && !isOwnerTeacher) {
      const accessResult = await ContentAccessService.checkAccess(supabase, {
        userId: user.id,
        contentType: "LIVE_CLASS",
        contentId: liveClass.id,
        isTeacherOrAdmin: false,
      });

      if (!accessResult.granted) {
        return NextResponse.json(
          {
            id: liveClass.id,
            topic: liveClass.topic,
            subject: liveClass.subject,
            educatorName: liveClass.educator_name,
            liveStatus: liveClass.live_status,
            canJoin: false,
            isLive: false,
            playbackVideoId: null,
            embedPlaybackUrl: null,
            access: accessResult,
            error: accessResult.reason || "Active enrollment required to access this live classroom.",
          },
          { status: 403 }
        );
      }
    }

    // 4. Handle TERMINATED state: sever all access
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

    // 5. Handle COMPLETED state: Resolve recording ONLY from linked published cms_lectures
    if (liveClass.live_status === "COMPLETED") {
      const { data: linkedLecture } = await supabase
        .from("cms_lectures")
        .select("video_playback_url, video_url")
        .eq("original_live_class_id", liveClassId)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .maybeSingle();

      const resolvedRecordingUrl = linkedLecture?.video_playback_url || linkedLecture?.video_url || null;

      return NextResponse.json({
        id: liveClass.id,
        topic: liveClass.topic,
        subject: liveClass.subject,
        educatorName: liveClass.educator_name,
        liveStatus: "COMPLETED",
        canJoin: false,
        isCompleted: true,
        recordingUrl: resolvedRecordingUrl,
        recordingStatus: liveClass.recording_status || (resolvedRecordingUrl ? "READY" : "PROCESSING"),
        message: resolvedRecordingUrl
          ? "This live class has concluded. Recording is available."
          : "This live class has concluded. Recording will be available once published by administration.",
      });
    }

    const nowMs = Date.now();
    const scheduledStartMs = new Date(liveClass.scheduled_start).getTime();
    const earlyAccessWindowMs = 10 * 60 * 1000; // 10 minutes

    // 6. Fetch private fields strictly server-side using admin client when needed for broadcast operations
    let providerSessionId: string | null = null;
    let currentInstanceId: string | null = null;

    const isRealYt = liveClass.stream_provider === "youtube";
    let activeLiveBroadcastId: string | null = null;
    let isBroadcastConfirmedLive = false;

    if (isRealYt && nowMs >= scheduledStartMs - earlyAccessWindowMs) {
      try {
        const privilegedServerClient = createAdminClient();
        const { data: privRow } = await privilegedServerClient
          .from("cms_live_classes")
          .select("provider_session_id, current_live_instance_id")
          .eq("id", liveClassId)
          .single();

        providerSessionId = privRow?.provider_session_id || null;
        currentInstanceId = privRow?.current_live_instance_id || null;

        const matchedBroadcast = await YouTubeLiveService.matchActiveBroadcast({
          topic: liveClass.topic,
          scheduledStart: liveClass.scheduled_start,
          currentBroadcastId: providerSessionId || undefined,
          client: privilegedServerClient,
        });

        if (matchedBroadcast) {
          activeLiveBroadcastId = matchedBroadcast.id;
          isBroadcastConfirmedLive = true;

          // If the matched active broadcast is new or different, perform atomic instance transition
          if (!currentInstanceId || matchedBroadcast.id !== providerSessionId) {
            const isInitial = !currentInstanceId;
            const transition = await LiveInstanceManager.transitionToNewInstance({
              liveClassId: liveClass.id,
              newBroadcastId: matchedBroadcast.id,
              newVideoId: matchedBroadcast.id,
              lifecycleStatus: matchedBroadcast.status?.lifeCycleStatus || "live",
              teacherId: liveClass.educator_id || user.id || null,
              transitionReason: isInitial ? "INITIAL_CREATE" : "TEACHER_RECONNECT",
              client: privilegedServerClient,
            });

            currentInstanceId = transition.instanceId;
            providerSessionId = transition.videoId;
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

    // 7. Access Rule Validation:
    // Teacher Early Access (scheduled_start - 10m): strictly for Teacher / Admin setup
    // Student Access: strictly blocked until now >= scheduled_start
    const isTeacherInPreparationWindow =
      (isOwnerTeacher || isSuperAdmin) &&
      nowMs >= scheduledStartMs - earlyAccessWindowMs &&
      nowMs < scheduledStartMs;

    const isStudentWindowOpen = nowMs >= scheduledStartMs;
    const isLiveActive = liveClass.live_status === "LIVE" || liveClass.is_live || isBroadcastConfirmedLive;

    // For YouTube streams:
    // Student receives live playback ONLY when now >= scheduled_start AND a YouTube broadcast is CONFIRMED ACTIVELY LIVE
    // For non-YouTube streams: student is allowed when scheduled window is open and class is live.
    const isEffectiveStudentLive = isRealYt
      ? (isStudentWindowOpen && isBroadcastConfirmedLive)
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
          sessionId: providerSessionId || `live_${liveClass.id}`,
          liveClassId: liveClass.id,
          userId: user.id,
          userName: liveClass.educator_name,
          userRole: isSuperAdmin ? "SUPER_ADMIN" : "ADMIN",
        });
      }
    } else {
      // Student path: allowed strictly when scheduled start is reached and live broadcast is confirmed active
      if (isStudentAllowed) {
        canJoin = true;
        accessMode = "STUDENT_JOIN";
        joinUrl = await StreamingService.getJoinUrl({
          sessionId: activeLiveBroadcastId || providerSessionId || `live_${liveClass.id}`,
          liveClassId: liveClass.id,
          userId: user.id,
          userName: profile?.full_name || "Student",
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
        : isEffectiveStudentLive;

    // Resolved playback ID:
    // For students: ONLY when now >= scheduledStartMs AND actively confirmed live broadcast ID exists.
    // For teachers/admins: actively confirmed live broadcast ID, or current provider_session_id for setup preview.
    const resolvedPlaybackId = (isOwnerTeacher || isSuperAdmin)
      ? (isBroadcastConfirmedLive ? activeLiveBroadcastId : providerSessionId)
      : (isStudentWindowOpen && isBroadcastConfirmedLive ? activeLiveBroadcastId : null);

    const embedPlaybackUrl = resolvedPlaybackId
      ? `https://www.youtube-nocookie.com/embed/${resolvedPlaybackId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`
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

    // 8. Calculate Active TopVeda Live Student Viewer Count from student_live_attendance
    let activeViewerCount = 0;
    try {
      const ninetySecondsAgo = new Date(Date.now() - 90 * 1000).toISOString();
      const { count } = await supabase
        .from("student_live_attendance")
        .select("id", { count: "exact", head: true })
        .eq("live_class_id", liveClass.id)
        .gte("last_heartbeat_at", ninetySecondsAgo);
      activeViewerCount = count || 0;
    } catch {
      // non-blocking
    }

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
      currentInstanceId: (isOwnerTeacher || isSuperAdmin) ? currentInstanceId : null,
      isLive: isEffectiveLive,
      canJoin,
      accessMode,
      joinUrl,
      playbackVideoId: resolvedPlaybackId,
      embedPlaybackUrl,
      studioPublishUrl,
      activeViewerCount,
      isTeacher: isOwnerTeacher || isSuperAdmin,
      isPreparationWindow: (isOwnerTeacher || isSuperAdmin) ? isTeacherInPreparationWindow : isStudentInPreparation,
      secondsToStart: Math.max(0, Math.floor((scheduledStartMs - nowMs) / 1000)),
      secondsToTeacherEarlyAccess: Math.max(0, Math.floor((scheduledStartMs - earlyAccessWindowMs - nowMs) / 1000)),
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

