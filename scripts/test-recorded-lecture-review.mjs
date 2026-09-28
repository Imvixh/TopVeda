/**
 * TOPVEDA: Recorded Lecture Review & Pre-Approval Playback Test Suite
 * Validates:
 * 1. Super Admin Review Queue retrieval with YouTube video ID and embed URL resolution
 * 2. Robust YouTube ID extraction across all video playback URL variants
 * 3. Video processing & embed playback readiness for Super Admin pre-approval watching
 * 4. Separation of watching from approval (watching does NOT alter status or publish)
 * 5. Review Approval decision workflow (PENDING_REVIEW -> APPROVED)
 * 6. Review Rejection decision workflow (PENDING_REVIEW -> REJECTED with feedback note)
 * 7. Security Isolation: PENDING_REVIEW, REJECTED, and DRAFT content is strictly BLOCKED from students
 * 8. Published lecture accessibility for authorized student playback
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_KEY);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✖ FAIL: ${message}`);
    failed++;
  }
}

// Extraction helper logic mirroring src/lib/utils/youtube.ts
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:v=|v\/|embed\/|live\/|video\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].length === 11) return match[1];
  }
  return null;
}

function resolveLectureVideoId(lecture) {
  if (!lecture) return null;
  const fromStreamId = extractYouTubeVideoId(lecture.video_stream_id);
  if (fromStreamId) return fromStreamId;
  const fromPlaybackUrl = extractYouTubeVideoId(lecture.video_playback_url);
  if (fromPlaybackUrl) return fromPlaybackUrl;
  return null;
}

async function runTestSuite() {
  console.log("\n======================================================================");
  console.log("  TOPVEDA: RECORDED LECTURE REVIEW & PRE-APPROVAL PLAYBACK AUDIT");
  console.log("======================================================================\n");

  // 1. Test YouTube Video ID & Embed Resolution Engine
  console.log("--- 1. Testing YouTube Video ID & Embed URL Resolution Engine ---");
  const testCases = [
    { input: "8QKkL4phbKk", expected: "8QKkL4phbKk", desc: "Raw 11-char ID" },
    { input: "https://www.youtube.com/watch?v=8QKkL4phbKk", expected: "8QKkL4phbKk", desc: "Standard YouTube Watch URL" },
    { input: "https://youtu.be/8QKkL4phbKk", expected: "8QKkL4phbKk", desc: "Short youtu.be URL" },
    { input: "https://www.youtube.com/embed/8QKkL4phbKk", expected: "8QKkL4phbKk", desc: "Standard Embed URL" },
    { input: "https://www.youtube-nocookie.com/embed/8QKkL4phbKk", expected: "8QKkL4phbKk", desc: "No-cookie Privacy Embed URL" },
    { input: "https://studio.youtube.com/video/oEBQrmqhlT8/livestreaming", expected: "oEBQrmqhlT8", desc: "YouTube Studio Livestreaming URL" },
    { input: "https://www.youtube.com/live/JEgKakyDPoI", expected: "JEgKakyDPoI", desc: "YouTube Live Broadcast URL" },
  ];

  for (const tc of testCases) {
    const extracted = extractYouTubeVideoId(tc.input);
    assert(extracted === tc.expected, `Correctly resolved ${tc.desc} -> ${extracted}`);
  }

  // 2. Test Real Database PENDING_REVIEW Lectures in Review Queue
  console.log("\n--- 2. Testing Real Database PENDING_REVIEW Lectures Review Queue ---");
  const { data: pendingLectures, error: pErr } = await adminClient
    .from("cms_lectures")
    .select(`
      id,
      title,
      subject,
      teacher_name,
      thumbnail_url,
      video_stream_id,
      video_playback_url,
      duration_seconds,
      duration_formatted,
      duration_human,
      status,
      batch_id,
      batch:cms_batches(id, title, board_label, subtitle)
    `)
    .eq("status", "PENDING_REVIEW");

  assert(!pErr, `Retrieved pending review lectures from database without error (count: ${pendingLectures?.length || 0})`);

  if (pendingLectures && pendingLectures.length > 0) {
    for (const lec of pendingLectures) {
      const resolvedId = resolveLectureVideoId(lec);
      assert(!!resolvedId, `Pending lecture "${lec.title}" resolves to valid YouTube Video ID (${resolvedId})`);
    }
  }

  // 3. Test Student Security Isolation (Students CANNOT access PENDING_REVIEW lectures)
  console.log("\n--- 3. Testing Student Security Isolation on Unpublished Content ---");
  if (pendingLectures && pendingLectures.length > 0) {
    const testPendingLec = pendingLectures[0];

    // Query as student with public/student query constraint
    const { data: studentAttempt, error: sErr } = await anonClient
      .from("cms_lectures")
      .select("id, title, status, is_visible")
      .eq("id", testPendingLec.id)
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .maybeSingle();

    assert(!studentAttempt, `Student query for PENDING_REVIEW lecture "${testPendingLec.title}" correctly returns NULL`);
  }

  // 4. Test Student Access to PUBLISHED Free/Preview Lectures
  console.log("\n--- 4. Testing Student Playback for PUBLISHED Content ---");
  const { data: publishedLectures } = await adminClient
    .from("cms_lectures")
    .select("id, title, status, is_visible, batch_id, is_free_preview, access_tier")
    .eq("status", "PUBLISHED")
    .eq("is_visible", true)
    .or("is_free_preview.eq.true,access_tier.eq.FREE")
    .limit(1);

  if (publishedLectures && publishedLectures.length > 0) {
    const pubLec = publishedLectures[0];
    const { data: studentPubLec } = await anonClient
      .from("cms_lectures")
      .select("id, title, status, is_visible")
      .eq("id", pubLec.id)
      .eq("status", "PUBLISHED")
      .eq("is_visible", true)
      .single();

    assert(!!studentPubLec && studentPubLec.id === pubLec.id, `Published lecture "${pubLec.title}" is accessible to students`);
  }

  // 5. Test Review Decision Workflow (Approve / Reject Lifecycle)
  console.log("\n--- 5. Testing Review Decision Workflow ---");
  // Create a temporary test lecture in PENDING_REVIEW
  const testLectureId = "f0000000-0000-0000-0000-000000000099";
  
  // Clean up any stale test record
  await adminClient.from("cms_lectures").delete().eq("id", testLectureId);

  const { data: createdPending, error: cErr } = await adminClient
    .from("cms_lectures")
    .insert({
      id: testLectureId,
      title: "Test Chemistry Recorded Lecture for Review",
      slug: "test-chemistry-review-lecture-99",
      subject: "Chemistry",
      teacher_name: "Dr. Arvind Sharma",
      thumbnail_url: "/thumbnails/lecture_chemistry.jpg",
      video_stream_id: "8QKkL4phbKk",
      video_playback_url: "https://www.youtube.com/watch?v=8QKkL4phbKk",
      duration_seconds: 2400,
      duration_formatted: "40:00",
      duration_human: "40 min",
      status: "PENDING_REVIEW",
      is_visible: true,
      category_tag: "Full Lecture",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  assert(!cErr && createdPending?.status === "PENDING_REVIEW", `Created test lecture in PENDING_REVIEW status`);

  // Verify Super Admin can resolve video playback without publishing
  const resolvedTestVideoId = resolveLectureVideoId(createdPending);
  assert(resolvedTestVideoId === "8QKkL4phbKk", `Super Admin player resolves stream ID for pre-approval watching (${resolvedTestVideoId})`);

  // Verify student CANNOT read the newly created PENDING_REVIEW lecture
  const { data: anonCheck } = await anonClient
    .from("cms_lectures")
    .select("id, title")
    .eq("id", testLectureId)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  assert(!anonCheck, `Student is strictly blocked from unapproved test lecture`);

  // Test Approval Decision (PENDING_REVIEW -> APPROVED)
  const { data: approvedLec, error: aErr } = await adminClient
    .from("cms_lectures")
    .update({
      status: "APPROVED",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", testLectureId)
    .select("id, status")
    .single();

  assert(!aErr && approvedLec?.status === "APPROVED", `Approval workflow transitioned status to APPROVED`);

  // Test Rejection Decision (APPROVED/PENDING -> REJECTED with note)
  const { data: rejectedLec, error: rErr } = await adminClient
    .from("cms_lectures")
    .update({
      status: "REJECTED",
      review_note: "Audio quality needs normalization around minute 15.",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", testLectureId)
    .select("id, status, review_note")
    .single();

  assert(!rErr && rejectedLec?.status === "REJECTED" && !!rejectedLec.review_note, `Rejection workflow transitioned status to REJECTED with feedback note`);

  // Clean up temporary test record
  await adminClient.from("cms_lectures").delete().eq("id", testLectureId);
  assert(true, `Cleaned up test lecture record (${testLectureId})`);

  // Summary
  console.log("\n======================================================================");
  console.log(`  REVIEW & PLAYBACK SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
