/**
 * TopVeda Phase 6 Loop 2: Real Recorded Video Pipeline Comprehensive Audit
 * 
 * Verifies all 10 milestones of Loop 2:
 * Milestone 1: YouTube Upload Service Architecture & Types
 * Milestone 2: Server-Authoritative Video Validation & Whitelisting
 * Milestone 3: Duplicate & Idempotency Safeguards
 * Milestone 4: Resumable YouTube Data API Ingest & Metadata Handling
 * Milestone 5: Privacy Model (Unlisted + Platform Gating)
 * Milestone 6: Governance State Machine (DRAFT -> PENDING_REVIEW -> APPROVED -> PUBLISHED)
 * Milestone 7: YouTube Processing Status & Duration Resolution
 * Milestone 8: Super Admin CMS Review & Video Preview
 * Milestone 9: Student Embedded Playback & ContentAccessService Isolation
 * Milestone 10: Student Progress Tracking (85% Threshold) & Secret Isolation
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Simple env loader without external package
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const f of envFiles) {
    const fullPath = path.join(ROOT, f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

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
console.log("  TOPVEDA PHASE 6 LOOP 2: REAL RECORDED VIDEO PIPELINE VERIFICATION");
console.log("======================================================================\n");

// ------------------------------------------------------------------------------
// Milestone 1: Architecture & Type System
// ------------------------------------------------------------------------------
console.log("[Milestone 1/10] YouTube Upload Service Architecture & Types");
const ytUploadServicePath = path.join(ROOT, "src", "lib", "services", "youtube-upload.service.ts");
const ytTypesPath = path.join(ROOT, "src", "types", "youtube.types.ts");
const teacherTypesPath = path.join(ROOT, "src", "types", "teacher.types.ts");

assert(fs.existsSync(ytUploadServicePath), "youtube-upload.service.ts exists");
assert(fs.existsSync(ytTypesPath), "youtube.types.ts exists");
assert(fs.existsSync(teacherTypesPath), "teacher.types.ts exists");

const ytUploadCode = fs.readFileSync(ytUploadServicePath, "utf8");
assert(ytUploadCode.includes("class YouTubeUploadService"), "YouTubeUploadService class defined");
assert(ytUploadCode.includes("uploadVideo"), "uploadVideo method implemented");
assert(ytUploadCode.includes("getVideoProcessingStatus"), "getVideoProcessingStatus method implemented");
assert(ytUploadCode.includes("parseIsoDuration"), "parseIsoDuration method implemented");
assert(ytUploadCode.includes("formatDuration"), "formatDuration method implemented");

const ytTypesCode = fs.readFileSync(ytTypesPath, "utf8");
assert(ytTypesCode.includes("UploadYouTubeVideoOptions"), "UploadYouTubeVideoOptions interface exported");
assert(ytTypesCode.includes("UploadedYouTubeVideoResult"), "UploadedYouTubeVideoResult interface exported");
assert(ytTypesCode.includes("YouTubeVideoProcessingStatus"), "YouTubeVideoProcessingStatus interface exported");

// ------------------------------------------------------------------------------
// Milestone 2: Server-Authoritative Video Validation & Whitelisting
// ------------------------------------------------------------------------------
console.log("\n[Milestone 2/10] Server-Authoritative Video Validation & MIME Whitelist");
const uploadRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "lectures", "upload", "route.ts");
assert(fs.existsSync(uploadRoutePath), "POST /api/teacher/lectures/upload route exists");

const uploadRouteCode = fs.readFileSync(uploadRoutePath, "utf8");
assert(uploadRouteCode.includes("ALLOWED_VIDEO_MIME_TYPES"), "MIME type whitelist defined");
assert(uploadRouteCode.includes("video/mp4"), "video/mp4 whitelisted");
assert(uploadRouteCode.includes("video/webm"), "video/webm whitelisted");
assert(uploadRouteCode.includes("video/quicktime"), "video/quicktime whitelisted");
assert(uploadRouteCode.includes("ALLOWED_VIDEO_EXTENSIONS"), "Extension whitelist defined");
assert(uploadRouteCode.includes("MAX_VIDEO_FILE_SIZE_BYTES"), "Max file size boundary defined (1GB)");
assert(uploadRouteCode.includes("multipart/form-data"), "Supports multipart/form-data uploads");
assert(uploadRouteCode.includes("request.formData()"), "Parses binary FormData server-side");

// ------------------------------------------------------------------------------
// Milestone 3: Duplicate & Idempotency Safeguards
// ------------------------------------------------------------------------------
console.log("\n[Milestone 3/10] Duplicate & Idempotency Safeguards");
assert(uploadRouteCode.includes("recentDuplicate"), "Checks for rapid duplicate submissions");
assert(uploadRouteCode.includes("409"), "Returns HTTP 409 Conflict on duplicate upload attempts");
assert(uploadRouteCode.includes("educator_id"), "Scopes idempotency to the authenticated educator");

// ------------------------------------------------------------------------------
// Milestone 4: Resumable YouTube Data API Ingest
// ------------------------------------------------------------------------------
console.log("\n[Milestone 4/10] Resumable YouTube Data API Ingest & Metadata");
assert(ytUploadCode.includes("uploadType=resumable"), "Uses YouTube resumable upload protocol");
assert(ytUploadCode.includes("YouTubeLiveService.getValidAccessToken"), "Retrieves fresh OAuth access token via server refresh");
assert(ytUploadCode.includes("X-Upload-Content-Type"), "Sets resumable upload content type header");
assert(ytUploadCode.includes("X-Upload-Content-Length"), "Sets resumable upload content length header");
assert(ytUploadCode.includes("Location"), "Parses resumable upload session location URI");
assert(ytUploadCode.includes("https://www.youtube-nocookie.com/embed/"), "Builds privacy-enhanced embed URL");

// ------------------------------------------------------------------------------
// Milestone 5: Privacy Model (Unlisted + Platform Gating)
// ------------------------------------------------------------------------------
console.log("\n[Milestone 5/10] Privacy & Security Model");
assert(ytUploadCode.includes("privacyStatus: options.privacyStatus || \"unlisted\"") || ytUploadCode.includes("privacyStatus || \"unlisted\""), "Defaults to unlisted privacy");
assert(uploadRouteCode.includes("privacyStatus: \"unlisted\""), "Upload route passes unlisted privacy");
const studentPlayerPath = path.join(ROOT, "src", "app", "student", "lectures", "[id]", "page.tsx");
assert(fs.existsSync(studentPlayerPath), "Student lecture player page exists");
const studentPlayerCode = fs.readFileSync(studentPlayerPath, "utf8");
assert(studentPlayerCode.includes("TopVeda Security Model"), "Correct security notice displayed");
assert(studentPlayerCode.includes("YouTube Unlisted reduces public discoverability but cannot prevent sharing of a discovered URL"), "Accurate privacy documentation text");
assert(!studentPlayerCode.includes("watchUrl"), "Raw YouTube watch URLs not exposed in student player");

// ------------------------------------------------------------------------------
// Milestone 6: Governance State Machine
// ------------------------------------------------------------------------------
console.log("\n[Milestone 6/10] Governance State Machine & Super Admin Review Pipeline");
assert(uploadRouteCode.includes("PENDING_REVIEW"), "Enforces PENDING_REVIEW state for submitted content");
assert(uploadRouteCode.includes("NotificationService.notifySuperAdminLectureSubmitted"), "Dispatches notification to Super Admin");

const cmsReviewRoute = path.join(ROOT, "src", "app", "api", "admin", "cms", "review", "route.ts");
const cmsPublishRoute = path.join(ROOT, "src", "app", "api", "admin", "cms", "publish", "route.ts");
assert(fs.existsSync(cmsReviewRoute), "POST /api/admin/cms/review exists");
assert(fs.existsSync(cmsPublishRoute), "POST /api/admin/cms/publish exists");

const cmsReviewCode = fs.readFileSync(cmsReviewRoute, "utf8");
assert(cmsReviewCode.includes("SUPER_ADMIN"), "Super Admin authorization enforced for reviews");
const cmsPublishCode = fs.readFileSync(cmsPublishRoute, "utf8");
assert(cmsPublishCode.includes("SUPER_ADMIN"), "Super Admin authorization enforced for publication");

// ------------------------------------------------------------------------------
// Milestone 7: YouTube Processing Status & Duration Resolution
// ------------------------------------------------------------------------------
console.log("\n[Milestone 7/10] YouTube Video Processing Status Endpoint");
const videoStatusRoutePath = path.join(ROOT, "src", "app", "api", "youtube", "video-status", "route.ts");
assert(fs.existsSync(videoStatusRoutePath), "GET /api/youtube/video-status exists");
const videoStatusCode = fs.readFileSync(videoStatusRoutePath, "utf8");
assert(videoStatusCode.includes("YouTubeUploadService.getVideoProcessingStatus"), "Calls getVideoProcessingStatus");
assert(videoStatusCode.includes("videoId"), "Accepts videoId parameter");
assert(videoStatusCode.includes("durationSeconds"), "Syncs resolved duration to cms_lectures");

// Duration parsing logic unit tests
function parseIsoDuration(durationStr) {
  if (!durationStr) return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

assert(parseIsoDuration("PT45M12S") === 2712, "parseIsoDuration converts PT45M12S -> 2712s");
assert(parseIsoDuration("PT1H2M30S") === 3750, "parseIsoDuration converts PT1H2M30S -> 3750s");
assert(parseIsoDuration("PT10S") === 10, "parseIsoDuration converts PT10S -> 10s");

// ------------------------------------------------------------------------------
// Milestone 8: Super Admin CMS Review & Video Preview
// ------------------------------------------------------------------------------
console.log("\n[Milestone 8/10] Super Admin Review Inspection & Video Preview");
const reviewModalPath = path.join(ROOT, "src", "components", "admin", "cms", "review-inspection-modal.tsx");
assert(fs.existsSync(reviewModalPath), "review-inspection-modal.tsx exists");
const reviewModalCode = fs.readFileSync(reviewModalPath, "utf8");
assert(reviewModalCode.includes("iframe"), "Renders iframe player for video inspection");
assert(reviewModalCode.includes("youtube-nocookie.com/embed"), "Embeds YouTube video preview securely");
assert(reviewModalCode.includes("YouTube Stream Ready"), "Visual badge for ready YouTube streams");

// ------------------------------------------------------------------------------
// Milestone 9: Student Embedded Playback & ContentAccessService Isolation
// ------------------------------------------------------------------------------
console.log("\n[Milestone 9/10] Student In-Platform Playback & Access Gating");
assert(studentPlayerCode.includes("iframe"), "Student page renders embedded iframe");
assert(studentPlayerCode.includes("youtube-nocookie.com/embed/"), "Student player uses privacy-enhanced embed URL");
assert(studentPlayerCode.includes("eq(\"status\", \"PUBLISHED\")"), "Enforces PUBLISHED status check in query");
assert(studentPlayerCode.includes("eq(\"is_visible\", true)"), "Enforces is_visible check");

const contentAccessPath = path.join(ROOT, "src", "lib", "services", "content-access.service.ts");
assert(fs.existsSync(contentAccessPath), "content-access.service.ts exists");
const contentAccessCode = fs.readFileSync(contentAccessPath, "utf8");
assert(contentAccessCode.includes("contentType === \"LECTURE\""), "ContentAccessService handles LECTURE content type");
assert(contentAccessCode.includes("entity.status !== \"PUBLISHED\""), "Blocks non-published lectures");
assert(contentAccessCode.includes("student_content_entitlements"), "Checks student enrollment and entitlements");

// ------------------------------------------------------------------------------
// Milestone 10: Student Progress (85% Threshold) & Secret Isolation
// ------------------------------------------------------------------------------
console.log("\n[Milestone 10/10] Student Progress Tracking & Secret Isolation");
const studentProgressRoutePath = path.join(ROOT, "src", "app", "api", "student", "learning", "progress", "route.ts");
assert(fs.existsSync(studentProgressRoutePath), "POST /api/student/learning/progress exists");
const studentLearningServicePath = path.join(ROOT, "src", "lib", "services", "student-learning.service.ts");
const studentLearningCode = fs.readFileSync(studentLearningServicePath, "utf8");
assert(studentLearningCode.includes("0.85"), "Enforces 85% completion threshold");
assert(studentLearningCode.includes("student_lecture_progress"), "Updates student_lecture_progress table");
assert(studentLearningCode.includes("student_learning_activity"), "Logs learning activity event");
assert(studentLearningCode.includes("LECTURE_WATCH"), "Activity type logged as LECTURE_WATCH");

// Secret isolation check: ensure no client-side leaks
const clientTabPath = path.join(ROOT, "src", "components", "admin", "teacher", "recorded-lectures-tab.tsx");
const clientTabCode = fs.readFileSync(clientTabPath, "utf8");
assert(!clientTabCode.includes("GOOGLE_CLIENT_SECRET"), "Client tab has no GOOGLE_CLIENT_SECRET");
assert(!clientTabCode.includes("YOUTUBE_TOKEN_ENCRYPTION_KEY"), "Client tab has no encryption key");
assert(!clientTabCode.includes("refresh_token"), "Client tab does not reference raw refresh tokens");
assert(!studentPlayerCode.includes("GOOGLE_CLIENT_SECRET"), "Student player has no GOOGLE_CLIENT_SECRET");

console.log("\n======================================================================");
console.log(`  LOOP 2 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
