import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { CmsService } from "@/lib/services/cms.service";
import { ReviewDecisionRequest } from "@/types/cms.types";
import { requireSuperAdminAAL2 } from "@/lib/supabase/auth-helpers";

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

    // Authorize Super Admin with mandatory AAL2 MFA verification
    const authResult = await requireSuperAdminAAL2(supabase);
    if (!authResult.authorized || !authResult.user) {
      return authResult.errorResponse!;
    }
    const user = authResult.user;

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
