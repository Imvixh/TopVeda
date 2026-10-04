import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SystemStateService } from "@/lib/services/system-state.service";
import { renderMaintenanceHtml } from "@/lib/utils/maintenance-page";

const PUBLIC_SUPABASE_URL = "https://uxkvwuavidufnqliauuj.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_zoSwfBIXs97hyeS0OfP2ig_SqtDAQK_";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const pathname = request.nextUrl.pathname;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase credentials are not configured, pass through
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

  // Authoritatively authenticate user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    userRole = profile?.role || null;
  }

  // --------------------------------------------------------------------------
  // 1. GLOBAL MAINTENANCE MODE GATE
  // --------------------------------------------------------------------------
  const maintenance = await SystemStateService.getMaintenanceState();
  if (maintenance.isEnabled) {
    const isSuperAdminControlPath =
      pathname === "/super-admin" ||
      pathname.startsWith("/api/auth/super-admin-login") ||
      pathname.startsWith("/api/admin/system/") ||
      (userRole === "SUPER_ADMIN" &&
        (pathname === "/admin" ||
          pathname.startsWith("/admin/") ||
          pathname.startsWith("/api/admin/")));

    if (!isSuperAdminControlPath) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          {
            error: "Service Unavailable: TopVeda is currently undergoing scheduled maintenance.",
            maintenance: true,
            message: maintenance.message,
          },
          {
            status: 503,
            headers: {
              "Retry-After": "300",
            },
          }
        );
      }

      return new NextResponse(renderMaintenanceHtml(maintenance.message), {
        status: 503,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Retry-After": "300",
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 2. DEDICATED SUPER ADMIN ENTRY ROUTE: /super-admin
  // --------------------------------------------------------------------------
  if (pathname === "/super-admin") {
    if (user && userRole) {
      if (userRole === "SUPER_ADMIN") {
        // Only redirect to dashboard if Super Admin has already achieved AAL2
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === "aal2") {
          return NextResponse.redirect(new URL("/admin", request.url));
        }
        // If session is at AAL1, allow user to view /super-admin to complete MFA challenge/enrollment
        return supabaseResponse;
      }
      if (userRole === "STUDENT") {
        return NextResponse.redirect(new URL("/student", request.url));
      }
      if (userRole === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    }
    // Unauthenticated user is allowed to view the Super Admin Login page
    return supabaseResponse;
  }

  // --------------------------------------------------------------------------
  // 3. PROTECTED STUDENT ROUTES: /student/*
  // --------------------------------------------------------------------------
  if (pathname.startsWith("/student")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "login");
      url.searchParams.set("portal", "student");
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    const isLiveClassroom = pathname.startsWith("/student/live/");

    if (!userRole || userRole !== "STUDENT") {
      if (userRole === "SUPER_ADMIN") {
        if (isLiveClassroom) {
          return supabaseResponse;
        }
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      if (userRole === "ADMIN") {
        if (isLiveClassroom) {
          return supabaseResponse;
        }
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }
  }

  // --------------------------------------------------------------------------
  // 4. PROTECTED ADMIN ROUTES: /admin and /admin/*
  // --------------------------------------------------------------------------
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // A. Unauthenticated access to /admin renders the dedicated Admin Auth page
    if (!user) {
      if (pathname === "/admin") {
        return supabaseResponse;
      }
      // Sub-routes redirect unauthenticated users to /admin
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (!userRole) {
      if (pathname === "/admin") {
        return supabaseResponse;
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }

    // B. Reject Student attempting Admin Portal
    if (userRole === "STUDENT") {
      const url = request.nextUrl.clone();
      url.pathname = "/student";
      url.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(url);
    }

    // C. Administrator Scoping
    if (userRole === "ADMIN") {
      // Normal Admins cannot access Super Admin CMS suite or Application Review vault
      if (pathname.startsWith("/admin/cms") || pathname.startsWith("/admin/applications")) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      // Verify APPROVED status for sub-routes
      if (pathname.startsWith("/admin/")) {
        const { data: app } = await supabase
          .from("admin_applications")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "APPROVED")
          .maybeSingle();

        if (!app) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin";
          url.searchParams.set("error", "pending");
          return NextResponse.redirect(url);
        }
      }
    }

    // D. Super Administrator MFA Gate
    if (userRole === "SUPER_ADMIN") {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel !== "aal2") {
        const url = request.nextUrl.clone();
        url.pathname = "/super-admin";
        url.searchParams.set("mfa", "required");
        url.searchParams.set("redirect", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
