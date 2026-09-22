import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SubmitForReviewRequest } from "@/types/cms.types";

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

    // 2. Authorize Admin or Super Admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "ADMIN" && profile.role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "Forbidden: Only Administrators and Educators can submit content for review." },
        { status: 403 }
      );
    }

    const body: SubmitForReviewRequest = await request.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "Missing required parameters (entityType, entityId)." },
        { status: 400 }
      );
    }

    const tableMap: Record<string, string> = {
      BATCH: "cms_batches",
      CHAPTER: "cms_chapters",
      LECTURE: "cms_lectures",
      LIVE_CLASS: "cms_live_classes",
      STUDY_MATERIAL: "cms_study_materials",
    };

    const targetTable = tableMap[entityType];
    if (!targetTable) {
      return NextResponse.json(
        { error: `Invalid entity type: ${entityType}. Must be one of BATCH, CHAPTER, LECTURE, LIVE_CLASS, STUDY_MATERIAL.` },
        { status: 400 }
      );
    }

    // 3. Fetch existing entity
    const { data: existing, error: fetchError } = await supabase
      .from(targetTable)
      .select("*")
      .eq("id", entityId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Content record not found." },
        { status: 404 }
      );
    }

    // 4. Ownership verification for ADMIN role (Super Admin can submit any item)
    if (profile.role !== "SUPER_ADMIN") {
      const isOwner =
        existing.created_by === user.id ||
        existing.submitted_by === user.id ||
        existing.educator_id === user.id ||
        existing.lead_educator_id === user.id;

      if (!isOwner) {
        return NextResponse.json(
          { error: "Forbidden: You are not authorized to submit content created by another educator." },
          { status: 403 }
        );
      }
    }

    // 5. Enforce valid status transition: Only DRAFT or REJECTED -> PENDING_REVIEW
    if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
      return NextResponse.json(
        {
          error: `Invalid transition: Cannot submit content with status '${existing.status}'. Only DRAFT or REJECTED content can be submitted for review.`,
        },
        { status: 400 }
      );
    }

    // 6. Update status to PENDING_REVIEW
    const { error: updateError } = await supabase
      .from(targetTable)
      .update({
        status: "PENDING_REVIEW",
        submitted_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entityId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to submit content for review." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Content submitted for Super Admin review successfully.`,
      entityId,
      entityType,
      status: "PENDING_REVIEW",
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
