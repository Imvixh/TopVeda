import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StudentStudyMaterialService } from "@/lib/services/student-study-material.service";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

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
      return NextResponse.json(
        { error: "Authentication required to download study materials." },
        { status: 401 }
      );
    }

    // Call service to verify enrollment, increment download counter, log activity, and generate download URL
    const downloadData = await StudentStudyMaterialService.generateAuthorizedDownload(
      supabase,
      user.id,
      id
    );

    return NextResponse.json(downloadData);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    const status = error.message.includes("FORBIDDEN")
      ? 403
      : error.message.includes("NOT_FOUND")
      ? 404
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
