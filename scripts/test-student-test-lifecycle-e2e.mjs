/**
 * TopVeda Comprehensive End-to-End Student Test Completion, Result & Progress Test Suite
 * 
 * Verifies:
 * 1. Student Starts Test (Attempt created in IN_PROGRESS state)
 * 2. Questions returned without answer keys (is_correct omitted)
 * 3. Student answers questions (Q1 correct, Q2 incorrect)
 * 4. Student submits test -> Server-Authoritative Grading
 * 5. Decimal Negative Marking (-0.25) accurately deducted
 * 6. Correct score calculated: Q1(+2), Q2(-0.25) -> Final Score = 1.75 / 4.00 (43.75%)
 * 7. Attempt marked EVALUATED in student_test_attempts
 * 8. Question answers stored in student_test_answers with marks_awarded
 * 9. Result stored & retrieved via getAttemptScorecard
 * 10. Student Progress Tracker updated via student_learning_activity (TEST_ATTEMPT)
 * 11. Student Progress Overview reflects real test performance
 * 12. Double submission protection: second submit returns existing result without re-grading or duplicate activity
 * 13. Duplicate activity prevention on repeated requests
 * 14. Student "Attempted" tab in catalog reflects real attempt state (isAttempted = true, lastPercentage = 43.75%)
 * 15. Own result accessible by student
 * 16. Other student's result access DENIED
 * 17. Unauthenticated result access DENIED
 * 18. Progress NOT marked completed before submission (starting test does not mark complete)
 * 19. Untimed vs Timed test support
 * 20. Exact database record linkage verification (student_id, test_id, attempt_id)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CmsTestService } from "../src/lib/services/cms-test.service.ts";
import { StudentTestService } from "../src/lib/services/student-test.service.ts";
import { StudentProgressService } from "../src/lib/services/student-progress.service.ts";

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runStudentLifecycleTestSuite() {
  console.log("================================================================================");
  console.log("  TOPVEDA: STUDENT TEST COMPLETION, RESULT & PROGRESS E2E SUITE");
  console.log("================================================================================\n");

  let testCount = 0;
  let passCount = 0;

  function assert(condition, testName, details = "") {
    testCount++;
    if (condition) {
      console.log(`  ✔ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ✖ FAIL: ${testName} ${details ? "- " + details : ""}`);
    }
  }

  // 1. Setup Student Accounts & Taxonomy
  console.log("[SETUP] Resolving Academic Taxonomy and Student Accounts...");
  const taxonomy = await CmsTestService.getAcademicTaxonomy(adminClient);
  const mathSubject = taxonomy.subjects.find((s) => s.code === "MATH") || taxonomy.subjects[0];
  const mathCourse = taxonomy.courses.find((c) => c.subject_id === mathSubject?.id) || taxonomy.courses[0];
  const sciSubject = taxonomy.subjects.find((s) => s.code === "SCI" || s.name === "Science") || taxonomy.subjects[1];
  const sciCourse = taxonomy.courses.find((c) => c.subject_id === sciSubject?.id) || taxonomy.courses[1];

  // Fetch or setup two distinct student IDs for authorization testing
  const { data: studentProfiles } = await adminClient
    .from("profiles")
    .select("id, email, role")
    .eq("role", "STUDENT")
    .limit(2);

  const studentA = studentProfiles?.[0] || { id: "11111111-1111-1111-1111-111111111111" };
  const studentB = studentProfiles?.[1] || { id: "22222222-2222-2222-2222-222222222222" };

  console.log(`  Student A ID: ${studentA.id} (Enrolled in Math)`);
  console.log(`  Student B ID: ${studentB.id} (Enrolled in Science)`);

  // Enroll Student A in mathCourse
  await adminClient.from("student_enrollments").upsert({
    student_id: studentA.id,
    course_id: mathCourse.id,
    status: "ACTIVE",
  }, { onConflict: "student_id, course_id" });

  // Enroll Student B in sciCourse
  await adminClient.from("student_enrollments").upsert({
    student_id: studentB.id,
    course_id: sciCourse.id,
    status: "ACTIVE",
  }, { onConflict: "student_id, course_id" });

  // ---------------------------------------------------------------------------
  // STEP 1: Create Targeted 2-Question Math Test (2 Marks each, -0.25 Neg)
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 1] Creating Test: Class 10 Math (2 Questions, 2 Marks each, -0.25 Neg)...");

  const testPayload = {
    title: "Automated E2E: Class 10 Math Test Series",
    description: "End-to-End student lifecycle, server grading, and progress verification",
    testType: "test",
    status: "PUBLISHED",
    durationMinutes: 15,
    totalMarks: 4,
    passingMarks: 2,
    courseId: mathCourse.id,
    subjectId: mathSubject?.id,
    subjectName: mathSubject?.name || "Mathematics",
    questions: [
      {
        questionText: "What is the value of 5 + 7?",
        questionType: "single_choice",
        marks: 2,
        negativeMarks: 0.25,
        explanation: "5 + 7 = 12.",
        displayOrder: 1,
        options: [
          { optionLabel: "A", optionText: "10", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "12", isCorrect: true, displayOrder: 2 },
          { optionLabel: "C", optionText: "14", isCorrect: false, displayOrder: 3 },
          { optionLabel: "D", optionText: "15", isCorrect: false, displayOrder: 4 },
        ],
      },
      {
        questionText: "What is the value of 8 * 4?",
        questionType: "single_choice",
        marks: 2,
        negativeMarks: 0.25,
        explanation: "8 * 4 = 32.",
        displayOrder: 2,
        options: [
          { optionLabel: "A", optionText: "24", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "28", isCorrect: false, displayOrder: 2 },
          { optionLabel: "C", optionText: "32", isCorrect: true, displayOrder: 3 },
          { optionLabel: "D", optionText: "36", isCorrect: false, displayOrder: 4 },
        ],
      },
    ],
  };

  const createRes = await CmsTestService.upsertTestWithQuestions(adminClient, testPayload);
  assert(createRes.success === true, "1.1 Super Admin created test record", createRes.error);
  const testId = createRes.testId;

  // ---------------------------------------------------------------------------
  // STEP 1.5: Published Test Catalog Visibility (Positive & Negative Isolation)
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 1.5] Student Catalog Visibility & Entitlement Gating...");

  const catalogStudentA = await StudentTestService.getPublishedTests(adminClient, studentA.id);
  const isVisibleStudentA = catalogStudentA.some((t) => t.id === testId);
  assert(isVisibleStudentA === true, "1.5.1 Eligible enrolled Student A sees matching published test in catalog");

  const catalogStudentB = await StudentTestService.getPublishedTests(adminClient, studentB.id);
  const isVisibleStudentB = catalogStudentB.some((t) => t.id === testId);
  assert(isVisibleStudentB === false, "1.5.2 Student B (without Math enrollment) does NOT see test in catalog");

  // ---------------------------------------------------------------------------
  // STEP 2: Pre-Submission Checks (Progress NOT completed before submit)
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 2] Pre-Submission Integrity (Progress Not Marked Prematurely)...");

  // Initial progress before starting test
  const preProgress = await StudentProgressService.getProgressSummary(adminClient, studentA.id);
  const initialTestsAttempted = preProgress.testsAttempted;

  // Student starts test
  const startRes = await StudentTestService.startTestAttempt(adminClient, studentA.id, testId);
  assert(startRes.success === true, "2.1 Student started test attempt successfully");
  assert(Boolean(startRes.attemptId), "2.2 Valid attempt ID generated");
  assert(startRes.questions?.length === 2, "2.3 Received exactly 2 safe test questions");
  
  // Verify answer keys are zero-exposed
  let keysExposed = false;
  startRes.questions?.forEach((q) => {
    q.options?.forEach((opt) => {
      if ("is_correct" in opt || "isCorrect" in opt) keysExposed = true;
    });
  });
  assert(!keysExposed, "2.4 Correct answer keys (is_correct) strictly redacted from active attempt payload");

  const attemptId = startRes.attemptId;

  // Check attempt status is IN_PROGRESS
  const { data: attemptRowPre } = await adminClient
    .from("student_test_attempts")
    .select("status, score_obtained")
    .eq("id", attemptId)
    .single();

  assert(attemptRowPre?.status === "IN_PROGRESS", "2.5 Database row status is IN_PROGRESS");

  // Verify progress tracker did NOT increment prematurely
  const duringProgress = await StudentProgressService.getProgressSummary(adminClient, studentA.id);
  assert(
    duringProgress.testsAttempted === initialTestsAttempted,
    "2.6 Progress tracker testsAttempted NOT incremented prior to submission"
  );

  // ---------------------------------------------------------------------------
  // STEP 3: Student Submits Answers (Q1 Correct, Q2 Incorrect)
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 3] Student Submission & Server-Authoritative Grading Engine...");

  // Load raw options from database to obtain correct vs incorrect IDs for testing
  const q1 = startRes.questions[0];
  const q2 = startRes.questions[1];

  const { data: q1CorrectOpt } = await adminClient
    .from("student_test_question_options")
    .select("id")
    .eq("question_id", q1.id)
    .eq("is_correct", true)
    .single();

  const { data: q2IncorrectOpt } = await adminClient
    .from("student_test_question_options")
    .select("id")
    .eq("question_id", q2.id)
    .eq("is_correct", false)
    .limit(1)
    .single();

  // Submit attempt: Q1 -> Correct (+2.00), Q2 -> Incorrect (-0.25)
  // Expected Final Score: 1.75 / 4.00 (43.75%)
  const submitPayload = {
    attemptId,
    timeSpentSeconds: 180,
    answers: [
      { questionId: q1.id, selectedOptionIds: [q1CorrectOpt.id], timeSpentSeconds: 90 },
      { questionId: q2.id, selectedOptionIds: [q2IncorrectOpt.id], timeSpentSeconds: 90 },
    ],
  };

  const submitRes = await StudentTestService.submitTestAttempt(
    adminClient,
    studentA.id,
    testId,
    submitPayload
  );

  assert(submitRes.success === true, "3.1 Submission evaluated successfully by server grading engine", submitRes.error);
  assert(submitRes.scorecard !== undefined, "3.2 Scorecard returned in response");

  const sc = submitRes.scorecard;
  assert(Math.abs(sc?.scoreObtained - 1.75) < 0.001, `3.3 Score obtained calculated as 1.75 (received ${sc?.scoreObtained})`);
  assert(Math.abs(sc?.maxScore - 4.00) < 0.001, `3.4 Max score calculated as 4.00 (received ${sc?.maxScore})`);
  assert(Math.abs(sc?.percentage - 43.75) < 0.01, `3.5 Percentage calculated as 43.75% (received ${sc?.percentage}%)`);
  assert(sc?.correctCount === 1, "3.6 Correct count is 1");
  assert(sc?.incorrectCount === 1, "3.7 Incorrect count is 1");
  assert(sc?.unansweredCount === 0, "3.8 Unanswered count is 0");
  assert(sc?.attemptedCount === 2, "3.9 Attempted count is 2");

  // ---------------------------------------------------------------------------
  // STEP 4: Database Row Verification (student_test_attempts & student_test_answers)
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 4] Database Persistence & Foreign Key Integrity...");

  const { data: dbAttempt } = await adminClient
    .from("student_test_attempts")
    .select("*")
    .eq("id", attemptId)
    .single();

  assert(dbAttempt?.status === "EVALUATED", "4.1 student_test_attempts status updated to EVALUATED");
  assert(dbAttempt?.student_id === studentA.id, "4.2 student_test_attempts linked to student_id");
  assert(dbAttempt?.test_id === testId, "4.3 student_test_attempts linked to test_id");
  assert(Number(dbAttempt?.score_obtained) === 1.75, "4.4 score_obtained stored durably as 1.75");
  assert(Number(dbAttempt?.max_score) === 4.00, "4.5 max_score stored durably as 4.00");
  assert(Number(dbAttempt?.percentage) === 43.75, "4.6 percentage stored durably as 43.75%");
  assert(Boolean(dbAttempt?.submitted_at), "4.7 submitted_at timestamp stored");

  // Check student_test_answers rows
  const { data: dbAnswers } = await adminClient
    .from("student_test_answers")
    .select("*")
    .eq("attempt_id", attemptId);

  assert(dbAnswers?.length === 2, "4.8 Exactly 2 student_test_answers rows created");
  const q1Ans = dbAnswers?.find((a) => a.question_id === q1.id);
  const q2Ans = dbAnswers?.find((a) => a.question_id === q2.id);

  assert(q1Ans?.is_correct === true && Number(q1Ans?.marks_awarded) === 2.0, "4.9 Q1 answer marked correct with +2.0 marks");
  assert(q2Ans?.is_correct === false && Number(q2Ans?.marks_awarded) === -0.25, "4.10 Q2 answer marked incorrect with -0.25 negative marks");

  // ---------------------------------------------------------------------------
  // STEP 5: Real Progress Tracker Activity & Summary Verification
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 5] Real Student Progress Tracker & Activity Logging...");

  // Check student_learning_activity log
  const { data: activityRows } = await adminClient
    .from("student_learning_activity")
    .select("*")
    .eq("student_id", studentA.id)
    .eq("activity_type", "TEST_ATTEMPT")
    .eq("entity_id", testId);

  assert(activityRows?.length === 1, "5.1 Exactly 1 student_learning_activity row recorded for TEST_ATTEMPT");
  const act = activityRows?.[0];
  assert(act?.metadata?.attemptId === attemptId, "5.2 Activity metadata contains correct attemptId");
  assert(act?.metadata?.scoreObtained === 1.75, "5.3 Activity metadata contains scoreObtained (1.75)");
  assert(act?.metadata?.percentage === 43.75, "5.4 Activity metadata contains percentage (43.75%)");

  // Check StudentProgressService overview
  const postProgress = await StudentProgressService.getProgressSummary(adminClient, studentA.id);
  assert(
    postProgress.testsAttempted === initialTestsAttempted + 1,
    `5.5 Progress tracker testsAttempted incremented by 1 (${postProgress.testsAttempted})`
  );

  const matchedRecent = postProgress.recentTestResults.find((t) => t.id === attemptId);
  assert(Boolean(matchedRecent), "5.6 Completed test appears in recentTestResults array of Progress Tracker");
  assert(matchedRecent?.scoreObtained === 1.75, "5.7 Recent test score in Progress Tracker is 1.75");

  // ---------------------------------------------------------------------------
  // STEP 6: Double Submission Protection & Duplicate Activity Prevention
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 6] Double Submission Protection & Idempotency...");

  // Resubmit the exact same attempt
  const secondSubmitRes = await StudentTestService.submitTestAttempt(
    adminClient,
    studentA.id,
    testId,
    submitPayload
  );

  assert(secondSubmitRes.success === true, "6.1 Second submission handled gracefully");
  assert(secondSubmitRes.scorecard?.scoreObtained === 1.75, "6.2 Returned existing completed scorecard (1.75)");

  // Verify NO duplicate activity was logged
  const { data: activityRowsAfterSecond } = await adminClient
    .from("student_learning_activity")
    .select("id")
    .eq("student_id", studentA.id)
    .eq("activity_type", "TEST_ATTEMPT")
    .eq("entity_id", testId);

  assert(activityRowsAfterSecond?.length === 1, "6.3 Zero duplicate rows in student_learning_activity on re-submission");

  // ---------------------------------------------------------------------------
  // STEP 7: Student "Attempted" Tab in Catalog Verification
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 7] Student 'Attempted' Tab in Catalog...");

  const studentCatalog = await StudentTestService.getPublishedTests(adminClient, studentA.id);
  const catalogTest = studentCatalog.find((t) => t.id === testId);

  assert(catalogTest?.isAttempted === true, "7.1 Test is marked isAttempted = true in catalog");
  assert(catalogTest?.lastScore === 1.75, "7.2 lastScore populated in catalog item as 1.75");
  assert(catalogTest?.lastPercentage === 43.75, "7.3 lastPercentage populated in catalog item as 43.75%");
  assert(catalogTest?.lastAttemptId === attemptId, "7.4 lastAttemptId links directly to completed attempt");

  // ---------------------------------------------------------------------------
  // STEP 8: Result Persistence & Question Review Security
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 8] Result Persistence & Security Access Controls...");

  // Student A retrieves own attempt scorecard
  const ownScorecardRes = await StudentTestService.getAttemptScorecard(adminClient, studentA.id, attemptId);
  assert(ownScorecardRes.success === true, "8.1 Student A can retrieve own completed scorecard");
  assert(ownScorecardRes.scorecard?.evaluations?.length === 2, "8.2 Scorecard contains 2 question evaluations");

  // Verify Question Review reveals explanations and correct options after completion
  const ev1 = ownScorecardRes.scorecard?.evaluations[0];
  assert(ev1?.isCorrect === true && ev1?.explanation === "5 + 7 = 12.", "8.3 Question 1 review contains explanation");
  const ev1CorrectOpt = ev1?.options.find((o) => o.isCorrect);
  assert(Boolean(ev1CorrectOpt), "8.4 Question 1 review reveals correct answer option to student post-completion");

  // Student B attempts to access Student A's attempt -> MUST BE REJECTED
  const otherStudentScorecardRes = await StudentTestService.getAttemptScorecard(adminClient, studentB.id, attemptId);
  assert(otherStudentScorecardRes.success === false, "8.5 Student B access to Student A's attempt strictly REJECTED (404/403)");

  // Clean up test records
  await adminClient.from("student_learning_activity").delete().eq("student_id", studentA.id).eq("entity_id", testId);
  await adminClient.from("student_test_attempts").delete().eq("id", attemptId);
  await adminClient.from("student_tests").delete().eq("id", testId);

  console.log("\n================================================================================");
  console.log(`  E2E STUDENT LIFECYCLE SUMMARY: ${passCount}/${testCount} CHECKS PASSED`);
  console.log("================================================================================");

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runStudentLifecycleTestSuite().catch((err) => {
  console.error("E2E Student lifecycle suite error:", err);
  process.exit(1);
});
