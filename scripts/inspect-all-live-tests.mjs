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
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function inspectAllTests() {
  console.log("================================================================================");
  console.log("  TOPVEDA: LIVE DATABASE INSPECTION OF ALL 'student_tests' RECORDS");
  console.log("================================================================================\n");

  const { data: tests, error: tErr } = await client
    .from("student_tests")
    .select(`
      id,
      title,
      slug,
      test_type,
      status,
      is_visible,
      duration_minutes,
      total_marks,
      passing_marks,
      total_questions,
      access_tier,
      subject_name,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (tErr) {
    console.error("Failed to query student_tests:", tErr);
    return;
  }

  const { data: questions } = await client
    .from("student_test_questions")
    .select("id, test_id");

  const { data: attempts } = await client
    .from("student_test_attempts")
    .select("id, test_id, status, student_id, score_obtained, percentage");

  const qCounts = new Map();
  (questions || []).forEach((q) => {
    qCounts.set(q.test_id, (qCounts.get(q.test_id) || 0) + 1);
  });

  const aCounts = new Map();
  (attempts || []).forEach((a) => {
    aCounts.set(a.test_id, (aCounts.get(a.test_id) || 0) + 1);
  });

  console.log(`TOTAL student_tests RECORDS IN DATABASE: ${tests.length}\n`);

  console.log("-----------------------------------------------------------------------------------------------------------------------------------------------------");
  console.log(
    "| " +
      "ID".padEnd(38) +
      "| " +
      "Title".padEnd(60) +
      "| " +
      "Type".padEnd(16) +
      "| " +
      "Status".padEnd(12) +
      "| " +
      "Questions".padEnd(11) +
      "| " +
      "Attempts".padEnd(10) +
      "| " +
      "Student Visible".padEnd(17) +
      "|"
  );
  console.log("-----------------------------------------------------------------------------------------------------------------------------------------------------");

  tests.forEach((t) => {
    const qCount = qCounts.get(t.id) || 0;
    const aCount = aCounts.get(t.id) || 0;
    const isVisibleToStudents = t.status === "PUBLISHED" && t.is_visible === true;

    console.log(
      "| " +
        t.id.padEnd(38) +
        "| " +
        (t.title.length > 58 ? t.title.substring(0, 55) + "..." : t.title).padEnd(60) +
        "| " +
        t.test_type.padEnd(16) +
        "| " +
        t.status.padEnd(12) +
        "| " +
        String(qCount).padEnd(11) +
        "| " +
        String(aCount).padEnd(10) +
        "| " +
        (isVisibleToStudents ? "YES (Visible)" : "NO (Hidden)").padEnd(17) +
        "|"
    );
  });

  console.log("-----------------------------------------------------------------------------------------------------------------------------------------------------\n");

  console.log("DETAILED ATTEMPTS BREAKDOWN:");
  if (!attempts || attempts.length === 0) {
    console.log("  No student attempts found in database.\n");
  } else {
    attempts.forEach((a) => {
      const test = tests.find((t) => t.id === a.test_id);
      console.log(`  • Attempt ID: ${a.id} | Test: "${test?.title || a.test_id}" | Student ID: ${a.student_id} | Status: ${a.status} | Score: ${a.score_obtained} (${a.percentage}%)`);
    });
    console.log("");
  }

  // Summary categorization
  const publishedCount = tests.filter((t) => t.status === "PUBLISHED" && t.is_visible).length;
  const draftCount = tests.filter((t) => t.status === "DRAFT").length;
  const archivedCount = tests.filter((t) => t.status === "ARCHIVED" || !t.is_visible).length;
  const withAttempts = tests.filter((t) => (aCounts.get(t.id) || 0) > 0);
  const withoutAttempts = tests.filter((t) => (aCounts.get(t.id) || 0) === 0);

  console.log("INVENTORY SUMMARY:");
  console.log(`  • Total Tests: ${tests.length}`);
  console.log(`  • Published & Student-Visible: ${publishedCount}`);
  console.log(`  • Drafts: ${draftCount}`);
  console.log(`  • Archived / Hidden: ${archivedCount}`);
  console.log(`  • Tests with Student Attempts (Soft-Archive Only): ${withAttempts.length}`);
  console.log(`  • Tests without Attempts (Permanently Deletable): ${withoutAttempts.length}`);
}

inspectAllTests().catch(console.error);
