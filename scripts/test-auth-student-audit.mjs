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

async function testAuth() {
  console.log("Testing auth and student_tests reading...");

  // Try sign in with a demo/test user or anonymous if enabled
  const testEmail = `audit_student_${Date.now()}@topveda.test`;
  const testPassword = "AuditPassword123!";

  console.log("Signing up temporary audit student session...");
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  if (signUpErr) {
    console.log("Sign up result:", signUpErr.message);
  } else {
    console.log("Sign up successful! Authenticated User ID:", signUpData?.user?.id);
  }

  // Now query student_tests with this authenticated session
  const { data: tests, error: tErr } = await supabase
    .from("student_tests")
    .select("id, title, slug, status, is_visible, test_type, total_marks, total_questions");

  console.log("\n--- Authenticated Student Query on `student_tests` ---");
  console.log("Tests returned:", tests?.length, tErr ? `Error: ${tErr.message}` : "SUCCESS");
  tests?.forEach(t => console.log(`  • [${t.id}] "${t.title}" (${t.slug}) - ${t.test_type}, Marks: ${t.total_marks}, Status: ${t.status}`));

  // Query student_test_questions with authenticated session
  const { data: questions, error: qErr } = await supabase
    .from("student_test_questions")
    .select("id, test_id, question_text, marks, display_order")
    .order("display_order", { ascending: true });

  console.log("\n--- Authenticated Student Query on `student_test_questions` ---");
  console.log("Questions returned:", questions?.length, qErr ? `Error: ${qErr.message}` : "SUCCESS");
  questions?.forEach(q => console.log(`  • [${q.id}] Test: ${q.test_id}, Marks: ${q.marks}, Text: "${q.question_text.slice(0, 40)}..."`));

  // Query raw student_test_question_options with authenticated student (MUST RETURN 0 or FAIL because only Admin has access to raw options)
  const { data: rawOptions, error: roErr } = await supabase
    .from("student_test_question_options")
    .select("id, is_correct");

  console.log("\n--- Authenticated Student Query on RAW `student_test_question_options` ---");
  console.log("Raw Options returned to student:", rawOptions?.length, roErr ? `Error: ${roErr.message}` : "SECURE (0 rows)");

  // Query safe options view with authenticated student
  const { data: safeOptions, error: soErr } = await supabase
    .from("student_test_question_options_safe")
    .select("id, question_id, option_label, option_text, display_order");

  console.log("\n--- Authenticated Student Query on `student_test_question_options_safe` ---");
  console.log("Safe Options returned to student:", safeOptions?.length, soErr ? `Error: ${soErr.message}` : "SUCCESS");

  // Attempt direct INSERT on student_test_attempts with student session (MUST FAIL)
  if (signUpData?.user?.id) {
    const { error: insertAttemptErr } = await supabase
      .from("student_test_attempts")
      .insert({
        student_id: signUpData.user.id,
        test_id: "77000000-0000-0000-0000-000000000001",
        score_obtained: 100,
        status: "COMPLETED",
        percentage: 100,
        passed: true,
      });

    console.log("\n--- Student Direct INSERT on `student_test_attempts` ---");
    console.log("Direct student attempt write blocked by RLS:", insertAttemptErr ? `YES (${insertAttemptErr.message})` : "FAILED SECURITY (Allowed)");
  }
}

testAuth().catch(console.error);
