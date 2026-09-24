import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { YouTubeOAuthService } from "@/lib/services/youtube-oauth.service";
import { YouTubeService } from "@/lib/services/youtube.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");
  const storedCookieValue = request.cookies.get("topveda_yt_oauth_state")?.value;

  // Helper to build redirect response and clear state cookie
  const makeRedirect = (queryParams: Record<string, string>) => {
    const url = new URL("/admin/cms/integrations/youtube", request.url);
    for (const [k, v] of Object.entries(queryParams)) {
      url.searchParams.set(k, v);
    }
    const response = NextResponse.redirect(url.toString(), { status: 302 });
    response.cookies.delete("topveda_yt_oauth_state");
    return response;
  };

  // 1. Handle explicit Google OAuth error query params (e.g. access_denied)
  if (googleError) {
    return makeRedirect({
      error: `Google OAuth authorization cancelled or denied: ${googleError}`,
    });
  }

  // 2. Validate OAuth CSRF State
  const stateValidation = YouTubeOAuthService.validateState(state, storedCookieValue);
  if (!stateValidation.valid) {
    return makeRedirect({
      error: stateValidation.error || "OAuth state verification failed. Please try connecting again.",
    });
  }

  // 3. Ensure authorization code is present
  if (!code) {
    return makeRedirect({
      error: "No authorization code returned from Google.",
    });
  }

  // 4. Construct authenticated Supabase client from session cookies
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

  try {
    // 5. Exchange authorization code for tokens
    const dynamicRedirectUri =
      process.env.GOOGLE_YOUTUBE_REDIRECT_URI?.trim() ||
      new URL("/api/youtube/oauth/callback", request.url).toString();
    const tokenResponse = await YouTubeOAuthService.exchangeCodeForTokens(code, dynamicRedirectUri);

    if (!tokenResponse.access_token) {
      return makeRedirect({
        error: "Google token exchange did not return a valid access token.",
      });
    }

    if (!tokenResponse.refresh_token) {
      return makeRedirect({
        error: "Google did not provide a refresh token. Reconnect and ensure offline access consent is approved.",
      });
    }

    // 6. Retrieve and verify authenticated YouTube channel
    const channelInfo = await YouTubeService.getAuthenticatedChannel(tokenResponse.access_token);

    // 7. Encrypt refresh token with AES-256-GCM
    const encryptedRefreshToken = YouTubeOAuthService.encryptToken(tokenResponse.refresh_token);

    // 8. Persist integration record to Supabase using authenticated client
    await YouTubeService.saveConnection({
      channelId: channelInfo.id,
      channelTitle: channelInfo.title,
      channelThumbnailUrl: channelInfo.thumbnailUrl,
      encryptedRefreshToken,
      tokenMetadata: {
        scope: tokenResponse.scope,
        tokenType: tokenResponse.token_type,
        connectedAt: new Date().toISOString(),
      },
      connectedBy: stateValidation.userId,
      client: supabase,
    });

    // 9. Redirect back with success indicator
    return makeRedirect({
      success: "true",
      channelTitle: channelInfo.title,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown integration failure";
    return makeRedirect({
      error: `YouTube connection error: ${errorMsg}`,
    });
  }
}
