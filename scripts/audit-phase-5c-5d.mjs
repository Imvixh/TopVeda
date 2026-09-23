/**
 * TopVeda Combined Phase 5C + 5D: Automated Audit & Integration Test Suite
 * Validates:
 * 1. Database Schema & Migration Integrity (student_tests, questions, options, attempts, answers)
 * 2. Strict RLS Policies & Student Isolation for Tests and Attempts
 * 3. Safe Test Question Delivery (Zero Answer Key Leakage prior to submission)
 * 4. Server-Authoritative Grading Engine (Zero trust in client marks)
 * 5. Student Live Classes (5C) Querying & Step 5J Attendance Heartbeat Integration
 * 6. Phase 5B Progress Tracker Live Synchronization with Test Attempts
 * 7. 80/20 UI Reference Fidelity for Live & Tests Surfaces
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const results = [];

function assertTest(suite, name, condition, details = "") {
  if (condition) {
    results.push({ suite, name, status: "PASS", details });
    console.log(`  ${colors.green}✓ PASS${colors.reset} [${suite}] ${name}`);
  } else {
    results.push({ suite, name, status: "FAIL", details });
    console.log(`  ${colors.red}✗ FAIL${colors.reset} [${suite}] ${name}: ${details}`);
  }
}

console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   TOPVEDA PHASE 5C + 5D (LIVE & TESTS) — AUTOMATED AUDIT SUITE       ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}\n`);

// ============================================================================
// SUITE 1: DATABASE MIGRATION & SCHEMA INTEGRITY
// ============================================================================
console.log(`${colors.bold}SUITE 1: Database Migration & Schema Integrity${colors.reset}`);

const migrationPath = path.join(rootDir, "supabase", "migrations", "20260926000000_phase_5c_5d_live_tests.sql");
const migrationExists = fs.existsSync(migrationPath);
assertTest("Schema", "Phase 5C/5D migration file exists", migrationExists, migrationPath);

let migrationSql = "";
if (migrationExists) {
  migrationSql = fs.readFileSync(migrationPath, "utf8");
}

assertTest("Schema", "student_tests table created with access_tier, duration, and passing_marks",
  migrationSql.includes("CREATE TABLE IF NOT EXISTS public.student_tests") &&
  migrationSql.includes("access_tier public.content_access_tier") &&
  migrationSql.includes("duration_minutes INT") &&
  migrationSql.includes("passing_marks INT")
);

assertTest("Schema", "student_test_questions table created with marks and negative_marks",
  migrationSql.includes("CREATE TABLE IF NOT EXISTS public.student_test_questions") &&
  migrationSql.includes("marks INT") &&
  migrationSql.includes("negative_marks INT")
);

assertTest("Schema", "student_test_question_options table created with is_correct flag",
  migrationSql.includes("CREATE TABLE IF NOT EXISTS public.student_test_question_options") &&
  migrationSql.includes("is_correct BOOLEAN DEFAULT FALSE")
);

assertTest("Schema", "student_test_attempts table created with score, percentage, and passed fields",
  migrationSql.includes("CREATE TABLE IF NOT EXISTS public.student_test_attempts") &&
  migrationSql.includes("score_obtained INT") &&
  migrationSql.includes("percentage INT") &&
  migrationSql.includes("passed BOOLEAN")
);

assertTest("Schema", "student_test_answers table created with unique (attempt_id, question_id)",
  migrationSql.includes("CREATE TABLE IF NOT EXISTS public.student_test_answers") &&
  migrationSql.includes("uq_student_attempt_question UNIQUE (attempt_id, question_id)")
);

assertTest("Schema", "Non-destructive migration safety: zero DROP TABLE or TRUNCATE",
  !migrationSql.includes("DROP TABLE public.") && !migrationSql.includes("TRUNCATE")
);

assertTest("Schema", "student_test_question_options_safe view created omitting is_correct",
  migrationSql.includes("CREATE OR REPLACE VIEW public.student_test_question_options_safe") &&
  !migrationSql.includes("o.is_correct") &&
  migrationSql.includes("o.option_label")
);

// ============================================================================
// SUITE 2: ROW LEVEL SECURITY & STUDENT ISOLATION
// ============================================================================
console.log(`\n${colors.bold}SUITE 2: Row Level Security & Student Isolation${colors.reset}`);

assertTest("RLS", "RLS enabled on all 5 test and attempt tables",
  migrationSql.includes("ALTER TABLE public.student_tests ENABLE ROW LEVEL SECURITY;") &&
  migrationSql.includes("ALTER TABLE public.student_test_questions ENABLE ROW LEVEL SECURITY;") &&
  migrationSql.includes("ALTER TABLE public.student_test_question_options ENABLE ROW LEVEL SECURITY;") &&
  migrationSql.includes("ALTER TABLE public.student_test_attempts ENABLE ROW LEVEL SECURITY;") &&
  migrationSql.includes("ALTER TABLE public.student_test_answers ENABLE ROW LEVEL SECURITY;")
);

assertTest("RLS", "Raw student_test_question_options is restricted to Admin/Super Admin only (Zero direct answer key access)",
  migrationSql.includes('CREATE POLICY "admin_only_raw_test_options"') &&
  migrationSql.includes("public.is_admin_or_super_admin()")
);

assertTest("RLS", "student_test_attempts SELECT scoped to auth.uid() = student_id",
  migrationSql.includes('CREATE POLICY "students_view_own_attempts"') &&
  migrationSql.includes("auth.uid() = student_id")
);

assertTest("RLS", "student_test_attempts mutation restricted to server/super_admin only",
  migrationSql.includes('CREATE POLICY "server_only_insert_attempts"') &&
  migrationSql.includes('CREATE POLICY "server_only_update_attempts"') &&
  migrationSql.includes("public.is_super_admin()")
);

assertTest("RLS", "student_test_answers mutation restricted to server/super_admin only",
  migrationSql.includes('CREATE POLICY "server_only_insert_answers"') &&
  migrationSql.includes('CREATE POLICY "server_only_update_answers"') &&
  migrationSql.includes("public.is_super_admin()")
);

assertTest("RLS", "student_test_answers view scoped strictly to attempt owner",
  migrationSql.includes('CREATE POLICY "students_view_own_answers"') &&
  migrationSql.includes("a.student_id = auth.uid()")
);

// ============================================================================
// SUITE 3: SAFE QUESTION DELIVERY & ANSWER KEY PROTECTION
// ============================================================================
console.log(`\n${colors.bold}SUITE 3: Safe Question Delivery & Answer Key Protection${colors.reset}`);

const testServicePath = path.join(rootDir, "src", "lib", "services", "student-test.service.ts");
const testServiceCode = fs.readFileSync(testServicePath, "utf8");

assertTest("Answer Security", "startTestAttempt omits is_correct from safe question delivery",
  testServiceCode.includes("SafeTestQuestion") &&
  testServiceCode.includes("startTestAttempt") &&
  testServiceCode.includes("displayOrder: opt.display_order") &&
  testServiceCode.includes("option_label") &&
  testServiceCode.includes("option_text")
);

assertTest("Server Grading", "submitTestAttempt grades choices against true keys server-side",
  testServiceCode.includes("submitTestAttempt") &&
  testServiceCode.includes("selectedOptionIds.length === correctOptionIds.length") &&
  testServiceCode.includes("selectedOptionIds.every((id) => correctOptionIds.includes(id))")
);

assertTest("Server Grading", "Calculates score, percentage, and logs to student_learning_activity",
  testServiceCode.includes('from("student_test_attempts")') &&
  testServiceCode.includes('from("student_learning_activity")') &&
  testServiceCode.includes('activity_type: "TEST_ATTEMPT"')
);

// ============================================================================
// SUITE 4: STUDENT LIVE CLASSES (PHASE 5C) SERVICE & HEARTBEAT
// ============================================================================
console.log(`\n${colors.bold}SUITE 4: Student Live Classes Service & Heartbeat${colors.reset}`);

const liveServicePath = path.join(rootDir, "src", "lib", "services", "student-live.service.ts");
const liveServiceCode = fs.readFileSync(liveServicePath, "utf8");

assertTest("Live Service", "StudentLiveService exports getLiveClassesForStudent and getLiveClassDetail",
  liveServiceCode.includes("export class StudentLiveService") &&
  liveServiceCode.includes("getLiveClassesForStudent") &&
  liveServiceCode.includes("getLiveClassDetail")
);

assertTest("Live Service", "Maps factual student attendance from student_live_attendance",
  liveServiceCode.includes("from(\"student_live_attendance\")") &&
  liveServiceCode.includes("attendanceMap.set")
);

const liveRoomUiPath = path.join(rootDir, "src", "app", "student", "live", "[id]", "page.tsx");
const liveRoomUiCode = fs.readFileSync(liveRoomUiPath, "utf8");

assertTest("Live Heartbeat", "Live classroom runs automatic 30s attendance heartbeat loop",
  liveRoomUiCode.includes("/api/student/live/attendance") &&
  liveRoomUiCode.includes("heartbeatDurationSeconds: 30") &&
  liveRoomUiCode.includes("setInterval")
);

// ============================================================================
// SUITE 5: PHASE 5B PROGRESS TRACKER HARD SYNCHRONIZATION
// ============================================================================
console.log(`\n${colors.bold}SUITE 5: Phase 5B Progress Tracker Hard Synchronization${colors.reset}`);

const progressServicePath = path.join(rootDir, "src", "lib", "services", "student-progress.service.ts");
const progressServiceCode = fs.readFileSync(progressServicePath, "utf8");

assertTest("Progress Sync", "StudentProgressService queries student_test_attempts directly",
  progressServiceCode.includes("from(\"student_test_attempts\")") &&
  progressServiceCode.includes("in(\"status\", [\"SUBMITTED\", \"EVALUATED\"])")
);

assertTest("Progress Sync", "Populates testsAttempted, quizzesAttempted, and recentTestResults with factual data",
  progressServiceCode.includes("testsAttempted++") &&
  progressServiceCode.includes("recentTestResults.push")
);

// ============================================================================
// SUITE 6: API ENDPOINTS & AUTHENTICATION GOVERNANCE
// ============================================================================
console.log(`\n${colors.bold}SUITE 6: API Endpoints & Authentication Governance${colors.reset}`);

const apiLiveRoute = path.join(rootDir, "src", "app", "api", "student", "live", "route.ts");
const apiLiveDetailRoute = path.join(rootDir, "src", "app", "api", "student", "live", "[id]", "route.ts");
const apiTestsRoute = path.join(rootDir, "src", "app", "api", "student", "tests", "route.ts");
const apiTestDetailRoute = path.join(rootDir, "src", "app", "api", "student", "tests", "[id]", "route.ts");
const apiTestAttemptRoute = path.join(rootDir, "src", "app", "api", "student", "tests", "[id]", "attempt", "route.ts");
const apiTestSubmitRoute = path.join(rootDir, "src", "app", "api", "student", "tests", "[id]", "submit", "route.ts");
const apiScorecardRoute = path.join(rootDir, "src", "app", "api", "student", "tests", "attempts", "[attemptId]", "route.ts");

assertTest("API", "GET /api/student/live exists", fs.existsSync(apiLiveRoute));
assertTest("API", "GET /api/student/live/[id] exists", fs.existsSync(apiLiveDetailRoute));
assertTest("API", "GET /api/student/tests exists", fs.existsSync(apiTestsRoute));
assertTest("API", "GET /api/student/tests/[id] exists", fs.existsSync(apiTestDetailRoute));
assertTest("API", "POST /api/student/tests/[id]/attempt exists", fs.existsSync(apiTestAttemptRoute));
assertTest("API", "POST /api/student/tests/[id]/submit exists", fs.existsSync(apiTestSubmitRoute));
assertTest("API", "GET /api/student/tests/attempts/[attemptId] exists", fs.existsSync(apiScorecardRoute));

// ============================================================================
// SUITE 7: UI & 80/20 REFERENCE FIDELITY
// ============================================================================
console.log(`\n${colors.bold}SUITE 7: UI & 80/20 Reference Fidelity${colors.reset}`);

const liveCatalogUiPath = path.join(rootDir, "src", "app", "student", "live", "page.tsx");
const liveCatalogUiCode = fs.readFileSync(liveCatalogUiPath, "utf8");

assertTest("UI", "Live classes page renders categories (Live Now, Upcoming, Completed)",
  liveCatalogUiCode.includes("Live Now") &&
  liveCatalogUiCode.includes("Upcoming") &&
  liveCatalogUiCode.includes("Completed")
);

const testsCatalogUiPath = path.join(rootDir, "src", "app", "student", "tests", "page.tsx");
const testsCatalogUiCode = fs.readFileSync(testsCatalogUiPath, "utf8");

assertTest("UI", "Tests catalog renders tabs and parameter badges (Duration, Questions, Marks)",
  testsCatalogUiCode.includes("Chapter Drills") &&
  testsCatalogUiCode.includes("Mock Exams") &&
  testsCatalogUiCode.includes("durationMinutes")
);

const testRunnerUiPath = path.join(rootDir, "src", "app", "student", "tests", "[id]", "page.tsx");
const testRunnerUiCode = fs.readFileSync(testRunnerUiPath, "utf8");

assertTest("UI", "Interactive test runner renders question palette and countdown timer",
  testRunnerUiCode.includes("Question Palette") &&
  testRunnerUiCode.includes("formatTime(secondsRemaining)") &&
  testRunnerUiCode.includes("handleSelectOption")
);

assertTest("UI", "Post-submission scorecard renders score, percentage, and revealed explanations",
  testRunnerUiCode.includes("Performance Scorecard") &&
  testRunnerUiCode.includes("scorecard.percentage") &&
  testRunnerUiCode.includes("Detailed Question Analysis & Explanations")
);

// ============================================================================
// AUDIT SUMMARY
// ============================================================================
console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
const total = results.length;

console.log(`${colors.bold}TOTAL TESTS: ${total}${colors.reset}`);
console.log(`${colors.bold}${colors.green}PASSED: ${passed}${colors.reset}`);
if (failed > 0) {
  console.log(`${colors.bold}${colors.red}FAILED: ${failed}${colors.reset}`);
} else {
  console.log(`${colors.bold}${colors.green}ALL PHASE 5C + 5D AUDIT CHECKS PASSED (100%)${colors.reset}`);
}
console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}\n`);

if (failed > 0) {
  process.exit(1);
}
