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
    let targetBatchId = batchId || null;

    if (targetBatchId) {
      const { data: batchData, error: batchErr } = await adminClient
        .from("cms_batches")
        .select("id, course_id, board_id, class_id, starts_at, status, is_visible")
        .eq("id", targetBatchId)
        .maybeSingle();

      if (batchErr || !batchData) {
        return NextResponse.json({ error: "Batch not found." }, { status: 404 });
      }

      if (batchData.status !== "PUBLISHED" || batchData.is_visible === false) {
        return NextResponse.json({ error: "Batch is not active or available for enrollment." }, { status: 400 });
      }

      // Inherit the batch's genuine course_id if linked; never fabricate an unrelated course!
      targetCourseId = batchData.course_id || null;
    }

    const result = await StudentLearningService.enrollInCourse(adminClient, {
      userId: user.id,
      courseId: targetCourseId,
      batchId: targetBatchId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Enrollment failed" }, { status: 400 });
    }

    return NextResponse.json({ success: true, enrollment: result.enrollment });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
