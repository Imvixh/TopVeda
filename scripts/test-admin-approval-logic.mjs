/**
 * TopVeda Admin Approval & Registration Lifecycle Unit Tests
 * Verifies all states, role restrictions, and callbacks without requiring network.
 */

let passed = 0;
let failed = 0;

function assert(condition, testName, detail = "") {
  if (condition) {
    console.log(`  ✔ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ✖ FAIL: ${testName}`);
    if (detail) console.log(`     Detail: ${detail}`);
    failed++;
  }
}

console.log("\n======================================================================");
console.log("  TOPVEDA: ADMIN APPROVAL & PORTAL INTEGRITY TEST SUITE");
console.log("======================================================================\n");

// --- 1. Callback Redirection Matrix ---
console.log("1. Callback Redirection Logic");
function resolveCallbackRedirect(userRole, baseOrigin, nextParam) {
  if (nextParam) return `${baseOrigin}${nextParam}`;
  if (userRole === "ADMIN") {
    return `${baseOrigin}/admin?step=upload&email_verified=true`;
  }
  return `${baseOrigin}/student`;
}

const baseOrigin = "https://topveda.in";

assert(
  resolveCallbackRedirect("ADMIN", baseOrigin) === "https://topveda.in/admin?step=upload&email_verified=true",
  "Admin verified email redirects to /admin upload step"
);

assert(
  resolveCallbackRedirect("STUDENT", baseOrigin) === "https://topveda.in/student",
  "Student verified email redirects to /student (undisturbed)"
);

assert(
  resolveCallbackRedirect("ADMIN", baseOrigin, "/custom-dest") === "https://topveda.in/custom-dest",
  "Explicit safe next parameter takes precedence"
);

// --- 2. Admin Foundation State Machine ---
console.log("\n2. Admin Foundation Page Status Gating");
function computeAdminFoundationView(user, profile, application) {
  if (!user) return "AUTH_VIEW";
  if (profile?.role === "STUDENT") return "ACCESS_RESTRICTED_STUDENT";
  if (profile?.role === "SUPER_ADMIN") return "ADMIN_WORKSPACE_SUPER_ADMIN";
  
  if (profile?.role === "ADMIN") {
    if (!application) return "INCOMPLETE_UPLOAD_DOC";
    if (application.status === "PENDING") return "PENDING_APPROVAL_SCREEN";
    if (application.status === "REJECTED") return "REJECTED_SCREEN";
    if (application.status === "APPROVED") return "ADMIN_WORKSPACE";
  }
  return "UNKNOWN";
}

assert(
  computeAdminFoundationView(null, null, null) === "AUTH_VIEW",
  "Unauthenticated visitor sees AdminAuthView"
);

assert(
  computeAdminFoundationView({ id: "user-1" }, { role: "STUDENT" }, null) === "ACCESS_RESTRICTED_STUDENT",
  "Student signed in at /admin is shown Access Restricted"
);

assert(
  computeAdminFoundationView({ id: "user-2" }, { role: "ADMIN" }, null) === "INCOMPLETE_UPLOAD_DOC",
  "Admin who registered without document upload sees Incomplete / Upload Document"
);

assert(
  computeAdminFoundationView({ id: "user-3" }, { role: "ADMIN" }, { status: "PENDING" }) === "PENDING_APPROVAL_SCREEN",
  "Admin with pending application is blocked at Pending Approval screen (no workspace leak)"
);

assert(
  computeAdminFoundationView({ id: "user-4" }, { role: "ADMIN" }, { status: "REJECTED" }) === "REJECTED_SCREEN",
  "Admin with rejected application is blocked at Rejected screen"
);

assert(
  computeAdminFoundationView({ id: "user-5" }, { role: "ADMIN" }, { status: "APPROVED" }) === "ADMIN_WORKSPACE",
  "Only admin with APPROVED application reaches the Admin Foundation Workspace"
);

assert(
  computeAdminFoundationView({ id: "user-6" }, { role: "SUPER_ADMIN" }, null) === "ADMIN_WORKSPACE_SUPER_ADMIN",
  "Super Admin reaches the Admin Workspace"
);

// --- 3. Portal Enforcement Matrix ---
console.log("\n3. Portal Boundary Enforcement");
function enforceLoginPortal(userRole, expectedPortal) {
  if (expectedPortal === "student") {
    if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
      return { success: false, error: "Invalid user. Please use Admin Sign In." };
    }
  } else if (expectedPortal === "admin") {
    if (userRole === "SUPER_ADMIN") {
      return { success: false, error: "Invalid credentials. Unauthorized access." };
    }
    if (userRole === "STUDENT") {
      return { success: false, error: "Invalid user. Please use Student Sign In." };
    }
  }
  return { success: true, role: userRole };
}

assert(
  enforceLoginPortal("STUDENT", "student").success === true,
  "Student logging into student portal succeeds"
);

assert(
  enforceLoginPortal("ADMIN", "student").success === false &&
  enforceLoginPortal("ADMIN", "student").error === "Invalid user. Please use Admin Sign In.",
  "Admin logging into student portal is rejected"
);

assert(
  enforceLoginPortal("STUDENT", "admin").success === false &&
  enforceLoginPortal("STUDENT", "admin").error === "Invalid user. Please use Student Sign In.",
  "Student logging into admin portal is rejected"
);

assert(
  enforceLoginPortal("SUPER_ADMIN", "admin").success === false &&
  enforceLoginPortal("SUPER_ADMIN", "admin").error === "Invalid credentials. Unauthorized access.",
  "Super Admin logging into normal admin portal is rejected (must use /super-admin)"
);

assert(
  enforceLoginPortal("ADMIN", "admin").success === true,
  "Admin logging into admin portal is authenticated to show application status"
);

// --- 4. Sub-route Middleware Verification ---
console.log("\n4. Middleware Sub-route Verification");
function middlewareCheck(pathname, userRole, application) {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (userRole === "STUDENT") return { action: "REDIRECT", destination: "/student?error=unauthorized" };
    if (userRole === "ADMIN") {
      if (pathname.startsWith("/admin/cms") || pathname.startsWith("/admin/applications")) {
        return { action: "REDIRECT", destination: "/admin" };
      }
      if (pathname.startsWith("/admin/")) {
        if (!application || application.status !== "APPROVED") {
          return { action: "REDIRECT", destination: "/admin?error=pending" };
        }
      }
    }
  }
  return { action: "PASS" };
}

assert(
  middlewareCheck("/admin/classes", "ADMIN", { status: "PENDING" }).destination === "/admin?error=pending",
  "Pending admin accessing /admin/classes is redirected to /admin?error=pending"
);

assert(
  middlewareCheck("/admin/cms/batches", "ADMIN", { status: "APPROVED" }).destination === "/admin",
  "Approved normal admin accessing /admin/cms is redirected to /admin"
);

assert(
  middlewareCheck("/admin/classes", "ADMIN", { status: "APPROVED" }).action === "PASS",
  "Approved admin accessing /admin/classes passes through"
);

assert(
  middlewareCheck("/admin", "ADMIN", { status: "PENDING" }).action === "PASS",
  "Pending admin accessing /admin passes to page.tsx to render pending screen"
);

// --- 5. Summary ---
console.log("\n======================================================================");
console.log(`  RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) process.exit(1);

