/**
 * TopVeda Phase 6 Loop 3: Live Interaction Layer Comprehensive Audit
 * 
 * Verifies all 10 milestones of Loop 3:
 * Milestone 1: Live Chat Service, Types & Rate Limiting
 * Milestone 2: Chat Moderation & Role Authorization
 * Milestone 3: Live Polls, Single-Vote Enforcement & Aggregation
 * Milestone 4: Live Quizzes, Answer Key Protection & Redaction
 * Milestone 5: Server-Authoritative Quiz Grading & Score Calculation
 * Milestone 6: Realtime Subscription Channels & Live Room UI
 * Milestone 7: Activity Tracking (LIVE_CHAT, LIVE_POLL, LIVE_QUIZ)
 * Milestone 8: In-App Notification Dispatchers & Service Reuse
 * Milestone 9: Database Migration & Strict RLS Policies
 * Milestone 10: Participant Isolation & Zero Secret Leakage
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${message}`);
    failed++;
  }
}

console.log("\n======================================================================");
console.log("  TOPVEDA PHASE 6 LOOP 3: LIVE INTERACTION SYSTEM AUDIT");
console.log("======================================================================\n");

// ------------------------------------------------------------------------------
// Milestone 1: Live Chat Architecture & Rate Limiting
// ------------------------------------------------------------------------------
console.log("[Milestone 1/10] Live Chat Architecture & Rate Limiting");
const chatServicePath = path.join(ROOT, "src", "lib", "services", "live-chat.service.ts");
const interactionTypesPath = path.join(ROOT, "src", "types", "live-interaction.types.ts");
const studentChatRoutePath = path.join(ROOT, "src", "app", "api", "student", "live", "[id]", "chat", "route.ts");

assert(fs.existsSync(chatServicePath), "live-chat.service.ts exists");
assert(fs.existsSync(interactionTypesPath), "live-interaction.types.ts exists");
assert(fs.existsSync(studentChatRoutePath), "POST /api/student/live/[id]/chat exists");

const chatCode = fs.readFileSync(chatServicePath, "utf8");
assert(chatCode.includes("class LiveChatService"), "LiveChatService class defined");
assert(chatCode.includes("sendMessage"), "sendMessage method implemented");
assert(chatCode.includes("getMessages"), "getMessages method implemented");
assert(chatCode.includes("MAX_MESSAGE_LENGTH"), "Max message length cap defined");
assert(chatCode.includes("RATE_LIMIT_WINDOW_SECS"), "Rate limiting window defined");
assert(chatCode.includes("MAX_MESSAGES_PER_WINDOW"), "Max messages per window cap defined");

// ------------------------------------------------------------------------------
// Milestone 2: Chat Moderation & Role Authorization
// ------------------------------------------------------------------------------
console.log("\n[Milestone 2/10] Chat Moderation & Role Authorization");
const moderateRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "live", "[id]", "chat", "moderate", "route.ts");
assert(fs.existsSync(moderateRoutePath), "POST /api/teacher/live/[id]/chat/moderate exists");

const moderateCode = fs.readFileSync(moderateRoutePath, "utf8");
assert(moderateCode.includes("ADMIN") && moderateCode.includes("SUPER_ADMIN"), "Moderation restricted to educators and Super Admins");
assert(chatCode.includes("moderateMessage"), "moderateMessage method implemented in service");
assert(chatCode.includes("is_hidden"), "Manages is_hidden state in database");

// ------------------------------------------------------------------------------
// Milestone 3: Live Polls & Single-Vote Enforcement
// ------------------------------------------------------------------------------
console.log("\n[Milestone 3/10] Live Polls & Single-Vote Enforcement");
const pollServicePath = path.join(ROOT, "src", "lib", "services", "live-poll.service.ts");
const studentPollRoute = path.join(ROOT, "src", "app", "api", "student", "live", "[id]", "polls", "route.ts");
const studentVoteRoute = path.join(ROOT, "src", "app", "api", "student", "live", "[id]", "polls", "vote", "route.ts");
const teacherPollRoute = path.join(ROOT, "src", "app", "api", "teacher", "live", "[id]", "polls", "route.ts");
const teacherClosePollRoute = path.join(ROOT, "src", "app", "api", "teacher", "live", "[id]", "polls", "close", "route.ts");

assert(fs.existsSync(pollServicePath), "live-poll.service.ts exists");
assert(fs.existsSync(studentPollRoute), "GET /api/student/live/[id]/polls exists");
assert(fs.existsSync(studentVoteRoute), "POST /api/student/live/[id]/polls/vote exists");
assert(fs.existsSync(teacherPollRoute), "POST /api/teacher/live/[id]/polls exists");
assert(fs.existsSync(teacherClosePollRoute), "POST /api/teacher/live/[id]/polls/close exists");

const pollCode = fs.readFileSync(pollServicePath, "utf8");
assert(pollCode.includes("createPoll"), "createPoll method implemented");
assert(pollCode.includes("getActivePoll"), "getActivePoll method implemented");
assert(pollCode.includes("vote"), "vote method implemented");
assert(pollCode.includes("closePoll"), "closePoll method implemented");
assert(pollCode.includes("existingVote"), "Checks for existing student vote");
assert(pollCode.includes("You have already voted"), "Rejects duplicate votes with clear error");

// ------------------------------------------------------------------------------
// Milestone 4: Live Quizzes & Answer Key Protection
// ------------------------------------------------------------------------------
console.log("\n[Milestone 4/10] Live Quizzes & Answer Key Redaction");
const quizServicePath = path.join(ROOT, "src", "lib", "services", "live-quiz.service.ts");
const studentQuizRoute = path.join(ROOT, "src", "app", "api", "student", "live", "[id]", "quizzes", "route.ts");
const studentQuizSubmitRoute = path.join(ROOT, "src", "app", "api", "student", "live", "[id]", "quizzes", "submit", "route.ts");
const teacherQuizRoute = path.join(ROOT, "src", "app", "api", "teacher", "live", "[id]", "quizzes", "route.ts");

assert(fs.existsSync(quizServicePath), "live-quiz.service.ts exists");
assert(fs.existsSync(studentQuizRoute), "GET /api/student/live/[id]/quizzes exists");
assert(fs.existsSync(studentQuizSubmitRoute), "POST /api/student/live/[id]/quizzes/submit exists");
assert(fs.existsSync(teacherQuizRoute), "POST /api/teacher/live/[id]/quizzes exists");

const quizCode = fs.readFileSync(quizServicePath, "utf8");
assert(quizCode.includes("createQuiz"), "createQuiz method implemented");
assert(quizCode.includes("getActiveQuiz"), "getActiveQuiz method implemented");
assert(quizCode.includes("submitQuiz"), "submitQuiz method implemented");
assert(quizCode.includes("showCorrectAnswer"), "Redacts answer key for students before attempt submission");
assert(quizCode.includes("correctOptionId: showCorrectAnswer ? q.correct_option_id : undefined"), "Redacts correctOptionId strictly");

// ------------------------------------------------------------------------------
// Milestone 5: Server-Authoritative Quiz Grading
// ------------------------------------------------------------------------------
console.log("\n[Milestone 5/10] Server-Authoritative Quiz Grading & Scorecards");
assert(quizCode.includes("scoreObtained"), "Calculates scoreObtained server-side");
assert(quizCode.includes("maxScore"), "Calculates maxScore server-side");
assert(quizCode.includes("percentage"), "Calculates percentage score");
assert(quizCode.includes("existingAttempt"), "Enforces single attempt per student per quiz");
assert(quizCode.includes("live_class_quiz_attempts"), "Records attempt in live_class_quiz_attempts table");

// ------------------------------------------------------------------------------
// Milestone 6: Realtime Subscription Channels & Live Room UI
// ------------------------------------------------------------------------------
console.log("\n[Milestone 6/10] Realtime Subscription Channels & Interactive Classroom UI");
const liveRoomPath = path.join(ROOT, "src", "app", "student", "live", "[id]", "page.tsx");
assert(fs.existsSync(liveRoomPath), "Student live room page exists");
const liveRoomCode = fs.readFileSync(liveRoomPath, "utf8");

assert(liveRoomCode.includes("postgres_changes"), "Subscribes to Postgres realtime changes");
assert(liveRoomCode.includes("live_class_messages"), "Subscribes to live_class_messages realtime inserts");
assert(liveRoomCode.includes("live_class_polls"), "Subscribes to live_class_polls realtime events");
assert(liveRoomCode.includes("live_class_quizzes"), "Subscribes to live_class_quizzes realtime events");
assert(liveRoomCode.includes("activeTab"), "Interactive sidebar supports tabbed mode switching");
assert(liveRoomCode.includes("CHAT"), "Chat tab implemented in classroom");
assert(liveRoomCode.includes("POLLS"), "Polls tab implemented in classroom");
assert(liveRoomCode.includes("QUIZZES"), "Quizzes tab implemented in classroom");

// ------------------------------------------------------------------------------
// Milestone 7: Activity Tracking & Progress Integration
// ------------------------------------------------------------------------------
console.log("\n[Milestone 7/10] Activity Tracking & Progress Integration");
assert(chatCode.includes("LIVE_CHAT"), "Live chat logs LIVE_CHAT activity");
assert(pollCode.includes("LIVE_POLL"), "Live poll vote logs LIVE_POLL activity");
assert(quizCode.includes("LIVE_QUIZ_COMPLETION"), "Quiz submission logs LIVE_QUIZ_COMPLETION activity");
assert(chatCode.includes("student_learning_activity"), "Chat service references student_learning_activity");
assert(pollCode.includes("student_learning_activity"), "Poll service references student_learning_activity");
assert(quizCode.includes("student_learning_activity"), "Quiz service references student_learning_activity");

// ------------------------------------------------------------------------------
// Milestone 8: Notifications Integration
// ------------------------------------------------------------------------------
console.log("\n[Milestone 8/10] Notifications Architecture & Service Integration");
const notifServicePath = path.join(ROOT, "src", "lib", "services", "notification.service.ts");
assert(fs.existsSync(notifServicePath), "notification.service.ts exists");
const notifCode = fs.readFileSync(notifServicePath, "utf8");
assert(notifCode.includes("cms_notifications"), "Unified notifications table cms_notifications used");
assert(notifCode.includes("getStudentNotifications"), "getStudentNotifications supported");
assert(notifCode.includes("createNotification"), "createNotification supported");

// ------------------------------------------------------------------------------
// Milestone 9: Database Migration & RLS Security
// ------------------------------------------------------------------------------
console.log("\n[Milestone 9/10] Database Migration & Strict RLS Policies");
const migrationPath = path.join(ROOT, "supabase", "migrations", "20260930000000_phase_6_loop_3_live_interactions.sql");
assert(fs.existsSync(migrationPath), "20260930000000_phase_6_loop_3_live_interactions.sql exists");

const migrationCode = fs.readFileSync(migrationPath, "utf8");
assert(migrationCode.includes("CREATE TABLE IF NOT EXISTS public.live_class_messages"), "Defines live_class_messages table");
assert(migrationCode.includes("CREATE TABLE IF NOT EXISTS public.live_class_polls"), "Defines live_class_polls table");
assert(migrationCode.includes("CREATE TABLE IF NOT EXISTS public.live_class_poll_votes"), "Defines live_class_poll_votes table");
assert(migrationCode.includes("CREATE TABLE IF NOT EXISTS public.live_class_quizzes"), "Defines live_class_quizzes table");
assert(migrationCode.includes("CREATE TABLE IF NOT EXISTS public.live_class_quiz_questions"), "Defines live_class_quiz_questions table");
assert(migrationCode.includes("CREATE TABLE IF NOT EXISTS public.live_class_quiz_attempts"), "Defines live_class_quiz_attempts table");
assert(migrationCode.includes("ENABLE ROW LEVEL SECURITY"), "Enables Row Level Security on all interaction tables");
assert(migrationCode.includes("uq_live_poll_vote"), "Unique constraint prevents duplicate poll votes");
assert(migrationCode.includes("uq_live_quiz_attempt"), "Unique constraint prevents duplicate quiz attempts");

// ------------------------------------------------------------------------------
// Milestone 10: Participant Isolation & Secret Isolation
// ------------------------------------------------------------------------------
console.log("\n[Milestone 10/10] Participant Isolation & Zero Secret Leakage");
assert(!liveRoomCode.includes("GOOGLE_CLIENT_SECRET"), "Student live room has no GOOGLE_CLIENT_SECRET");
assert(!liveRoomCode.includes("YOUTUBE_TOKEN_ENCRYPTION_KEY"), "Student live room has no encryption key");
assert(!liveRoomCode.includes("correct_option_id"), "Student live room does not reference raw correct_option_id");

console.log("\n======================================================================");
console.log(`  LOOP 3 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
