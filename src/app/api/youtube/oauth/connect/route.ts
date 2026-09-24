import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { YouTubeOAuthService } from "@/lib/services/youtube-oauth.service";

export async function GET(request: NextRequest) {
  try {
    // 1. Check configuration
    if (!YouTubeOAuthService.isConfigured()) {
      return NextResponse.json(
        { error: "YouTube OAuth credentials are not configured on the server." },
        { status: 500 }
      );
    }

    // 2. Authenticate User via Supabase
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
        { error: "Unauthorized: Please log in as Super Admin." },
        { status: 401 }
      );
    }

    // 3. Verify SUPER_ADMIN role server-side
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can initiate YouTube connection." },
        { status: 403 }
      );
    }

    // 4. Generate cryptographically secure OAuth state
    const { state, cookieValue } = YouTubeOAuthService.generateState(user.id);
    const authUrl = YouTubeOAuthService.buildAuthorizationUrl(state);

    // 5. Create redirect response and attach short-lived secure state cookie
    const response = NextResponse.redirect(authUrl, { status: 302 });

    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set({
      name: "topveda_yt_oauth_state",
      value: cookieValue,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/api/youtube/oauth",
      maxAge: 10 * 60, // 10 minutes
    });

    return response;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
