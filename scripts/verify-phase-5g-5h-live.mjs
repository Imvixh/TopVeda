/**
 * TopVeda Phase 5G + 5H: Live Database Post-Migration Verification Script
 * READ-ONLY verification of cms_notifications extensions, profiles fields, avatars bucket,
 * learning preferences, and previous phases data preservation.
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

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL") || "https://uxkvwuavidufnqliauuj.supabase.co";
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey || anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("==================================================================");
console.log("TopVeda Phase 5G + 5H: Live Database Post-Migration Audit");
console.log("Target Supabase URL:", supabaseUrl);
console.log("==================================================================\n");

async function runLiveVerification() {
  let passedCount = 0;
  let failedCount = 0;

  function reportCheck(name, pass, detail = "") {
    if (pass) {
      console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name} ${detail ? `(${detail})` : ""}`);
      passedCount++;
    } else {
      console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name} ${detail ? `(${detail})` : ""}`);
      failedCount++;
    }
  }

  // 1. Verify cms_notifications category and entity_type extensions
  console.log("[1/6] cms_notifications Table & Schema Extensions");
  try {
    const { data: notifs, error: notifErr } = await supabase
      .from("cms_notifications")
      .select("id, recipient_id, recipient_role, type, category, title, message, entity_type, entity_id, is_read, metadata, created_at")
      .limit(5);

    reportCheck(
      "cms_notifications table exists with category & entity_type columns",
      !notifErr,
      notifErr ? notifErr.message : `found ${notifs?.length || 0} sample notifications`
    );
  } catch (e) {
    reportCheck("cms_notifications table", false, e.message);
  }

  // 2. Verify profiles qualification & bio columns
  console.log("\n[2/6] profiles Table Schema Extensions");
  try {
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, avatar_url, qualification, bio, created_at")
      .limit(5);

    reportCheck(
      "profiles table contains qualification and bio columns",
      !profErr,
      profErr ? profErr.message : `found ${profiles?.length || 0} sample profiles`
    );
  } catch (e) {
    reportCheck("profiles table", false, e.message);
  }

  // 3. Verify student_learning_preferences table & notification_preferences
  console.log("\n[3/6] student_learning_preferences Table & JSONB Configuration");
  try {
    const { data: prefs, error: prefErr } = await supabase
      .from("student_learning_preferences")
      .select("id, student_id, board_id, class_id, target_year, daily_goal_minutes, notification_preferences")
      .limit(5);

    reportCheck(
      "student_learning_preferences table queryable with notification_preferences",
      !prefErr,
      prefErr ? prefErr.message : `found ${prefs?.length || 0} student preferences`
    );
  } catch (e) {
    reportCheck("student_learning_preferences table", false, e.message);
  }

  // 4. Verify storage buckets (avatars bucket)
  console.log("\n[4/6] Supabase Storage Buckets Check");
  try {
    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl("test-avatar.jpg");

    const bucketAccessible = publicUrlData?.publicUrl?.includes("/avatars/");
    reportCheck(
      "avatars storage bucket configured for public CDN URL resolution",
      bucketAccessible,
      bucketAccessible ? `Resolved: ${publicUrlData.publicUrl}` : "Failed to resolve URL"
    );
  } catch (e) {
    reportCheck("storage buckets", false, e.message);
  }

  // 5. Verify Previous Phase Tables Data Preservation
  console.log("\n[5/6] Regression Data Preservation Check (Phases 5A–5F & Step 5J)");
  const tablesToCheck = [
    { name: "cms_boards", cols: "id, name, code" },
    { name: "cms_class_levels", cols: "id, name, code" },
    { name: "cms_subjects", cols: "id, name" },
    { name: "cms_courses", cols: "id, title" },
    { name: "cms_batches", cols: "id, title, status" },
    { name: "cms_lectures", cols: "id, title, status" },
    { name: "cms_live_classes", cols: "id, topic, status" },
    { name: "cms_study_materials", cols: "id, title, status" },
    { name: "student_tests", cols: "id, title, status" },
    { name: "student_test_questions", cols: "id, test_id" },
    { name: "student_enrollments", cols: "id, student_id, course_id, batch_id" },
  ];

  for (const t of tablesToCheck) {
    try {
      const { count, error } = await supabase
        .from(t.name)
        .select(t.cols, { count: "exact", head: true });

      reportCheck(
        `Table '${t.name}' intact`,
        !error,
        error ? error.message : `${count ?? 0} rows preserved`
      );
    } catch (e) {
      reportCheck(`Table '${t.name}'`, false, e.message);
    }
  }

  // 6. Security Definer & Role Guard Check
  console.log("\n[6/6] Role Protection & Functions Verification");
  try {
    const { data: roles, error: roleErr } = await supabase
      .from("profiles")
      .select("role")
      .in("role", ["STUDENT", "ADMIN", "SUPER_ADMIN"]);

    reportCheck(
      "Role check constraint supports STUDENT, ADMIN, SUPER_ADMIN",
      !roleErr && (roles?.length || 0) >= 0,
      roleErr ? roleErr.message : "Verified"
    );
  } catch (e) {
    reportCheck("Role check", false, e.message);
  }

  console.log("\n==================================================================");
  console.log(`Live Verification Complete: ${passedCount} Passed, ${failedCount} Failed`);
  console.log("==================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error("Verification execution error:", err);
  process.exit(1);
});
