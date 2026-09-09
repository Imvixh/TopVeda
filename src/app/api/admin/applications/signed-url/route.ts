import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

    // 1. Verify user session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify Super Admin authorization
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can generate document review URLs." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { path } = body;

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Invalid document path" }, { status: 400 });
    }

    // 3. Create 5-minute (300 seconds) signed URL
    const { data: signedData, error: signError } = await supabase.storage
      .from("admin-documents")
      .createSignedUrl(path, 300);

    if (signError || !signedData?.signedUrl) {
      return NextResponse.json(
        { error: signError?.message || "Failed to generate signed document URL." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl: signedData.signedUrl,
    });
  } catch (err: unknown) {
    console.error("[SignedURL API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
