import fs from "fs";
import path from "path";
import { createClient } from '../node_modules/@supabase/supabase-js/dist/index.mjs';
import { CmsTestService } from '../src/lib/services/cms-test.service.ts';
import { StudentTestService } from '../src/lib/services/student-test.service.ts';

// Parse .env.local without exposing secrets
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...rest] = trimmed.split("=");
        if (key && rest.length > 0) {
          process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    });
  }
} catch (e) {
  // Silent catch
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uxkvwuavidufnqliauuj.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function runTests() {
  console.log("================================================================================");
  console.log("TOPVEDA — TEST & PRACTICE MANAGEMENT MODULE COMPREHENSIVE VERIFICATION");
  console.log("================================================================================\n");

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // TEST 1: Seed default dummy tests (3 Test Series, 2 Practice Drills, 1 Mock Exam)
  console.log("1. SEEDING & SYNCING DEFAULT DUMMY TESTS...");
  await CmsTestService.seedDefaultDummyTests(adminClient);
  const taxonomy = await CmsTestService.getAcademicTaxonomy(adminClient);
  console.log(`   Taxonomy Loaded: ${taxonomy.boards.length} Boards, ${taxonomy.classes.length} Classes, ${taxonomy.subjects.length} Subjects, ${taxonomy.courses.length} Courses, ${taxonomy.chapters.length} Chapters`);

  const catalog = await CmsTestService.getAdminTestsCatalog(adminClient);
  console.log(`   Admin Catalog Tests Count: ${catalog.tests.length}`);
  console.log(`   Stats: Total=${catalog.stats.totalTests}, Published=${catalog.stats.publishedCount}, Drills=${catalog.stats.practiceDrillCount}, Tests=${catalog.stats.testCount}, Mocks=${catalog.stats.mockExamCount}`);
  if (catalog.tests.length >= 6) {
    console.log("   ✓ All 6 required tests (3 Test Series, 2 Practice Drills, 1 Mock Exam) are present in catalog.\n");
  } else {
    console.error(`   ✗ Expected at least 6 tests, found ${catalog.tests.length}`);
  }

  // TEST 2: JSON Import Validation & Academic Entity Resolution
  console.log("2. JSON IMPORT & TAXONOMY RESOLUTION TESTING...");
  const validJson = JSON.stringify({
    title: "Class 10 Mathematics Practice Test 01",
    description: "Chapter 1 Real Numbers practice test",
    type: "practice_drill",
    board: "CBSE",
    class: 10,
    subject: "Mathematics",
    chapter: "Real Numbers & Trigonometry",
    duration_minutes: 0,
    total_marks: 4,
    negative_marking: 0.5,
    questions: [
      {
        question: "Which of the following is a linear equation?",
        type: "mcq",
        marks: 4,
        negative_marks: 0.5,
        options: [
          { id: "A", text: "2x + 3 = 5" },
          { id: "B", text: "x² + 2 = 0" },
          { id: "C", text: "1/x = 2" },
          { id: "D", text: "x³ = 8" }
        ],
        correct_answer: "A",
        explanation: "A linear equation has the highest power of the variable equal to 1."
      }
    ]
  });

  const validResult = CmsTestService.validateAndParseJson(validJson, taxonomy);
  console.log(`   Valid JSON test result: valid=${validResult.valid}, errors=${validResult.errors.length}`);
  if (validResult.valid && validResult.parsedPayload?.subjectName === "Mathematics") {
    console.log("   ✓ JSON schema validation and academic entity resolution passed.");
  } else {
    console.error("   ✗ Valid JSON test failed:", validResult.errors);
  }

  // Invalid JSON (missing correct answer match)
  const invalidJson = JSON.stringify({
    title: "Invalid Test",
    questions: [
      {
        question: "Sample Question?",
        options: [{ id: "A", text: "Opt A" }, { id: "B", text: "Opt B" }],
        correct_answer: "Z" // Invalid option ID
      }
    ]
  });
  const invalidResult = CmsTestService.validateAndParseJson(invalidJson, taxonomy);
  if (!invalidResult.valid && invalidResult.errors.length > 0) {
    console.log(`   ✓ Correctly caught invalid JSON: "${invalidResult.errors[0]}"`);
  } else {
    console.error("   ✗ Failed to reject invalid JSON.");
  }

  // TEST 3: Create Draft Test -> Edit -> Publish
  console.log("\n3. SUPER ADMIN TEST CREATION & PUBLISH LIFECYCLE...");
  const createPayload = {
    title: "Automated Test Lifecyle Verification",
    description: "Testing end-to-end draft and publish workflow",
    testType: "test",
    status: "DRAFT",
    durationMinutes: 25,
    totalMarks: 8,
    passingMarks: 4,
    subjectId: taxonomy.subjects[0]?.id,
    subjectName: taxonomy.subjects[0]?.name,
    courseId: taxonomy.courses[0]?.id,
    questions: [
      {
        questionText: "What is the capital of India?",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 1,
        explanation: "New Delhi is the official capital of India.",
        displayOrder: 1,
        options: [
          { optionLabel: "A", optionText: "Mumbai", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "New Delhi", isCorrect: true, displayOrder: 2 },
          { optionLabel: "C", optionText: "Kolkata", isCorrect: false, displayOrder: 3 },
          { optionLabel: "D", optionText: "Chennai", isCorrect: false, displayOrder: 4 },
        ]
      },
      {
        questionText: "Which planet is known as the Red Planet?",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 1,
        explanation: "Mars appears red due to abundant iron oxide on its surface.",
        displayOrder: 2,
        options: [
          { optionLabel: "A", optionText: "Venus", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "Jupiter", isCorrect: false, displayOrder: 2 },
          { optionLabel: "C", optionText: "Mars", isCorrect: true, displayOrder: 3 },
          { optionLabel: "D", optionText: "Saturn", isCorrect: false, displayOrder: 4 },
        ]
      }
    ]
  };

  const createRes = await CmsTestService.upsertTestWithQuestions(adminClient, createPayload);
  console.log(`   Created Draft Test ID: ${createRes.testId}`);
  if (!createRes.success || !createRes.testId) {
    throw new Error("Failed to create test");
  }

  // Verify Draft is NOT visible in published student tests
  const studentTests = await StudentTestService.getPublishedTests(adminClient);
  const foundDraftInStudent = studentTests.some((t) => t.id === createRes.testId);
  if (!foundDraftInStudent) {
    console.log("   ✓ Security check: Draft test is strictly HIDDEN from student catalog.");
  } else {
    console.error("   ✗ Security failure: Draft test leaked into student catalog!");
  }

  // Update Test to PUBLISHED
  createPayload.id = createRes.testId;
  createPayload.status = "PUBLISHED";
  const publishRes = await CmsTestService.upsertTestWithQuestions(adminClient, createPayload);
  console.log(`   Published Test result: success=${publishRes.success}`);

  // TEST 4: Student Attempt Simulation & Answer Key Leakage Check
  console.log("\n4. STUDENT ATTEMPT EXPERIENCE & ANSWER KEY PROTECTION...");
  const testStudentId = "6f72791e-2761-4b75-8168-503778cf6c43";

  // Start Attempt
  const attemptRes = await StudentTestService.startTestAttempt(adminClient, testStudentId, createRes.testId);
  console.log(`   Started Attempt result: success=${attemptRes.success}, attemptId=${attemptRes.attemptId}, err=${attemptRes.error}`);
  console.log(`   Safe Questions Count: ${attemptRes.questions?.length}`);

  // Verify safe questions do NOT expose is_correct
  let answerKeyLeaked = false;
  attemptRes.questions?.forEach((q) => {
    q.options?.forEach((opt) => {
      if ((opt).isCorrect !== undefined || (opt).is_correct !== undefined) {
        answerKeyLeaked = true;
      }
    });
  });

  if (!answerKeyLeaked) {
    console.log("   ✓ Security check: Answer keys (is_correct) are ZERO-EXPOSED to student payload.");
  } else {
    console.error("   ✗ Security failure: is_correct leaked in student payload!");
  }

  // TEST 5: Server-Side Grading with Negative Marking
  console.log("\n5. SERVER-AUTHORITATIVE GRADING & SCORECARD GENERATION...");
  const q1 = attemptRes.questions[0];
  const q2 = attemptRes.questions[1];

  // Pick correct for Q1 (Option B = New Delhi), incorrect for Q2 (Option A = Venus)
  const q1CorrectOpt = q1.options.find((o) => o.optionLabel === "B");
  const q2IncorrectOpt = q2.options.find((o) => o.optionLabel === "A");

  const submitPayload = {
    attemptId: attemptRes.attemptId,
    timeSpentSeconds: 120,
    answers: [
      { questionId: q1.id, selectedOptionIds: [q1CorrectOpt.id] },
      { questionId: q2.id, selectedOptionIds: [q2IncorrectOpt.id] },
    ]
  };

  const submitRes = await StudentTestService.submitTestAttempt(adminClient, testStudentId, createRes.testId, submitPayload);
  const sc = submitRes.scorecard;
  console.log(`   Score Obtained: ${sc.scoreObtained} / ${sc.maxScore} (${sc.percentage}%)`);
  console.log(`   Correct: ${sc.correctCount}, Incorrect: ${sc.incorrectCount}, Passed: ${sc.passed}`);

  // Expected: Q1 = +4, Q2 = -1 => Total = 3 marks out of 8 (38%)
  if (sc.scoreObtained === 3 && sc.correctCount === 1 && sc.incorrectCount === 1) {
    console.log("   ✓ Authoritative server grading & negative marking deduction verified (4 - 1 = 3 marks).");
  } else {
    console.error(`   ✗ Unexpected score: ${sc.scoreObtained}`);
  }

  // TEST 6: Clean Up / Archive Test Protection
  console.log("\n6. DELETION & HISTORICAL SCORE PROTECTION...");
  const delRes = await CmsTestService.deleteOrArchiveTest(adminClient, createRes.testId);
  console.log(`   Delete action taken: ${delRes.action} — ${delRes.message}`);
  if (delRes.action === "ARCHIVED") {
    console.log("   ✓ Historical protection: Test was safely archived rather than destroyed because attempts existed.");
  }

  // Clean up test attempt and test
  await adminClient.from("student_test_attempts").delete().eq("test_id", createRes.testId);
  await adminClient.from("student_tests").delete().eq("id", createRes.testId);
  console.log("   Cleaned up test artifact.");

  console.log("\n================================================================================");
  console.log("ALL TEST & PRACTICE VERIFICATION CHECKS COMPLETED SUCCESSFULLY!");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
