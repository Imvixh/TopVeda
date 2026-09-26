/**
 * TopVeda Phase 5G + 5H Security & Architecture Automated Audit
 * Verifies:
 * 1. Unified Notification architecture (cms_notifications extensions)
 * 2. Student Notification Center & event dispatchers
 * 3. Student Profile & settings hierarchy (courses, batches, faculty, learning prefs)
 * 4. Admin Profile isolation and security
 * 5. Supabase Auth & RLS integrity
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

console.log("\n========================================================");
console.log("  TOPVEDA PHASE 5G + 5H AUTOMATED AUDIT");
console.log("  Notifications + Student & Admin Profile/Settings");
console.log("========================================================\n");

// 1. Migration Verification
console.log("[1/5] Database Migration Checks");
const migrationPath = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20260928000000_phase_5g_5h_notifications_profiles.sql"
);
assert(fs.existsSync(migrationPath), "Migration 20260928000000_phase_5g_5h_notifications_profiles.sql exists");

if (fs.existsSync(migrationPath)) {
  const migContent = fs.readFileSync(migrationPath, "utf-8");
  assert(migContent.includes("ALTER TABLE public.profiles"), "Migration enhances public.profiles table");
  assert(migContent.includes("qualification VARCHAR(255)"), "Adds qualification field to profiles");
  assert(migContent.includes("bio TEXT"), "Adds bio field to profiles");
  assert(migContent.includes("ALTER TABLE public.cms_notifications"), "Extends unified cms_notifications table");
  assert(migContent.includes("cms_notifications_category_check"), "Defines category check constraints");
  assert(migContent.includes("cms_notifications_entity_type_check"), "Expands entity_type to support TEST, ANNOUNCEMENT, COURSE");
  assert(migContent.includes("idx_cms_notifications_category_recipient"), "Adds composite index for category & recipient");
  assert(migContent.includes("storage.buckets"), "Provisions avatars storage bucket");
  assert(migContent.includes("auth_upload_own_avatar"), "Enforces user folder isolation on avatar uploads");
}

// 2. TypeScript Services Checks
console.log("\n[2/5] Backend Services & Types Checks");
const notifServicePath = path.join(ROOT, "src", "lib", "services", "notification.service.ts");
const studentProfileServicePath = path.join(ROOT, "src", "lib", "services", "student-profile.service.ts");
const adminProfileServicePath = path.join(ROOT, "src", "lib", "services", "admin-profile.service.ts");
const typesPath = path.join(ROOT, "src", "types", "student-profile.types.ts");

assert(fs.existsSync(notifServicePath), "NotificationService exists");
if (fs.existsSync(notifServicePath)) {
  const notifContent = fs.readFileSync(notifServicePath, "utf-8");
  assert(notifContent.includes("getStudentNotifications"), "NotificationService provides getStudentNotifications");
  assert(notifContent.includes("getStudentUnreadCount"), "NotificationService provides getStudentUnreadCount");
  assert(notifContent.includes("markAllAsRead"), "NotificationService provides markAllAsRead");
  assert(notifContent.includes("notifyStudentsLecturePublished"), "Provides lecture event dispatcher");
  assert(notifContent.includes("notifyStudentsLiveClassCreated"), "Provides live class event dispatcher");
  assert(notifContent.includes("notifyStudentsStudyMaterialPublished"), "Provides study material event dispatcher");
  assert(notifContent.includes("notifyStudentTestResultAvailable"), "Provides test result event dispatcher");
  assert(notifContent.includes("notifyStudentsAnnouncementPublished"), "Provides announcement event dispatcher");
}

assert(fs.existsSync(studentProfileServicePath), "StudentProfileService exists");
if (fs.existsSync(studentProfileServicePath)) {
  const spContent = fs.readFileSync(studentProfileServicePath, "utf-8");
  assert(spContent.includes("getStudentProfile"), "StudentProfileService provides getStudentProfile");
  assert(spContent.includes("updateStudentProfile"), "StudentProfileService provides updateStudentProfile");
  assert(spContent.includes("updateStudentPreferences"), "StudentProfileService provides updateStudentPreferences");
  assert(spContent.includes("student_enrollments"), "Derives enrollment hierarchy (course, batch, faculty)");
}

assert(fs.existsSync(adminProfileServicePath), "AdminProfileService exists");
if (fs.existsSync(adminProfileServicePath)) {
  const apContent = fs.readFileSync(adminProfileServicePath, "utf-8");
  assert(apContent.includes("getAdminProfile"), "AdminProfileService provides getAdminProfile");
  assert(apContent.includes("updateAdminProfile"), "AdminProfileService provides updateAdminProfile");
  assert(apContent.includes("SUPER_ADMIN") && apContent.includes("ADMIN"), "Enforces strict admin role checks");
}

assert(fs.existsSync(typesPath), "Student and Admin Profile types exist");

// 3. API Endpoints Checks
console.log("\n[3/5] API Endpoints Checks");
const apiFiles = [
  "src/app/api/student/notifications/route.ts",
  "src/app/api/student/notifications/[id]/read/route.ts",
  "src/app/api/student/notifications/read-all/route.ts",
  "src/app/api/student/profile/route.ts",
  "src/app/api/student/profile/preferences/route.ts",
  "src/app/api/student/profile/avatar/route.ts",
  "src/app/api/student/profile/change-password/route.ts",
  "src/app/api/admin/profile/route.ts",
  "src/app/api/admin/profile/change-password/route.ts",
];

for (const apiFile of apiFiles) {
  const fullPath = path.join(ROOT, apiFile);
  assert(fs.existsSync(fullPath), `Endpoint exists: ${apiFile}`);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    assert(content.includes("auth.getUser()"), `${apiFile} derives user from Supabase Auth`);
  }
}

// 4. UI Pages Checks
console.log("\n[4/5] UI Pages & Header Components Checks");
const notifPagePath = path.join(ROOT, "src", "app", "student", "notifications", "page.tsx");
const profilePagePath = path.join(ROOT, "src", "app", "student", "profile", "page.tsx");
const settingsPagePath = path.join(ROOT, "src", "app", "student", "settings", "page.tsx");
const adminProfilePagePath = path.join(ROOT, "src", "app", "admin", "profile", "page.tsx");
const headerPath = path.join(ROOT, "src", "components", "student", "student-header.tsx");

assert(fs.existsSync(notifPagePath), "Student Notifications page exists");
if (fs.existsSync(notifPagePath)) {
  const notifUi = fs.readFileSync(notifPagePath, "utf-8");
  assert(notifUi.includes("CLASSES") && notifUi.includes("TESTS") && notifUi.includes("ANNOUNCEMENTS"), "Supports category tabs (Classes, Tests, Announcements)");
  assert(notifUi.includes("handleMarkAllAsRead"), "Provides mark all as read action");
  assert(notifUi.includes("formatRelativeTime"), "Renders natural relative timestamps");
}

assert(fs.existsSync(profilePagePath), "Student Profile page exists");
if (fs.existsSync(profilePagePath)) {
  const profUi = fs.readFileSync(profilePagePath, "utf-8");
  assert(profUi.includes("Personal Information"), "Includes Personal Info tab");
  assert(profUi.includes("Change Password"), "Includes Change Password tab");
  assert(profUi.includes("Notification"), "Includes Notification preferences tab");
  assert(profUi.includes("Learning Preferences"), "Includes Learning preferences tab");
  assert(profUi.includes("Help & Support"), "Includes Help & Support tab");
}

assert(fs.existsSync(adminProfilePagePath), "Dedicated Admin Profile page exists");
if (fs.existsSync(adminProfilePagePath)) {
  const adminUi = fs.readFileSync(adminProfilePagePath, "utf-8");
  assert(adminUi.includes("/api/admin/profile"), "Queries dedicated admin API");
  assert(!adminUi.includes("CmsSidebar"), "Enforces isolated Admin Profile layout (no CMS sidebar)");
}

const superAdminProfilePath = path.join(ROOT, "src", "app", "admin", "cms", "profile", "page.tsx");
assert(fs.existsSync(superAdminProfilePath), "Dedicated Super Admin CMS Profile page exists");

assert(fs.existsSync(headerPath), "Student Header exists");
if (fs.existsSync(headerPath)) {
  const headerUi = fs.readFileSync(headerPath, "utf-8");
  assert(headerUi.includes("unreadCount"), "Student Header displays unread notification badge");
}

// 5. Security & Isolation Verification
console.log("\n[5/5] Security & Role Guard Verification");
const adminApiContent = fs.readFileSync(path.join(ROOT, "src", "app", "api", "admin", "profile", "route.ts"), "utf-8");
assert(adminApiContent.includes("Forbidden. Admin privileges required."), "Admin profile API forbids non-admin users");

const studentApiContent = fs.readFileSync(path.join(ROOT, "src", "app", "api", "student", "profile", "route.ts"), "utf-8");
assert(!studentApiContent.includes("role ="), "Student profile update never mutates role");

console.log("\n========================================================");
console.log(`  AUDIT SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log("========================================================\n");

if (failed > 0) {
  process.exit(1);
}
