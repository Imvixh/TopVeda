import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { NotificationService } from "@/lib/services/notification.service";
import { NotificationFilterCategory } from "@/types/cms.types";

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const { searchParams } = new URL(request.url);
    const category = (searchParams.get("category") || "ALL") as NotificationFilterCategory;

    const data = await NotificationService.getStudentNotifications(
      supabase,
      user.id,
      category
    );

    return NextResponse.json(data);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
