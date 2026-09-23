import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StudentProgressService } from "@/lib/services/student-progress.service";

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
    const { liveClassId, heartbeatDurationSeconds } = body;

    if (!liveClassId) {
      return NextResponse.json({ error: "Missing required parameter: liveClassId" }, { status: 400 });
    }

    const result = await StudentProgressService.recordLiveAttendance(supabase, {
      userId: user.id,
      liveClassId,
      heartbeatDurationSeconds: Number(heartbeatDurationSeconds) || 30,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to record live attendance." }, { status: 400 });
    }

    return NextResponse.json({ success: true, isAttended: result.isAttended });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
