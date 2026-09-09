import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a standard Supabase browser client for use in Client Components.
 * Uses public publishable credentials only.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
