import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { YouTubeUploadService } from "@/lib/services/youtube-upload.service";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden: Only educators and administrators can check video processing status." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    if (!videoId?.trim()) {
      return NextResponse.json({ error: "Missing required videoId query parameter." }, { status: 400 });
    }

    const status = await YouTubeUploadService.getVideoProcessingStatus(videoId.trim());

    // If duration was resolved and lecture exists with this video_stream_id, optionally sync duration
    if (status.durationSeconds && status.durationSeconds > 0) {
      await supabase
        .from("cms_lectures")
        .update({
          duration_seconds: status.durationSeconds,
          duration_formatted: status.durationFormatted,
          duration_human: status.durationHuman,
        })
        .eq("video_stream_id", videoId.trim());
    }

    return NextResponse.json(status);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
