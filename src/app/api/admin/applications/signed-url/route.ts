import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
