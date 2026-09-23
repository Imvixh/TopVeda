import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { NotificationService } from "@/lib/services/notification.service";
import { UploadRecordedLectureDTO } from "@/types/teacher.types";

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
      .select("id, full_name, role, avatar_url")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden: Only verified educators and administrators can upload recorded lectures." },
        { status: 403 }
      );
    }

    const body: UploadRecordedLectureDTO = await request.json();
    const {
      title,
      boardId,
      classId,
      subjectId,
      courseId,
      chapterId,
      batchId,
      subject,
      lectureNumber,
      description,
      thumbnailUrl,
      thumbnailBg,
      videoStreamId,
      videoPlaybackUrl,
      durationSeconds,
      durationFormatted,
      durationHuman,
      categoryTag,
      isFreePreview,
      materialIds,
      status = "PENDING_REVIEW",
    } = body;

    // 3. Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: "Lecture title is required." }, { status: 400 });
    }
    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (!thumbnailUrl?.trim()) {
      return NextResponse.json({ error: "Lecture thumbnail is required." }, { status: 400 });
    }

    const cleanSlug = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;
    const educatorName = profile.full_name || "Educator";
    const nowIso = new Date().toISOString();

    const lectureStatus = status === "DRAFT" ? "DRAFT" : "PENDING_REVIEW";

    // 4. Insert into cms_lectures
    const { data: newLecture, error: insertError } = await supabase
      .from("cms_lectures")
      .insert({
        title: title.trim(),
        slug: cleanSlug,
        subject: subject.trim(),
        teacher_name: educatorName,
        educator_id: user.id,
        board_id: boardId || null,
        class_id: classId || null,
        subject_id: subjectId || null,
        course_id: courseId || null,
        chapter_id: chapterId || null,
        batch_id: batchId || null,
        lecture_number: lectureNumber || 1,
        description: description?.trim() || null,
        thumbnail_url: thumbnailUrl.trim(),
        thumbnail_bg: thumbnailBg || "from-[#0F2042] via-[#162D59] to-[#0A162B]",
        video_stream_id: videoStreamId?.trim() || `cf_upload_${Date.now()}`,
        video_playback_url: videoPlaybackUrl?.trim() || null,
        video_upload_status: videoPlaybackUrl ? "ready" : "pending_encoding",
        duration_seconds: durationSeconds || 2700,
        duration_formatted: durationFormatted || "45:00",
        duration_human: durationHuman || "45 min",
        categoryTag: categoryTag || "Recorded Lecture",
        is_home_featured: false,
        is_free_preview: isFreePreview ?? true,
        material_ids: materialIds || [],
        status: lectureStatus,
        is_visible: true,
        display_order: 0,
        created_by: user.id,
        submitted_by: user.id,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message || "Failed to save recorded lecture." }, { status: 500 });
    }

    // 5. If submitted for review, notify Super Admin
    if (lectureStatus === "PENDING_REVIEW") {
      await NotificationService.notifySuperAdminLectureSubmitted(supabase, {
        teacherId: user.id,
        teacherName: educatorName,
        lectureId: newLecture.id,
        title: newLecture.title,
        subject: newLecture.subject,
      });
    }

    return NextResponse.json({
      success: true,
      message:
        lectureStatus === "PENDING_REVIEW"
          ? "Recorded lecture uploaded and submitted for Super Admin review."
          : "Recorded lecture draft saved successfully.",
      lecture: newLecture,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
