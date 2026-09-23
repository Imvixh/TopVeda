import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StudentProgressService } from "@/lib/services/student-progress.service";

export async function GET(request: NextRequest) {
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
      return NextResponse.json({
        overallProgressPercent: 0,
        coursesCompleted: 0,
        totalEnrolledCourses: 0,
        lecturesWatched: 0,
        totalAccessibleLectures: 0,
        testsAttempted: 0,
        quizzesAttempted: 0,
        liveClassesAttended: 0,
        subjectProgress: [],
        recentTestResults: [],
        areasToImprove: [],
      });
    }

    const data = await StudentProgressService.getProgressSummary(supabase, user.id);

    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
