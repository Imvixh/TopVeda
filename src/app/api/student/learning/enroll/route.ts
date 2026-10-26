import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { StudentLearningService } from "@/lib/services/student-learning.service";

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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Please log in to enroll." }, { status: 401 });
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    const body = await request.json();
    const { courseId, batchId } = body;


    if (!courseId && !batchId) {
      return NextResponse.json({ error: "Missing required parameter: courseId or batchId" }, { status: 400 });
    }

    let targetCourseId = courseId || null;
    if (batchId) {
      const { data: batchData, error: batchErr } = await adminClient
        .from("cms_batches")
        .select("id, course_id, board_id, class_id, starts_at, status, is_visible")
        .eq("id", batchId)
        .maybeSingle();

      if (batchErr || !batchData) {
        return NextResponse.json({ error: "Batch not found." }, { status: 404 });
      }

      if (batchData.status !== "PUBLISHED" || batchData.is_visible === false) {
        return NextResponse.json({ error: "Batch is not active or available for enrollment." }, { status: 400 });
      }

      if (batchData.course_id) {
        targetCourseId = batchData.course_id;
      } else if (!targetCourseId) {
        // Fallback: match course by board_id and class_id, or first course
        if (batchData.class_id && batchData.board_id) {
          const { data: matchCourses } = await adminClient
            .from("cms_courses")
            .select("id")
            .eq("board_id", batchData.board_id)
            .eq("class_id", batchData.class_id)
            .limit(1);
          if (matchCourses && matchCourses.length > 0) {
            targetCourseId = matchCourses[0].id;
          }
        }
        if (!targetCourseId) {
          const { data: fallbackCourses } = await adminClient
            .from("cms_courses")
            .select("id")
            .limit(1);
          if (fallbackCourses && fallbackCourses.length > 0) {
            targetCourseId = fallbackCourses[0].id;
          }
        }
      }
    }


    if (targetCourseId) {
      const result = await StudentLearningService.enrollInCourse(adminClient, {
        userId: user.id,
        courseId: targetCourseId,
        batchId: batchId || null,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Enrollment failed" }, { status: 400 });
      }

      return NextResponse.json({ success: true, enrollment: result.enrollment });
    }

    // Direct standalone batch enrollment (with targetCourseId fallback)
    const { data: existing } = await adminClient
      .from("student_enrollments")
      .select("*")
      .eq("student_id", user.id)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, enrollment: existing });
    }

    const { data: anyCourse } = await adminClient
      .from("cms_courses")
      .select("id")
      .limit(1);
    const resolvedCourseId = targetCourseId || (anyCourse && anyCourse[0]?.id) || null;

    const { data: newEnrollment, error: insertError } = await adminClient
      .from("student_enrollments")
      .insert({
        student_id: user.id,
        course_id: resolvedCourseId,
        batch_id: batchId,
        status: "ACTIVE",
        enrolled_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message || "Failed to enroll in batch" }, { status: 500 });
    }

    return NextResponse.json({ success: true, enrollment: newEnrollment });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
