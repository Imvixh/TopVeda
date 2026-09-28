import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { ContentAccessService } from "@/lib/services/content-access.service";
import { resolveLectureEmbedUrl } from "@/lib/utils/youtube";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lectureId } = await props.params;

    if (!lectureId) {
      return NextResponse.json(
        {
          authorized: false,
          canWatch: false,
          code: "BAD_REQUEST",
          error: "Missing lecture id parameter.",
          lecture: null,
          videoStreamId: null,
          videoPlaybackUrl: null,
          embedUrl: null,
        },
        { status: 400 }
      );
    }

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

    // 1. Authenticate user - STRICT 401 IF UNAUTHENTICATED
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          authorized: false,
          canWatch: false,
          code: "UNAUTHORIZED",
          error: "Authentication required to access lecture.",
          lecture: null,
          videoStreamId: null,
          videoPlaybackUrl: null,
          embedUrl: null,
        },
        { status: 401 }
      );
    }

    // 2. Fetch User Profile & Role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();

    const isTeacherOrAdmin =
      profile?.role === "SUPER_ADMIN" || profile?.role === "ADMIN";

    // 3. Fetch Lecture Metadata
    const privilegedClient = createAdminClient();
    const { data: lecture, error: fetchErr } = await privilegedClient
      .from("cms_lectures")
      .select(`
        id,
        title,
        subject,
        teacher_name,
        description,
        duration_seconds,
        duration_human,
        duration_formatted,
        video_playback_url,
        video_stream_id,
        category_tag,
        course_id,
        batch_id,
        chapter_id,
        is_free_preview,
        access_tier,
        status,
        is_visible,
        starts_at,
        ends_at,
        batch:cms_batches(id, title, board_label, subtitle)
      `)
      .eq("id", lectureId)
      .single();

    if (fetchErr || !lecture) {
      return NextResponse.json(
        {
          authorized: false,
          canWatch: false,
          code: "NOT_FOUND",
          error: "Lecture not found.",
          lecture: null,
          videoStreamId: null,
          videoPlaybackUrl: null,
          embedUrl: null,
        },
        { status: 404 }
      );
    }

    // 4. Server-authoritative content access evaluation
    const accessResult = await ContentAccessService.checkAccess(supabase, {
      userId: user.id,
      contentType: "LECTURE",
      contentId: lecture.id,
      isTeacherOrAdmin,
    });

    if (!accessResult.granted) {
      return NextResponse.json(
        {
          authorized: false,
          canWatch: false,
          code: "ACCESS_DENIED",
          error:
            accessResult.reason ||
            "Active batch or course enrollment required to access this lecture.",
          lecture: null,
          videoStreamId: null,
          videoPlaybackUrl: null,
          embedUrl: null,
        },
        { status: 403 }
      );
    }

    // 5. Build Authoritative Playback Payload ONLY for Authorized Callers
    const resolvedEmbedUrl = resolveLectureEmbedUrl(lecture);
    const resolvedBatch = Array.isArray(lecture.batch)
      ? lecture.batch[0]
      : lecture.batch;

    return NextResponse.json({
      authorized: true,
      canWatch: true,
      lecture: {
        id: lecture.id,
        title: lecture.title,
        subject: lecture.subject,
        teacher_name: lecture.teacher_name,
        description: lecture.description,
        duration_seconds: lecture.duration_seconds,
        duration_human: lecture.duration_human,
        duration_formatted: lecture.duration_formatted,
        video_playback_url: lecture.video_playback_url,
        video_stream_id: lecture.video_stream_id,
        embedUrl: resolvedEmbedUrl,
        category_tag: lecture.category_tag,
        course_id: lecture.course_id,
        batch_id: lecture.batch_id,
        chapter_id: lecture.chapter_id,
        batch: resolvedBatch || null,
      },
      videoStreamId: lecture.video_stream_id,
      videoPlaybackUrl: lecture.video_playback_url,
      embedUrl: resolvedEmbedUrl,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      {
        authorized: false,
        canWatch: false,
        code: "SERVER_ERROR",
        error: error.message,
        lecture: null,
        videoStreamId: null,
        videoPlaybackUrl: null,
        embedUrl: null,
      },
      { status: 500 }
    );
  }
}
