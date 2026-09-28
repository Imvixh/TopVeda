import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uxkvwuavidufnqliauuj.supabase.co"
    ),
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      "sb_publishable_zoSwfBIXs97hyeS0OfP2ig_SqtDAQK_"
    ),
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "sb_publishable_zoSwfBIXs97hyeS0OfP2ig_SqtDAQK_"
    ),
    "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(
      process.env.NEXT_PUBLIC_APP_URL || "https://topveda.in"
    ),
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
});
