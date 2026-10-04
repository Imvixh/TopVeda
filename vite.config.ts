import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import fs from "node:fs";

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
  let turnstileSiteKey = "";
  if (isProduction) {
    const rawProc = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
    if (rawProc && rawProc !== "1x00000000000000000000AA") {
      turnstileSiteKey = rawProc;
    } else {
      const rawEnv = env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;
      if (rawEnv && rawEnv !== "1x00000000000000000000AA") {
        turnstileSiteKey = rawEnv;
      } else {
        // Fallback: Read directly from .env.production if .env.local or process.env masked it
        try {
          if (fs.existsSync(".env.production")) {
            const prodContent = fs.readFileSync(".env.production", "utf8");
            const match = prodContent.match(/NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY=([^\r\n]+)/);
            if (match && match[1].trim() && match[1].trim() !== "1x00000000000000000000AA") {
              turnstileSiteKey = match[1].trim().replace(/^["']|["']$/g, "");
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } else {
    turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || "";
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
