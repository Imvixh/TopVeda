import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { NotificationService } from "@/lib/services/notification.service";
import { YouTubeUploadService } from "@/lib/services/youtube-upload.service";
import { StorageService } from "@/lib/services/storage.service";

// Whitelist of supported video MIME types and extensions
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/mpeg",
  "video/3gpp",
  "video/ogg",
]);

const ALLOWED_VIDEO_EXTENSIONS = new Set([
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "mpg",
  "mpeg",
  "3gp",
  "ogv",
]);

const MAX_VIDEO_FILE_SIZE_BYTES = 1024 * 1024 * 1024; // 1 GB maximum upload limit

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

    // 3. Parse Request (multipart/form-data or application/json)
    const contentType = request.headers.get("content-type") || "";
    let title = "";
    let subject = "";
    let boardId: string | null = null;
    let classId: string | null = null;
    let subjectId: string | null = null;
    let courseId: string | null = null;
    let chapterId: string | null = null;
    let batchId: string | null = null;
    let lectureNumber = 1;
    let description: string | null = null;
    let thumbnailUrl = "/thumbnails/sample.jpg";
    let thumbnailBg = "from-[#0F2042] via-[#162D59] to-[#0A162B]";
    let videoStreamId: string | null = null;
    let videoPlaybackUrl: string | null = null;
    let durationSeconds = 2700;
    let durationFormatted = "45:00";
    let durationHuman = "45 min";
    let categoryTag = "Recorded Lecture";
    let isFreePreview = true;
    let materialIds: string[] = [];
    let statusTarget = "PENDING_REVIEW";
    let videoFile: File | null = null;
    let thumbnailFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      title = (formData.get("title") as string) || "";
      subject = (formData.get("subject") as string) || "";
      boardId = (formData.get("boardId") as string) || null;
      classId = (formData.get("classId") as string) || null;
      subjectId = (formData.get("subjectId") as string) || null;
      courseId = (formData.get("courseId") as string) || null;
      chapterId = (formData.get("chapterId") as string) || null;
      batchId = (formData.get("batchId") as string) || null;
      lectureNumber = parseInt((formData.get("lectureNumber") as string) || "1", 10) || 1;
      description = (formData.get("description") as string) || null;
      thumbnailUrl = (formData.get("thumbnailUrl") as string) || thumbnailUrl;
      thumbnailBg = (formData.get("thumbnailBg") as string) || thumbnailBg;
      videoStreamId = (formData.get("videoStreamId") as string) || null;
      videoPlaybackUrl = (formData.get("videoPlaybackUrl") as string) || null;
      durationSeconds = parseInt((formData.get("durationSeconds") as string) || "2700", 10) || 2700;
      durationFormatted = (formData.get("durationFormatted") as string) || durationFormatted;
      durationHuman = (formData.get("durationHuman") as string) || durationHuman;
      categoryTag = (formData.get("categoryTag") as string) || categoryTag;
      isFreePreview = formData.get("isFreePreview") === "false" ? false : true;
      statusTarget = (formData.get("status") as string) || "PENDING_REVIEW";

      const rawMaterialIds = formData.get("materialIds") as string;
      if (rawMaterialIds) {
        try {
          materialIds = JSON.parse(rawMaterialIds);
        } catch {
          materialIds = [];
        }
      }

      const rawVideo = formData.get("video");
      if (rawVideo instanceof File && rawVideo.size > 0) {
        videoFile = rawVideo;
      }

      const rawThumbnail = formData.get("thumbnail");
      if (rawThumbnail instanceof File && rawThumbnail.size > 0) {
        thumbnailFile = rawThumbnail;
      }
    } else {
      const body = await request.json();
      title = body.title || "";
      subject = body.subject || "";
      boardId = body.boardId || null;
      classId = body.classId || null;
      subjectId = body.subjectId || null;
      courseId = body.courseId || null;
      chapterId = body.chapterId || null;
      batchId = body.batchId || null;
      lectureNumber = body.lectureNumber || 1;
      description = body.description || null;
      thumbnailUrl = body.thumbnailUrl || thumbnailUrl;
      thumbnailBg = body.thumbnailBg || thumbnailBg;
      videoStreamId = body.videoStreamId || null;
      videoPlaybackUrl = body.videoPlaybackUrl || null;
      durationSeconds = body.durationSeconds || 2700;
      durationFormatted = body.durationFormatted || durationFormatted;
      durationHuman = body.durationHuman || durationHuman;
      categoryTag = body.categoryTag || categoryTag;
      isFreePreview = body.isFreePreview ?? true;
      materialIds = body.materialIds || [];
      statusTarget = body.status || "PENDING_REVIEW";
    }

    // 4. Server-Side Validation
    if (!title.trim()) {
      return NextResponse.json({ error: "Lecture title is required." }, { status: 400 });
    }
    if (!subject.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    // 5. Handle Thumbnail File Upload if attached
    if (thumbnailFile) {
      try {
        const thumbEntityId = crypto.randomUUID();
        const thumbPath = StorageService.generateScopedPath(user.id, thumbEntityId, thumbnailFile.name);
        const { path: uploadedThumbPath, error: thumbUploadErr } = await StorageService.uploadFile(
          supabase,
          "lecture-thumbnails",
          thumbPath,
          thumbnailFile,
          { contentType: thumbnailFile.type }
        );
        if (!thumbUploadErr && uploadedThumbPath) {
          thumbnailUrl = uploadedThumbPath;
        }
      } catch (thumbErr) {
        console.warn("[LectureUpload] Non-blocking thumbnail storage warning:", thumbErr);
      }
    }

    // 6. Handle Video Upload to YouTube Data API (if video file attached)
    let finalVideoStreamId = videoStreamId;
    let finalVideoPlaybackUrl = videoPlaybackUrl;
    let videoUploadStatus = "ready";

    if (videoFile) {
      // Validate Video MIME Type
      if (!ALLOWED_VIDEO_MIME_TYPES.has(videoFile.type)) {
        return NextResponse.json(
          {
            error: `Unsupported video format "${videoFile.type}". Please upload MP4, WebM, QuickTime (MOV), MKV, or AVI.`,
          },
          { status: 400 }
        );
      }

      // Validate Video Extension
      const fileExt = videoFile.name.split(".").pop()?.toLowerCase() || "";
      if (!ALLOWED_VIDEO_EXTENSIONS.has(fileExt)) {
        return NextResponse.json(
          {
            error: `Unsupported video file extension ".${fileExt}". Allowed extensions: .mp4, .webm, .mov, .mkv, .avi.`,
          },
          { status: 400 }
        );
      }

      // Validate File Size
      if (videoFile.size > MAX_VIDEO_FILE_SIZE_BYTES) {
        return NextResponse.json(
          {
            error: `Video file size exceeds maximum limit of 1 GB (${(videoFile.size / (1024 * 1024)).toFixed(1)} MB uploaded).`,
          },
          { status: 400 }
        );
      }

      // Duplicate / Idempotency Check: Prevent duplicate simultaneous upload
      const recentThreshold = new Date(Date.now() - 30 * 1000).toISOString();
      const { data: recentDuplicate } = await supabase
        .from("cms_lectures")
        .select("id, title")
        .eq("educator_id", user.id)
        .eq("title", title.trim())
        .gte("created_at", recentThreshold)
        .maybeSingle();

      if (recentDuplicate) {
        return NextResponse.json(
          {
            error: `A lecture with the title "${title.trim()}" was uploaded seconds ago. Please wait before submitting duplicates.`,
          },
          { status: 409 }
        );
      }

      // Convert File to Buffer and upload to TopVeda YouTube channel
      const arrayBuf = await videoFile.arrayBuffer();
      const videoBuffer = Buffer.from(arrayBuf);

      const uploadResult = await YouTubeUploadService.uploadVideo({
        title: title.trim(),
        description: description?.trim() || `TopVeda Academic Lecture: ${title.trim()}`,
        videoBuffer,
        mimeType: videoFile.type,
        privacyStatus: "unlisted",
        tags: ["TopVeda", subject.trim(), "Recorded Lecture", "Education"],
      });

      finalVideoStreamId = uploadResult.videoId;
      finalVideoPlaybackUrl = uploadResult.embedPlaybackUrl;
      videoUploadStatus = "ready";
    }

    if (!finalVideoStreamId) {
      finalVideoStreamId = `cf_upload_${Date.now()}`;
    }

    const cleanSlug = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;
    const educatorName = profile.full_name || "Educator";
    const nowIso = new Date().toISOString();
    const lectureStatus = statusTarget === "DRAFT" ? "DRAFT" : "PENDING_REVIEW";

    // 7. Insert Lecture Record into cms_lectures
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
        video_stream_id: finalVideoStreamId,
        video_playback_url: finalVideoPlaybackUrl,
        video_upload_status: videoUploadStatus,
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

    // 8. If submitted for review, notify Super Admin
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
          ? "Recorded lecture uploaded to YouTube and submitted for Super Admin review."
          : "Recorded lecture draft saved successfully.",
      lecture: newLecture,
      videoId: finalVideoStreamId,
      playbackUrl: finalVideoPlaybackUrl,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
