import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SystemStateService } from "@/lib/services/system-state.service";
import { requireSuperAdminAAL2 } from "@/lib/supabase/auth-helpers";

export async function GET() {
  try {
    const maintenance = await SystemStateService.getMaintenanceState();
    return NextResponse.json({
      success: true,
      maintenance,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch maintenance state." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const response = NextResponse.next();

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
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    // Authorize Super Admin with mandatory AAL2 MFA verification
    const authResult = await requireSuperAdminAAL2(supabase);
    if (!authResult.authorized || !authResult.user) {
      return authResult.errorResponse!;
    }
    const user = authResult.user;

    const body = await request.json();
    const { enabled, message } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid 'enabled' status boolean." },
        { status: 400 }
      );
    }

    const updated = await SystemStateService.setMaintenanceState(
      enabled,
      user.email || "SUPER_ADMIN",
      message
    );

    return NextResponse.json({
      success: true,
      maintenance: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update maintenance state." },
      { status: 500 }
    );
  }
}
