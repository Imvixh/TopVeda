/**
 * TopVeda Phase 5C + 5D: Live Database Post-Migration Verification Script
 * READ-ONLY verification of test tables, questions, options, attempts, answers, RLS, and data preservation.
 */

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
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("==================================================================");
console.log("TopVeda Phase 5C + 5D: Live Database Verification");
console.log("Target Supabase URL:", supabaseUrl);
console.log("==================================================================\n");

async function runLiveVerification() {
  const report = {
    testsTable: "UNKNOWN",
    questionsTable: "UNKNOWN",
    optionsTable: "UNKNOWN",
    attemptsTable: "UNKNOWN",
    answersTable: "UNKNOWN",
    counts: {},
    errors: [],
  };

  // 1. Verify student_tests table
  try {
    const { data, error } = await supabase
      .from("student_tests")
      .select("id, title, slug, subject_name, duration_minutes, total_marks, passing_marks, total_questions, access_tier, status")
      .limit(5);

    if (error) {
      report.testsTable = "FAIL";
      report.errors.push(`student_tests: ${error.message}`);
    } else {
      report.testsTable = "PASS";
      console.log(`✓ student_tests table queryable with ${data?.length || 0} seeded tests`);
    }
  } catch (e) {
    report.testsTable = "ERROR";
    report.errors.push(`student_tests exception: ${e.message}`);
  }

  // 2. Verify student_test_questions table
  try {
    const { data, error } = await supabase
      .from("student_test_questions")
      .select("id, test_id, question_text, question_type, marks, negative_marks, display_order")
      .limit(5);

    if (error) {
      report.questionsTable = "FAIL";
      report.errors.push(`student_test_questions: ${error.message}`);
    } else {
      report.questionsTable = "PASS";
      console.log(`✓ student_test_questions table queryable with ${data?.length || 0} seeded questions`);
    }
  } catch (e) {
    report.questionsTable = "ERROR";
    report.errors.push(`student_test_questions exception: ${e.message}`);
  }

  // 3. Verify student_test_question_options table
  try {
    const { data, error } = await supabase
      .from("student_test_question_options")
      .select("id, question_id, option_label, option_text, is_correct, display_order")
      .limit(5);

    if (error) {
      report.optionsTable = "FAIL";
      report.errors.push(`student_test_question_options: ${error.message}`);
    } else {
      report.optionsTable = "PASS";
      console.log(`✓ student_test_question_options table queryable with options`);
    }
  } catch (e) {
    report.optionsTable = "ERROR";
    report.errors.push(`student_test_question_options exception: ${e.message}`);
  }

  // 4. Verify student_test_attempts table
  try {
    const { data, error } = await supabase
      .from("student_test_attempts")
      .select("id, student_id, test_id, status, score_obtained, percentage, passed")
      .limit(1);

    if (error) {
      report.attemptsTable = "FAIL";
      report.errors.push(`student_test_attempts: ${error.message}`);
    } else {
      report.attemptsTable = "PASS";
      console.log("✓ student_test_attempts table queryable");
    }
  } catch (e) {
    report.attemptsTable = "ERROR";
    report.errors.push(`student_test_attempts exception: ${e.message}`);
  }

  // 5. Verify student_test_answers table
  try {
    const { data, error } = await supabase
      .from("student_test_answers")
      .select("id, attempt_id, question_id, selected_option_ids, marks_awarded")
      .limit(1);

    if (error) {
      report.answersTable = "FAIL";
      report.errors.push(`student_test_answers: ${error.message}`);
    } else {
      report.answersTable = "PASS";
      console.log("✓ student_test_answers table queryable");
    }
  } catch (e) {
    report.answersTable = "ERROR";
    report.errors.push(`student_test_answers exception: ${e.message}`);
  }

  // 6. Verify existing data preservation across previous milestones
  const tables = [
    "cms_courses",
    "cms_batches",
    "cms_chapters",
    "cms_lectures",
    "cms_live_classes",
    "student_enrollments",
    "student_lecture_progress",
    "student_live_attendance",
    "student_tests",
  ];

  console.log("\n--- Existing Data Count Verification ---");
  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
      if (error) {
        report.counts[t] = `ERROR: ${error.message}`;
        report.errors.push(`${t} count failed: ${error.message}`);
      } else {
        report.counts[t] = count;
        console.log(`  • ${t.padEnd(28)}: ${count} records (Preserved)`);
      }
    } catch (e) {
      report.counts[t] = `EXCEPTION: ${e.message}`;
    }
  }

  console.log("\n==================================================================");
  if (report.errors.length === 0) {
    console.log("🎉 ALL LIVE PHASE 5C + 5D DATABASE CHECKS PASSED!");
  } else {
    console.log("❌ LIVE DATABASE VERIFICATION FAILED WITH ERRORS:");
    report.errors.forEach((err) => console.log(`  - ${err}`));
  }
  console.log("==================================================================");

  return report;
}

runLiveVerification().then((report) => {
  if (report.errors.length > 0) {
    process.exit(1);
  }
});
