import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { NotificationService } from "@/lib/services/notification.service";
import { UpdateRecordedLectureDTO } from "@/types/teacher.types";

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

    const body: UpdateRecordedLectureDTO = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing lecture id parameter." }, { status: 400 });
    }

    // 2. Fetch existing lecture & check status
    const { data: existing, error: fetchErr } = await supabase
      .from("cms_lectures")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Recorded lecture not found." }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.role === "SUPER_ADMIN";
    const isOwnerTeacher =
      existing.educator_id === user.id ||
      existing.created_by === user.id ||
      existing.submitted_by === user.id;

    if (!isSuperAdmin && !isOwnerTeacher) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to edit this lecture." },
        { status: 403 }
      );
    }

    // 3. Enforce Teacher Editing Lock Rule:
    // Once Super Admin approves, Teacher editing is locked!
    if (!isSuperAdmin && (existing.status === "APPROVED" || existing.status === "PUBLISHED")) {
      return NextResponse.json(
        {
          error: "Editing Locked: This lecture has been approved/published by Super Admin and cannot be modified by teachers. Contact Super Admin for revisions.",
        },
        { status: 403 }
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updatePayload.title = updates.title.trim();
    if (updates.subject !== undefined) updatePayload.subject = updates.subject.trim();
    if (updates.boardId !== undefined) updatePayload.board_id = updates.boardId;
    if (updates.classId !== undefined) updatePayload.class_id = updates.classId;
    if (updates.subjectId !== undefined) updatePayload.subject_id = updates.subjectId;
    if (updates.courseId !== undefined) updatePayload.course_id = updates.courseId;
    if (updates.chapterId !== undefined) updatePayload.chapter_id = updates.chapterId;
    if (updates.batchId !== undefined) updatePayload.batch_id = updates.batchId;
    if (updates.lectureNumber !== undefined) updatePayload.lecture_number = updates.lectureNumber;
    if (updates.description !== undefined) updatePayload.description = updates.description?.trim() || null;
    if (updates.thumbnailUrl !== undefined) updatePayload.thumbnail_url = updates.thumbnailUrl.trim();
    if (updates.thumbnailBg !== undefined) updatePayload.thumbnail_bg = updates.thumbnailBg;
    if (updates.videoPlaybackUrl !== undefined) updatePayload.video_playback_url = updates.videoPlaybackUrl?.trim() || null;
    if (updates.durationFormatted !== undefined) updatePayload.duration_formatted = updates.durationFormatted;
    if (updates.durationHuman !== undefined) updatePayload.duration_human = updates.durationHuman;
    if (updates.categoryTag !== undefined) updatePayload.category_tag = updates.categoryTag;
    if (updates.isFreePreview !== undefined) updatePayload.is_free_preview = updates.isFreePreview;
    if (updates.materialIds !== undefined) updatePayload.material_ids = updates.materialIds;

    // Handle resubmission from REJECTED / DRAFT -> PENDING_REVIEW
    let isResubmission = false;
    if (updates.status === "PENDING_REVIEW") {
      updatePayload.status = "PENDING_REVIEW";
      updatePayload.submitted_by = user.id;
      if (existing.status === "REJECTED") {
        isResubmission = true;
      }
    } else if (updates.status === "DRAFT") {
      updatePayload.status = "DRAFT";
    }

    const { data: updatedLecture, error: updateErr } = await supabase
      .from("cms_lectures")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Failed to update lecture." }, { status: 500 });
    }

    // If resubmitted, alert Super Admin
    if (isResubmission) {
      await NotificationService.notifySuperAdminLectureSubmitted(supabase, {
        teacherId: user.id,
        teacherName: profile?.full_name || "Educator",
        lectureId: id,
        title: updatedLecture.title,
        subject: updatedLecture.subject,
      });
    }

    return NextResponse.json({
      success: true,
      message: isResubmission
        ? "Revisions submitted to Super Admin for review."
        : "Lecture updated successfully.",
      lecture: updatedLecture,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
