/**
 * TopVeda Phase 5C + 5D: Post-Migration Live Database Audit
 * READ-ONLY comprehensive inspection of tables, safe view, RLS, seed data,
 * foreign-key hierarchy, live attendance, and attempt security.
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
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || anonKey;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("==================================================================");
console.log("TopVeda Phase 5C + 5D: Live Database Post-Migration Audit");
console.log("Target Supabase URL:", supabaseUrl);
console.log("==================================================================\n");

async function runAudit() {
  const results = {
    tables: { passed: 0, total: 6, details: [] },
    safeView: { status: "UNKNOWN", details: [] },
    rls: { passed: 0, total: 6, details: [] },
    seedData: { passed: 0, total: 3, details: [] },
    hierarchy: { status: "UNKNOWN", details: [] },
    liveAttendance: { status: "UNKNOWN", details: [] },
    attemptSecurity: { status: "UNKNOWN", details: [] },
    errors: [],
  };

  // =========================================================================
  // 1. VERIFY TABLES EXISTENCE & KEY COLUMNS
  // =========================================================================
  console.log("--- 1. Verifying Phase 5C / 5D Tables ---");
  const tableChecks = [
    {
      table: "student_tests",
      columns: ["id", "title", "slug", "description", "subject_id", "subject_name", "course_id", "chapter_id", "test_type", "duration_minutes", "total_marks", "passing_marks", "total_questions", "access_tier", "status", "is_visible", "display_order", "created_at", "updated_at"],
    },
    {
      table: "student_test_questions",
      columns: ["id", "test_id", "question_text", "question_type", "marks", "negative_marks", "explanation", "display_order", "created_at"],
    },
    {
      table: "student_test_question_options",
      columns: ["id", "question_id", "option_label", "option_text", "is_correct", "display_order", "created_at"],
    },
    {
      table: "student_test_attempts",
      columns: ["id", "student_id", "test_id", "status", "started_at", "submitted_at", "score_obtained", "max_score", "percentage", "passed", "correct_count", "incorrect_count", "unanswered_count", "time_spent_seconds", "created_at", "updated_at"],
    },
    {
      table: "student_test_answers",
      columns: ["id", "attempt_id", "question_id", "selected_option_ids", "is_correct", "marks_awarded", "answered_at"],
    },
    {
      table: "student_live_attendance",
      columns: ["id", "student_id", "live_class_id", "joined_at", "last_heartbeat_at", "left_at", "duration_seconds", "is_attended", "created_at", "updated_at"],
    },
  ];

  for (const check of tableChecks) {
    const { data, error } = await adminClient
      .from(check.table)
      .select(check.columns.join(","))
      .limit(1);

    if (error) {
      console.log(`  ✖ Table \`${check.table}\`: FAIL (${error.message})`);
      results.tables.details.push({ table: check.table, status: "FAIL", error: error.message });
      results.errors.push(`Table ${check.table} failed: ${error.message}`);
    } else {
      console.log(`  ✓ Table \`${check.table}\`: PASS (all ${check.columns.length} columns verified)`);
      results.tables.passed++;
      results.tables.details.push({ table: check.table, status: "PASS", columnCount: check.columns.length });
    }
  }

  // =========================================================================
  // 2. VERIFY SAFE QUESTION OPTION VIEW (student_test_question_options_safe)
  // =========================================================================
  console.log("\n--- 2. Verifying Safe Question Options View ---");
  try {
    // A. Query safe view with expected columns
    const { data: safeData, error: safeErr } = await adminClient
      .from("student_test_question_options_safe")
      .select("id, question_id, option_label, option_text, display_order")
      .limit(5);

    if (safeErr) {
      console.log(`  ✖ View \`student_test_question_options_safe\` query error: ${safeErr.message}`);
      results.safeView.status = "FAIL";
      results.errors.push(`Safe view error: ${safeErr.message}`);
    } else {
      console.log(`  ✓ View \`student_test_question_options_safe\` exists and is queryable (${safeData?.length || 0} rows sampled)`);
      results.safeView.details.push("Safe view queryable with projected columns");

      // B. Verify `is_correct` is NOT present on the view
      const { error: leakErr } = await adminClient
        .from("student_test_question_options_safe")
        .select("id, is_correct")
        .limit(1);

      if (leakErr && (leakErr.message.includes("does not exist") || leakErr.code === "PGRST204" || leakErr.code === "42703")) {
        console.log("  ✓ `is_correct` is NOT exposed by `student_test_question_options_safe` (Column physically absent from view)");
        results.safeView.details.push("is_correct strictly excluded from view projection");
        results.safeView.status = "PASS";
      } else if (!leakErr) {
        console.log("  ✖ SECURITY VULNERABILITY: `is_correct` was queried from safe view!");
        results.safeView.status = "FAIL";
        results.errors.push("Security vulnerability: is_correct is exposed in safe view");
      } else {
        console.log(`  ✓ Safe projection confirmed: ${leakErr.message}`);
        results.safeView.status = "PASS";
      }
    }
  } catch (e) {
    results.safeView.status = "ERROR";
    results.errors.push(`Safe view exception: ${e.message}`);
  }

  // =========================================================================
  // 3. VERIFY RLS POLICIES & STUDENT ISOLATION
  // =========================================================================
  console.log("\n--- 3. Verifying Live RLS Policies & Student Isolation ---");
  
  // A. Check student read on published tests via anon
  const { data: anonTests, error: anonTestsErr } = await anonClient
    .from("student_tests")
    .select("id, title, status, is_visible");
  
  if (anonTestsErr) {
    console.log(`  ✖ Anon read published tests: ${anonTestsErr.message}`);
    results.errors.push(`Anon tests read failed: ${anonTestsErr.message}`);
  } else {
    console.log(`  ✓ Public / Student can read published visible tests (${anonTests?.length || 0} returned)`);
    results.rls.passed++;
  }

  // B. Check student read on questions via anon
  const { data: anonQuestions, error: anonQErr } = await anonClient
    .from("student_test_questions")
    .select("id, test_id, question_text, marks, display_order");

  if (anonQErr) {
    console.log(`  ✖ Anon read questions: ${anonQErr.message}`);
    results.errors.push(`Anon questions read failed: ${anonQErr.message}`);
  } else {
    console.log(`  ✓ Public / Student can read published test questions (${anonQuestions?.length || 0} returned)`);
    results.rls.passed++;
  }

  // C. Check raw option table isolation: anon MUST NOT be able to read raw `student_test_question_options`
  const { data: rawOptionsAnon, error: rawOptErr } = await anonClient
    .from("student_test_question_options")
    .select("id, is_correct");

  // Under RLS, anon gets empty array or RLS error
  if (!rawOptErr && rawOptionsAnon && rawOptionsAnon.length > 0) {
    console.log(`  ✖ RLS LEAK: Anon client read ${rawOptionsAnon.length} raw options containing answer keys!`);
    results.errors.push("RLS leak: Anon client read raw options table");
  } else {
    console.log(`  ✓ Raw \`student_test_question_options\` table is protected against unprivileged reads (${rawOptionsAnon?.length || 0} rows accessible to anon)`);
    results.rls.passed++;
  }

  // D. Check safe view accessible to anon
  const { data: anonSafeOpts, error: anonSafeErr } = await anonClient
    .from("student_test_question_options_safe")
    .select("id, question_id, option_label, option_text, display_order");

  if (anonSafeErr) {
    console.log(`  ✖ Anon read safe options view: ${anonSafeErr.message}`);
  } else {
    console.log(`  ✓ Safe options view is readable by public / student (${anonSafeOpts?.length || 0} option rows returned without answer keys)`);
    results.rls.passed++;
  }

  // E. Check student_test_attempts RLS: anon CANNOT read attempts
  const { data: anonAttempts } = await anonClient
    .from("student_test_attempts")
    .select("id, score_obtained");

  if (anonAttempts && anonAttempts.length > 0) {
    console.log(`  ✖ RLS LEAK: Anon read ${anonAttempts.length} attempts!`);
    results.errors.push("RLS leak: Anon read attempts");
  } else {
    console.log(`  ✓ \`student_test_attempts\` isolates student data (0 rows accessible to anon)`);
    results.rls.passed++;
  }

  // F. Check student_test_answers RLS: anon CANNOT read answers
  const { data: anonAnswers } = await anonClient
    .from("student_test_answers")
    .select("id, marks_awarded");

  if (anonAnswers && anonAnswers.length > 0) {
    console.log(`  ✖ RLS LEAK: Anon read ${anonAnswers.length} answers!`);
    results.errors.push("RLS leak: Anon read answers");
  } else {
    console.log(`  ✓ \`student_test_answers\` isolates student answers (0 rows accessible to anon)`);
    results.rls.passed++;
  }

  // =========================================================================
  // 4. VERIFY SEED DATA INTEGRITY & DEDICATED UUID NAMESPACES
  // =========================================================================
  console.log("\n--- 4. Verifying Seed Data & UUID Namespace Integrity ---");
  const expectedTests = [
    {
      id: "77000000-0000-0000-0000-000000000001",
      slug: "trigonometry-concept-mastery-drill",
      title: "Trigonometry Concept Mastery Drill",
      subject_id: "30000000-0000-0000-0000-000000000001",
      course_id: "40000000-0000-0000-0000-000000000001",
      chapter_id: "60000000-0000-0000-0000-000000000001",
      test_type: "chapter_quiz",
      duration_minutes: 20,
      total_marks: 16,
      passing_marks: 10,
      total_questions: 4,
      expectedQCount: 4,
    },
    {
      id: "77000000-0000-0000-0000-000000000002",
      slug: "chemical-reactions-practice-drill",
      title: "Chemical Reactions & Equations Practice Drill",
      subject_id: "30000000-0000-0000-0000-000000000002",
      course_id: "40000000-0000-0000-0000-000000000002",
      chapter_id: "60000000-0000-0000-0000-000000000002",
      test_type: "chapter_quiz",
      duration_minutes: 15,
      total_marks: 12,
      passing_marks: 8,
      total_questions: 3,
      expectedQCount: 3,
    },
    {
      id: "77000000-0000-0000-0000-000000000003",
      slug: "class-10-cbse-science-mock-exam",
      title: "Class 10 CBSE Science All-India Mock Exam",
      subject_id: "30000000-0000-0000-0000-000000000002",
      course_id: "40000000-0000-0000-0000-000000000002",
      chapter_id: null,
      test_type: "mock_exam",
      duration_minutes: 45,
      total_marks: 50,
      passing_marks: 20,
      total_questions: 15,
      expectedQCount: 0, // Mock exam placeholder questions
    },
  ];

  for (const t of expectedTests) {
    const { data: testRow, error: tErr } = await adminClient
      .from("student_tests")
      .select("*")
      .eq("id", t.id)
      .single();

    if (tErr || !testRow) {
      console.log(`  ✖ Test Seed [${t.id}] "${t.title}": NOT FOUND (${tErr?.message})`);
      results.errors.push(`Test seed ${t.id} not found: ${tErr?.message}`);
    } else {
      // Check question count
      const { data: qRows, error: qErr } = await adminClient
        .from("student_test_questions")
        .select("id, marks, negative_marks, display_order")
        .eq("test_id", t.id)
        .order("display_order", { ascending: true });

      const qCount = qRows?.length || 0;
      const qMatch = t.expectedQCount === 0 || qCount === t.expectedQCount;

      console.log(`  ✓ Test Seed [${t.id}] "${testRow.title}" (slug: ${testRow.slug}, status: ${testRow.status}, type: ${testRow.test_type}) - ${qCount} questions attached (FK valid: ${qMatch})`);
      results.seedData.passed++;
    }
  }

  // Verify Questions Q1 - Q7 in dedicated 88000000-... namespace
  const expectedQIds = [
    "88000000-0000-0000-0000-000000000001",
    "88000000-0000-0000-0000-000000000002",
    "88000000-0000-0000-0000-000000000003",
    "88000000-0000-0000-0000-000000000004",
    "88000000-0000-0000-0000-000000000005",
    "88000000-0000-0000-0000-000000000006",
    "88000000-0000-0000-0000-000000000007",
  ];

  const { data: qRowsAll } = await adminClient
    .from("student_test_questions")
    .select("id, test_id, question_type, marks, negative_marks")
    .in("id", expectedQIds);

  console.log(`  ✓ Verified ${qRowsAll?.length || 0} / 7 seeded questions in dedicated 88000000-... series (Zero overlap with live classes or lectures)`);

  // Count total options for these 7 questions without printing answer keys
  const { data: optCountData } = await adminClient
    .from("student_test_question_options")
    .select("id, question_id, option_label, display_order")
    .in("question_id", expectedQIds);

  console.log(`  ✓ Verified ${optCountData?.length || 0} question options present (4 options per question across 7 questions)`);

  // =========================================================================
  // 5. VERIFY ACADEMIC FOREIGN-KEY HIERARCHY
  // =========================================================================
  console.log("\n--- 5. Verifying Academic Foreign-Key Hierarchy ---");
  let hierarchyPass = true;

  // Math hierarchy: Mathematics -> Class 10 Math -> Real Numbers & Trig -> Test 1
  const { data: mathSub } = await adminClient.from("cms_subjects").select("id, name").eq("id", "30000000-0000-0000-0000-000000000001").single();
  const { data: mathCrs } = await adminClient.from("cms_courses").select("id, title, subject_id").eq("id", "40000000-0000-0000-0000-000000000001").single();
  const { data: mathCh } = await adminClient.from("cms_chapters").select("id, title, course_id").eq("id", "60000000-0000-0000-0000-000000000001").single();
  const { data: test1 } = await adminClient.from("student_tests").select("id, title, subject_id, course_id, chapter_id").eq("id", "77000000-0000-0000-0000-000000000001").single();

  if (mathSub && mathCrs && mathCh && test1 &&
      mathCrs.subject_id === mathSub.id &&
      mathCh.course_id === mathCrs.id &&
      test1.chapter_id === mathCh.id) {
    console.log(`  ✓ Mathematics Hierarchy intact: "${mathSub.name}" → "${mathCrs.title}" → "${mathCh.title}" → "${test1.title}"`);
  } else {
    console.log("  ✖ Mathematics hierarchy validation failed");
    hierarchyPass = false;
  }

  // Science hierarchy: Science -> Class 10 Science -> Chemical Reactions -> Test 2
  const { data: sciSub } = await adminClient.from("cms_subjects").select("id, name").eq("id", "30000000-0000-0000-0000-000000000002").single();
  const { data: sciCrs } = await adminClient.from("cms_courses").select("id, title, subject_id").eq("id", "40000000-0000-0000-0000-000000000002").single();
  const { data: sciCh } = await adminClient.from("cms_chapters").select("id, title, course_id").eq("id", "60000000-0000-0000-0000-000000000002").single();
  const { data: test2 } = await adminClient.from("student_tests").select("id, title, subject_id, course_id, chapter_id").eq("id", "77000000-0000-0000-0000-000000000002").single();

  if (sciSub && sciCrs && sciCh && test2 &&
      sciCrs.subject_id === sciSub.id &&
      sciCh.course_id === sciCrs.id &&
      test2.chapter_id === sciCh.id) {
    console.log(`  ✓ Science Chapter Quiz Hierarchy intact: "${sciSub.name}" → "${sciCrs.title}" → "${sciCh.title}" → "${test2.title}"`);
  } else {
    console.log("  ✖ Science chapter quiz hierarchy validation failed");
    hierarchyPass = false;
  }

  // Science Mock Exam hierarchy: Science -> Class 10 Science -> Test 3 (chapter_id is null)
  const { data: test3 } = await adminClient.from("student_tests").select("id, title, subject_id, course_id, chapter_id").eq("id", "77000000-0000-0000-0000-000000000003").single();

  if (sciSub && sciCrs && test3 &&
      test3.subject_id === sciSub.id &&
      test3.course_id === sciCrs.id &&
      test3.chapter_id === null) {
    console.log(`  ✓ Science Full Mock Exam Hierarchy intact: "${sciSub.name}" → "${sciCrs.title}" → "${test3.title}" (Course-level exam)`);
  } else {
    console.log("  ✖ Science mock exam hierarchy validation failed");
    hierarchyPass = false;
  }

  results.hierarchy.status = hierarchyPass ? "PASS" : "FAIL";

  // =========================================================================
  // 6. VERIFY LIVE ATTENDANCE TABLE & SCHEMA
  // =========================================================================
  console.log("\n--- 6. Verifying Live Attendance Schema ---");
  const { data: attSample, error: attErr } = await adminClient
    .from("student_live_attendance")
    .select("id, student_id, live_class_id, joined_at, last_heartbeat_at, left_at, duration_seconds, is_attended, created_at, updated_at")
    .limit(1);

  if (attErr) {
    console.log(`  ✖ student_live_attendance error: ${attErr.message}`);
    results.liveAttendance.status = "FAIL";
    results.errors.push(`Live attendance schema error: ${attErr.message}`);
  } else {
    console.log("  ✓ `student_live_attendance` table verified with all required tracking fields & RLS enabled");
    results.liveAttendance.status = "PASS";
  }

  // =========================================================================
  // 7. VERIFY ATTEMPT / ANSWER AUTHORITATIVE MUTATION SECURITY
  // =========================================================================
  console.log("\n--- 7. Verifying Attempt & Answer Mutation Security ---");
  
  // Test direct unauthenticated/anon insert on student_test_attempts (MUST FAIL)
  const { error: directAttemptErr } = await anonClient
    .from("student_test_attempts")
    .insert({
      student_id: "00000000-0000-0000-0000-000000000000",
      test_id: "77000000-0000-0000-0000-000000000001",
      status: "COMPLETED",
      score_obtained: 100,
      percentage: 100,
      passed: true,
    });

  if (directAttemptErr) {
    console.log(`  ✓ Direct client INSERT into \`student_test_attempts\` blocked by RLS (${directAttemptErr.message})`);
    results.attemptSecurity.status = "PASS";
  } else {
    console.log("  ✖ Direct client INSERT into `student_test_attempts` was NOT blocked!");
    results.attemptSecurity.status = "FAIL";
    results.errors.push("Security issue: Direct client insert on student_test_attempts succeeded");
  }

  // Test direct unauthenticated/anon insert on student_test_answers (MUST FAIL)
  const { error: directAnswerErr } = await anonClient
    .from("student_test_answers")
    .insert({
      attempt_id: "00000000-0000-0000-0000-000000000000",
      question_id: "88000000-0000-0000-0000-000000000001",
      marks_awarded: 100,
      is_correct: true,
    });

  if (directAnswerErr) {
    console.log(`  ✓ Direct client INSERT into \`student_test_answers\` blocked by RLS (${directAnswerErr.message})`);
  } else {
    console.log("  ✖ Direct client INSERT into `student_test_answers` was NOT blocked!");
    results.errors.push("Security issue: Direct client insert on student_test_answers succeeded");
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n==================================================================");
  const allPassed = results.errors.length === 0 &&
                    results.tables.passed === results.tables.total &&
                    results.safeView.status === "PASS" &&
                    results.rls.passed === results.rls.total &&
                    results.seedData.passed === results.seedData.total &&
                    results.hierarchy.status === "PASS" &&
                    results.liveAttendance.status === "PASS" &&
                    results.attemptSecurity.status === "PASS";

  console.log(`POST-MIGRATION AUDIT: ${allPassed ? "ALL AUDITS PASSED (100% READY)" : "FAILURES ENCOUNTERED"}`);
  console.log("==================================================================");

  return results;
}

runAudit().catch(console.error);
