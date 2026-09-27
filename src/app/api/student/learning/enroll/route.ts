import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

    const body = await request.json();
    const { courseId, batchId } = body;

    if (!courseId && !batchId) {
      return NextResponse.json({ error: "Missing required parameter: courseId or batchId" }, { status: 400 });
    }

    let targetCourseId = courseId;
    if (batchId) {
      const { data: batchData, error: batchErr } = await supabase
        .from("cms_batches")
        .select("id, course_id, starts_at, status, is_visible")
        .eq("id", batchId)
        .maybeSingle();

      if (batchErr || !batchData) {
        return NextResponse.json({ error: "Batch not found." }, { status: 404 });
      }

      if (batchData.status !== "PUBLISHED" || batchData.is_visible === false) {
        return NextResponse.json({ error: "Batch is not active or available for enrollment." }, { status: 400 });
      }

      // STRICT VALIDATION: Reject enrollment into upcoming batches (starts_at > NOW())
      const nowIso = new Date().toISOString();
      if (batchData.starts_at && batchData.starts_at > nowIso) {
        return NextResponse.json(
          { error: "Enrollment is not open for upcoming batches. Please check back when the batch starts." },
          { status: 400 }
        );
      }

      if (batchData.course_id && !targetCourseId) {
        targetCourseId = batchData.course_id;
      }
    }

    if (targetCourseId) {
      const result = await StudentLearningService.enrollInCourse(supabase, {
        userId: user.id,
        courseId: targetCourseId,
        batchId: batchId || null,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Enrollment failed" }, { status: 400 });
      }

      return NextResponse.json({ success: true, enrollment: result.enrollment });
    }

    // Direct standalone batch enrollment
    const { data: existing } = await supabase
      .from("student_enrollments")
      .select("*")
      .eq("student_id", user.id)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, enrollment: existing });
    }

    const { data: newEnrollment, error: insertError } = await supabase
      .from("student_enrollments")
      .insert({
        student_id: user.id,
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
