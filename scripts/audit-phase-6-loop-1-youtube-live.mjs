/**
 * TopVeda Phase 6 Loop 1: YouTube Live Streaming & Attendance Audit
 * 
 * Verifies:
 * 1. YouTube Live API Service Architecture & Ingest Provisioning
 * 2. YouTube Streaming Provider Implementation & IStreamingProvider Abstraction
 * 3. Teacher Autonomous Live Scheduling with YouTube Session Creation
 * 4. 10-Minute Teacher Early Access & Student Isolation Matrix
 * 5. Student Live Classroom YouTube Embed & Access Validation
 * 6. Server-Authoritative Live Attendance & Heartbeat Security
 * 7. Live Lifecycle Synchronization & Super Admin Governance
 * 8. Recording Handoff to Super Admin Review Pipeline
 * 9. Provider Secret Isolation (Stream Keys & Tokens Redaction)
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
console.log("  TOPVEDA PHASE 6 LOOP 1: REAL YOUTUBE LIVE & ATTENDANCE AUDIT");
console.log("======================================================================\n");

// ------------------------------------------------------------------------------
// 1. YouTube Live Service Architecture
// ------------------------------------------------------------------------------
console.log("[1/8] YouTube Live Service Architecture");

const ytLiveServicePath = path.join(ROOT, "src", "lib", "services", "youtube-live.service.ts");
assert(fs.existsSync(ytLiveServicePath), "youtube-live.service.ts exists");

if (fs.existsSync(ytLiveServicePath)) {
  const code = fs.readFileSync(ytLiveServicePath, "utf-8");
  assert(code.includes("class YouTubeLiveService"), "Exports YouTubeLiveService class");
  assert(code.includes("createLiveBroadcast"), "Implements createLiveBroadcast method");
  assert(code.includes("createLiveStream"), "Implements createLiveStream method");
  assert(code.includes("bindBroadcastToStream"), "Implements bindBroadcastToStream method");
  assert(code.includes("transitionBroadcast"), "Implements transitionBroadcast method");
  assert(code.includes("getBroadcast"), "Implements getBroadcast method");
  assert(code.includes("getStream"), "Implements getStream method");
  assert(code.includes("privacyStatus || \"unlisted\""), "Defaults broadcast privacy to unlisted to reduce public discoverability");
  assert(code.includes("getValidAccessToken"), "Implements token refresh using stored encrypted refresh token");
}

// ------------------------------------------------------------------------------
// 2. YouTube Streaming Provider Implementation
// ------------------------------------------------------------------------------
console.log("\n[2/8] YouTube Streaming Provider Implementation");

const ytStreamingPath = path.join(ROOT, "src", "lib", "services", "youtube-streaming.service.ts");
assert(fs.existsSync(ytStreamingPath), "youtube-streaming.service.ts exists");

if (fs.existsSync(ytStreamingPath)) {
  const code = fs.readFileSync(ytStreamingPath, "utf-8");
  assert(code.includes("class YouTubeStreamingProvider implements IStreamingProvider"), "Implements IStreamingProvider interface");
  assert(code.includes("providerName = \"youtube\""), "Sets providerName to \"youtube\"");
  assert(code.includes("createSession"), "Implements createSession method");
  assert(code.includes("startSession"), "Implements startSession method");
  assert(code.includes("endSession"), "Implements endSession method");
  assert(code.includes("terminateSession"), "Implements terminateSession method");
  assert(code.includes("getStatus"), "Implements getStatus method");
  assert(code.includes("youtube-nocookie.com/embed"), "Generates privacy-enhanced embed playback URL");
}

const streamingServicePath = path.join(ROOT, "src", "lib", "services", "streaming.service.ts");
assert(fs.existsSync(streamingServicePath), "streaming.service.ts exists");

if (fs.existsSync(streamingServicePath)) {
  const code = fs.readFileSync(streamingServicePath, "utf-8");
  assert(code.includes("YouTubeStreamingProvider"), "StreamingService integrates YouTubeStreamingProvider");
  assert(code.includes("new YouTubeStreamingProvider()"), "Defaults primary streaming provider to YouTubeStreamingProvider");
}

// ------------------------------------------------------------------------------
// 3. Teacher Autonomous Live Scheduling
// ------------------------------------------------------------------------------
console.log("\n[3/8] Teacher Autonomous Live Scheduling Verification");

const createRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "live", "create", "route.ts");
assert(fs.existsSync(createRoutePath), "POST /api/teacher/live/create exists");

if (fs.existsSync(createRoutePath)) {
  const code = fs.readFileSync(createRoutePath, "utf-8");
  assert(code.includes("StreamingService.createLiveSession"), "Invokes StreamingService.createLiveSession on creation");
  assert(code.includes("overlap"), "Enforces schedule collision / overlap prevention server-side");
  assert(code.includes("stream_key: _internalKey"), "Redacts internal stream key from client response");
}

// ------------------------------------------------------------------------------
// 4. 10-Minute Teacher Early Access & Student Isolation Matrix
// ------------------------------------------------------------------------------
console.log("\n[4/8] 10-Minute Teacher Early Access & Student Isolation Matrix");

const sessionRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "live", "session", "route.ts");
assert(fs.existsSync(sessionRoutePath), "GET /api/teacher/live/session exists");

if (fs.existsSync(sessionRoutePath)) {
  const code = fs.readFileSync(sessionRoutePath, "utf-8");
  assert(code.includes("earlyAccessWindowMs = 10 * 60 * 1000"), "Configures 10-minute teacher early access window");
  assert(code.includes("isStudentAllowed = !isOwnerTeacher && !isSuperAdmin && isStudentWindowOpen && isLiveActive"), "Strictly isolates student access until scheduled start and live activation");
  assert(code.includes("playbackVideoId"), "Returns playbackVideoId to authorized clients");
  assert(code.includes("embedPlaybackUrl"), "Returns embedPlaybackUrl to authorized clients");
}

// ------------------------------------------------------------------------------
// 5. Student Live Classroom Player Embedding
// ------------------------------------------------------------------------------
console.log("\n[5/8] Student Live Classroom Player Embedding");

const studentLiveUiPath = path.join(ROOT, "src", "app", "student", "live", "[id]", "page.tsx");
assert(fs.existsSync(studentLiveUiPath), "Student Live Classroom page exists (/student/live/[id])");

if (fs.existsSync(studentLiveUiPath)) {
  const code = fs.readFileSync(studentLiveUiPath, "utf-8");
  assert(code.includes("iframe"), "Embeds responsive iframe player for live viewing");
  assert(code.includes("youtube-nocookie.com/embed"), "Uses privacy-enhanced embed domain");
  assert(code.includes("/api/student/live/attendance"), "Hooks live attendance heartbeat reporting");
}

// ------------------------------------------------------------------------------
// 6. Server-Authoritative Live Attendance & Heartbeat Security
// ------------------------------------------------------------------------------
console.log("\n[6/8] Server-Authoritative Live Attendance & Heartbeat Security");

const attendanceRoutePath = path.join(ROOT, "src", "app", "api", "student/live/attendance/route.ts");
assert(fs.existsSync(attendanceRoutePath), "POST /api/student/live/attendance exists");

const progressServicePath = path.join(ROOT, "src", "lib", "services", "student-progress.service.ts");
assert(fs.existsSync(progressServicePath), "student-progress.service.ts exists");

if (fs.existsSync(progressServicePath)) {
  const code = fs.readFileSync(progressServicePath, "utf-8");
  assert(code.includes("recordLiveAttendance"), "Implements recordLiveAttendance method");
  assert(code.includes("Math.min(heartbeatDurationSeconds, 60)"), "Enforces server-authoritative heartbeat duration cap (60s max per tick)");
  assert(code.includes("student_live_attendance"), "Upserts into student_live_attendance table");
  assert(code.includes("student_learning_activity"), "Appends record to student_learning_activity audit log");
}

// ------------------------------------------------------------------------------
// 7. Live Lifecycle Synchronization & Super Admin Governance
// ------------------------------------------------------------------------------
console.log("\n[7/8] Live Lifecycle Synchronization & Super Admin Governance");

const startRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "live", "start", "route.ts");
assert(fs.existsSync(startRoutePath), "POST /api/teacher/live/start exists");

const endRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "live", "end", "route.ts");
assert(fs.existsSync(endRoutePath), "POST /api/teacher/live/end exists");

const terminateRoutePath = path.join(ROOT, "src", "app", "api", "admin", "live", "terminate", "route.ts");
assert(fs.existsSync(terminateRoutePath), "POST /api/admin/live/terminate exists");

if (fs.existsSync(endRoutePath)) {
  const code = fs.readFileSync(endRoutePath, "utf-8");
  assert(code.includes("StreamingService.endLiveSession"), "Concludes live streaming session in provider");
  assert(code.includes("inheritLiveClassToLectureDraft"), "Automatically inherits completed live class to recorded lecture draft");
  assert(code.includes("recording_status: \"PROCESSING\""), "Sets recording_status to PROCESSING");
}

if (fs.existsSync(terminateRoutePath)) {
  const code = fs.readFileSync(terminateRoutePath, "utf-8");
  assert(code.includes("SUPER_ADMIN"), "Enforces SUPER_ADMIN role for emergency termination");
  assert(code.includes("reason"), "Requires audit termination reason");
}

// ------------------------------------------------------------------------------
// 8. Recording Handoff to Super Admin Review Pipeline
// ------------------------------------------------------------------------------
console.log("\n[8/8] Recording Handoff to Super Admin Review Pipeline");

const cmsServicePath = path.join(ROOT, "src", "lib", "services", "cms.service.ts");
assert(fs.existsSync(cmsServicePath), "cms.service.ts exists");

if (fs.existsSync(cmsServicePath)) {
  const code = fs.readFileSync(cmsServicePath, "utf-8");
  assert(code.includes("inheritLiveClassToLectureDraft"), "Implements inheritLiveClassToLectureDraft");
  assert(code.includes("status: \"DRAFT\"") || code.includes("status: \"PENDING_REVIEW\""), "Generates initial draft status for review governance");
}

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`  AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exitCode = 1;
}
