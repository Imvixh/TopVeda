import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { CmsService } from "@/lib/services/cms.service";
import { ReviewDecisionRequest } from "@/types/cms.types";

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

    // 2. Authorize Super Admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can review submissions." },
        { status: 403 }
      );
    }

    const body: ReviewDecisionRequest = await request.json();
    const { entityType, entityId, decision, reviewNote } = body;

    if (!entityType || !entityId || !decision) {
      return NextResponse.json(
        { error: "Missing required parameters (entityType, entityId, decision)." },
        { status: 400 }
      );
    }

    const result = await CmsService.reviewContentSubmission(
      supabase,
      { entityType, entityId, decision, reviewNote },
      user.id
    );

    if (!result.success || result.error) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to update review status." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Content successfully marked as ${decision}.`,
      entityId,
      decision,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
