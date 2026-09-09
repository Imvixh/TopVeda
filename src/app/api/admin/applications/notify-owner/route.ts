import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { EmailService } from "@/lib/email/email-service";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { applicationId, applicantName, applicantEmail, applicantPhone } = body;

    if (!applicationId || !applicantName || !applicantEmail) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const reviewUrl = `${origin}/admin/applications`;

    // Send owner notification email
    const emailResult = await EmailService.sendOwnerNewApplicationAlert({
      applicantName,
      applicantEmail,
      applicantPhone: applicantPhone || user.phone || "",
      applicationId,
      reviewUrl,
    });

    return NextResponse.json({ success: true, emailResult });
  } catch (err: unknown) {
    console.error("[NotifyOwner API] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
