import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/student";
  // Strict open redirect defense: must begin with a single slash, no backslashes, no scheme, no protocol-relative "//"
  const isSafeRelativePath =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes("\\") &&
    !rawNext.includes("://");
  const next = isSafeRelativePath ? rawNext : "/student";

  if (code) {
    const supabase = await createClient();
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && sessionData?.user) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const baseOrigin = forwardedHost && !isLocalEnv ? `https://${forwardedHost}` : origin;

      let userRole = sessionData.user.user_metadata?.role;
      if (!userRole) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", sessionData.user.id)
          .maybeSingle();
        userRole = profile?.role;
      }

      if (searchParams.has("next")) {
        return NextResponse.redirect(`${baseOrigin}${next}`);
      }

      if (userRole === "ADMIN") {
        return NextResponse.redirect(`${baseOrigin}/?auth=register&type=admin&email_verified=true`);
      }

      return NextResponse.redirect(`${baseOrigin}/student`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/?auth=login&error=verification_failed`);
}
