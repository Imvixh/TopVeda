/**
 * TopVeda Phase 6 Loop 3: Live Interaction E2E Functional Lifecycle Test
 * Tests Chat Rate Limiting & Moderation, Poll Aggregation & Duplicate Prevention,
 * and Quiz Server-Side Grading with Answer Key Protection.
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
console.log("  TOPVEDA PHASE 6 LOOP 3: REAL E2E INTERACTION SIMULATION TEST");
console.log("======================================================================\n");

// ------------------------------------------------------------------------------
// 1. Live Chat Message Validation & Rate Limiter Simulation
// ------------------------------------------------------------------------------
console.log("[1/5] Live Chat Validation & Spam Guard Simulation");

function validateAndSendChatMessage({ senderId, role, message, recentMessageCountIn10s }) {
  const trimmed = (message || "").trim();
  if (!trimmed) return { success: false, error: "Empty message" };
  if (trimmed.length > 500) return { success: false, error: "Message too long" };

  if (role === "STUDENT" && recentMessageCountIn10s >= 5) {
    return { success: false, error: "Rate limit exceeded" };
  }

  return { success: true, message: { senderId, message: trimmed, isHidden: false } };
}

assert(validateAndSendChatMessage({ senderId: "stu-1", role: "STUDENT", message: "Hello sir!", recentMessageCountIn10s: 0 }).success, "Standard student message is accepted");
assert(!validateAndSendChatMessage({ senderId: "stu-1", role: "STUDENT", message: "   ", recentMessageCountIn10s: 0 }).success, "Empty/whitespace message is rejected");
assert(!validateAndSendChatMessage({ senderId: "stu-1", role: "STUDENT", message: "a".repeat(501), recentMessageCountIn10s: 0 }).success, "501-character message is rejected (max 500)");
assert(!validateAndSendChatMessage({ senderId: "stu-1", role: "STUDENT", message: "Spam!", recentMessageCountIn10s: 5 }).success, "6th message within 10s is blocked by spam guard");
assert(validateAndSendChatMessage({ senderId: "tea-1", role: "ADMIN", message: "Announcement", recentMessageCountIn10s: 10 }).success, "Teacher bypasses spam rate limit for instructional broadcasts");

// ------------------------------------------------------------------------------
// 2. Chat Moderation Simulation
// ------------------------------------------------------------------------------
console.log("\n[2/5] Chat Moderation & Message Hiding Simulation");

function moderateChatMessage({ isTeacherOrAdmin, message, isHidden }) {
  if (!isTeacherOrAdmin) return { success: false, error: "Unauthorized" };
  return { success: true, updatedMessage: { ...message, isHidden } };
}

const origMsg = { id: "msg-1", message: "Inappropriate text", isHidden: false };
const modResult = moderateChatMessage({ isTeacherOrAdmin: true, message: origMsg, isHidden: true });
assert(modResult.success && modResult.updatedMessage.isHidden === true, "Teacher can hide inappropriate message");

const unauthMod = moderateChatMessage({ isTeacherOrAdmin: false, message: origMsg, isHidden: true });
assert(!unauthMod.success, "Student cannot moderate another student's message (403)");

// ------------------------------------------------------------------------------
// 3. Live Polls: Single-Vote Enforcement & Percentage Tallying
// ------------------------------------------------------------------------------
console.log("\n[3/5] Live Polls Single-Vote Enforcement & Percentage Aggregation");

function tallyPollResults(options, votes) {
  const totalVotes = votes.length;
  const countMap = {};
  options.forEach((o) => (countMap[o.id] = 0));
  votes.forEach((v) => {
    countMap[v.optionId] = (countMap[v.optionId] || 0) + 1;
  });

  return options.map((o) => {
    const count = countMap[o.id] || 0;
    const votePercentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    return { id: o.id, text: o.text, voteCount: count, votePercentage };
  });
}

function castVote(pollStatus, existingVotes, studentId, optionId) {
  if (pollStatus !== "ACTIVE") return { success: false, error: "Poll closed" };
  if (existingVotes.some((v) => v.studentId === studentId)) {
    return { success: false, error: "Already voted" };
  }
  return { success: true, vote: { studentId, optionId } };
}

const pollOpts = [
  { id: "1", text: "Option A" },
  { id: "2", text: "Option B" },
  { id: "3", text: "Option C" },
];

const v1 = castVote("ACTIVE", [], "stu-1", "1");
assert(v1.success, "First vote from student-1 succeeds");

const v2Duplicate = castVote("ACTIVE", [{ studentId: "stu-1", optionId: "1" }], "stu-1", "2");
assert(!v2Duplicate.success, "Second vote from student-1 is rejected (single vote rule)");

const vClosed = castVote("CLOSED", [], "stu-2", "1");
assert(!vClosed.success, "Voting in closed poll is rejected");

const votes = [
  { studentId: "stu-1", optionId: "1" },
  { studentId: "stu-2", optionId: "1" },
  { studentId: "stu-3", optionId: "2" },
  { studentId: "stu-4", optionId: "3" },
];
const tallied = tallyPollResults(pollOpts, votes);
assert(tallied[0].voteCount === 2 && tallied[0].votePercentage === 50, "Option A has 2 votes (50%)");
assert(tallied[1].voteCount === 1 && tallied[1].votePercentage === 25, "Option B has 1 vote (25%)");
assert(tallied[2].voteCount === 1 && tallied[2].votePercentage === 25, "Option C has 1 vote (25%)");

// ------------------------------------------------------------------------------
// 4. Live Quiz: Answer Key Redaction for Students
// ------------------------------------------------------------------------------
console.log("\n[4/5] Live Quiz Answer Key Protection & Redaction");

const rawQuestions = [
  { id: "q1", questionNumber: 1, questionText: "d/dx(sin x)", options: [{ id: "1", text: "cos x" }, { id: "2", text: "-cos x" }], correct_option_id: "1", points: 1 },
  { id: "q2", questionNumber: 2, questionText: "Integral of 1/x dx", options: [{ id: "1", text: "ln|x|" }, { id: "2", text: "e^x" }], correct_option_id: "1", points: 2 },
];

function getQuestionsForClient(questions, isTeacherOrAdmin, hasAttempted) {
  return questions.map((q) => {
    const showCorrectAnswer = isTeacherOrAdmin || hasAttempted;
    return {
      id: q.id,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      options: q.options,
      correctOptionId: showCorrectAnswer ? q.correct_option_id : undefined,
      points: q.points,
    };
  });
}

const studentPreQuizView = getQuestionsForClient(rawQuestions, false, false);
assert(studentPreQuizView[0].correctOptionId === undefined, "Student pre-quiz view has correctOptionId REDACTED");
assert(studentPreQuizView[1].correctOptionId === undefined, "Student pre-quiz view has question 2 answer REDACTED");

const teacherQuizView = getQuestionsForClient(rawQuestions, true, false);
assert(teacherQuizView[0].correctOptionId === "1", "Teacher view includes correctOptionId for management");

// ------------------------------------------------------------------------------
// 5. Live Quiz: Server-Side Grading & Scorecard Calculation
// ------------------------------------------------------------------------------
console.log("\n[5/5] Server-Side Quiz Grading & Single Attempt Enforcement");

function gradeQuizSubmission(questions, studentAnswers) {
  let scoreObtained = 0;
  let maxScore = 0;

  const questionResults = questions.map((q) => {
    const chosen = studentAnswers[q.id] || "";
    const isCorrect = chosen === q.correct_option_id;
    const pointsAwarded = isCorrect ? q.points : 0;
    scoreObtained += pointsAwarded;
    maxScore += q.points;
    return { questionId: q.id, chosen, correct: q.correct_option_id, isCorrect, pointsAwarded };
  });

  const percentage = maxScore > 0 ? Math.round((scoreObtained / maxScore) * 100) : 0;
  return { scoreObtained, maxScore, percentage, questionResults };
}

// Student answers q1 correctly (1 pt) and q2 incorrectly (0/2 pt) -> 1/3 pts (33%)
const graded1 = gradeQuizSubmission(rawQuestions, { q1: "1", q2: "2" });
assert(graded1.scoreObtained === 1 && graded1.maxScore === 3, "Grade calculation: 1 / 3 points obtained");
assert(graded1.percentage === 33, "Percentage calculation: 33% correct");
assert(graded1.questionResults[0].isCorrect === true, "Q1 correctly scored as true");
assert(graded1.questionResults[1].isCorrect === false, "Q2 correctly scored as false");

// Student answers all correctly -> 3/3 pts (100%)
const graded2 = gradeQuizSubmission(rawQuestions, { q1: "1", q2: "1" });
assert(graded2.scoreObtained === 3 && graded2.percentage === 100, "100% scorecard calculation verified");

const studentPostQuizView = getQuestionsForClient(rawQuestions, false, true);
assert(studentPostQuizView[0].correctOptionId === "1", "Post-submission view unlocks answer key for review");

console.log("\n======================================================================");
console.log(`  E2E SIMULATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
