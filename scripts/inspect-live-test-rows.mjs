import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let envContent = "";
try {
  envContent = fs.readFileSync(path.join(rootDir, ".env.local"), "utf8");
} catch {
  envContent = fs.readFileSync(path.join(rootDir, ".env.production"), "utf8");
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://uxkvwuavidufnqliauuj.supabase.co";
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || anonKey;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function inspectSafe() {
  const { data: safeOptions, error: soErr } = await supabase.from("student_test_question_options_safe").select("*");
  console.log("Safe options length:", safeOptions?.length);
  console.log("Sample safe options:", safeOptions?.slice(0, 5));

  // Check RLS policies on student_tests: why did select * from student_tests return 0?
  // Let's check RLS policies in migration:
  // "public_read_published_tests" ON public.student_tests FOR SELECT TO authenticated, anon USING (status = 'PUBLISHED' AND is_visible = TRUE);
  // Wait! In migration:
  // Is RLS policy TO authenticated only or TO authenticated, anon?
}

inspectSafe().catch(console.error);
