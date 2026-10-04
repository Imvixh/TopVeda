import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production" || process.env.NODE_ENV === "production";
  const env = loadEnv(mode, process.cwd(), "");

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://uxkvwuavidufnqliauuj.supabase.co";

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_zoSwfBIXs97hyeS0OfP2ig_SqtDAQK_";

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    (isProduction ? "https://topveda.in" : "http://localhost:3000");

  // Production environment resolution:
  // Must use explicit production build env / .env.production, and NEVER accept local development test key
  let turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
  if (!turnstileSiteKey) {
    if (!isProduction) {
      turnstileSiteKey = env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
    } else {
      // In production mode, ignore test key that might be present in local development .env.local
      const candidate = env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
      if (candidate && candidate !== "1x00000000000000000000AA") {
        turnstileSiteKey = candidate;
      }
    }
  }

  // Strict Production Environment Guard
  if (isProduction) {
    if (!turnstileSiteKey) {
      throw new Error(
        "[Security Configuration Error] NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY is missing in production build environment. Production builds MUST supply a valid production Turnstile site key and must never fall back to test credentials."
      );
    }
    if (turnstileSiteKey === "1x00000000000000000000AA") {
      throw new Error(
        "[Security Configuration Error] Test Turnstile site key (1x00000000000000000000AA) cannot be used for production builds. Please supply the real Cloudflare production site key."
      );
    }
  }

  const resolvedTurnstileKey = turnstileSiteKey || (isProduction ? "" : "1x00000000000000000000AA");

  return {
    define: {
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseAnonKey),
      "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(appUrl),
      "process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY": JSON.stringify(resolvedTurnstileKey),
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
      }),
    ],
  };
});
