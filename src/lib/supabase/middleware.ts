import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  // If Supabase credentials are not yet configured, allow public browsing
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: Do not use getSession() inside middleware as it can be spoofed;
  // getUser() sends a request to the Supabase Auth server to validate the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 1. Protected Student Routes: /student/*
  if (pathname.startsWith("/student")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      url.searchParams.set("portal", "student");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Verify role in public.profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Allow Educators and Super Admins to enter Live Classroom for monitoring and interaction moderation
    const isLiveClassroom = pathname.startsWith("/student/live/");

    if (!profile || profile.role !== "STUDENT") {
      if (profile?.role === "SUPER_ADMIN") {
        if (isLiveClassroom) {
          return supabaseResponse;
        }
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      if (profile?.role === "ADMIN") {
        // Check if admin is approved
        const { data: app } = await supabase
          .from("admin_applications")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "APPROVED")
          .maybeSingle();

        if (app) {
          if (isLiveClassroom) {
            return supabaseResponse;
          }
          return NextResponse.redirect(new URL("/admin", request.url));
        }

        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("auth", "login");
        url.searchParams.set("portal", "admin");
        url.searchParams.set("error", "pending");
        return NextResponse.redirect(url);
      }

      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  // 2. Protected Admin Routes: /admin/*
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      url.searchParams.set("portal", "admin");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Verify role in public.profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      url.searchParams.set("portal", "admin");
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }

    if (profile.role === "STUDENT") {
      const url = request.nextUrl.clone();
      url.pathname = "/student";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }

    if (profile.role === "ADMIN") {
      // Must have APPROVED admin application
      const { data: app } = await supabase
        .from("admin_applications")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "APPROVED")
        .maybeSingle();

      if (!app) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.searchParams.set("auth", "login");
        url.searchParams.set("portal", "admin");
        url.searchParams.set("error", "pending");
        return NextResponse.redirect(url);
      }
    }
    // SUPER_ADMIN is allowed directly
  }

  return supabaseResponse;
}
