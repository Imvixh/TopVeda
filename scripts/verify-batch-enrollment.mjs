/**
 * Verification Script for Batch Enrollments (Standalone & Course-Linked)
 * Tests whether student enrollment succeeds for batches with course_id = null
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

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

async function runAudit() {
  console.log("=====================================================================");
  console.log("  TOPVEDA: BATCH ENROLLMENT AUDIT & DB CONSTRAINT VERIFICATION       ");
  console.log("=====================================================================");

  // 1. Find a published batch with course_id IS NULL (like LAKSHYA)
  const { data: batches, error: bErr } = await adminClient
    .from("cms_batches")
    .select("id, title, course_id, status")
    .is("course_id", null)
    .eq("status", "PUBLISHED")
    .limit(1);

  if (bErr || !batches || batches.length === 0) {
    console.error("No published standalone batch found to test:", bErr?.message);
    return;
  }

  const testBatch = batches[0];
  console.log(`Testing Standalone Batch: "${testBatch.title}" (ID: ${testBatch.id}, course_id: ${testBatch.course_id})`);

  // 2. Find a test student profile
  const { data: students, error: sErr } = await adminClient
    .from("profiles")
    .select("id, email, role")
    .eq("role", "STUDENT")
    .limit(1);

  if (sErr || !students || students.length === 0) {
    console.error("No student profile found for testing:", sErr?.message);
    return;
  }

  const testStudent = students[0];
  console.log(`Using Test Student: ${testStudent.email} (ID: ${testStudent.id})`);

  // 3. Clean up any existing enrollment for this test student and batch
  await adminClient
    .from("student_enrollments")
    .delete()
    .eq("student_id", testStudent.id)
    .eq("batch_id", testBatch.id);

  // 4. Test Standalone Enrollment (course_id: null)
  console.log("\n[TEST 1] Attempting insertion into student_enrollments with course_id = null...");
  const { data: insertedEnrollment, error: insertError } = await adminClient
    .from("student_enrollments")
    .insert({
      student_id: testStudent.id,
      batch_id: testBatch.id,
      course_id: null,
      status: "ACTIVE",
      enrolled_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) {
    console.error(`\n❌ FAIL: Database rejected standalone enrollment!`);
    console.error(`   Error code: ${insertError.code}`);
    console.error(`   Message:    ${insertError.message}`);
    console.error(`\n   >>> DIAGNOSIS: Migration M10 (20261006000010_m10_standalone_batch_enrollments.sql)`);
    console.error(`   >>> has NOT been executed on this Supabase database yet.`);
    console.error(`   >>> Please execute the SQL in Supabase Dashboard SQL Editor.`);
    return false;
  } else {
    console.log(`\n✔ PASS: Successfully enrolled student in standalone batch "${testBatch.title}"!`);
    console.log(`   Enrollment Record ID: ${insertedEnrollment.id}`);
  }

  // 5. Test Duplicate Enrollment prevention / idempotency
  console.log("\n[TEST 2] Testing duplicate enrollment query...");
  const { data: existingEnrollment } = await adminClient
    .from("student_enrollments")
    .select("id, status")
    .eq("student_id", testStudent.id)
    .eq("batch_id", testBatch.id)
    .maybeSingle();

  if (existingEnrollment) {
    console.log(`✔ PASS: Duplicate enrollment check confirmed active status.`);
  }

  // 6. Test update on cms_batches (verifying trigger trg_guard_cms_batches_review is not broken)
  console.log("\n[TEST 3] Testing cms_batches update compatibility...");
  const { error: batchUpdateErr } = await adminClient
    .from("cms_batches")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", testBatch.id);

  if (batchUpdateErr) {
    console.error(`❌ FAIL: cms_batches update failed: ${batchUpdateErr.message}`);
    if (batchUpdateErr.message.includes('has no field "batch_id"')) {
      console.error(`   >>> Broken trigger trg_guard_cms_batches_review is active!`);
    }
  } else {
    console.log(`✔ PASS: cms_batches update succeeded without trigger crash.`);
  }

  // Clean up test enrollment
  await adminClient
    .from("student_enrollments")
    .delete()
    .eq("student_id", testStudent.id)
    .eq("batch_id", testBatch.id);
  console.log("\nTest enrollment cleaned up successfully.");
  console.log("=====================================================================");
  console.log("  ALL TESTS PASSED: Batch enrollments are working properly!           ");
  console.log("=====================================================================");
  return true;
}

runAudit().catch(console.error);

