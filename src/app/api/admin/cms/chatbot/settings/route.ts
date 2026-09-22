import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { CmsChatbotSettings } from "@/types/cms.types";

/**
 * Super Admin Chatbot Settings Server-Side API Proxy
 * 
 * Provides authorized access to full chatbot configuration (including sensitive fields
 * such as system_instructions, model_provider, model_name, rate limits).
 * 
 * Column-level security on PostgreSQL shields these fields from direct public/student queries.
 * Only SUPER_ADMIN users verified server-side can read or update these settings.
 */

function getServiceRoleClient(userServerClient: ReturnType<typeof createServerClient>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  // Fallback to user server client if service_role key is not configured
  return userServerClient;
}

// ----------------------------------------------------------------------------
// GET: Retrieve complete chatbot settings for SUPER_ADMIN
// ----------------------------------------------------------------------------
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

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorize Super Admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can view chatbot settings." },
        { status: 403 }
      );
    }

    // 3. Query settings using privileged server client
    const db = getServiceRoleClient(supabase);
    const { data, error } = await db
      .from("cms_chatbot_settings")
      .select(
        `
        id,
        name,
        greeting,
        welcome_message,
        placeholder_text,
        external_url,
        portal_visibility,
        is_enabled,
        maintenance_mode,
        maintenance_message,
        system_instructions,
        academic_scope,
        model_provider,
        model_name,
        temperature,
        max_tokens,
        rate_limit_per_minute,
        max_daily_queries_per_student,
        status,
        starts_at,
        ends_at,
        created_at,
        updated_at
      `
      )
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to retrieve chatbot settings." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data as CmsChatbotSettings | null,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// POST / PATCH: Update or initialize singleton chatbot settings for SUPER_ADMIN
// ----------------------------------------------------------------------------
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

    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorize Super Admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only Super Administrators can update chatbot settings." },
        { status: 403 }
      );
    }

    // 3. Parse and sanitize payload
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body: expected JSON object." },
        { status: 400 }
      );
    }

    // Sanitize to only permitted schema fields
    const updatePayload: Record<string, unknown> = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.name === "string") updatePayload.name = body.name.trim();
    if (typeof body.greeting === "string") updatePayload.greeting = body.greeting.trim();
    if (typeof body.welcome_message === "string") updatePayload.welcome_message = body.welcome_message.trim();
    if (typeof body.placeholder_text === "string") updatePayload.placeholder_text = body.placeholder_text.trim();
    if (typeof body.external_url === "string" || body.external_url === null) updatePayload.external_url = body.external_url;
    if (typeof body.is_enabled === "boolean") updatePayload.is_enabled = body.is_enabled;
    if (typeof body.maintenance_mode === "boolean") updatePayload.maintenance_mode = body.maintenance_mode;
    if (typeof body.maintenance_message === "string") updatePayload.maintenance_message = body.maintenance_message.trim();
    if (typeof body.system_instructions === "string") updatePayload.system_instructions = body.system_instructions.trim();
    if (typeof body.model_provider === "string") updatePayload.model_provider = body.model_provider;
    if (typeof body.model_name === "string") updatePayload.model_name = body.model_name.trim();
    if (typeof body.temperature === "number") updatePayload.temperature = Math.max(0, Math.min(2, body.temperature));
    if (typeof body.max_tokens === "number") updatePayload.max_tokens = Math.max(1, body.max_tokens);
    if (typeof body.rate_limit_per_minute === "number") updatePayload.rate_limit_per_minute = Math.max(1, body.rate_limit_per_minute);
    if (typeof body.max_daily_queries_per_student === "number") updatePayload.max_daily_queries_per_student = Math.max(1, body.max_daily_queries_per_student);
    if (body.portal_visibility && typeof body.portal_visibility === "object") updatePayload.portal_visibility = body.portal_visibility;
    if (body.academic_scope && typeof body.academic_scope === "object") updatePayload.academic_scope = body.academic_scope;

    const db = getServiceRoleClient(supabase);

    // Check existing singleton row
    const { data: existing } = await db
      .from("cms_chatbot_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    let error;
    if (existing) {
      const res = await db
        .from("cms_chatbot_settings")
        .update(updatePayload)
        .eq("id", existing.id);
      error = res.error;
    } else {
      updatePayload.created_by = user.id;
      const res = await db
        .from("cms_chatbot_settings")
        .insert(updatePayload);
      error = res.error;
    }

    if (error) {
      return NextResponse.json(
        { error: "Failed to update chatbot settings." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Chatbot settings updated successfully.",
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
