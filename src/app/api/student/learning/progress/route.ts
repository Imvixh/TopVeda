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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { lectureId, courseId, lastPositionSeconds, watchDurationSeconds, totalDurationSeconds } = body;

    if (!lectureId || !courseId) {
      return NextResponse.json({ error: "Missing required parameters: lectureId, courseId" }, { status: 400 });
    }

    const result = await StudentLearningService.updateLectureProgress(supabase, {
      userId: user.id,
      lectureId,
      courseId,
      lastPositionSeconds: Number(lastPositionSeconds) || 0,
      watchDurationSeconds: Number(watchDurationSeconds) || 0,
      totalDurationSeconds: Number(totalDurationSeconds) || 0,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
