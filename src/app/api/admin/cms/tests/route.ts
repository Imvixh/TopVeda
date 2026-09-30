import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { CmsTestService, AdminTestUpsertPayload } from "@/lib/services/cms-test.service";

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
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // Verify role in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "SUPER_ADMIN" && profile.role !== "ADMIN" && profile.role !== "TEACHER")) {
      return NextResponse.json({ error: "Forbidden. Admin privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const testType = searchParams.get("testType") || undefined;
    const status = searchParams.get("status") || undefined;
    const boardId = searchParams.get("boardId") || undefined;
    const classId = searchParams.get("classId") || undefined;
    const subjectId = searchParams.get("subjectId") || undefined;

    // Resolve privileged db client:
    // If SUPABASE_SERVICE_ROLE_KEY is present, use privileged service-role admin client.
    // Otherwise, use authenticated Super Admin / Admin server client respecting RLS.
    const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;

    // Ensure initial demo data exists if empty
    const { count } = await dbClient.from("student_tests").select("*", { count: "exact", head: true });
    if (!count || count === 0) {
      await CmsTestService.seedDefaultDummyTests(dbClient);
    }

    const [catalogResult, taxonomy] = await Promise.all([
      CmsTestService.getAdminTestsCatalog(dbClient, {
        search,
        testType,
        status,
        boardId,
        classId,
        subjectId,
      }),
      CmsTestService.getAcademicTaxonomy(dbClient),
    ]);

    return NextResponse.json({
      tests: catalogResult.tests,
      stats: catalogResult.stats,
      taxonomy,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    // Role check: Strictly Super Admin only for test creation & publishing
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Super Administrator privileges required." }, { status: 403 });
    }

    const payload: AdminTestUpsertPayload = await request.json();

    // Prefer privileged service-role admin client if SUPABASE_SERVICE_ROLE_KEY is present;
    // Otherwise use authenticated Super Admin client authorized by RLS (is_admin_or_super_admin).
    const dbClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : supabase;
    const result = await CmsTestService.upsertTestWithQuestions(dbClient, payload, user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      testId: result.testId,
      message: payload.status === "PUBLISHED" ? "Test created & published successfully." : "Draft test saved successfully.",
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
