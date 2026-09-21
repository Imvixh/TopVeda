import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { StorageService, CmsBucketId } from "@/lib/services/storage.service";

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

    const body = await request.json();
    const { bucket, path, expiresIn } = body;

    if (!bucket || !path) {
      return NextResponse.json(
        { error: "Missing required parameters (bucket, path)." },
        { status: 400 }
      );
    }

    const validBuckets: CmsBucketId[] = [
      "cms-banners",
      "lecture-thumbnails",
      "cms-assets",
      "study-materials",
    ];

    if (!validBuckets.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket specified." }, { status: 400 });
    }

    const { signedUrl, error } = await StorageService.getSignedUrl(
      supabase,
      bucket,
      path,
      expiresIn || 3600
    );

    if (error || !signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Failed to generate signed URL." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn: expiresIn || 3600,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
