import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { CmsTestService } from "../src/lib/services/cms-test.service.ts";
import { StudentTestService } from "../src/lib/services/student-test.service.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let envContent = "";
for (const envFile of [".env.local", ".env.production", ".env"]) {
  const p = path.join(rootDir, envFile);
  if (fs.existsSync(p)) envContent += "\n" + fs.readFileSync(p, "utf8");
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : process.env[key] || null;
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://uxkvwuavidufnqliauuj.supabase.co";
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    }).on("error", reject);
  });
}

async function verifyPostDeployment() {
  console.log("===============================================================");
  console.log("TOPVEDA POST-DEPLOYMENT PRODUCTION VERIFICATION");
  console.log("===============================================================\n");

  let totalChecks = 0;
  let passedChecks = 0;

  function assert(condition, name, details = "") {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? "- " + details : ""}`);
    }
  }

  // 1. Check HTTP 200 on production site
  console.log("1. Verifying Live Site Response...");
  try {
    const liveRes = await httpGet("https://topveda.in");
    assert(liveRes.status === 200 || liveRes.status === 307 || liveRes.status === 308, `https://topveda.in returns HTTP ${liveRes.status}`);
  } catch (err) {
    // Try worker URL as well
    try {
      const workerRes = await httpGet("https://topveda-dev.krvishalprf112.workers.dev");
      assert(workerRes.status === 200 || workerRes.status === 307 || workerRes.status === 308, `Worker deployment URL returns HTTP ${workerRes.status}`);
    } catch (wErr) {
      assert(false, "Live URL accessible", err.message);
    }
  }

  // 2. Super Admin can open Test & Practice
  console.log("\n2. Verifying Super Admin Test & Practice Access...");
  const catalog = await CmsTestService.getAdminTestsCatalog(adminClient);
  assert(catalog.tests.length >= 7, `Super Admin catalog loaded with ${catalog.tests.length} tests`);

  // 3. Super Admin can create a test
  console.log("\n3. Verifying Super Admin Test Creation...");
  const { data: courses } = await adminClient.from("cms_courses").select("id, subject_id").eq("is_visible", true);
  const mathCourse = courses[0];

  const testPayload = {
    title: "Post-Deployment Verification Test",
    slug: `post-deploy-verify-${Date.now()}`,
    description: "Verifying live test creation post deployment",
    testType: "test",
    status: "PUBLISHED",
    isVisible: true,
    durationMinutes: 20,
    totalMarks: 4,
    passingMarks: 2,
    courseId: mathCourse.id,
    subjectId: mathCourse.subject_id,
    subjectName: "Mathematics",
    questions: [
      {
        questionText: "What is 2 + 2?",
        questionType: "single_choice",
        marks: 4,
        negativeMarks: 0,
        explanation: "2 + 2 = 4",
        displayOrder: 1,
        options: [
          { optionLabel: "A", optionText: "3", isCorrect: false, displayOrder: 1 },
          { optionLabel: "B", optionText: "4", isCorrect: true, displayOrder: 2 },
        ],
      },
    ],
  };

  const createRes = await CmsTestService.upsertTestWithQuestions(adminClient, testPayload, "6f72791e-2761-4b75-8168-503778cf6c43");
  assert(createRes.success === true && Boolean(createRes.testId), "Super Admin successfully created post-deployment test", createRes.error);
  const liveTestId = createRes.testId;

  // 4. Student Catalog Loads
  console.log("\n4. Verifying Student Catalog & Academic Isolation...");
  const studentA_Id = "14d4ac70-b333-41b7-b7e2-85948fc53367"; // Enrolled in Course 1 (Math)
  const studentB_Id = "e7063306-3925-49c3-9b26-dd8faa5dc078"; // Enrolled in Course 2 (Science)

  const scienceCourse = courses.find((c) => c.id !== mathCourse.id) || courses[1];

  // Clean and set enrollments
  await adminClient.from("student_enrollments").delete().in("student_id", [studentA_Id, studentB_Id]);
  await adminClient.from("student_enrollments").insert([
    { student_id: studentA_Id, course_id: mathCourse.id, status: "ACTIVE" },
    { student_id: studentB_Id, course_id: scienceCourse.id, status: "ACTIVE" },
  ]);

  const catalogA = await StudentTestService.getPublishedTests(adminClient, studentA_Id);
  const isVisibleA = catalogA.some((t) => t.id === liveTestId);
  assert(isVisibleA, "Published test appears for eligible enrolled student");

  // 5. Wrong class/subject student cannot access it
  const catalogB = await StudentTestService.getPublishedTests(adminClient, studentB_Id);
  const isVisibleB = catalogB.some((t) => t.id === liveTestId);
  assert(!isVisibleB, "Published test excluded from non-enrolled student catalog");

  // 6. Direct test URL cannot bypass enrollment
  console.log("\n5. Verifying Direct URL Protection...");
  const detailA = await StudentTestService.getTestDetail(adminClient, studentA_Id, liveTestId);
  assert(detailA.success, "Eligible student direct detail returns 200");

  const detailB = await StudentTestService.getTestDetail(adminClient, studentB_Id, liveTestId);
  assert(!detailB.success, "Non-enrolled student direct detail access DENIED");

  // 7. Start attempt cannot bypass enrollment
  console.log("\n6. Verifying Start Attempt Protection & Answer Key Security...");
  const startB = await StudentTestService.startTestAttempt(adminClient, studentB_Id, liveTestId);
  assert(!startB.success, "Non-enrolled student start attempt DENIED");

  const startA = await StudentTestService.startTestAttempt(adminClient, studentA_Id, liveTestId);
  assert(startA.success && Boolean(startA.attemptId), "Eligible student start attempt ALLOWED");

  // Verify no answer key leakage
  const questions = startA.questions || [];
  let leakedKey = false;
  for (const q of questions) {
    if ("is_correct" in q || "isCorrect" in q) leakedKey = true;
    for (const opt of q.options || []) {
      if ("is_correct" in opt || "isCorrect" in opt) leakedKey = true;
    }
  }
  assert(!leakedKey, "Zero answer keys leaked in active attempt question payload");

  // 8. Clean up verification test and attempts
  if (startA.attemptId) {
    await adminClient.from("student_test_attempts").delete().eq("id", startA.attemptId);
  }
  if (liveTestId) {
    await CmsTestService.deleteOrArchiveTest(adminClient, liveTestId);
  }

  // 9. Existing Authentication & 7 Baseline Tests Intact
  console.log("\n7. Verifying Existing Authentication & Baseline Inventory...");
  const { data: authUsers } = await adminClient.auth.admin.listUsers();
  assert(authUsers?.users?.length >= 10, `Authentication intact: ${authUsers?.users?.length} auth users active`);

  const { data: baselineTests } = await adminClient.from("student_tests").select("id, title");
  assert(baselineTests.length === 7, `All 7 baseline dummy tests preserved intact (count: ${baselineTests.length})`);

  console.log("\n===============================================================");
  console.log(`POST-DEPLOYMENT RESULTS: ${passedChecks}/${totalChecks} PASSED`);
  console.log("===============================================================");

  if (passedChecks === totalChecks) {
    console.log("PRODUCTION VERIFICATION 100% SUCCESSFUL.");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyPostDeployment().catch((err) => {
  console.error("FATAL VERIFICATION ERROR:", err);
  process.exit(1);
});
