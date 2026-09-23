import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StreamingService } from "@/lib/services/streaming.service";
import { CmsService } from "@/lib/services/cms.service";

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { liveClassId } = await request.json();

    if (!liveClassId) {
      return NextResponse.json({ error: "Missing liveClassId parameter." }, { status: 400 });
    }

    // 2. Fetch Live Class & Check Ownership / Authorization
    const { data: liveClass, error: fetchErr } = await supabase
      .from("cms_live_classes")
      .select("*")
      .eq("id", liveClassId)
      .single();

    if (fetchErr || !liveClass) {
      return NextResponse.json({ error: "Live Class not found." }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isSuperAdmin = profile?.role === "SUPER_ADMIN";
    const isOwnerTeacher =
      liveClass.educator_id === user.id ||
      liveClass.created_by === user.id ||
      liveClass.submitted_by === user.id;

    if (!isSuperAdmin && !isOwnerTeacher) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to end this Live Class session." },
        { status: 403 }
      );
    }

    // 3. Conclude session in provider
    let recordingId = `rec_${liveClass.id}`;
    if (liveClass.provider_session_id) {
      const providerRes = await StreamingService.endLiveSession(liveClass.provider_session_id);
      if (providerRes.recordingId) {
        recordingId = providerRes.recordingId;
      }
    }

    const nowIso = new Date().toISOString();

    // 4. Update Database State to COMPLETED
    const { data: updatedClass, error: updateErr } = await supabase
      .from("cms_live_classes")
      .update({
        live_status: "COMPLETED",
        is_live: false,
        status_text: "COMPLETED",
        cta_text: "View Recording",
        ended_at: nowIso,
        recording_id: recordingId,
        recording_status: "PROCESSING",
        recording_url: liveClass.stream_room_url,
        updated_at: nowIso,
      })
      .eq("id", liveClassId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Failed to complete live class." }, { status: 500 });
    }

    // 5. Automatic Recording Draft Inheritance: Create recorded lecture draft
    const { data: inheritedLecture } = await CmsService.inheritLiveClassToLectureDraft(
      supabase,
      liveClassId,
      liveClass.stream_room_url || undefined
    );

    const { stream_key: _k, ...sanitizedClass } = updatedClass;

    return NextResponse.json({
      success: true,
      message: "Live class ended normally. Recording draft has been generated for review.",
      liveClass: sanitizedClass,
      inheritedLectureId: inheritedLecture?.id || null,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
