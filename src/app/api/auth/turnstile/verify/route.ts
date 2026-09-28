import { NextRequest, NextResponse } from "next/server";
import { validateTurnstileToken, validateRequestOrigin, checkRateLimit } from "@/lib/utils/security";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate Origin / CSRF Defense
    const originCheck = validateRequestOrigin(request);
    if (!originCheck.valid) {
      return NextResponse.json(
        { success: false, error: originCheck.reason || "Cross-Origin request forbidden." },
        { status: 403 }
      );
    }

    // 2. Sliding Window Rate Limiting (60 requests/min per IP)
    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const rateLimit = checkRateLimit(`turnstile_verify_${clientIp}`, 60, 60000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many security verification requests. Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }

    // 3. Parse and validate payload
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request payload." },
        { status: 400 }
      );
    }

    const { token } = body;

    // 4. Server-Side Cloudflare Siteverify Verification with Replay Protection
    const result = await validateTurnstileToken(token, clientIp);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Security verification failed." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      hostname: result.hostname,
      challengeTs: result.challengeTs,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred during security verification." },
      { status: 500 }
    );
  }
}
