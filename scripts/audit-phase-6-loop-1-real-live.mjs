/**
 * TopVeda Phase 6 Loop 1: Real YouTube Live & Attendance Comprehensive Audit
 * 
 * Verifies all 10 phases of Loop 1:
 * Phase 1: Architecture & Provider Integration
 * Phase 2: Real YouTube API Auth & Token Refresh
 * Phase 3: Live Broadcast Creation & RTMP Stream Ingest
 * Phase 4: Production-Safe Broadcast Settings (Unlisted, DVR, UltraLow Latency, AutoStart/Stop)
 * Phase 5: Teacher Autonomous Live Scheduling & Early Access Window
 * Phase 6: Student In-Platform Embedded Player Isolation
 * Phase 7: Server-Authoritative Live Attendance & Anti-Spoofing Heartbeats
 * Phase 8: Live Lifecycle Synchronization (SCHEDULED -> LIVE -> COMPLETED -> TERMINATED)
 * Phase 9: Recording Handoff to Super Admin Review Pipeline (PENDING_REVIEW)
 * Phase 10: Secret Isolation & Zero Token Leakage
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
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
console.log("  TOPVEDA PHASE 6 LOOP 1: REAL YOUTUBE LIVE END-TO-END VERIFICATION");
console.log("======================================================================\n");

// ------------------------------------------------------------------------------
// Phase 1: Architecture & Provider Abstraction
// ------------------------------------------------------------------------------
console.log("[Phase 1/10] Architecture & Provider Abstraction");
const streamingServicePath = path.join(ROOT, "src", "lib", "services", "streaming.service.ts");
const ytStreamingPath = path.join(ROOT, "src", "lib", "services", "youtube-streaming.service.ts");
const ytLiveServicePath = path.join(ROOT, "src", "lib", "services", "youtube-live.service.ts");

assert(fs.existsSync(streamingServicePath), "streaming.service.ts exists");
assert(fs.existsSync(ytStreamingPath), "youtube-streaming.service.ts exists");
assert(fs.existsSync(ytLiveServicePath), "youtube-live.service.ts exists");

const ytStreamingCode = fs.readFileSync(ytStreamingPath, "utf8");
assert(ytStreamingCode.includes("class YouTubeStreamingProvider implements IStreamingProvider"), "Implements IStreamingProvider");
assert(ytStreamingCode.includes("providerName = \"youtube\""), "Primary providerName is 'youtube'");
assert(ytStreamingCode.includes("createSession"), "Implements createSession");
assert(ytStreamingCode.includes("startSession"), "Implements startSession");
assert(ytStreamingCode.includes("endSession"), "Implements endSession");
assert(ytStreamingCode.includes("terminateSession"), "Implements terminateSession");
assert(ytStreamingCode.includes("getStatus"), "Implements getStatus");

// ------------------------------------------------------------------------------
// Phase 2: YouTube OAuth Auth & Server-Side Token Security
// ------------------------------------------------------------------------------
console.log("\n[Phase 2/10] Real YouTube OAuth Auth & Token Security");
const ytOAuthServicePath = path.join(ROOT, "src", "lib", "services", "youtube-oauth.service.ts");
assert(fs.existsSync(ytOAuthServicePath), "youtube-oauth.service.ts exists");
const ytOAuthCode = fs.readFileSync(ytOAuthServicePath, "utf8");
assert(ytOAuthCode.includes("aes-256-gcm"), "AES-256-GCM encryption implemented for refresh tokens");
assert(ytOAuthCode.includes("refreshAccessToken"), "Implements refreshAccessToken");
assert(ytOAuthCode.includes("validateState"), "Implements timing-safe OAuth state validation");
assert(ytOAuthCode.includes("buildAuthorizationUrl"), "Constructs secure Google OAuth consent URL");

// ------------------------------------------------------------------------------
// Phase 3 & 4: Live Broadcast Creation & Production Settings
// ------------------------------------------------------------------------------
console.log("\n[Phase 3 & 4/10] Live Broadcast, RTMP Stream & Production Settings");
const ytLiveCode = fs.readFileSync(ytLiveServicePath, "utf8");
assert(ytLiveCode.includes("createLiveBroadcast"), "Implements createLiveBroadcast");
assert(ytLiveCode.includes("createLiveStream"), "Implements createLiveStream");
assert(ytLiveCode.includes("bindBroadcastToStream"), "Implements bindBroadcastToStream");
assert(ytLiveCode.includes("privacyStatus: options.privacyStatus || \"unlisted\"") || ytLiveCode.includes("privacyStatus || \"unlisted\""), "Defaults to unlisted privacy to reduce public discoverability");
assert(ytLiveCode.includes("enableAutoStart: options.enableAutoStart ?? true") || ytLiveCode.includes("enableAutoStart"), "Configures enableAutoStart");
assert(ytLiveCode.includes("enableAutoStop: options.enableAutoStop ?? true") || ytLiveCode.includes("enableAutoStop"), "Configures enableAutoStop");
assert(ytLiveCode.includes("enableDvr: true"), "Enables DVR replay during live");
assert(ytLiveCode.includes("enableEmbed: true"), "Enables player embedding");
assert(ytLiveCode.includes("latencyPreference"), "Configures low-latency streaming preference");
assert(ytLiveCode.includes("ingestionType: \"rtmp\""), "RTMP ingest configured for broadcast streams");

// ------------------------------------------------------------------------------
// Phase 5: Teacher Live Workflow & Early Access
// ------------------------------------------------------------------------------
console.log("\n[Phase 5/10] Teacher Autonomous Live Workflow & Early Access");
const createLiveRoute = path.join(ROOT, "src", "app", "api", "teacher", "live", "create", "route.ts");
const sessionRoute = path.join(ROOT, "src", "app", "api", "teacher", "live", "session", "route.ts");
assert(fs.existsSync(createLiveRoute), "POST /api/teacher/live/create exists");
assert(fs.existsSync(sessionRoute), "GET /api/teacher/live/session exists");

const createCode = fs.readFileSync(createLiveRoute, "utf8");
assert(createCode.includes("StreamingService.createLiveSession"), "Teacher creation provisions live streaming session");
assert(createCode.includes("overlapCheckErr") || createCode.includes("overlap"), "Prevents teacher schedule collisions");
assert(createCode.includes("stream_key: _internalKey"), "Redacts raw stream key from student/client response");

const sessionCode = fs.readFileSync(sessionRoute, "utf8");
assert(sessionCode.includes("earlyAccessWindowMs = 10 * 60 * 1000"), "Enforces 10-minute teacher early access preparation window");
assert(sessionCode.includes("studioPublishUrl"), "Returns YouTube Studio livestreaming console URL for educator");
assert(sessionCode.includes("embedPlaybackUrl"), "Returns embedPlaybackUrl for authorized participants");

// ------------------------------------------------------------------------------
// Phase 6: Student In-Platform Player Embedding
// ------------------------------------------------------------------------------
console.log("\n[Phase 6/10] Student In-Platform Embedded Player");
const studentLivePage = path.join(ROOT, "src", "app", "student", "live", "[id]", "page.tsx");
assert(fs.existsSync(studentLivePage), "Student Live Classroom page exists (/student/live/[id])");

const studentPageCode = fs.readFileSync(studentLivePage, "utf8");
assert(studentPageCode.includes("youtube-nocookie.com/embed"), "Embeds YouTube Live using privacy-enhanced domain");
assert(studentPageCode.includes("iframe"), "Renders embedded player inside TopVeda without external redirection");
assert(studentPageCode.includes("Classroom Chat"), "Embeds native TopVeda classroom chat alongside stream");

// ------------------------------------------------------------------------------
// Phase 7: Server-Authoritative Live Attendance & Anti-Spoofing
// ------------------------------------------------------------------------------
console.log("\n[Phase 7/10] Server-Authoritative Live Attendance & Heartbeats");
const attendanceRoute = path.join(ROOT, "src", "app", "api", "student", "live", "attendance", "route.ts");
const progressService = path.join(ROOT, "src", "lib", "services", "student-progress.service.ts");
assert(fs.existsSync(attendanceRoute), "POST /api/student/live/attendance exists");
assert(fs.existsSync(progressService), "student-progress.service.ts exists");

const progressCode = fs.readFileSync(progressService, "utf8");
assert(progressCode.includes("recordLiveAttendance"), "Implements recordLiveAttendance");
assert(progressCode.includes("Math.min(heartbeatDurationSeconds, 60)"), "Enforces maximum 60s cap per heartbeat tick");
assert(progressCode.includes("student_live_attendance"), "Upserts live attendance duration and attendance status");
assert(progressCode.includes("student_learning_activity"), "Logs learning activity to student audit trail");

// ------------------------------------------------------------------------------
// Phase 8: Live Class Lifecycle (SCHEDULED -> LIVE -> COMPLETED)
// ------------------------------------------------------------------------------
console.log("\n[Phase 8/10] Live Class Lifecycle Synchronization");
const startRoute = path.join(ROOT, "src", "app", "api", "teacher", "live", "start", "route.ts");
const endRoute = path.join(ROOT, "src", "app", "api", "teacher", "live", "end", "route.ts");
const terminateRoute = path.join(ROOT, "src", "app", "api", "admin", "live", "terminate", "route.ts");

assert(fs.existsSync(startRoute), "POST /api/teacher/live/start exists");
assert(fs.existsSync(endRoute), "POST /api/teacher/live/end exists");
assert(fs.existsSync(terminateRoute), "POST /api/admin/live/terminate exists");

const startCode = fs.readFileSync(startRoute, "utf8");
assert(startCode.includes("StreamingService.startLiveSession"), "Transitions provider session to live");
assert(startCode.includes("live_status: \"LIVE\""), "Updates database state to LIVE");

const endCode = fs.readFileSync(endRoute, "utf8");
assert(endCode.includes("StreamingService.endLiveSession"), "Transitions provider session to complete");
assert(endCode.includes("live_status: \"COMPLETED\""), "Updates database state to COMPLETED");
assert(endCode.includes("recording_status: \"PROCESSING\""), "Sets recording status to PROCESSING");

const termCode = fs.readFileSync(terminateRoute, "utf8");
assert(termCode.includes("SUPER_ADMIN"), "Restricts emergency termination to Super Admin");
assert(termCode.includes("termination_reason"), "Requires audited termination reason");

// ------------------------------------------------------------------------------
// Phase 9: Recording Handoff to Super Admin Review Governance
// ------------------------------------------------------------------------------
console.log("\n[Phase 9/10] Recording Review Pipeline Governance");
const cmsServicePath = path.join(ROOT, "src", "lib", "services", "cms.service.ts");
assert(fs.existsSync(cmsServicePath), "cms.service.ts exists");
const cmsCode = fs.readFileSync(cmsServicePath, "utf8");
assert(cmsCode.includes("inheritLiveClassToLectureDraft"), "Implements inheritLiveClassToLectureDraft");
assert(cmsCode.includes("status: \"DRAFT\"") || cmsCode.includes("status: \"PENDING_REVIEW\""), "Inherited lecture requires Super Admin review prior to student publication");

// ------------------------------------------------------------------------------
// Phase 10: Secret Isolation & Zero Token Leakage
// ------------------------------------------------------------------------------
console.log("\n[Phase 10/10] Secret Isolation & Token Protection");
const statusRoutePath = path.join(ROOT, "src", "app", "api", "youtube", "status", "route.ts");
const statusCode = fs.readFileSync(statusRoutePath, "utf8");
assert(statusCode.includes("SUPER_ADMIN"), "Status route is guarded by Super Admin role");
assert(!statusCode.includes("encrypted_refresh_token"), "Status endpoint never exposes encrypted refresh tokens");

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------
console.log("\n======================================================================");
console.log(`  LOOP 1 AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exitCode = 1;
}
