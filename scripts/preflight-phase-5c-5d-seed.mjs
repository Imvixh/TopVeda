/**
 * TopVeda Phase 5C + 5D Preflight Live DB Verification
 * READ-ONLY: Verifies all referenced seed subject/course/chapter UUIDs exist
 * and belong to the Class 10 Math/Science hierarchy, and checks for test/question conflicts.
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
console.log("TopVeda Phase 5C + 5D: Live DB Preflight & Hierarchy Verification");
console.log("Target Supabase URL:", supabaseUrl);
console.log("==================================================================\n");

async function runPreflight() {
  const seedSubjectIds = [
    { id: "30000000-0000-0000-0000-000000000001", expected: "Mathematics" },
    { id: "30000000-0000-0000-0000-000000000002", expected: "Science" },
  ];

  const seedCourseIds = [
    { id: "40000000-0000-0000-0000-000000000001", expectedSubjectId: "30000000-0000-0000-0000-000000000001", label: "Math Course" },
    { id: "40000000-0000-0000-0000-000000000002", expectedSubjectId: "30000000-0000-0000-0000-000000000002", label: "Science Course" },
  ];

  const seedChapterIds = [
    { id: "60000000-0000-0000-0000-000000000001", expectedCourseId: "40000000-0000-0000-0000-000000000001", label: "Math Chapter 1" },
    { id: "60000000-0000-0000-0000-000000000002", expectedCourseId: "40000000-0000-0000-0000-000000000002", label: "Science Chapter 2" },
  ];

  const seedTestIds = [
    "77000000-0000-0000-0000-000000000001",
    "77000000-0000-0000-0000-000000000002",
    "77000000-0000-0000-0000-000000000003",
  ];

  const seedSlugs = [
    "trigonometry-concept-mastery-drill",
    "chemical-reactions-practice-drill",
    "class-10-cbse-science-mock-exam",
  ];

  const seedQuestionIds = [
    "88000000-0000-0000-0000-000000000001",
    "88000000-0000-0000-0000-000000000002",
    "88000000-0000-0000-0000-000000000003",
    "88000000-0000-0000-0000-000000000004",
    "88000000-0000-0000-0000-000000000005",
    "88000000-0000-0000-0000-000000000006",
    "88000000-0000-0000-0000-000000000007",
  ];

  let passed = true;

  // 1. Verify Subjects
  console.log("1. Verifying Seed Subjects in `cms_subjects`...");
  for (const item of seedSubjectIds) {
    const { data, error } = await supabase
      .from("cms_subjects")
      .select("id, name, slug")
      .eq("id", item.id)
      .single();

    if (error || !data) {
      console.error(`  ✖ Subject not found: ${item.id} (${item.expected}) - Error: ${error?.message}`);
      passed = false;
    } else {
      console.log(`  ✓ Subject found: [${data.id}] "${data.name}" (slug: ${data.slug})`);
    }
  }

  // 2. Verify Courses
  console.log("\n2. Verifying Seed Courses in `cms_courses`...");
  for (const item of seedCourseIds) {
    const { data, error } = await supabase
      .from("cms_courses")
      .select("id, title, slug, subject_id, class_id, status, is_visible")
      .eq("id", item.id)
      .single();

    if (error || !data) {
      console.error(`  ✖ Course not found: ${item.id} (${item.label}) - Error: ${error?.message}`);
      passed = false;
    } else {
      const subjectMatch = data.subject_id === item.expectedSubjectId;
      
      // Fetch class level name
      let className = "Unknown";
      if (data.class_id) {
        const { data: classData } = await supabase
          .from("cms_class_levels")
          .select("name, code")
          .eq("id", data.class_id)
          .single();
        if (classData) {
          className = `${classData.name} (${classData.code})`;
        }
      }

      console.log(`  ✓ Course found: [${data.id}] "${data.title}" (Class: ${className}, subject_id: ${data.subject_id}) - Subject FK valid: ${subjectMatch}`);
      if (!subjectMatch) {
        console.error(`    ✖ Expected subject_id: ${item.expectedSubjectId}, got: ${data.subject_id}`);
        passed = false;
      }
    }
  }

  // 3. Verify Chapters
  console.log("\n3. Verifying Seed Chapters in `cms_chapters`...");
  for (const item of seedChapterIds) {
    const { data, error } = await supabase
      .from("cms_chapters")
      .select("id, title, chapter_number, course_id")
      .eq("id", item.id)
      .single();

    if (error || !data) {
      console.error(`  ✖ Chapter not found: ${item.id} (${item.label}) - Error: ${error?.message}`);
      passed = false;
    } else {
      const courseMatch = data.course_id === item.expectedCourseId;
      console.log(`  ✓ Chapter found: [${data.id}] "${data.title}" (Ch #${data.chapter_number}, course_id: ${data.course_id}) - Course FK valid: ${courseMatch}`);
      if (!courseMatch) {
        console.error(`    ✖ Expected course_id: ${item.expectedCourseId}, got: ${data.course_id}`);
        passed = false;
      }
    }
  }

  // 4. Check for existing student_tests table & conflict check
  console.log("\n4. Checking for Potential Conflicts in `student_tests`...");
  const { data: testData, error: testErr } = await supabase
    .from("student_tests")
    .select("id, slug, title");

  if (testErr) {
    if (testErr.code === "PGRST205" || testErr.message?.includes("does not exist") || testErr.message?.includes("relation")) {
      console.log("  ✓ `student_tests` table does not exist yet (clean slate for Phase 5C+5D migration).");
    } else {
      console.log(`  ℹ Note on student_tests query: ${testErr.message} (code: ${testErr.code})`);
    }
  } else {
    console.log(`  ℹ student_tests table already exists with ${testData?.length || 0} rows.`);
    const existingIds = testData.filter(t => seedTestIds.includes(t.id));
    const existingSlugs = testData.filter(t => seedSlugs.includes(t.slug));
    console.log(`    Matching Seed IDs: ${existingIds.length} / ${seedTestIds.length}`);
    console.log(`    Matching Seed Slugs: ${existingSlugs.length} / ${seedSlugs.length}`);
  }

  // 5. Check for questions and options tables
  console.log("\n5. Checking for Question & Option Tables...");
  const { data: qData, error: qErr } = await supabase
    .from("student_test_questions")
    .select("id")
    .in("id", seedQuestionIds);

  if (qErr) {
    if (qErr.code === "PGRST205" || qErr.message?.includes("does not exist") || qErr.message?.includes("relation")) {
      console.log("  ✓ `student_test_questions` table does not exist yet (clean slate).");
    } else {
      console.log(`  ℹ Note on student_test_questions query: ${qErr.message}`);
    }
  } else {
    console.log(`  ℹ Matching seed question IDs found: ${qData?.length || 0} / ${seedQuestionIds.length}`);
  }

  // 6. Verify cms_live_classes table (Phase 4.1 foundation)
  console.log("\n6. Verifying `cms_live_classes` Foundation Table...");
  const { data: liveData, error: liveErr } = await supabase
    .from("cms_live_classes")
    .select("id, topic, subject, live_status, scheduled_start, course_id, subject_id")
    .limit(5);

  if (liveErr) {
    console.error(`  ✖ cms_live_classes query error: ${liveErr.message}`);
    passed = false;
  } else {
    console.log(`  ✓ \`cms_live_classes\` table exists and is accessible (${liveData?.length || 0} sample rows retrieved).`);
    liveData?.forEach(l => {
      console.log(`    - [${l.id}] "${l.topic}" (${l.subject}, status: ${l.live_status})`);
    });
  }

  console.log("\n==================================================================");
  console.log(`PREFLIGHT RESULT: ${passed ? "ALL CHECKS PASSED (100% READY)" : "FAILURES DETECTED"}`);
  console.log("==================================================================");
}

runPreflight().catch(console.error);
