import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SystemStateService } from "@/lib/services/system-state.service";

export async function GET() {
  try {
    const state = await SystemStateService.getLeaderboardState();
    return NextResponse.json({
      success: true,
      isEnabled: state.isEnabled,
      updatedAt: state.updatedAt,
      updatedBy: state.updatedBy,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "SUPER_ADMIN" && profile?.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Super Admin or Admin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Invalid 'enabled' boolean parameter." },
        { status: 400 }
      );
    }

    const updated = await SystemStateService.setLeaderboardState(enabled, user.id);

    return NextResponse.json({
      success: true,
      isEnabled: updated.isEnabled,
      updatedAt: updated.updatedAt,
      updatedBy: updated.updatedBy,
      message: `Leaderboard is now ${enabled ? "VISIBLE to all students" : "HIDDEN / PAUSED for students"}.`,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
