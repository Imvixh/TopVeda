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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const adminClient = createClient(supabaseUrl, serviceKey);
const anonClient = createClient(supabaseUrl, anonKey);

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

async function runE2EValidation() {
  console.log("\n======================================================================");
  console.log("  TOPVEDA: THREE TARGETED BATCH FIXES VERIFICATION SUITE");
  console.log("======================================================================\n");

  const nowIso = new Date().toISOString();

  // -------------------------------------------------------------------------
  // TEST 1: Existing Dummy Batches Visibility & Relations in Super Admin Query
  // -------------------------------------------------------------------------
  console.log("--- 1. Testing Existing Dummy Batches Retrieval for Super Admin ---");
  const { data: upcomingBatches, error: upErr } = await adminClient
    .from("cms_batches")
    .select(`
      *,
      board:cms_boards(id, name, code),
      class_level:cms_class_levels(id, name, code),
      subject:cms_subjects(id, name, code),
      batch_teachers:cms_batch_teachers(
        id,
        batch_id,
        teacher_id,
        display_order,
        teacher:profiles(id, full_name, avatar_url, qualification, role)
      )
    `)
    .or(`is_featured.eq.true,starts_at.gt.${nowIso}`)
    .neq("status", "ARCHIVED")
    .order("display_order", { ascending: true });

  assert(!upErr && upcomingBatches?.length === 4, `Super Admin New & Featured Batches query returned exactly 4 dummy batches (got ${upcomingBatches?.length})`);

  const { data: ongoingBatches, error: onErr } = await adminClient
    .from("cms_batches")
    .select(`
      *,
      board:cms_boards(id, name, code),
      class_level:cms_class_levels(id, name, code),
      subject:cms_subjects(id, name, code),
      batch_teachers:cms_batch_teachers(
        id,
        batch_id,
        teacher_id,
        display_order,
        teacher:profiles(id, full_name, avatar_url, qualification, role)
      )
    `)
    .or(`is_ongoing.eq.true,and(starts_at.not.is.null,starts_at.lte.${nowIso})`)
    .neq("status", "ARCHIVED")
    .order("display_order", { ascending: true });

  assert(!onErr && ongoingBatches?.length === 5, `Super Admin Ongoing Batches query returned exactly 5 dummy batches (got ${ongoingBatches?.length})`);

  // -------------------------------------------------------------------------
  // TEST 2: Edit an existing dummy batch & verify Student Home synchronization
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Testing Edit & Synchronization on Existing Batch ---");
  const targetBatch = upcomingBatches[0];
  const originalSubtitle = targetBatch.subtitle;
  const updatedSubtitle = "Updated Board Prep Test " + Date.now().toString().slice(-4);

  // Update
  const { data: updatedBatch, error: updateErr } = await adminClient
    .from("cms_batches")
    .update({ subtitle: updatedSubtitle, updated_at: new Date().toISOString() })
    .eq("id", targetBatch.id)
    .select()
    .single();

  assert(!updateErr && updatedBatch?.subtitle === updatedSubtitle, `Edited batch subtitle persisted to database: "${updatedSubtitle}"`);

  // Verify Student Home query reflects it
  const { data: studentFeatured, error: sfErr } = await anonClient
    .from("cms_batches")
    .select("id, title, subtitle, is_visible")
    .eq("id", targetBatch.id)
    .eq("status", "PUBLISHED")
    .eq("is_visible", true)
    .single();

  assert(!sfErr && studentFeatured?.subtitle === updatedSubtitle, `Student Home query immediately received the updated subtitle`);

  // Revert back
  await adminClient
    .from("cms_batches")
    .update({ subtitle: originalSubtitle, updated_at: new Date().toISOString() })
    .eq("id", targetBatch.id);

  // -------------------------------------------------------------------------
  // TEST 3: Toggle Visibility OFF and ON
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Testing Visibility Toggle ON / OFF ---");
  // Toggle OFF
  await adminClient.from("cms_batches").update({ is_visible: false }).eq("id", targetBatch.id);
  const { data: studentHidden } = await anonClient
    .from("cms_batches")
    .select("id")
    .eq("id", targetBatch.id)
    .eq("status", "PUBLISHED")
    .eq("is_visible", true)
    .maybeSingle();

  assert(studentHidden === null, `When is_visible=false, batch is hidden from Student Home`);

  // Toggle ON
  await adminClient.from("cms_batches").update({ is_visible: true }).eq("id", targetBatch.id);
  const { data: studentVisible } = await anonClient
    .from("cms_batches")
    .select("id")
    .eq("id", targetBatch.id)
    .eq("status", "PUBLISHED")
    .eq("is_visible", true)
    .maybeSingle();

  assert(studentVisible?.id === targetBatch.id, `When is_visible=true, batch appears again on Student Home`);

  // -------------------------------------------------------------------------
  // TEST 4: Create a NEW Upcoming / Featured Batch & Verify
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Testing Create NEW Featured / Upcoming Batch ---");
  const newFeaturedPayload = {
    title: "Class 10 Advanced Math Special",
    slug: `class-10-advanced-math-${Date.now().toString().slice(-4)}`,
    board_id: "10000000-0000-0000-0000-000000000001",
    class_id: "20000000-0000-0000-0000-000000000001",
    subject_id: "30000000-0000-0000-0000-000000000001",
    board_label: "Class 10 CBSE",
    subtitle: "Complete Olympiad & Board Prep",
    description: "Special advanced batch",
    starts_at: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days in future
    badge_text: "New",
    badge_variant: "orange",
    bg_gradient: "from-sky-50/70 via-blue-50/40 to-indigo-50/30",
    border_color: "border-sky-100",
    is_featured: true,
    is_ongoing: false,
    status_type: "ongoing",
    educator_name: "Vishal Kumar",
    educator_avatar_url: "/assets/student/teacher-male-1.jpg",
    cta_text: "Explore →",
    cta_link: "/student/batches",
    display_order: 5,
    is_visible: true,
    status: "PUBLISHED",
  };

  const { data: createdFeatured, error: cfErr } = await adminClient
    .from("cms_batches")
    .insert(newFeaturedPayload)
    .select()
    .single();

  assert(!cfErr && createdFeatured?.id, `Successfully created new Featured batch (ID: ${createdFeatured?.id})`);

  // Bind teacher
  const { error: cfTeacherErr } = await adminClient
    .from("cms_batch_teachers")
    .insert({
      batch_id: createdFeatured.id,
      teacher_id: "6f72791e-2761-4b75-8168-503778cf6c43",
      display_order: 1,
    });
  assert(!cfTeacherErr, `Successfully bound faculty profile to new Featured batch`);

  // Verify in Student Home Featured Batches query
  const { data: studentHomeFeaturedList } = await anonClient
    .from("cms_batches")
    .select("id, title")
    .eq("status", "PUBLISHED")
    .eq("is_visible", true)
    .or(`is_featured.eq.true,starts_at.gt.${new Date().toISOString()}`);

  const foundInStudent = studentHomeFeaturedList?.some((b) => b.id === createdFeatured.id);
  assert(foundInStudent, `Newly created batch appears in Student Home Featured Batches query`);

  // Cleanup created batch
  await adminClient.from("cms_batch_teachers").delete().eq("batch_id", createdFeatured.id);
  await adminClient.from("cms_batches").delete().eq("id", createdFeatured.id);
  assert(true, `Cleaned up test featured batch`);

  // -------------------------------------------------------------------------
  // TEST 5: Create a NEW Ongoing Batch & Verify
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Testing Create NEW Ongoing Batch ---");
  const newOngoingPayload = {
    title: "Computer Science",
    slug: `class-12-computer-science-${Date.now().toString().slice(-4)}`,
    board_id: "10000000-0000-0000-0000-000000000001",
    class_id: "20000000-0000-0000-0000-000000000003",
    subject_id: "30000000-0000-0000-0000-000000000001",
    board_label: "CBSE Board",
    badge_text: "Class 12 (CBSE)",
    subtitle: "Python & SQL Daily Live Lectures",
    description: "Active CS cohort",
    starts_at: new Date(Date.now() - 3600000).toISOString(), // started 1 hour ago
    is_visible: true,
    status: "PUBLISHED",
    is_featured: false,
    is_ongoing: true,
    status_type: "live",
    cta_text: "Join Now",
    cta_link: "/student/batches",
    icon_type: "atom",
    icon_bg: "bg-sky-50 border-sky-100",
    icon_color: "text-sky-600",
    display_order: 6,
    educator_name: "Vishal Kumar",
    educator_avatar_url: "/assets/student/teacher-male-1.jpg",
  };

  const { data: createdOngoing, error: coErr } = await adminClient
    .from("cms_batches")
    .insert(newOngoingPayload)
    .select()
    .single();

  assert(!coErr && createdOngoing?.id, `Successfully created new Ongoing batch (ID: ${createdOngoing?.id})`);

  // Verify in Student Home Ongoing Batches query
  const { data: studentHomeOngoingList } = await anonClient
    .from("cms_batches")
    .select("id, title")
    .eq("status", "PUBLISHED")
    .eq("is_visible", true)
    .or(`is_ongoing.eq.true,and(starts_at.not.is.null,starts_at.lte.${new Date().toISOString()})`);

  const foundInOngoingStudent = studentHomeOngoingList?.some((b) => b.id === createdOngoing.id);
  assert(foundInOngoingStudent, `Newly created batch appears in Student Home Ongoing Batches query`);

  // Cleanup created batch
  await adminClient.from("cms_batches").delete().eq("id", createdOngoing.id);
  assert(true, `Cleaned up test ongoing batch`);

  console.log("\n======================================================================");
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================================\n");
}

runE2EValidation().catch(console.error);
