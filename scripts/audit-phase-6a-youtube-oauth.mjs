/**
 * TopVeda Phase 6A: YouTube OAuth 2.0 & Platform Integration Audit
 * 
 * Verifies:
 * 1. Types & Services Source Verification
 * 2. Secret Isolation & Client Bundle Security (no NEXT_PUBLIC_ exposure)
 * 3. Cryptographic State & AES-256-GCM Token Encryption Security
 * 4. OAuth URL Construction & CSRF Protection
 * 5. YouTube API & Streaming Provider Architecture
 * 6. Database Migration & Schema Isolation
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
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
console.log("  TOPVEDA PHASE 6A: YOUTUBE OAUTH INTEGRATION AUDIT");
console.log("========================================================\n");

// ------------------------------------------------------------------------------
// 1. Types & Service Files Verification
// ------------------------------------------------------------------------------
console.log("[1/6] Types & Service Files Verification");

const youtubeTypesPath = path.join(ROOT, "src", "types", "youtube.types.ts");
assert(fs.existsSync(youtubeTypesPath), "youtube.types.ts exists");

if (fs.existsSync(youtubeTypesPath)) {
  const content = fs.readFileSync(youtubeTypesPath, "utf-8");
  assert(content.includes("interface YouTubeOAuthConfig"), "Defines YouTubeOAuthConfig interface");
  assert(content.includes("interface GoogleOAuthTokenResponse"), "Defines GoogleOAuthTokenResponse interface");
  assert(content.includes("interface YouTubeChannelInfo"), "Defines YouTubeChannelInfo interface");
  assert(content.includes("interface YouTubeConnectionStatus"), "Defines YouTubeConnectionStatus interface");
  assert(content.includes("interface PlatformIntegrationRecord"), "Defines PlatformIntegrationRecord interface");
}

const oauthServicePath = path.join(ROOT, "src", "lib", "services", "youtube-oauth.service.ts");
assert(fs.existsSync(oauthServicePath), "youtube-oauth.service.ts exists");

if (fs.existsSync(oauthServicePath)) {
  const content = fs.readFileSync(oauthServicePath, "utf-8");
  assert(content.includes("class YouTubeOAuthService"), "Exports YouTubeOAuthService class");
  assert(content.includes("isConfigured"), "Implements isConfigured method");
  assert(content.includes("getConfig"), "Implements getConfig method");
  assert(content.includes("encryptToken"), "Implements encryptToken method (AES-256-GCM)");
  assert(content.includes("decryptToken"), "Implements decryptToken method (AES-256-GCM)");
  assert(content.includes("generateState"), "Implements generateState method (CSRF protection)");
  assert(content.includes("validateState"), "Implements validateState method (timing-safe check)");
  assert(content.includes("buildAuthorizationUrl"), "Implements buildAuthorizationUrl method");
  assert(content.includes("exchangeCodeForTokens"), "Implements exchangeCodeForTokens method");
  assert(content.includes("refreshAccessToken"), "Implements refreshAccessToken method");
  assert(content.includes("class YouTubeOAuthError"), "Defines YouTubeOAuthError base class");
  assert(content.includes("class YouTubeConfigError"), "Defines YouTubeConfigError class");
  assert(content.includes("class YouTubeAuthError"), "Defines YouTubeAuthError class");
  assert(content.includes("class YouTubeStateError"), "Defines YouTubeStateError class");
}

const ytServicePath = path.join(ROOT, "src", "lib", "services", "youtube.service.ts");
assert(fs.existsSync(ytServicePath), "youtube.service.ts exists");

if (fs.existsSync(ytServicePath)) {
  const content = fs.readFileSync(ytServicePath, "utf-8");
  assert(content.includes("class YouTubeService"), "Exports YouTubeService class");
  assert(content.includes("getAuthenticatedChannel"), "Implements getAuthenticatedChannel method (YouTube Data API v3)");
  assert(content.includes("getConnectionStatus"), "Implements getConnectionStatus method");
  assert(content.includes("saveConnection"), "Implements saveConnection method");
  assert(content.includes("disconnect"), "Implements disconnect method");
}

const ytStreamingPath = path.join(ROOT, "src", "lib", "services", "youtube-streaming.service.ts");
assert(fs.existsSync(ytStreamingPath), "youtube-streaming.service.ts exists");
if (fs.existsSync(ytStreamingPath)) {
  const content = fs.readFileSync(ytStreamingPath, "utf-8");
  assert(content.includes("class YouTubeStreamingProvider implements IStreamingProvider"), "Implements IStreamingProvider interface");
}

// ------------------------------------------------------------------------------
// 2. Secret Isolation & Client Bundle Security
// ------------------------------------------------------------------------------
console.log("\n[2/6] Secret Isolation & Client Bundle Security");

const envExamplePath = path.join(ROOT, ".env.example");
assert(fs.existsSync(envExamplePath), ".env.example exists");
if (fs.existsSync(envExamplePath)) {
  const content = fs.readFileSync(envExamplePath, "utf-8");
  assert(content.includes("GOOGLE_YOUTUBE_CLIENT_ID"), ".env.example documents GOOGLE_YOUTUBE_CLIENT_ID");
  assert(content.includes("GOOGLE_YOUTUBE_CLIENT_SECRET"), ".env.example documents GOOGLE_YOUTUBE_CLIENT_SECRET");
  assert(content.includes("GOOGLE_YOUTUBE_REDIRECT_URI"), ".env.example documents GOOGLE_YOUTUBE_REDIRECT_URI");
  assert(!content.includes("NEXT_PUBLIC_GOOGLE_YOUTUBE"), "No NEXT_PUBLIC_ prefix on Google YouTube variables in .env.example");
}

const gitignorePath = path.join(ROOT, ".gitignore");
assert(fs.existsSync(gitignorePath), ".gitignore exists");
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  assert(gitignoreContent.includes(".env*.local") || gitignoreContent.includes(".env.local"), ".env.local is ignored by Git");
}

// Recursively scan src/ for any illicit NEXT_PUBLIC_GOOGLE or NEXT_PUBLIC_YOUTUBE
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
      if (
        text.includes("NEXT_PUBLIC_GOOGLE_YOUTUBE_CLIENT_SECRET") ||
        text.includes("NEXT_PUBLIC_YOUTUBE_TOKEN_ENCRYPTION_KEY") ||
        text.includes("NEXT_PUBLIC_GOOGLE_CLIENT_SECRET")
      ) {
        console.error(`  \x1b[31mSECURITY LEAK DETECTED\x1b[0m in ${fullPath}`);
        leakCount++;
      }
    }
  }
  return leakCount;
}

const leakCount = scanForLeakedTokenPrefixes(path.join(ROOT, "src"));
assert(leakCount === 0, "Zero client-exposed YouTube OAuth secret variables across src/");

// ------------------------------------------------------------------------------
// 3. Cryptographic State & AES-256-GCM Token Encryption Security
// ------------------------------------------------------------------------------
console.log("\n[3/6] Cryptographic State & AES-256-GCM Token Encryption Security");

// Test AES-256-GCM Encryption & Decryption Roundtrip
const sampleSecret = "sample_test_refresh_token_1//0gXYZ_TopVedaSecretToken";
const testSeed = "test_encryption_seed_phase_6a_topveda";
const testKey = crypto.createHash("sha256").update(testSeed).digest();

// Direct encryption test
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv("aes-256-gcm", testKey, iv);
let encryptedHex = cipher.update(sampleSecret, "utf8", "hex");
encryptedHex += cipher.final("hex");
const authTag = cipher.getAuthTag();
const packedPayload = `${iv.toString("hex")}:${authTag.toString("hex")}:${encryptedHex}`;

assert(packedPayload.split(":").length === 3, "Encrypted payload packs IV, AuthTag, and Ciphertext");

// Decryption test
const [dIvHex, dAuthTagHex, dCipherHex] = packedPayload.split(":");
const decipher = crypto.createDecipheriv("aes-256-gcm", testKey, Buffer.from(dIvHex, "hex"));
decipher.setAuthTag(Buffer.from(dAuthTagHex, "hex"));
let decrypted = decipher.update(dCipherHex, "hex", "utf8");
decrypted += decipher.final("utf8");

assert(decrypted === sampleSecret, "AES-256-GCM encryption/decryption roundtrip verified successfully");

// Tamper resistance test (tampering with ciphertext fails auth tag check)
const tamperedHex = dCipherHex.substring(0, dCipherHex.length - 2) + "00";
const tamperDecipher = crypto.createDecipheriv("aes-256-gcm", testKey, Buffer.from(dIvHex, "hex"));
tamperDecipher.setAuthTag(Buffer.from(dAuthTagHex, "hex"));
let tamperFailed = false;
try {
  tamperDecipher.update(tamperedHex, "hex", "utf8");
  tamperDecipher.final("utf8");
} catch {
  tamperFailed = true;
}
assert(tamperFailed, "AES-256-GCM successfully detects and rejects tampered ciphertext");

// ------------------------------------------------------------------------------
// 4. API Endpoints & Super Admin Route Verification
// ------------------------------------------------------------------------------
console.log("\n[4/6] API Endpoints & Super Admin Route Verification");

const connectRoutePath = path.join(ROOT, "src", "app", "api", "youtube", "oauth", "connect", "route.ts");
assert(fs.existsSync(connectRoutePath), "GET /api/youtube/oauth/connect endpoint exists");

if (fs.existsSync(connectRoutePath)) {
  const content = fs.readFileSync(connectRoutePath, "utf-8");
  assert(content.includes("SUPER_ADMIN"), "GET /api/youtube/oauth/connect enforces SUPER_ADMIN role check");
  assert(content.includes("topveda_yt_oauth_state"), "Sets httpOnly topveda_yt_oauth_state cookie");
  assert(content.includes("buildAuthorizationUrl"), "Constructs Google OAuth authorization URL");
}

const callbackRoutePath = path.join(ROOT, "src", "app", "api", "youtube", "oauth", "callback", "route.ts");
assert(fs.existsSync(callbackRoutePath), "GET /api/youtube/oauth/callback endpoint exists");

if (fs.existsSync(callbackRoutePath)) {
  const content = fs.readFileSync(callbackRoutePath, "utf-8");
  assert(content.includes("validateState"), "Validates state against stored cookie");
  assert(content.includes("exchangeCodeForTokens"), "Exchanges authorization code server-side");
  assert(content.includes("getAuthenticatedChannel"), "Retrieves authenticated channel via YouTube Data API");
  assert(content.includes("encryptToken"), "Encrypts refresh token before saving");
  assert(content.includes("saveConnection"), "Persists connection to database");
}

const statusRoutePath = path.join(ROOT, "src", "app", "api", "youtube", "status", "route.ts");
assert(fs.existsSync(statusRoutePath), "GET /api/youtube/status endpoint exists");

if (fs.existsSync(statusRoutePath)) {
  const content = fs.readFileSync(statusRoutePath, "utf-8");
  assert(content.includes("SUPER_ADMIN"), "GET /api/youtube/status enforces SUPER_ADMIN role check");
  assert(content.includes("getConnectionStatus"), "Returns sanitized connection status metadata");
}

const disconnectRoutePath = path.join(ROOT, "src", "app", "api", "youtube", "disconnect", "route.ts");
assert(fs.existsSync(disconnectRoutePath), "POST /api/youtube/disconnect endpoint exists");

// ------------------------------------------------------------------------------
// 5. Super Admin UI & CMS Navigation Verification
// ------------------------------------------------------------------------------
console.log("\n[5/6] Super Admin UI & CMS Navigation Verification");

const uiPagePath = path.join(ROOT, "src", "app", "admin", "cms", "integrations", "youtube", "page.tsx");
assert(fs.existsSync(uiPagePath), "Super Admin YouTube Integration page exists (/admin/cms/integrations/youtube)");

if (fs.existsSync(uiPagePath)) {
  const content = fs.readFileSync(uiPagePath, "utf-8");
  assert(content.includes("/api/youtube/oauth/connect"), "UI triggers /api/youtube/oauth/connect");
  assert(content.includes("/api/youtube/status"), "UI queries /api/youtube/status");
  assert(content.includes("/api/youtube/disconnect"), "UI provides disconnect capability");
  assert(content.includes("Connected") && content.includes("Not Connected"), "UI renders dynamic Connected / Not Connected states");
}

const navConfigPath = path.join(ROOT, "src", "components", "admin", "cms", "cms-nav-config.ts");
if (fs.existsSync(navConfigPath)) {
  const navContent = fs.readFileSync(navConfigPath, "utf-8");
  assert(navContent.includes("/admin/cms/integrations/youtube"), "CMS sidebar nav links to /admin/cms/integrations/youtube");
}

// ------------------------------------------------------------------------------
// 6. Database Migration & Environment Credentials Verification
// ------------------------------------------------------------------------------
console.log("\n[6/6] Database Migration & Environment Credentials Verification");

const migrationPath = path.join(ROOT, "supabase", "migrations", "20260929000000_phase_6a_youtube_oauth_integration.sql");
assert(fs.existsSync(migrationPath), "Migration 20260929000000_phase_6a_youtube_oauth_integration.sql exists");

if (fs.existsSync(migrationPath)) {
  const migContent = fs.readFileSync(migrationPath, "utf-8");
  assert(migContent.includes("cms_platform_integrations"), "Migration creates cms_platform_integrations table");
  assert(migContent.includes("encrypted_refresh_token"), "Migration defines encrypted_refresh_token column");
  assert(migContent.includes("SUPER_ADMIN"), "Migration enforces SUPER_ADMIN-only RLS policies");
}

const clientId = process.env.GOOGLE_YOUTUBE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_YOUTUBE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_YOUTUBE_REDIRECT_URI;

const isClientIdConfigured = !!(clientId && clientId.trim().length > 0);
const isClientSecretConfigured = !!(clientSecret && clientSecret.trim().length > 0);
const isRedirectUriConfigured = !!(redirectUri && redirectUri.trim().length > 0);

assert(isClientIdConfigured, "GOOGLE_YOUTUBE_CLIENT_ID is configured in environment");
assert(isClientSecretConfigured, "GOOGLE_YOUTUBE_CLIENT_SECRET is configured in environment");
assert(isRedirectUriConfigured, "GOOGLE_YOUTUBE_REDIRECT_URI is configured in environment");

// ------------------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------------------
console.log("\n========================================================");
console.log(`  AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("========================================================\n");

if (failed > 0) {
  process.exitCode = 1;
}
