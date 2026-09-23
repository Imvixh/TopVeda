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

const supabase = createClient(supabaseUrl, anonKey);

async function testAuthSession() {
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: "test_student_phase5@topveda.com",
    password: "Password123!",
  });

  console.log("Sign in with existing student:", signInData?.session ? "SESSION ACTIVE" : "NO SESSION", signInErr?.message || "");

  // If failed, let's test signing up with auto-confirm if enabled or check session
  const testEmail = `student_${Date.now()}@topveda.test`;
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: "Password123!",
  });
  console.log("Sign up session:", signUpData?.session ? "SESSION PRESENT" : "SESSION IS NULL (Email confirmation required)");
}

testAuthSession().catch(console.error);
