import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { CmsTestService } from "@/lib/services/cms-test.service";

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden. Super Administrator privileges required." }, { status: 403 });
    }

    const { jsonString } = await request.json();

    if (!jsonString || typeof jsonString !== "string") {
      return NextResponse.json({
        valid: false,
        errors: ["Missing jsonString payload in request body."],
        warnings: [],
      });
    }

    const adminClient = createAdminClient();
    const taxonomy = await CmsTestService.getAcademicTaxonomy(adminClient);

    const validation = CmsTestService.validateAndParseJson(jsonString, taxonomy);

    return NextResponse.json(validation);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
