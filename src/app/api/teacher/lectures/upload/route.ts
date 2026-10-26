import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
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

// Whitelist of supported thumbnail image MIME types
const ALLOWED_THUMBNAIL_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_THUMBNAIL_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB maximum thumbnail size (YouTube thumbnails.set limit)

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
    let user = null;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const { data: userData } = await supabase.auth.getUser(token);
      user = userData?.user;
    }
    if (!user) {
      const { data: userData } = await supabase.auth.getUser();
      user = userData?.user;
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authoritative DB client (fallback to createAdminClient for server transaction persistence)
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    // 2. Authorize Admin / Educator or Super Admin
    const { data: profile } = await db
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
    let thumbnailUrl = "";
    let thumbnailBg = "from-[#0F2042] via-[#162D59] to-[#0A162B]";
    let videoStreamId: string | null = null;
    let videoPlaybackUrl: string | null = null;
    let durationSeconds = 0;
    let durationFormatted = "";
    let durationHuman = "";
    let categoryTag = "Recorded Lecture";
    let isFreePreview = true;
    let materialIds: string[] = [];
    let statusTarget = "PENDING_REVIEW";
    let videoFile: File | null = null;
    let thumbnailFile: File | null = null;
    let materialFile: File | null = null;
    let materialUrl: string | null = null;
    let materialTitle: string | null = null;

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
      thumbnailUrl = (formData.get("thumbnailUrl") as string) || "";
      thumbnailBg = (formData.get("thumbnailBg") as string) || thumbnailBg;
      videoStreamId = (formData.get("videoStreamId") as string) || null;
      videoPlaybackUrl = (formData.get("videoPlaybackUrl") as string) || null;
      durationSeconds = parseInt((formData.get("durationSeconds") as string) || "0", 10) || 0;
      durationFormatted = (formData.get("durationFormatted") as string) || "";
      durationHuman = (formData.get("durationHuman") as string) || "";
      categoryTag = (formData.get("categoryTag") as string) || categoryTag;
      isFreePreview = formData.get("isFreePreview") === "false" ? false : true;
      statusTarget = (formData.get("status") as string) || "PENDING_REVIEW";
      materialUrl = (formData.get("materialUrl") as string) || null;
      materialTitle = (formData.get("materialTitle") as string) || null;

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

      const rawMaterial = formData.get("material") || formData.get("materialFile");
      if (rawMaterial instanceof File && rawMaterial.size > 0) {
        materialFile = rawMaterial;
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
      thumbnailUrl = body.thumbnailUrl || "";
      thumbnailBg = body.thumbnailBg || thumbnailBg;
      videoStreamId = body.videoStreamId || null;
      videoPlaybackUrl = body.videoPlaybackUrl || null;
      durationSeconds = parseInt(String(body.durationSeconds || "0"), 10) || 0;
      durationFormatted = body.durationFormatted || "";
      durationHuman = body.durationHuman || "";
      categoryTag = body.categoryTag || categoryTag;
      isFreePreview = body.isFreePreview ?? true;
      materialIds = body.materialIds || [];
      statusTarget = body.status || "PENDING_REVIEW";
      materialUrl = body.materialUrl || null;
      materialTitle = body.materialTitle || null;
    }

    // Compute accurate duration metadata
    if (durationSeconds > 0) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      if (!durationFormatted || durationFormatted === "45:00") {
        durationFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      }
      if (!durationHuman || durationHuman === "45 min") {
        durationHuman = mins >= 60 ? `${Math.floor(mins / 60)} hr ${mins % 60} min` : `${Math.max(1, mins)} min`;
      }
    } else {
      durationSeconds = 0;
      durationFormatted = durationFormatted && durationFormatted !== "45:00" ? durationFormatted : "00:00";
      durationHuman = durationHuman && durationHuman !== "45 min" ? durationHuman : "0 min";
    }

    // 4. Server-Side Validation
    if (!title.trim()) {
      return NextResponse.json({ error: "Lecture title is required." }, { status: 400 });
    }
    if (!subject.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }

    // 5. Handle Thumbnail Upload (if custom image file was provided)
    let thumbnailBuffer: Buffer | null = null;
    if (thumbnailFile) {
      if (!ALLOWED_THUMBNAIL_MIME_TYPES.has(thumbnailFile.type)) {
        return NextResponse.json(
          { error: "Unsupported thumbnail image type. Allowed types: JPG, PNG, WebP." },
          { status: 400 }
        );
      }
      if (thumbnailFile.size > MAX_THUMBNAIL_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "Thumbnail file exceeds 2 MB limit." },
          { status: 400 }
        );
      }

      const thumbArrayBuf = await thumbnailFile.arrayBuffer();
      thumbnailBuffer = Buffer.from(thumbArrayBuf);

      // Upload to Supabase Storage Bucket
      const fileExt = thumbnailFile.name.split(".").pop() || "jpg";
      const storagePath = `thumbnails/${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${fileExt}`;

      const { path: uploadedThumbPath, error: thumbStorageErr } = await StorageService.uploadFile(
        db,
        "lecture-thumbnails",
        storagePath,
        thumbnailFile,
        { contentType: thumbnailFile.type }
      );

      if (!thumbStorageErr && uploadedThumbPath) {
        thumbnailUrl = StorageService.getPublicUrl(db, "lecture-thumbnails", uploadedThumbPath);
      }
    }

    // Default thumbnail fallback if still empty
    if (!thumbnailUrl.trim()) {
      thumbnailUrl = "/images/subjects/mathematics-banner.png";
    }

    // 6. Handle Companion Study Material Upload
    let finalMaterialUrl = materialUrl;
    let materialSizeBytes: number | null = null;
    if (materialFile && !finalMaterialUrl) {
      try {
        const entityId = crypto.randomUUID();
        const storagePath = StorageService.generateScopedPath(user.id, entityId, materialFile.name);
        const arrayBuf = await materialFile.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuf);
        materialSizeBytes = materialFile.size;

        const { path: uploadedPath, error: matUploadErr } = await StorageService.uploadFile(
          db,
          "study-materials",
          storagePath,
          fileBuffer,
          { contentType: materialFile.type || "application/pdf" }
        );
        if (!matUploadErr && uploadedPath) {
          finalMaterialUrl = uploadedPath;
        } else if (matUploadErr) {
          console.error("[LectureUpload] Material upload error:", matUploadErr);
        }
      } catch (err) {
        console.error("[LectureUpload] Failed to process companion material file:", err);
      }
    }

    // 7. Handle Video Upload via YouTube Upload Service or Stream Fallback
    let finalVideoStreamId = videoStreamId;
    let finalVideoPlaybackUrl = videoPlaybackUrl || "https://stream.topveda.com/lectures/sample.m3u8";
    let videoUploadStatus: "pending" | "processing" | "ready" | "failed" =
      videoFile ? "processing" : "ready";

    if (videoFile) {
      // Validate Video MIME
      if (!ALLOWED_VIDEO_MIME_TYPES.has(videoFile.type)) {
        return NextResponse.json(
          {
            error: `Unsupported video MIME type "${videoFile.type}". Supported formats: MP4, WebM, QuickTime MOV, MKV, AVI, MPEG.`,
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
      const { data: recentDuplicate } = await db
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

      // If custom thumbnail buffer is available, apply it to YouTube (non-blocking)
      if (thumbnailBuffer && finalVideoStreamId) {
        await YouTubeUploadService.setVideoThumbnail(
          finalVideoStreamId,
          thumbnailBuffer,
          thumbnailFile?.type || "image/jpeg",
          db
        );
      }
    }

    if (!finalVideoStreamId) {
      finalVideoStreamId = `cf_upload_${Date.now()}`;
    }

    const cleanSlug = `${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-4)}`;
    const educatorName = profile.full_name || "Educator";
    const nowIso = new Date().toISOString();
    const lectureStatus = statusTarget === "DRAFT" ? "DRAFT" : "PENDING_REVIEW";

    // 8. Insert Lecture Record into cms_lectures
    const { data: newLecture, error: insertError } = await db
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
        duration_seconds: durationSeconds,
        duration_formatted: durationFormatted,
        duration_human: durationHuman,
        category_tag: categoryTag || "Recorded Lecture",
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

    // 9. If companion study material URL or file was provided, create cms_study_materials record
    let createdMaterial = null;
    if (finalMaterialUrl) {
      const matTitle = (materialTitle || `${title.trim()} - Notes`).trim();
      const { data: newMaterial, error: materialInsertErr } = await db
        .from("cms_study_materials")
        .insert({
          title: matTitle,
          material_type: "notes",
          file_url: finalMaterialUrl,
          file_size_bytes: materialSizeBytes,
          lecture_id: newLecture.id,
          batch_id: batchId || null,
          subject_id: subjectId || null,
          course_id: courseId || null,
          chapter_id: chapterId || null,
          display_order: 0,
          is_visible: true,
          status: lectureStatus,
          created_by: user.id,
          submitted_by: user.id,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (materialInsertErr) {
        console.error("[LectureUpload] Material DB insert error:", materialInsertErr);
      } else if (newMaterial) {
        createdMaterial = newMaterial;
        const updatedMaterialIds = Array.from(new Set([...materialIds, newMaterial.id]));
        await db
          .from("cms_lectures")
          .update({ material_ids: updatedMaterialIds })
          .eq("id", newLecture.id);
        newLecture.material_ids = updatedMaterialIds;
      }
    }

    // 10. If submitted for review, notify Super Admin
    if (lectureStatus === "PENDING_REVIEW") {
      await NotificationService.notifySuperAdminLectureSubmitted(db, {
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
          ? "Recorded lecture and companion materials uploaded and submitted for Super Admin review."
          : "Recorded lecture draft and companion materials saved successfully.",
      lecture: newLecture,
      material: createdMaterial,
      videoId: finalVideoStreamId,
      playbackUrl: finalVideoPlaybackUrl,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
