import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
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

    // 2. Fetch Live Class & Check Ownership / Authorization with safe projection
    const { data: liveClass, error: fetchErr } = await supabase
      .from("cms_live_classes")
      .select(`
        id,
        topic,
        subject,
        description,
        educator_name,
        educator_avatar_url,
        thumbnail_url,
        scheduled_start,
        scheduled_end,
        time_display,
        live_status,
        is_live,
        status_text,
        cta_text,
        educator_id,
        created_by,
        submitted_by,
        batch_id,
        subject_id,
        stream_provider,
        recording_status
      `)
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
    let isAuthorizedTeacher =
      isSuperAdmin ||
      liveClass.educator_id === user.id ||
      liveClass.created_by === user.id ||
      liveClass.submitted_by === user.id;

    if (!isAuthorizedTeacher && profile?.role === "ADMIN" && liveClass.batch_id) {
      const { data: isAssigned } = await supabase.rpc("is_batch_subject_teacher", {
        p_batch_id: liveClass.batch_id,
        p_subject_id: liveClass.subject_id || null,
      });
      if (isAssigned) {
        isAuthorizedTeacher = true;
      }
    }

    if (!isAuthorizedTeacher) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to end this Live Class session." },
        { status: 403 }
      );
    }

    // 3. Fetch private provider credentials server-side via admin client
    const adminClient = createAdminClient();
    const { data: privRow } = await adminClient
      .from("cms_live_classes")
      .select("provider_session_id, stream_room_url")
      .eq("id", liveClassId)
      .single();

    // 4. Conclude session in provider
    let recordingId = `rec_${liveClass.id}`;
    let actualRecordingPlaybackUrl: string | null = null;
    if (privRow?.provider_session_id) {
      const providerRes = await StreamingService.endLiveSession(privRow.provider_session_id);
      if (providerRes.recordingId) {
        recordingId = providerRes.recordingId;
      }
    }

    const nowIso = new Date().toISOString();

    // 5. Update Database State to COMPLETED with safe column projection
    const { data: updatedClass, error: updateErr } = await supabase
      .from("cms_live_classes")
      .update({
        live_status: "COMPLETED",
        is_live: false,
        status_text: "COMPLETED",
        cta_text: "View Recording",
        ended_at: nowIso,
        recording_status: "PROCESSING",
        updated_at: nowIso,
      })
      .eq("id", liveClassId)
      .select(`
        id,
        batch_id,
        subject,
        topic,
        educator_name,
        scheduled_start,
        scheduled_end,
        live_status,
        is_live,
        status_text,
        cta_text,
        ended_at,
        recording_status,
        updated_at
      `)
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message || "Failed to complete live class." }, { status: 500 });
    }

    // Record server-authoritative recording id via admin client
    await adminClient
      .from("cms_live_classes")
      .update({
        recording_id: recordingId,
        recording_url: actualRecordingPlaybackUrl,
      })
      .eq("id", liveClassId);

    // 6. Automatic Recording Draft Inheritance: Create recorded lecture draft
    const { data: inheritedLecture } = await CmsService.inheritLiveClassToLectureDraft(
      supabase,
      liveClassId,
      actualRecordingPlaybackUrl || undefined
    );

    return NextResponse.json({
      success: true,
      message: "Live class ended normally. Recording draft has been generated for review.",
      liveClass: updatedClass,
      inheritedLectureId: inheritedLecture?.id || null,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
