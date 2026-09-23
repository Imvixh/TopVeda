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
console.log("TopVeda Phase 4.1 Step 5J: Live Read-Only Database Verification");
console.log("Target Supabase URL:", supabaseUrl);
console.log("==================================================================\n");

async function runLiveVerification() {
  const report = {
    liveClassesColumns: "UNKNOWN",
    lecturesColumns: "UNKNOWN",
    notificationsTable: "UNKNOWN",
    postgrestSchemaCache: "UNKNOWN",
    counts: {},
    errors: [],
  };

  // 1. PostgREST Schema Cache & cms_live_classes verification
  try {
    const { data, error } = await supabase
      .from("cms_live_classes")
      .select("id, board_id, class_id, subject_id, course_id, chapter_id, stream_provider, recording_status, live_status, terminated_by, termination_reason")
      .limit(1);

    if (error) {
      report.liveClassesColumns = "FAIL";
      report.postgrestSchemaCache = "FAIL";
      report.errors.push(`cms_live_classes query: ${error.message}`);
    } else {
      report.liveClassesColumns = "PASS";
      report.postgrestSchemaCache = "PASS";
      console.log("✓ PostgREST schema cache recognizes all Step 5J cms_live_classes columns (board_id, class_id, subject_id, course_id, chapter_id, stream_provider, etc.)");
    }
  } catch (err) {
    report.liveClassesColumns = "FAIL";
    report.postgrestSchemaCache = "FAIL";
    report.errors.push(`cms_live_classes exception: ${err.message}`);
  }

  // 2. cms_lectures verification
  try {
    const { data, error } = await supabase
      .from("cms_lectures")
      .select("id, board_id, class_id, subject_id, course_id, original_live_class_id, lecture_number, recording_provider_id, material_ids")
      .limit(1);

    if (error) {
      report.lecturesColumns = "FAIL";
      report.errors.push(`cms_lectures query: ${error.message}`);
    } else {
      report.lecturesColumns = "PASS";
      console.log("✓ PostgREST schema cache recognizes all Step 5J cms_lectures columns (board_id, class_id, subject_id, course_id, original_live_class_id, lecture_number, material_ids)");
    }
  } catch (err) {
    report.lecturesColumns = "FAIL";
    report.errors.push(`cms_lectures exception: ${err.message}`);
  }

  // 3. cms_notifications verification
  try {
    const { data, error } = await supabase
      .from("cms_notifications")
      .select("id, recipient_id, recipient_role, sender_id, type, title, message, entity_type, entity_id, is_read, metadata, created_at, updated_at")
      .limit(1);

    if (error) {
      report.notificationsTable = "FAIL";
      report.errors.push(`cms_notifications query: ${error.message}`);
    } else {
      report.notificationsTable = "PASS";
      console.log("✓ public.cms_notifications table exists and all columns are accessible");
    }
  } catch (err) {
    report.notificationsTable = "FAIL";
    report.errors.push(`cms_notifications exception: ${err.message}`);
  }

  // 4. Data Preservation Counts across all 12 CMS tables
  const tables = [
    "cms_boards",
    "cms_class_levels",
    "cms_subjects",
    "cms_courses",
    "cms_batches",
    "cms_chapters",
    "cms_lectures",
    "cms_live_classes",
    "cms_study_materials",
    "cms_hero_banners",
    "cms_daily_quotes",
    "cms_hub_items",
    "cms_notifications",
  ];

  console.log("\n--- CMS Table Record Counts (Read-Only) ---");
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        report.counts[table] = `ERROR: ${error.message}`;
        console.log(`- ${table}: ERROR (${error.message})`);
      } else {
        report.counts[table] = count;
        console.log(`- ${table}: ${count} record(s)`);
      }
    } catch (err) {
      report.counts[table] = `EXCEPTION: ${err.message}`;
    }
  }

  console.log("\n--- Verification Summary ---");
  console.log("cms_live_classes columns:", report.liveClassesColumns);
  console.log("cms_lectures columns:", report.lecturesColumns);
  console.log("cms_notifications table:", report.notificationsTable);
  console.log("PostgREST schema cache:", report.postgrestSchemaCache);
  if (report.errors.length > 0) {
    console.log("Errors:", report.errors);
  }
}

runLiveVerification();
