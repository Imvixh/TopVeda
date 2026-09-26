/**
 * TopVeda Automated Regression & Verification Test Suite:
 * Task 1: Global Timezone Consistency (Asia/Kolkata / IST)
 * Task 2: Teacher Profile (Avatar, Qualification, Location, Address)
 * Task 3: Super Admin Teacher Profile View
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  APP_TIMEZONE,
  parseISTInputToUTC,
  formatUTCToIST,
  formatLiveDateIST,
  formatLiveTimeIST,
  formatLiveTimeDisplay,
  getTMinus10TimeIST,
  getISTDateInput,
  getISTTimeInput,
  isWithinEarlyAccessWindow,
} from "../src/lib/utils/timezone.ts";

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
console.log("  TOPVEDA AUTOMATED VERIFICATION SUITE");
console.log("  Task 1: Timezone Consistency (Asia/Kolkata / IST)");
console.log("  Task 2: Teacher Profile Architecture");
console.log("  Task 3: Super Admin Teacher Profile View");
console.log("========================================================\n");

// ---------------------------------------------------------------------------
// PART 1: GLOBAL TIMEZONE CONSISTENCY TESTS
// ---------------------------------------------------------------------------
console.log("[1/3] Testing Global Timezone Consistency (IST / UTC Engine)...");

// Test 1: Teacher schedules 9:00 PM IST on Sep 26, 2026
const inputDate = "2026-09-26";
const inputTime = "21:00";
const utcResult = parseISTInputToUTC(inputDate, inputTime);

assert(
  utcResult === "2026-09-26T15:30:00.000Z",
  `Teacher schedules 9:00 PM IST -> Canonical UTC is "2026-09-26T15:30:00.000Z" (Got: ${utcResult})`
);

// Test 2: Formatting back to IST displays 9:00 PM
const formattedTime = formatLiveTimeIST(utcResult);
assert(
  formattedTime === "9:00 PM",
  `Database UTC timestamp formats to "9:00 PM" IST (Got: "${formattedTime}")`
);

// Test 3: Date formatting in IST
const formattedDate = formatLiveDateIST(utcResult, { month: "short", day: "numeric" });
assert(
  formattedDate === "Sep 26",
  `Database UTC timestamp formats date to "Sep 26" IST (Got: "${formattedDate}")`
);

// Test 4: Combined Live Time Display
const liveDisplay = formatLiveTimeDisplay(utcResult);
assert(
  liveDisplay === "Sep 26 • 9:00 PM",
  `Live time display is "Sep 26 • 9:00 PM" (Got: "${liveDisplay}")`
);

// Test 5: Live Time Range Display
const utcEnd = new Date(new Date(utcResult).getTime() + 60 * 60 * 1000).toISOString();
const liveRangeDisplay = formatLiveTimeDisplay(utcResult, utcEnd);
assert(
  liveRangeDisplay === "Sep 26 • 9:00 PM – 10:00 PM",
  `Live range display is "Sep 26 • 9:00 PM – 10:00 PM" (Got: "${liveRangeDisplay}")`
);

// Test 6: T-10 Preparation Open Time
const tMinus10 = getTMinus10TimeIST(utcResult);
assert(
  tMinus10 === "8:50 PM",
  `T-10 preparation window starts at "8:50 PM" IST for 9:00 PM start (Got: "${tMinus10}")`
);

// Test 7: Date Rollover (1:00 AM IST on Sep 27 -> 19:30 UTC on Sep 26)
const rolloverDate = "2026-09-27";
const rolloverTime = "01:00";
const rolloverUtc = parseISTInputToUTC(rolloverDate, rolloverTime);
assert(
  rolloverUtc === "2026-09-26T19:30:00.000Z",
  `Date rollover: Sep 27 01:00 IST -> Sep 26 19:30:00.000Z UTC (Got: ${rolloverUtc})`
);
const rolloverDisplay = formatLiveTimeDisplay(rolloverUtc);
assert(
  rolloverDisplay === "Sep 27 • 1:00 AM",
  `Date rollover formats back to "Sep 27 • 1:00 AM" IST (Got: "${rolloverDisplay}")`
);

// Test 8: HTML Input value helpers (getISTDateInput & getISTTimeInput)
const dateInputVal = getISTDateInput(utcResult);
const timeInputVal = getISTTimeInput(utcResult);
assert(
  dateInputVal === "2026-09-26",
  `getISTDateInput extracts "2026-09-26" in IST from UTC (Got: "${dateInputVal}")`
);
assert(
  timeInputVal === "21:00",
  `getISTTimeInput extracts "21:00" in IST from UTC (Got: "${timeInputVal}")`
);

// Test 9: YouTube ISO compatibility
const ytIso = new Date(utcResult).toISOString();
assert(
  ytIso.endsWith("Z") && !isNaN(new Date(ytIso).getTime()),
  `YouTube broadcast API receives canonical ISO-8601 UTC timestamp "${ytIso}"`
);

// ---------------------------------------------------------------------------
// PART 2: TEACHER PROFILE ARCHITECTURE & DATABASE
// ---------------------------------------------------------------------------
console.log("\n[2/3] Testing Teacher Profile Schema & Endpoints...");

// Check migration file
const migrationPath = path.join(
  ROOT,
  "supabase",
  "migrations",
  "20261001000000_profiles_location_address.sql"
);
assert(fs.existsSync(migrationPath), "Migration file 20261001000000_profiles_location_address.sql exists");

if (fs.existsSync(migrationPath)) {
  const migContent = fs.readFileSync(migrationPath, "utf-8");
  assert(migContent.includes("location VARCHAR(255)"), "Migration adds location VARCHAR(255)");
  assert(migContent.includes("address TEXT"), "Migration adds address TEXT");
}

// Check Profile Types
const typesPath = path.join(ROOT, "src", "types", "student-profile.types.ts");
assert(fs.existsSync(typesPath), "src/types/student-profile.types.ts exists");
const typesContent = fs.readFileSync(typesPath, "utf-8");
assert(typesContent.includes("location?: string | null;"), "AdminProfileSummary includes location");
assert(typesContent.includes("address?: string | null;"), "AdminProfileSummary includes address");
assert(typesContent.includes("location?: string;"), "UpdateAdminProfilePayload includes location");
assert(typesContent.includes("address?: string;"), "UpdateAdminProfilePayload includes address");

// Check AdminProfileService
const adminProfileServicePath = path.join(ROOT, "src", "lib", "services", "admin-profile.service.ts");
assert(fs.existsSync(adminProfileServicePath), "admin-profile.service.ts exists");
const adminProfileServiceContent = fs.readFileSync(adminProfileServicePath, "utf-8");
assert(adminProfileServiceContent.includes("location"), "AdminProfileService selects location");
assert(adminProfileServiceContent.includes("address"), "AdminProfileService selects address");
assert(adminProfileServiceContent.includes("payload.location"), "AdminProfileService updates location");
assert(adminProfileServiceContent.includes("payload.address"), "AdminProfileService updates address");

// Check Avatar Upload API
const avatarRoutePath = path.join(ROOT, "src", "app", "api", "admin", "profile", "avatar", "route.ts");
assert(fs.existsSync(avatarRoutePath), "src/app/api/admin/profile/avatar/route.ts exists");
const avatarRouteContent = fs.readFileSync(avatarRoutePath, "utf-8");
assert(avatarRouteContent.includes("2 * 1024 * 1024"), "Avatar upload validates 2MB limit");
assert(avatarRouteContent.includes("image/jpeg") && avatarRouteContent.includes("image/png"), "Avatar upload validates MIME types");
assert(avatarRouteContent.includes("export async function POST"), "Avatar upload endpoint supports POST");
assert(avatarRouteContent.includes("export async function DELETE"), "Avatar endpoint supports DELETE (photo removal)");
assert(avatarRouteContent.includes("avatars"), "Avatar endpoint uses Supabase avatars bucket");

// Check Teacher Profile Page UI
const adminProfilePagePath = path.join(ROOT, "src", "app", "admin", "profile", "page.tsx");
assert(fs.existsSync(adminProfilePagePath), "src/app/admin/profile/page.tsx exists");
const adminProfilePageContent = fs.readFileSync(adminProfilePagePath, "utf-8");
assert(adminProfilePageContent.includes("handleAvatarFileChange"), "Profile page has avatar file change handler");
assert(adminProfilePageContent.includes("handleAvatarRemove"), "Profile page has avatar removal handler");
assert(adminProfilePageContent.includes("qualification"), "Profile page has qualification field");
assert(adminProfilePageContent.includes("location"), "Profile page has location field");
assert(adminProfilePageContent.includes("address"), "Profile page has address field");
assert(adminProfilePageContent.includes("handleChangePassword"), "Profile page preserves password management");

// ---------------------------------------------------------------------------
// PART 3: SUPER ADMIN TEACHER PROFILE VIEW
// ---------------------------------------------------------------------------
console.log("\n[3/3] Testing Super Admin Teacher Profile View...");

// Check CmsService.getTeachersForSuperAdmin
const cmsServicePath = path.join(ROOT, "src", "lib", "services", "cms.service.ts");
assert(fs.existsSync(cmsServicePath), "src/lib/services/cms.service.ts exists");
const cmsServiceContent = fs.readFileSync(cmsServicePath, "utf-8");
assert(
  cmsServiceContent.includes("qualification, location, address, bio"),
  "CmsService.getTeachersForSuperAdmin fetches qualification, location, address, bio"
);

// Check TeacherDirectoryItem in teacher.types.ts
const teacherTypesPath = path.join(ROOT, "src", "types", "teacher.types.ts");
assert(fs.existsSync(teacherTypesPath), "src/types/teacher.types.ts exists");
const teacherTypesContent = fs.readFileSync(teacherTypesPath, "utf-8");
assert(teacherTypesContent.includes("qualification?: string;"), "TeacherDirectoryItem has qualification");
assert(teacherTypesContent.includes("location?: string;"), "TeacherDirectoryItem has location");
assert(teacherTypesContent.includes("address?: string;"), "TeacherDirectoryItem has address");
assert(teacherTypesContent.includes("phone?: string;"), "TeacherDirectoryItem has phone");

// Check Content Studio / Teacher Directory UI
const contentPagePath = path.join(ROOT, "src", "app", "admin", "content", "page.tsx");
assert(fs.existsSync(contentPagePath), "src/app/admin/content/page.tsx exists");
const contentPageContent = fs.readFileSync(contentPagePath, "utf-8");
assert(contentPageContent.includes("viewingProfileTeacher"), "Content page has viewingProfileTeacher state");
assert(contentPageContent.includes("View Profile"), "Teacher cards have View Profile button");
assert(contentPageContent.includes("Educator Profile (Super Admin View)"), "Content page contains Super Admin Teacher Profile modal");
assert(contentPageContent.includes("viewingProfileTeacher.qualification"), "Modal renders teacher qualification");
assert(contentPageContent.includes("viewingProfileTeacher.location"), "Modal renders teacher location");
assert(contentPageContent.includes("viewingProfileTeacher.address"), "Modal renders teacher address");

// ---------------------------------------------------------------------------
// PART 4: ROLE CONTEXT SEPARATION & ROUTING BOUNDARIES
// ---------------------------------------------------------------------------
console.log("\n[4/4] Testing Role-Separated Profile Routing & Context Boundaries...");

// 1. Teacher/Admin Profile isolation (No CmsSidebar or CmsTopbar)
assert(
  !adminProfilePageContent.includes("<CmsSidebar") && !adminProfilePageContent.includes("<CmsTopbar"),
  "Teacher /admin/profile does NOT render Super Admin CmsSidebar or CmsTopbar"
);
assert(
  adminProfilePageContent.includes("/admin/content") && adminProfilePageContent.includes("Teacher Workspace"),
  "Teacher /admin/profile retains navigation within Admin/Teacher area (/admin/content)"
);

// 2. Super Admin dedicated CMS Profile page
const superAdminProfilePath = path.join(ROOT, "src", "app", "admin", "cms", "profile", "page.tsx");
assert(fs.existsSync(superAdminProfilePath), "Dedicated Super Admin CMS profile page exists at src/app/admin/cms/profile/page.tsx");

// 3. Super Admin CMS navigation points to /admin/cms/profile
const cmsNavConfigPath = path.join(ROOT, "src", "components", "admin", "cms", "cms-nav-config.ts");
const cmsNavConfigContent = fs.readFileSync(cmsNavConfigPath, "utf-8");
assert(
  cmsNavConfigContent.includes('href: "/admin/cms/profile"'),
  "CMS sidebar navigation maps Profile to /admin/cms/profile"
);

const cmsSidebarPath = path.join(ROOT, "src", "components", "admin", "cms", "cms-sidebar.tsx");
const cmsSidebarContent = fs.readFileSync(cmsSidebarPath, "utf-8");
assert(
  cmsSidebarContent.includes('href="/admin/cms/profile"'),
  "CMS sidebar footer user capsule maps to /admin/cms/profile"
);

const cmsTopbarPath = path.join(ROOT, "src", "components", "admin", "cms", "cms-topbar.tsx");
const cmsTopbarContent = fs.readFileSync(cmsTopbarPath, "utf-8");
assert(
  cmsTopbarContent.includes('href="/admin/cms/profile"'),
  "CMS topbar maps Profile to /admin/cms/profile"
);

// 4. Admin Foundation role-awareness
const adminFoundationPath = path.join(ROOT, "src", "app", "admin", "page.tsx");
const adminFoundationContent = fs.readFileSync(adminFoundationPath, "utf-8");
assert(
  adminFoundationContent.includes('const profileHref = isSuperAdmin ? "/admin/cms/profile" : "/admin/profile"'),
  "Admin Foundation page routes Super Admin to /admin/cms/profile and Admin/Teacher to /admin/profile"
);

// 5. Teacher Workspace role-awareness
assert(
  contentPageContent.includes('isSuperAdmin ? "/admin/cms/profile" : "/admin/profile"'),
  "Teacher Workspace header routes Super Admin to /admin/cms/profile and Admin/Teacher to /admin/profile"
);

// ---------------------------------------------------------------------------
// PART 5: TEACHER PROFILE -> STUDENT LIVE CLASS IDENTITY SYNCHRONIZATION
// ---------------------------------------------------------------------------
console.log("\n[5/5] Testing Teacher Profile -> Student Live Class Identity Synchronization...");

// 1. Live Class Creation uses real profile
const createRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "live", "create", "route.ts");
const createRouteContent = fs.readFileSync(createRoutePath, "utf-8");
assert(
  createRouteContent.includes("educator_id: user.id") && createRouteContent.includes("educator_avatar_url: educatorAvatar"),
  "Live Class creation links canonical educator_id to auth.uid() and stores real profile avatar"
);

// 2. Student Live Service joins profiles:educator_id
const studentLiveServicePath = path.join(ROOT, "src", "lib", "services", "student-live.service.ts");
const studentLiveServiceContent = fs.readFileSync(studentLiveServicePath, "utf-8");
assert(
  studentLiveServiceContent.includes("profiles:educator_id(avatar_url, full_name)"),
  "StudentLiveService joins profiles table on educator_id to fetch current profile name & avatar"
);
assert(
  studentLiveServiceContent.includes("profileData?.avatar_url"),
  "StudentLiveService prioritizes joined profile avatar over stale snapshot"
);
assert(
  !studentLiveServiceContent.includes('return "/assets/student/teacher-male-1.jpg"'),
  "StudentLiveService avoids hardcoded dummy stock teacher image fallback"
);

// 3. Student Home Service joins profiles:educator_id
const studentHomeServicePath = path.join(ROOT, "src", "lib", "services", "student-home.service.ts");
const studentHomeServiceContent = fs.readFileSync(studentHomeServicePath, "utf-8");
assert(
  studentHomeServiceContent.includes("profiles:educator_id(avatar_url, full_name)"),
  "StudentHomeService joins profiles table on educator_id for live classes"
);
assert(
  studentHomeServiceContent.includes("profileData?.avatar_url"),
  "StudentHomeService resolves real teacher profile avatar"
);

// 4. Live Session endpoint synchronizes with joined profile
const sessionRoutePath = path.join(ROOT, "src", "app", "api", "teacher", "live", "session", "route.ts");
const sessionRouteContent = fs.readFileSync(sessionRoutePath, "utf-8");
assert(
  sessionRouteContent.includes("profiles:educator_id(full_name, email, avatar_url)"),
  "Teacher Live Session route joins profiles:educator_id"
);
assert(
  sessionRouteContent.includes("profileData?.full_name") && sessionRouteContent.includes("profileData?.avatar_url"),
  "Teacher Live Session route returns synchronized educatorName and educatorAvatarUrl from profile"
);

console.log("\n========================================================");
console.log(`  AUDIT COMPLETE: ${passed} Passed, ${failed} Failed`);
console.log("========================================================\n");

if (failed > 0) {
  process.exit(1);
}


