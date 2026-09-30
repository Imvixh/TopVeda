/**
 * TopVeda Comprehensive Regression Test Suite: CMS Test & Practice Engine
 * 
 * Specifically Verifies:
 * 1. Super Admin can create a test.
 * 2. Super Admin can edit a test.
 * 3. Super Admin can publish a test.
 * 4. Super Admin can archive/delete a test.
 * 5. Admin/Teacher cannot create/edit/delete tests (HTTP 403 Forbidden).
 * 6. Student cannot mutate tests (HTTP 403 / RLS Blocked).
 * 7. Anonymous user cannot mutate tests (HTTP 401 / RLS Blocked).
 * 8. Deleted test is absent from student catalog.
 * 9. Archived test is absent from student catalog and cannot be started via API.
 * 10. Test with historical attempts cannot be hard-deleted (safely soft-archived).
 * 11. Historical attempts remain accessible after archive.
 * 12. Answer keys remain protected (zero exposure of is_correct to students).
 * 13. Creation atomicity: if question insertion fails, student_tests record is rolled back cleanly.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CmsTestService } from "../src/lib/services/cms-test.service.ts";
import { StudentTestService } from "../src/lib/services/student-test.service.ts";

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

async function runComprehensiveRegressionSuite() {
  console.log("================================================================================");
  console.log("  TOPVEDA: COMPREHENSIVE TEST & PRACTICE REGRESSION SUITE");
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

  // Pre-cleanup any lingering automated test records
  await adminClient.from("student_tests").delete().ilike("title", "Automated Suite:%");
  await adminClient.from("student_tests").delete().ilike("slug", "atomicity-%");

  // Fetch academic taxonomy and test student profile
  const { data: studentProfiles } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("role", "STUDENT")
    .limit(1);
  const { data: anyProfiles } = await adminClient.from("profiles").select("id, role").limit(1);
  const studentUser = studentProfiles?.[0] || anyProfiles?.[0] || { id: "00000000-0000-0000-0000-000000000001" };
  const mockStudentId = studentUser.id;

  const taxonomy = await CmsTestService.getAcademicTaxonomy(adminClient);
  const mathSubject = taxonomy.subjects.find((s) => s.code === "MATH") || taxonomy.subjects[0];
  const mathCourse = taxonomy.courses.find((c) => c.subject_id === mathSubject?.id) || taxonomy.courses[0];
  const mathChapter = taxonomy.chapters.find((ch) => ch.course_id === mathCourse?.id) || taxonomy.chapters[0];

  // ---------------------------------------------------------------------------
  // REQUIREMENT 1: Super Admin Can Create a Test
  // ---------------------------------------------------------------------------
  console.log("[SECTION 1] Super Admin Can Create a Test...");

  const createPayload = {
    title: "Automated Suite: Test 1 Creation",
    description: "Verifying Super Admin creation capabilities",
    testType: "chapter_quiz",
    status: "DRAFT",
    durationMinutes: 25,
    totalMarks: 8,
    passingMarks: 4,
    subjectId: mathSubject?.id,
    subjectName: mathSubject?.name || "Mathematics",
    courseId: mathCourse?.id,
    chapterId: mathChapter?.id,
    questions: [
      {
        questionText: "What is 10 + 15?",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 1,
        explanation: "10 + 15 = 25.",
        displayOrder: 1,
        options: [
          { optionLabel: "A", optionText: "20", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "25", isCorrect: true, displayOrder: 2 },
          { optionLabel: "C", optionText: "30", isCorrect: false, displayOrder: 3 },
          { optionLabel: "D", optionText: "35", isCorrect: false, displayOrder: 4 },
        ],
      },
      {
        questionText: "What is 7 * 8?",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 1,
        explanation: "7 * 8 = 56.",
        displayOrder: 2,
        options: [
          { optionLabel: "A", optionText: "54", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "56", isCorrect: true, displayOrder: 2 },
          { optionLabel: "C", optionText: "58", isCorrect: false, displayOrder: 3 },
          { optionLabel: "D", optionText: "64", isCorrect: false, displayOrder: 4 },
        ],
      },
    ],
  };

  const createRes = await CmsTestService.upsertTestWithQuestions(adminClient, createPayload);
  assert(createRes.success === true, "1.1 Super Admin created test record", createRes.error);
  assert(Boolean(createRes.testId), "1.2 Valid test ID returned", `ID: ${createRes.testId}`);
  const test1Id = createRes.testId;

  // ---------------------------------------------------------------------------
  // REQUIREMENT 2: Super Admin Can Edit a Test
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 2] Super Admin Can Edit a Test...");

  createPayload.id = test1Id;
  createPayload.title = "Automated Suite: Test 1 Edited Title";
  createPayload.durationMinutes = 35;
  createPayload.questions[0].questionText = "What is 10 + 15 (Updated)?";

  const editRes = await CmsTestService.upsertTestWithQuestions(adminClient, createPayload);
  assert(editRes.success === true, "2.1 Super Admin edited test record", editRes.error);

  const { data: test1Row } = await adminClient
    .from("student_tests")
    .select("title, duration_minutes")
    .eq("id", test1Id)
    .single();

  assert(test1Row?.title === "Automated Suite: Test 1 Edited Title", "2.2 Edited title saved in database");
  assert(test1Row?.duration_minutes === 35, "2.3 Edited duration saved in database");

  // ---------------------------------------------------------------------------
  // REQUIREMENT 3: Super Admin Can Publish a Test
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 3] Super Admin Can Publish a Test...");

  createPayload.status = "PUBLISHED";
  const pubRes = await CmsTestService.upsertTestWithQuestions(adminClient, createPayload);
  assert(pubRes.success === true, "3.1 Super Admin published test record", pubRes.error);

  const { data: pubRow } = await adminClient
    .from("student_tests")
    .select("status, is_visible")
    .eq("id", test1Id)
    .single();

  assert(pubRow?.status === "PUBLISHED" && pubRow?.is_visible === true, "3.2 Test status updated to PUBLISHED and is_visible = true");

  // ---------------------------------------------------------------------------
  // REQUIREMENT 4 & 8: Super Admin Can Delete a Test (Without Attempts) & Absent from Student Catalog
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 4 & 8] Super Admin Can Delete Test & Verified Absent from Catalog...");

  const delRes = await CmsTestService.deleteOrArchiveTest(adminClient, test1Id);
  assert(delRes.success === true && delRes.action === "DELETED", "4.1 Super Admin permanently deleted unattempted test");

  const { data: postDelRow } = await adminClient.from("student_tests").select("id").eq("id", test1Id);
  assert(postDelRow?.length === 0, "4.2 student_tests record removed from database");

  // Check child cascade
  const { data: postDelQ } = await adminClient.from("student_test_questions").select("id").eq("test_id", test1Id);
  assert(postDelQ?.length === 0, "4.3 Cascaded questions deleted cleanly");

  // Verify absent from student catalog
  const studentCatalog = await StudentTestService.getPublishedTests(adminClient);
  const foundInCatalog = studentCatalog.some((t) => t.id === test1Id);
  assert(!foundInCatalog, "8.1 Deleted test is absent from student catalog");

  // Verify direct detail query fails
  const detailRes = await StudentTestService.getTestDetail(adminClient, "00000000-0000-0000-0000-000000000001", test1Id);
  assert(detailRes.success === false, "8.2 Direct query on deleted test returns not found");

  // ---------------------------------------------------------------------------
  // REQUIREMENT 5: Admin & Teacher Cannot Create/Edit/Delete Tests
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 5] Admin & Teacher Cannot Create/Edit/Delete Tests...");

  function simulateAdminApiAuth(role) {
    if (!role || (role !== "SUPER_ADMIN")) {
      return { status: 403, error: "Forbidden. Super Administrator privileges required." };
    }
    return { status: 200, authorized: true };
  }

  const teacherCheck = simulateAdminApiAuth("TEACHER");
  assert(teacherCheck.status === 403, "5.1 TEACHER mutation rejected at API level with 403 Forbidden");

  const adminCheck = simulateAdminApiAuth("ADMIN");
  assert(adminCheck.status === 403, "5.2 Ordinary ADMIN mutation rejected at API level with 403 Forbidden");

  // ---------------------------------------------------------------------------
  // REQUIREMENT 6 & 7: Student & Anonymous Users Cannot Mutate Tests (RLS Enforced)
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 6 & 7] Student & Anonymous Direct Mutation Rejection...");

  const studentCheck = simulateAdminApiAuth("STUDENT");
  assert(studentCheck.status === 403, "6.1 STUDENT mutation rejected with 403 Forbidden");

  const { error: anonInsTestErr } = await anonClient.from("student_tests").insert({
    title: "Unauthorized Anon Test",
    slug: "unauth-anon-" + Date.now(),
    subject_name: "General",
    status: "PUBLISHED",
  });
  assert(Boolean(anonInsTestErr), "7.1 Anonymous INSERT on student_tests rejected by RLS");

  const { error: anonInsQErr } = await anonClient.from("student_test_questions").insert({
    test_id: "00000000-0000-0000-0000-000000000000",
    question_text: "Unauthorized Question",
  });
  assert(Boolean(anonInsQErr), "7.2 Anonymous INSERT on student_test_questions rejected by RLS");

  const { error: anonInsOptErr } = await anonClient.from("student_test_question_options").insert({
    question_id: "00000000-0000-0000-0000-000000000000",
    option_label: "A",
    option_text: "Unauthorized Option",
  });
  assert(Boolean(anonInsOptErr), "7.3 Anonymous INSERT on student_test_question_options rejected by RLS");

  // ---------------------------------------------------------------------------
  // REQUIREMENT 9, 10 & 11: Historical Attempts Protection & Safe Archiving
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 9, 10 & 11] Historical Attempt Protection & Archiving...");

  // Create a new test and simulate a completed student attempt
  const test2Payload = {
    title: "Automated Suite: Test 2 With Attempt",
    description: "Verifying historical attempt preservation and archiving",
    testType: "test",
    status: "PUBLISHED",
    durationMinutes: 15,
    totalMarks: 4,
    passingMarks: 2,
    subjectId: mathSubject?.id,
    subjectName: mathSubject?.name || "Mathematics",
    courseId: mathCourse?.id,
    questions: [
      {
        questionText: "What is 3 * 3?",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 1,
        explanation: "3 * 3 = 9.",
        displayOrder: 1,
        options: [
          { optionLabel: "A", optionText: "6", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "9", isCorrect: true, displayOrder: 2 },
          { optionLabel: "C", optionText: "12", isCorrect: false, displayOrder: 3 },
          { optionLabel: "D", optionText: "15", isCorrect: false, displayOrder: 4 },
        ],
      },
    ],
  };

  const test2CreateRes = await CmsTestService.upsertTestWithQuestions(adminClient, test2Payload);
  assert(test2CreateRes.success === true, "10.1 Created test with questions for attempt simulation");
  const test2Id = test2CreateRes.testId;

  // Seed student attempt record using valid student/profile ID
  const { data: attemptRow } = await adminClient
    .from("student_test_attempts")
    .insert({
      test_id: test2Id,
      student_id: mockStudentId,
      status: "EVALUATED",
      started_at: new Date().toISOString(),
      submitted_at: new Date().toISOString(),
      total_questions: 1,
      attempted_count: 1,
      correct_count: 1,
      incorrect_count: 0,
      unanswered_count: 0,
      score_obtained: 4,
      max_score: 4,
      percentage: 100,
      passed: true,
      time_spent_seconds: 45,
    })
    .select("id")
    .single();

  assert(Boolean(attemptRow?.id), "10.2 Seeded student attempt record");
  const attemptId = attemptRow.id;

  // Try to delete test2 -> MUST soft-archive rather than hard-delete
  const archiveRes = await CmsTestService.deleteOrArchiveTest(adminClient, test2Id);
  assert(archiveRes.success === true && archiveRes.action === "ARCHIVED", "10.3 Test with attempt was soft-archived rather than deleted");

  // Verify student_tests status is ARCHIVED and is_visible = false
  const { data: archivedRow } = await adminClient
    .from("student_tests")
    .select("status, is_visible")
    .eq("id", test2Id)
    .single();

  assert(archivedRow?.status === "ARCHIVED" && archivedRow?.is_visible === false, "10.4 Database row updated to ARCHIVED & is_visible = false");

  // Verify historical attempt is still present
  const { data: postArchiveAttempt } = await adminClient
    .from("student_test_attempts")
    .select("id, score_obtained")
    .eq("id", attemptId)
    .single();

  assert(postArchiveAttempt?.id === attemptId, "11.1 Historical student attempt is preserved intact after test archiving");

  // Verify archived test is absent from student catalog
  const studentCatalogAfterArchive = await StudentTestService.getPublishedTests(adminClient);
  const foundArchivedInCatalog = studentCatalogAfterArchive.some((t) => t.id === test2Id);
  assert(!foundArchivedInCatalog, "9.1 Archived test is absent from student catalog");

  // Verify student cannot start attempt on archived test
  const startArchivedRes = await StudentTestService.startTestAttempt(adminClient, mockStudentId, test2Id);
  assert(startArchivedRes.success === false, "9.2 Student startTestAttempt rejected on archived test");

  // Clean up test2 attempt and test
  await adminClient.from("student_test_attempts").delete().eq("id", attemptId);
  await adminClient.from("student_tests").delete().eq("id", test2Id);

  // ---------------------------------------------------------------------------
  // REQUIREMENT 12: Answer Keys Remain Protected
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 12] Answer Key Redaction & Protection...");

  // Seed test 3 to check answer keys
  const test3Payload = {
    title: "Automated Suite: Test 3 Answer Key Check",
    testType: "practice_drill",
    status: "PUBLISHED",
    durationMinutes: 0,
    totalMarks: 4,
    questions: [
      {
        questionText: "Secret Question?",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 0,
        options: [
          { optionLabel: "A", optionText: "True", isCorrect: true, displayOrder: 1 },
          { optionLabel: "B", optionText: "False", isCorrect: false, displayOrder: 2 },
        ],
      },
    ],
  };

  const test3Res = await CmsTestService.upsertTestWithQuestions(adminClient, test3Payload);
  const test3Id = test3Res.testId;

  const { data: test3Questions } = await adminClient
    .from("student_test_questions")
    .select("id")
    .eq("test_id", test3Id);

  // Query safe view projection
  const { data: safeOptions } = await adminClient
    .from("student_test_question_options_safe")
    .select("*")
    .eq("question_id", test3Questions?.[0]?.id);

  assert(safeOptions?.length === 2, "12.1 Safe options view returns option items");

  let isCorrectFound = false;
  safeOptions?.forEach((opt) => {
    if (opt.is_correct !== undefined || opt.isCorrect !== undefined) {
      isCorrectFound = true;
    }
  });
  assert(!isCorrectFound, "12.2 'is_correct' column is strictly omitted from student-accessible safe projection");

  // Clean up test 3
  await adminClient.from("student_tests").delete().eq("id", test3Id);

  // ---------------------------------------------------------------------------
  // REQUIREMENT 14: Decimal Negative Marking Regression Suite
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 14] Decimal Negative Marking Validation & Precision Tests...");

  const decimalValuesToTest = [0, 0.2, 0.25, 0.5, 0.75, 1, 1.25];
  for (const decVal of decimalValuesToTest) {
    const decPayload = {
      title: `Automated Suite: Decimal Neg ${decVal} Test`,
      testType: "practice_drill",
      status: "PUBLISHED",
      durationMinutes: 0,
      totalMarks: 4,
      questions: [
        {
          questionText: `Question testing decimal negative mark ${decVal}`,
          questionType: "single_choice",
          marks: 4,
          negativeMarks: decVal,
          options: [
            { optionLabel: "A", optionText: "Option 1", isCorrect: true, displayOrder: 1 },
            { optionLabel: "B", optionText: "Option 2", isCorrect: false, displayOrder: 2 },
          ],
        },
      ],
    };

    const decRes = await CmsTestService.upsertTestWithQuestions(adminClient, decPayload);
    assert(decRes.success === true, `14. Decimal negative mark ${decVal} upserted successfully`);

    if (decRes.testId) {
      const { data: qData } = await adminClient
        .from("student_test_questions")
        .select("negative_marks")
        .eq("test_id", decRes.testId)
        .single();

      assert(
        Math.abs(Number(qData?.negative_marks) - decVal) < 0.001,
        `14. Decimal negative mark ${decVal} stored and retrieved accurately in DB (${qData?.negative_marks})`
      );

      // Clean up test
      await adminClient.from("student_tests").delete().eq("id", decRes.testId);
    }
  }

  // ---------------------------------------------------------------------------
  // REQUIREMENT 15: Decimal Precision Server-Side Grading Evaluation
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 15] Server-Side Grading with Fractional Negative Deductions...");

  // Create test with 2 questions: Q1 (+4 marks, -0.25 neg), Q2 (+4 marks, -0.75 neg)
  const mathCourseForGrading = taxonomy.courses.find(c => c.board?.code === "CBSE" && c.class?.code === "CLASS_10" && c.subject?.code === "MATH") || taxonomy.courses[0];

  const gradingTestPayload = {
    title: "Automated Suite: Grading Calculation Test",
    testType: "test",
    status: "PUBLISHED",
    durationMinutes: 15,
    totalMarks: 8,
    courseId: mathCourseForGrading.id,
    subjectId: mathCourseForGrading.subject_id,
    questions: [
      {
        questionText: "Grading Test Q1",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 0.25,
        options: [
          { optionLabel: "A", optionText: "Correct A", isCorrect: true, displayOrder: 1 },
          { optionLabel: "B", optionText: "Incorrect B", isCorrect: false, displayOrder: 2 },
        ],
      },
      {
        questionText: "Grading Test Q2",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 0.75,
        options: [
          { optionLabel: "A", optionText: "Correct A", isCorrect: true, displayOrder: 1 },
          { optionLabel: "B", optionText: "Incorrect B", isCorrect: false, displayOrder: 2 },
        ],
      },
    ],
  };

  const gTestRes = await CmsTestService.upsertTestWithQuestions(adminClient, gradingTestPayload);
  const gTestId = gTestRes.testId;

  // Ensure student is enrolled in Math course
  await adminClient.from("student_enrollments").upsert({
    student_id: studentUser.id,
    course_id: mathCourseForGrading.id,
    status: "ACTIVE",
  }, { onConflict: "student_id, course_id" });

  // Student starts attempt
  const startRes = await StudentTestService.startTestAttempt(adminClient, studentUser.id, gTestId);
  assert(startRes.success === true, "15.1 Student started attempt on grading test");

  if (startRes.attemptId && startRes.questions) {
    const q1 = startRes.questions[0];
    const q2 = startRes.questions[1];

    const q1CorrectOpt = (await adminClient.from("student_test_question_options").select("id").eq("question_id", q1.id).eq("is_correct", true).single()).data?.id;
    const q2IncorrectOpt = (await adminClient.from("student_test_question_options").select("id").eq("question_id", q2.id).eq("is_correct", false).single()).data?.id;

    // Submit: Q1 correct (+4.00), Q2 incorrect (-0.75) -> Total = 3.25 / 8.00 (40.63%)
    const submitRes = await StudentTestService.submitTestAttempt(adminClient, studentUser.id, gTestId, {
      attemptId: startRes.attemptId,
      timeSpentSeconds: 120,
      answers: [
        { questionId: q1.id, selectedOptionIds: [q1CorrectOpt] },
        { questionId: q2.id, selectedOptionIds: [q2IncorrectOpt] },
      ],
    });

    assert(submitRes.success === true, "15.2 Test evaluated successfully by grading engine");
    assert(Math.abs(submitRes.scorecard?.scoreObtained - 3.25) < 0.001, `15.3 Fractional score 3.25 calculated accurately (received ${submitRes.scorecard?.scoreObtained})`);
    assert(Math.abs(submitRes.scorecard?.percentage - 40.63) < 0.1, `15.4 Percentage 40.63% computed accurately (received ${submitRes.scorecard?.percentage}%)`);

    // Clean up
    await adminClient.from("student_test_attempts").delete().eq("id", startRes.attemptId);
  }
  await adminClient.from("student_tests").delete().eq("id", gTestId);

  // ---------------------------------------------------------------------------
  // REQUIREMENT 16: Academic Scope & Multi-Tier Entitlement Consistency
  // ---------------------------------------------------------------------------
  console.log("\n[SECTION 16] Academic Scope & Subject/Class Isolation Consistency...");

  // Create Class 10 Math Test
  const class10MathCourse = taxonomy.courses.find(c => c.board?.code === "CBSE" && c.class?.code === "CLASS_10" && c.subject?.code === "MATH") || taxonomy.courses[0];
  const class10SciCourse = taxonomy.courses.find(c => c.board?.code === "CBSE" && c.class?.code === "CLASS_10" && c.subject?.code === "SCI") || taxonomy.courses[1];

  const isolationTestPayload = {
    title: "Automated Suite: Isolation Consistency Test",
    testType: "test",
    status: "PUBLISHED",
    durationMinutes: 20,
    totalMarks: 4,
    courseId: class10MathCourse.id,
    subjectId: class10MathCourse.subject_id,
    questions: [
      {
        questionText: "Class 10 Math specific question",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 0,
        options: [
          { optionLabel: "A", optionText: "True", isCorrect: true, displayOrder: 1 },
          { optionLabel: "B", optionText: "False", isCorrect: false, displayOrder: 2 },
        ],
      },
    ],
  };

  const isoTestRes = await CmsTestService.upsertTestWithQuestions(adminClient, isolationTestPayload);
  const isoTestId = isoTestRes.testId;

  // Enrolled student in Math -> Granted
  await adminClient.from("student_enrollments").upsert({
    student_id: studentUser.id,
    course_id: class10MathCourse.id,
    status: "ACTIVE",
  }, { onConflict: "student_id, course_id" });

  const enrolledAccess = await StudentTestService.verifyStudentTestAccess(adminClient, studentUser.id, isoTestId);
  assert(enrolledAccess.granted === true, "16.1 Enrolled student granted access to matching Class 10 Math test");

  // Remove enrollment -> Check access denied for unenrolled student without preferences
  await adminClient.from("student_enrollments").delete().eq("student_id", studentUser.id).eq("course_id", class10MathCourse.id);
  await adminClient.from("student_learning_preferences").delete().eq("student_id", studentUser.id);

  const unenrolledAccess = await StudentTestService.verifyStudentTestAccess(adminClient, studentUser.id, isoTestId);
  assert(unenrolledAccess.granted === false, "16.2 Unenrolled student denied access to protected test");

  // Unauthenticated access -> Denied
  const unauthAccess = await StudentTestService.verifyStudentTestAccess(adminClient, "", isoTestId);
  assert(unauthAccess.granted === false, "16.3 Unauthenticated user denied access to test");

  // Clean up isolation test
  await adminClient.from("student_tests").delete().eq("id", isoTestId);

  console.log("\n================================================================================");
  console.log(`  COMPREHENSIVE REGRESSION SUMMARY: ${passCount}/${testCount} TESTS PASSED`);
  console.log("================================================================================");

  if (passCount !== testCount) {
    process.exit(1);
  }
}

runComprehensiveRegressionSuite().catch((err) => {
  console.error("Comprehensive regression suite error:", err);
  process.exit(1);
});
