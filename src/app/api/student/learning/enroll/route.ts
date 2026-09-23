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

    if (!courseId) {
      return NextResponse.json({ error: "Missing required parameter: courseId" }, { status: 400 });
    }

    const result = await StudentLearningService.enrollInCourse(supabase, {
      userId: user.id,
      courseId,
      batchId: batchId || null,
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
