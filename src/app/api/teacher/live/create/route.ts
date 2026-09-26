import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StreamingService } from "@/lib/services/streaming.service";
import { NotificationService } from "@/lib/services/notification.service";
import { CreateLiveClassDTO } from "@/types/teacher.types";
import {
  formatLiveTimeDisplay,
  formatLiveDateIST,
  formatLiveTimeIST,
} from "@/lib/utils/timezone";

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

    // 2. Authorize Admin / Educator or Super Admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, avatar_url")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden: Only verified educators and administrators can create Live Classes." },
        { status: 403 }
      );
    }

    const body: CreateLiveClassDTO = await request.json();
    const {
      subject,
      topic,
      description,
      scheduledStart,
      scheduledEnd,
      timeDisplay,
      boardId,
      classId,
      subjectId,
      courseId,
      chapterId,
      batchId,
      thumbnailUrl,
    } = body;

    // 3. Validate mandatory metadata
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Live Class topic / lecture title is required." }, { status: 400 });
    }
    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (!scheduledStart) {
      return NextResponse.json({ error: "Scheduled start date and time are required." }, { status: 400 });
    }

    const startTimestamp = new Date(scheduledStart).getTime();
    if (isNaN(startTimestamp)) {
      return NextResponse.json({ error: "Invalid scheduled start timestamp format." }, { status: 400 });
    }

    const endTimestamp = scheduledEnd ? new Date(scheduledEnd).getTime() : startTimestamp + 60 * 60 * 1000;
    if (endTimestamp <= startTimestamp) {
      return NextResponse.json({ error: "Scheduled end time must be after scheduled start time." }, { status: 400 });
    }

    // 4. Server-side overlap rule enforcement
    // A teacher cannot have overlapping live classes.
    const { data: existingClasses, error: overlapCheckErr } = await supabase
      .from("cms_live_classes")
      .select("id, topic, scheduled_start, scheduled_end")
      .or(`educator_id.eq.${user.id},created_by.eq.${user.id}`)
      .in("live_status", ["SCHEDULED", "LIVE"])
      .neq("status", "ARCHIVED");

    if (overlapCheckErr) {
      return NextResponse.json({ error: "Failed to verify schedule conflicts." }, { status: 500 });
    }

    if (existingClasses && existingClasses.length > 0) {
      for (const ec of existingClasses) {
        const ecStart = new Date(ec.scheduled_start).getTime();
        const ecEnd = ec.scheduled_end ? new Date(ec.scheduled_end).getTime() : ecStart + 60 * 60 * 1000;

        // Overlap condition: start < ecEnd && end > ecStart
        if (startTimestamp < ecEnd && endTimestamp > ecStart) {
          const conflictStartFormatted = `${formatLiveDateIST(ec.scheduled_start)} • ${formatLiveTimeIST(ec.scheduled_start)}`;
          const conflictEndFormatted = formatLiveTimeIST(ecEnd);
          return NextResponse.json(
            {
              error: `Schedule Conflict: You already have a Live Class ("${ec.topic}") scheduled during this window (${conflictStartFormatted} – ${conflictEndFormatted}). Overlapping live sessions are not allowed.`,
            },
            { status: 409 }
          );
        }
      }
    }

    // 5. Automatic human time display formatting (strictly Asia/Kolkata IST)
    const formattedTimeDisplay =
      timeDisplay?.trim() ||
      formatLiveTimeDisplay(scheduledStart);

    const educatorAvatar = profile.avatar_url || null;
    const educatorName = profile.full_name || "Educator";

    // 6. Initialize Provider Session
    const tempClassId = crypto.randomUUID();
    const sessionConfig = await StreamingService.createLiveSession({
      liveClassId: tempClassId,
      topic: topic.trim(),
      educatorId: user.id,
      educatorName,
      scheduledStart: new Date(startTimestamp).toISOString(),
      scheduledEnd: new Date(endTimestamp).toISOString(),
      client: supabase,
    });

    // 7. Insert Live Class into Database
    // Note: Live classes created by teachers require no Super Admin approval and are directly scheduled and visible to students.
    const { data: newLiveClass, error: insertError } = await supabase
      .from("cms_live_classes")
      .insert({
        id: tempClassId,
        board_id: boardId || null,
        class_id: classId || null,
        subject_id: subjectId || null,
        course_id: courseId || null,
        chapter_id: chapterId || null,
        batch_id: batchId || null,
        subject: subject.trim(),
        topic: topic.trim(),
        description: description?.trim() || null,
        thumbnail_url: thumbnailUrl?.trim() || educatorAvatar,
        educator_name: educatorName,
        educator_avatar_url: educatorAvatar,
        educator_id: user.id,
        scheduled_start: new Date(startTimestamp).toISOString(),
        scheduled_end: new Date(endTimestamp).toISOString(),
        time_display: formattedTimeDisplay,
        is_live: false,
        status_text: "UPCOMING",
        live_status: "SCHEDULED",
        cta_text: "Reminder",
        stream_provider: sessionConfig.provider,
        provider_session_id: sessionConfig.sessionId,
        stream_room_url: sessionConfig.streamRoomUrl,
        stream_key: sessionConfig.internalStreamKey || null,
        recording_status: "NONE",
        is_visible: true,
        status: "PUBLISHED",
        created_by: user.id,
        submitted_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message || "Failed to schedule live class." }, { status: 500 });
    }

    // 8. Dispatch notification event to Super Admin
    await NotificationService.notifySuperAdminLiveClassCreated(supabase, {
      teacherId: user.id,
      teacherName: educatorName,
      liveClassId: newLiveClass.id,
      title: newLiveClass.topic,
      scheduledStart: newLiveClass.scheduled_start,
    });

    // Strip internal stream key before returning response to client
    const { stream_key: _internalKey, ...sanitizedResponse } = newLiveClass;

    return NextResponse.json({
      success: true,
      message: "Live class scheduled successfully.",
      liveClass: sanitizedResponse,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
