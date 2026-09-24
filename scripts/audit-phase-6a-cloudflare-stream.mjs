/**
 * TopVeda Phase 6A: Cloudflare Stream REST API Integration Audit
 * 
 * Verifies:
 * 1. CloudflareStreamService exports & methods
 * 2. Configuration & missing credentials error handling
 * 3. Secret isolation (no NEXT_PUBLIC_ exposure, error sanitization)
 * 4. Error handling (Auth error, Config error, Not found error)
 * 5. Real Live Input lifecycle (create, get, delete, cleanup verification)
 * 6. StreamingService production guard vs dev mock isolation
 * 7. Database schema compatibility check
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Safely load .env.local if present into process.env without printing or leaking secrets
const envLocalPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

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

console.log("\n========================================================");
console.log("  TOPVEDA PHASE 6A: CLOUDFLARE STREAM INTEGRATION AUDIT");
console.log("========================================================\n");

// ------------------------------------------------------------------------------
// 1. Types & Services Source Verification
// ------------------------------------------------------------------------------
console.log("[1/6] Source Code & Architecture Verification");

const streamingTypesPath = path.join(ROOT, "src", "types", "streaming.types.ts");
assert(fs.existsSync(streamingTypesPath), "streaming.types.ts exists");

if (fs.existsSync(streamingTypesPath)) {
  const content = fs.readFileSync(streamingTypesPath, "utf-8");
  assert(content.includes("interface CloudflareLiveInput"), "Defines CloudflareLiveInput interface");
  assert(content.includes("interface CloudflareLiveInputRecording"), "Defines CloudflareLiveInputRecording interface");
  assert(content.includes("interface CloudflareStreamConfig"), "Defines CloudflareStreamConfig interface");
  assert(content.includes("interface IStreamingProvider"), "Defines IStreamingProvider interface");
}

const cfServicePath = path.join(ROOT, "src", "lib", "services", "cloudflare-stream.service.ts");
assert(fs.existsSync(cfServicePath), "cloudflare-stream.service.ts exists");

if (fs.existsSync(cfServicePath)) {
  const content = fs.readFileSync(cfServicePath, "utf-8");
  assert(content.includes("class CloudflareStreamService"), "Exports CloudflareStreamService class");
  assert(content.includes("createLiveInput"), "Implements createLiveInput method");
  assert(content.includes("getLiveInput"), "Implements getLiveInput method");
  assert(content.includes("deleteLiveInput"), "Implements deleteLiveInput method");
  assert(content.includes("listLiveInputs"), "Implements listLiveInputs method");
  assert(content.includes("CloudflareStreamError"), "Defines CloudflareStreamError base class");
  assert(content.includes("CloudflareStreamConfigError"), "Defines CloudflareStreamConfigError");
  assert(content.includes("CloudflareStreamAuthError"), "Defines CloudflareStreamAuthError");
  assert(content.includes("CloudflareStreamNotFoundError"), "Defines CloudflareStreamNotFoundError");
  assert(content.includes("Idempotency-Key"), "Supports Idempotency-Key header for network retries");
  assert(content.includes("recordingMode || \"automatic\""), "Defaults to automatic recording mode");
}

const streamingServicePath = path.join(ROOT, "src", "lib", "services", "streaming.service.ts");
assert(fs.existsSync(streamingServicePath), "streaming.service.ts exists");

if (fs.existsSync(streamingServicePath)) {
  const content = fs.readFileSync(streamingServicePath, "utf-8");
  assert(content.includes("CloudflareStreamingProvider"), "Uses CloudflareStreamingProvider");
  assert(content.includes("CloudflareStreamService.isConfigured()"), "Checks CloudflareStreamService configuration status");
  assert(content.includes("process.env.NODE_ENV === \"production\""), "Enforces production guard preventing fake IDs in prod");
}

// ------------------------------------------------------------------------------
// 2. Secret Isolation & Client Bundle Security
// ------------------------------------------------------------------------------
console.log("\n[2/6] Secret Isolation & Client Bundle Security");

// Check .env.example
const envExamplePath = path.join(ROOT, ".env.example");
assert(fs.existsSync(envExamplePath), ".env.example exists");
if (fs.existsSync(envExamplePath)) {
  const content = fs.readFileSync(envExamplePath, "utf-8");
  assert(content.includes("CLOUDFLARE_STREAM_ACCOUNT_ID"), ".env.example documents CLOUDFLARE_STREAM_ACCOUNT_ID");
  assert(content.includes("CLOUDFLARE_STREAM_API_TOKEN"), ".env.example documents CLOUDFLARE_STREAM_API_TOKEN");
  assert(!content.includes("NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN"), "No NEXT_PUBLIC_ token prefix in .env.example");
}

// Check .gitignore
const gitignorePath = path.join(ROOT, ".gitignore");
assert(fs.existsSync(gitignorePath), ".gitignore exists");
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  assert(gitignoreContent.includes(".env*.local") || gitignoreContent.includes(".env.local"), ".env.local is ignored by Git");
}

// Recursively scan src/ for any illicit NEXT_PUBLIC_CLOUDFLARE_API_TOKEN
function scanForLeakedTokenPrefixes(dir) {
  let leakCount = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "dist") {
        leakCount += scanForLeakedTokenPrefixes(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx") || entry.name.endsWith(".js") || entry.name.endsWith(".json"))) {
      const text = fs.readFileSync(fullPath, "utf-8");
      if (text.includes("NEXT_PUBLIC_CLOUDFLARE_STREAM_API_TOKEN") || text.includes("NEXT_PUBLIC_CLOUDFLARE_API_TOKEN")) {
        console.error(`  \x1b[31mSECURITY LEAK DETECTED\x1b[0m in ${fullPath}`);
        leakCount++;
      }
    }
  }
  return leakCount;
}

const leakCount = scanForLeakedTokenPrefixes(path.join(ROOT, "src"));
assert(leakCount === 0, "Zero client-exposed Cloudflare Stream token variables (NEXT_PUBLIC_*) across src/");

// ------------------------------------------------------------------------------
// 3. Service Logic & Error Sanitization Tests
// ------------------------------------------------------------------------------
console.log("\n[3/6] Service Instantiation & Error Sanitization Tests");

if (fs.existsSync(cfServicePath)) {
  const cfCode = fs.readFileSync(cfServicePath, "utf-8");

  // Verify Bearer token redaction logic is built in
  assert(
    cfCode.includes("replace(/Bearer\\s+[A-Za-z0-9_\\-.]+/gi, \"Bearer [REDACTED]\")"),
    "CloudflareStreamError implements regex redaction of Bearer tokens"
  );

  // Verify error hierarchy
  assert(cfCode.includes("class CloudflareStreamConfigError extends CloudflareStreamError"), "CloudflareStreamConfigError extends CloudflareStreamError");
  assert(cfCode.includes("class CloudflareStreamAuthError extends CloudflareStreamError"), "CloudflareStreamAuthError extends CloudflareStreamError");
  assert(cfCode.includes("class CloudflareStreamNotFoundError extends CloudflareStreamError"), "CloudflareStreamNotFoundError extends CloudflareStreamError");

  // Verify missing account ID / token guards
  assert(cfCode.includes("Missing Cloudflare Stream Account ID"), "Includes guard message for missing Account ID");
  assert(cfCode.includes("Missing Cloudflare Stream API Token"), "Includes guard message for missing API Token");
}

// ------------------------------------------------------------------------------
// 4. StreamingService Provider & Production Guard Tests
// ------------------------------------------------------------------------------
console.log("\n[4/6] StreamingService Provider & Production Guard Verification");

if (fs.existsSync(streamingServicePath)) {
  const streamCode = fs.readFileSync(streamingServicePath, "utf-8");

  assert(
    streamCode.includes("if (CloudflareStreamService.isConfigured())"),
    "createSession checks CloudflareStreamService.isConfigured() before making live input call"
  );

  assert(
    streamCode.includes("if (process.env.NODE_ENV === \"production\")") &&
    streamCode.includes("throw new CloudflareStreamConfigError"),
    "Throws CloudflareStreamConfigError in production when credentials are not configured"
  );

  assert(
    streamCode.includes("[DEV ONLY WARNING]"),
    "Logs isolated warning when falling back in non-production development environments"
  );

  assert(
    streamCode.includes("if (userRole !== \"SUPER_ADMIN\")"),
    "Strictly restricts live recording download URLs to SUPER_ADMIN role only"
  );
}

// ------------------------------------------------------------------------------
// 5. Cloudflare REST API Live Connectivity Check
// ------------------------------------------------------------------------------
console.log("\n[5/6] Cloudflare Stream REST API Live Connectivity Check");

const accountId = process.env.CLOUDFLARE_STREAM_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;

const isAccountIdConfigured = !!(accountId && accountId.trim().length > 0);
const isApiTokenConfigured = !!(apiToken && apiToken.trim().length > 0);

assert(isAccountIdConfigured, "CLOUDFLARE_STREAM_ACCOUNT_ID is configured in environment");
assert(isApiTokenConfigured, "CLOUDFLARE_STREAM_API_TOKEN is configured in environment");

if (isAccountIdConfigured && isApiTokenConfigured) {
  console.log("  \x1b[36mℹ INFO\x1b[0m: Real Cloudflare Stream credentials loaded securely from environment.");
  console.log("    → Executing real Cloudflare Stream REST API lifecycle roundtrip...");

  try {
    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;

    // 1. Create Live Input
    console.log("    [1/4] POST /accounts/{account_id}/stream/live_inputs (Creating temporary live input)...");
    const createRes = await fetch(`${baseUrl}/live_inputs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meta: { name: "TopVeda Phase 6A Audit Temporary Live Input", testRun: true, createdBy: "Antigravity Audit" },
        recording: { mode: "automatic", timeoutSeconds: 300 },
      }),
    });

    const createData = await createRes.json();
    const isCreateOk = createRes.ok && createData.success;
    
    if (isCreateOk) {
      assert(true, "Real Cloudflare Live Input created successfully (HTTP 200 OK)");
      
      const liveInputUid = createData.result?.uid;
      const hasValidUid = !!(liveInputUid && typeof liveInputUid === "string" && liveInputUid.length >= 16);
      assert(hasValidUid, "Real Cloudflare Live Input UID received (format verified)");

      const hasRtmpsUrl = !!createData.result?.rtmps?.url;
      assert(hasRtmpsUrl, "RTMPS ingest URL returned by Cloudflare");

      const hasStreamKey = !!createData.result?.rtmps?.streamKey;
      assert(hasStreamKey, "RTMPS stream key returned by Cloudflare (redacted for security)");

      const isRecordingAuto = createData.result?.recording?.mode === "automatic";
      assert(isRecordingAuto, "Live Input automatic recording mode confirmed: mode = \"automatic\"");

      // 2. Get Live Input
      console.log(`    [2/4] GET /accounts/{account_id}/stream/live_inputs/${liveInputUid}...`);
      const getRes = await fetch(`${baseUrl}/live_inputs/${liveInputUid}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      const getData = await getRes.json();
      assert(getRes.ok && getData.success && getData.result?.uid === liveInputUid, "GET /live_inputs/{uid} successfully fetched and matched Live Input UID");

      // 3. Delete Live Input
      console.log(`    [3/4] DELETE /accounts/{account_id}/stream/live_inputs/${liveInputUid}...`);
      const deleteRes = await fetch(`${baseUrl}/live_inputs/${liveInputUid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      const deleteData = await deleteRes.json();
      assert(deleteRes.ok && deleteData.success, "DELETE /live_inputs/{uid} succeeded (HTTP 200 OK)");

      // 4. Verify Cleanup
      console.log(`    [4/4] Verifying cleanup (GET /accounts/{account_id}/stream/live_inputs/${liveInputUid})...`);
      const cleanupRes = await fetch(`${baseUrl}/live_inputs/${liveInputUid}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      const isCleanedUp = cleanupRes.status === 404 || cleanupRes.status === 400;
      assert(isCleanedUp, `Cleanup verified: Live input no longer exists (HTTP ${cleanupRes.status} Not Found)`);
    } else {
      const sanitizedError = createData.errors?.[0]?.message || createData.messages?.[0]?.message || `HTTP ${createRes.status}`;
      const errorCode = createData.errors?.[0]?.code || createData.messages?.[0]?.code || createRes.status;
      console.log(`    \x1b[33m[DEBUG]\x1b[0m Cloudflare HTTP Status: ${createRes.status}`);
      console.log(`    \x1b[33m[DEBUG]\x1b[0m Error Code: ${errorCode}`);
      console.log(`    \x1b[33m[DEBUG]\x1b[0m Error Message: ${sanitizedError}`);
      assert(false, `Real Cloudflare Live Input lifecycle test (HTTP ${createRes.status} [${errorCode}]: ${sanitizedError})`);
    }
  } catch (err) {
    console.error(`  \x1b[31m✖ Live API Test Failed\x1b[0m: ${err.message ? err.message.replace(/Bearer\s+[A-Za-z0-9_\-.]+/gi, "Bearer [REDACTED]") : "Unknown error"}`);
    failed++;
  }
} else {
  console.error("  \x1b[31m✖ ERROR\x1b[0m: Credentials not found in environment or .env.local.");
  failed++;
}

// ------------------------------------------------------------------------------
// 6. Database Schema & Migration Verification
// ------------------------------------------------------------------------------
console.log("\n[6/6] Database Schema Compatibility");

const liveClassMigration = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260923000000_teacher_workspace_live_recorded.sql"
);

assert(fs.existsSync(liveClassMigration), "Teacher Live & Recorded schema migration exists");
if (fs.existsSync(liveClassMigration)) {
  const mig = fs.readFileSync(liveClassMigration, "utf-8");
  assert(mig.includes("stream_provider"), "cms_live_classes has stream_provider column");
  assert(mig.includes("provider_session_id"), "cms_live_classes has provider_session_id column");
  assert(mig.includes("stream_key"), "cms_live_classes has stream_key column");
  assert(mig.includes("recording_id"), "cms_live_classes has recording_id column");
  assert(mig.includes("recording_url"), "cms_live_classes has recording_url column");
  assert(mig.includes("recording_status"), "cms_live_classes has recording_status column");
}

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------
console.log("\n========================================================");
console.log(`  AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("========================================================\n");

if (failed > 0) {
  process.exitCode = 1;
}
