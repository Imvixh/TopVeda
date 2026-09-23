import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StudentStudyMaterialService } from "@/lib/services/student-study-material.service";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to access study material." },
        { status: 401 }
      );
    }

    // Fetch material metadata
    const { data: material, error: matErr } = await supabase
      .from("cms_study_materials")
      .select(`
        id,
        batch_id,
        course_id,
        chapter_id,
        title,
        material_type,
        file_url,
        file_size_bytes,
        page_count,
        download_count,
        access_tier,
        status,
        is_visible,
        created_at,
        cms_courses (
          id,
          title,
          cms_subjects (
            name
          )
        ),
        cms_chapters (
          id,
          title,
          chapter_number
        ),
        cms_batches (
          id,
          title,
          board_label
        )
      `)
      .eq("id", id)
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .maybeSingle();

    if (matErr || !material) {
      return NextResponse.json(
        { error: "Study material not found or unavailable." },
        { status: 404 }
      );
    }

    // Strict batch enrollment verification
    let isEnrolled = false;
    if (material.batch_id) {
      const check = await StudentStudyMaterialService.verifyStudentBatchEnrollment(
        supabase,
        user.id,
        material.batch_id
      );
      isEnrolled = check.isEnrolled;
    } else if (material.course_id) {
      const { data: courseEnrollment } = await supabase
        .from("student_enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("course_id", material.course_id)
        .is("batch_id", null)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();

      isEnrolled = Boolean(courseEnrollment);
    }

    if (!isEnrolled) {
      return NextResponse.json(
        { error: "Access Denied: You must be actively enrolled in this batch to access this study material." },
        { status: 403 }
      );
    }

    const course = (material as any).cms_courses;
    const batch = (material as any).cms_batches;
    const chapter = (material as any).cms_chapters;

    return NextResponse.json({
      id: material.id,
      batchId: material.batch_id || batch?.id || "",
      batchTitle: batch?.title || "Enrolled Batch",
      courseId: material.course_id || course?.id || "",
      courseTitle: course?.title || "Course",
      chapterId: material.chapter_id,
      chapterTitle: chapter?.title || null,
      subjectName: course?.cms_subjects?.name || "Academic Subject",
      title: material.title,
      materialType: material.material_type,
      fileUrl: material.file_url,
      fileSizeBytes: material.file_size_bytes || 2400000,
      pageCount: material.page_count || 4,
      downloadCount: material.download_count || 0,
      accessTier: material.access_tier || "FREE",
      isEnrolled: true,
      createdAt: material.created_at,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
