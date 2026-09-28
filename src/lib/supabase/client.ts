import { createBrowserClient } from "@supabase/ssr";

const PUBLIC_SUPABASE_URL = "https://uxkvwuavidufnqliauuj.supabase.co";
const PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_zoSwfBIXs97hyeS0OfP2ig_SqtDAQK_";

/**
 * Creates a standard Supabase browser client for use in Client Components.
 * Uses public publishable credentials only.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

