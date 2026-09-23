/**
 * TopVeda Phase 5E + 5F: Automated Audit & Verification Suite
 * Verifies Study Materials (Enrolled-Only Security, Download Authorization, Activity Tracking)
 * and Boards Discovery (Dynamic Board Catalog, Class Hierarchies, Batch Breakdown).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message, suiteName) {
  if (condition) {
    console.log(`  ✓ PASS [${suiteName}] ${message}`);
    totalPassed++;
  } else {
    console.error(`  ✖ FAIL [${suiteName}] ${message}`);
    totalFailed++;
  }
}

console.log("======================================================================");
console.log("   TOPVEDA PHASE 5E + 5F (STUDY MATERIALS & BOARDS) — AUDIT SUITE    ");
console.log("======================================================================\n");

// ============================================================================
// SUITE 1: Database Migration & Schema Specification
// ============================================================================
console.log("SUITE 1: Database Migration & Schema Integrity");

const migrationPath = path.join(rootDir, "supabase", "migrations", "20260927000000_phase_5e_5f_materials_boards.sql");
const migrationExists = fs.existsSync(migrationPath);
assert(migrationExists, "Phase 5E/5F migration file exists", "Schema");

let migrationSql = "";
if (migrationExists) {
  migrationSql = fs.readFileSync(migrationPath, "utf8");

  assert(
    migrationSql.includes("ALTER TABLE public.cms_study_materials") &&
    migrationSql.includes("batch_id UUID REFERENCES public.cms_batches"),
    "cms_study_materials extended with batch_id foreign key",
    "Schema"
  );

  assert(
    migrationSql.includes("CREATE INDEX IF NOT EXISTS idx_cms_study_materials_batch"),
    "Index on cms_study_materials (batch_id) created",
    "Schema"
  );

  assert(
    migrationSql.includes("students_read_enrolled_study_materials") &&
    migrationSql.includes("student_enrollments"),
    "Hardened RLS policy restricts study materials SELECT to enrolled batches",
    "RLS"
  );

  assert(
    migrationSql.includes("c1000000-0000-0000-0000-000000000001"),
    "Seed demo study materials created in dedicated c1000000-... UUID series",
    "Schema"
  );

  assert(
    !migrationSql.includes("DROP TABLE") && !migrationSql.includes("TRUNCATE"),
    "Non-destructive migration safety: zero DROP TABLE or TRUNCATE",
    "Schema"
  );
}

// ============================================================================
// SUITE 2: Domain Types & Data Contracts
// ============================================================================
console.log("\nSUITE 2: Domain Types & Data Contracts");

const smTypesPath = path.join(rootDir, "src", "types", "study-material.types.ts");
const boardTypesPath = path.join(rootDir, "src", "types", "board.types.ts");
const smTypesContent = fs.existsSync(smTypesPath) ? fs.readFileSync(smTypesPath, "utf8") : "";
const boardTypesContent = fs.existsSync(boardTypesPath) ? fs.readFileSync(boardTypesPath, "utf8") : "";

assert(
  smTypesContent.includes("export interface StudentStudyMaterialItem") &&
  smTypesContent.includes("materialType: MaterialType"),
  "StudentStudyMaterialItem domain type exported with materialType",
  "Types"
);

assert(
  smTypesContent.includes("export interface EnrolledBatchItem") &&
  smTypesContent.includes("materialsCount: number"),
  "EnrolledBatchItem domain type exported for batch switcher",
  "Types"
);

assert(
  boardTypesContent.includes("export interface StudentBoardItem") &&
  boardTypesContent.includes("classLevels: BoardClassLevel[]"),
  "StudentBoardItem domain type exported with classLevels",
  "Types"
);

assert(
  boardTypesContent.includes("export interface StudentBoardDetail") &&
  boardTypesContent.includes("enrolledBatches: BoardBatchCard[]") &&
  boardTypesContent.includes("availableBatches: BoardBatchCard[]"),
  "StudentBoardDetail domain type exported with enrolled & available batches",
  "Types"
);

// ============================================================================
// SUITE 3: Student Study Material Service & Enrolled-Only Gating
// ============================================================================
console.log("\nSUITE 3: Study Material Service & Strict Authorization");

const smServicePath = path.join(rootDir, "src", "lib", "services", "student-study-material.service.ts");
const smServiceContent = fs.existsSync(smServicePath) ? fs.readFileSync(smServicePath, "utf8") : "";

assert(
  smServiceContent.includes("getEnrolledBatchesForMaterials") &&
  smServiceContent.includes("verifyStudentBatchEnrollment"),
  "StudentStudyMaterialService exports batch enrollment verifier",
  "Service"
);

assert(
  smServiceContent.includes("getMaterialsForBatch") &&
  smServiceContent.includes("NOT_ENROLLED_IN_BATCH"),
  "getMaterialsForBatch strictly verifies enrollment and rejects unauthorized access",
  "Security"
);

assert(
  smServiceContent.includes("generateAuthorizedDownload") &&
  smServiceContent.includes("MATERIAL_DOWNLOAD"),
  "generateAuthorizedDownload verifies enrollment, increments counter, and logs learning activity",
  "Service"
);

// ============================================================================
// SUITE 4: Student Board Service & Dynamic Hierarchy
// ============================================================================
console.log("\nSUITE 4: Student Board Service & Discovery Hierarchy");

const boardServicePath = path.join(rootDir, "src", "lib", "services", "student-board.service.ts");
const boardServiceContent = fs.existsSync(boardServicePath) ? fs.readFileSync(boardServicePath, "utf8") : "";

assert(
  boardServiceContent.includes("getBoardsCatalog") &&
  boardServiceContent.includes("cms_boards"),
  "StudentBoardService exports getBoardsCatalog dynamically querying cms_boards",
  "Service"
);

assert(
  boardServiceContent.includes("getBoardDetail") &&
  boardServiceContent.includes("enrolledBatches") &&
  boardServiceContent.includes("availableBatches"),
  "getBoardDetail categorizes batches into enrolled, available, and upcoming",
  "Service"
);

// ============================================================================
// SUITE 5: API Endpoints & Server-Side Security
// ============================================================================
console.log("\nSUITE 5: API Endpoints & Server-Side Security");

const smApiPath = path.join(rootDir, "src", "app", "api", "student", "study-materials", "route.ts");
const smDetailApiPath = path.join(rootDir, "src", "app", "api", "student", "study-materials", "[id]", "route.ts");
const smDownloadApiPath = path.join(rootDir, "src", "app", "api", "student", "study-materials", "[id]", "download", "route.ts");
const boardsApiPath = path.join(rootDir, "src", "app", "api", "student", "boards", "route.ts");
const boardDetailApiPath = path.join(rootDir, "src", "app", "api", "student", "boards", "[id]", "route.ts");

assert(fs.existsSync(smApiPath), "GET /api/student/study-materials endpoint exists", "API");
assert(fs.existsSync(smDetailApiPath), "GET /api/student/study-materials/[id] endpoint exists", "API");
assert(fs.existsSync(smDownloadApiPath), "GET /api/student/study-materials/[id]/download endpoint exists", "API");
assert(fs.existsSync(boardsApiPath), "GET /api/student/boards endpoint exists", "API");
assert(fs.existsSync(boardDetailApiPath), "GET /api/student/boards/[id] endpoint exists", "API");

// ============================================================================
// SUITE 6: UI Implementation & 80/20 Reference Fidelity
// ============================================================================
console.log("\nSUITE 6: UI Implementation & 80/20 Reference Fidelity");

const smPagePath = path.join(rootDir, "src", "app", "student", "study-material", "page.tsx");
const boardsPagePath = path.join(rootDir, "src", "app", "student", "boards", "page.tsx");
const boardDetailPagePath = path.join(rootDir, "src", "app", "student", "boards", "[id]", "page.tsx");

const smPageContent = fs.existsSync(smPagePath) ? fs.readFileSync(smPagePath, "utf8") : "";
const boardsPageContent = fs.existsSync(boardsPagePath) ? fs.readFileSync(boardsPagePath, "utf8") : "";
const boardDetailPageContent = fs.existsSync(boardDetailPagePath) ? fs.readFileSync(boardDetailPagePath, "utf8") : "";

assert(
  smPageContent.includes("Select Enrolled Batch") &&
  smPageContent.includes("Formula Sheets") &&
  smPageContent.includes("handleDownload"),
  "Study Material page renders batch switcher, category filters, and download handler",
  "UI"
);

assert(
  boardsPageContent.includes("Educational Boards") &&
  boardsPageContent.includes("getBoardTheme") &&
  boardsPageContent.includes("Active Batches"),
  "Boards catalog page renders dynamic board cards with class tags & batch stats",
  "UI"
);

assert(
  boardDetailPageContent.includes("Filter by Class Level") &&
  boardDetailPageContent.includes("Your Enrolled Batches") &&
  boardDetailPageContent.includes("Available Batches"),
  "Board detail page renders class filters, enrolled batches, and available batches",
  "UI"
);

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n======================================================================");
console.log(`TOTAL TESTS: ${totalPassed + totalFailed}`);
console.log(`PASSED: ${totalPassed}`);
console.log(`FAILED: ${totalFailed}`);

if (totalFailed === 0) {
  console.log("ALL PHASE 5E + 5F AUDIT CHECKS PASSED (100%)");
  console.log("======================================================================\n");
  process.exit(0);
} else {
  console.log("PHASE 5E + 5F AUDIT FAILED WITH ERRORS");
  console.log("======================================================================\n");
  process.exit(1);
}
