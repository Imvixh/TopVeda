import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StudentProfileService } from "@/lib/services/student-profile.service";
import { UpdateStudentPreferencesPayload } from "@/types/student-profile.types";

export async function PATCH(request: NextRequest) {
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

    const payload = (await request.json()) as UpdateStudentPreferencesPayload;

    const result = await StudentProfileService.updateStudentPreferences(
      supabase,
      user.id,
      payload
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update preferences" },
        { status: 400 }
      );
    }

    return NextResponse.json(result.preferences);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
