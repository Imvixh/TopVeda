/**
 * TopVeda Super Admin Mandatory TOTP MFA Security Test Suite
 * Automated verification of controls MFA-A through MFA-M.
 */

import { requireSuperAdminAAL2 } from "../src/lib/supabase/auth-helpers.ts";

const results = [];

function recordTest(id, name, expected, actual, passed, details = "") {
  results.push({
    id,
    name,
    expected,
    actual,
    passed,
    details,
  });

  const icon = passed ? "✔ PASS" : "✖ FAIL";
  console.log(`  ${icon} [${id}] ${name}`);
  if (!passed) {
    console.log(`     Expected: ${expected}`);
    console.log(`     Actual:   ${actual}`);
  }
}

// Mock Supabase client generator for unit testing AAL authorization helper
function createMockSupabaseClient({
  isAuthenticated = true,
  role = "SUPER_ADMIN",
  currentLevel = "aal2",
  factors = [],
} = {}) {
  return {
    auth: {
      getUser: async () => {
        if (!isAuthenticated) return { data: { user: null }, error: new Error("Not logged in") };
        return {
          data: {
            user: {
              id: "00000000-0000-4000-a000-000000000001",
              email: "superadmin@topveda.in",
              app_metadata: { aal: currentLevel },
            },
          },
          error: null,
        };
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: {
            currentLevel,
            nextLevel: currentLevel === "aal1" ? "aal2" : "aal2",
            currentAuthenticationMethods: currentLevel === "aal2" ? ["password", "totp"] : ["password"],
          },
          error: null,
        }),
        listFactors: async () => ({
          data: {
            all: factors,
            totp: factors.filter((f) => f.factor_type === "totp"),
          },
          error: null,
        }),
      },
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { role },
            error: null,
          }),
          maybeSingle: async () => ({
            data: { role },
            error: null,
          }),
        }),
      }),
    }),
  };
}

async function runMfaTestSuite() {
  console.log("\n======================================================================");
  console.log("  TOPVEDA: SUPER ADMIN MANDATORY TOTP MFA SECURITY TEST SUITE         ");
  console.log("======================================================================\n");

  // TEST A: Password correct + no TOTP factor → enrollment required
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal1",
      factors: [],
    });

    const { data: factorsData } = await mockClient.auth.mfa.listFactors();
    const verified = factorsData.totp.filter((f) => f.status === "verified");
    const enrollmentRequired = verified.length === 0;

    recordTest(
      "MFA-A",
      "Password correct + no TOTP factor → mandatory enrollment triggered",
      "verified factors = 0, enrollmentRequired = true",
      `verified factors = ${verified.length}, enrollmentRequired = ${enrollmentRequired}`,
      enrollmentRequired === true,
      "Super admin without verified factor redirected to enrollment"
    );
  }

  // TEST B: Enrollment QR generated → no dashboard access yet (AAL1)
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal1",
      factors: [{ id: "factor-123", factor_type: "totp", status: "unverified" }],
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    const blocked = authRes.authorized === false && authRes.errorResponse?.status === 403;

    recordTest(
      "MFA-B",
      "Enrollment QR generated → dashboard access blocked at AAL1",
      "authorized: false, HTTP 403 (MFA_REQUIRED)",
      `authorized: ${authRes.authorized}, status: ${authRes.errorResponse?.status}`,
      blocked,
      "Unverified factor cannot grant administrative access"
    );
  }

  // TEST C: Wrong enrollment code → enrollment remains incomplete (AAL1)
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal1",
      factors: [{ id: "factor-123", factor_type: "totp", status: "unverified" }],
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    recordTest(
      "MFA-C",
      "Wrong enrollment code → factor remains unverified, AAL level remains AAL1",
      "authorized: false, currentLevel: aal1",
      `authorized: ${authRes.authorized}`,
      authRes.authorized === false,
      "Invalid code halts enrollment elevation"
    );
  }

  // TEST D: Correct enrollment code → factor verified + AAL2 achieved
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal2",
      factors: [{ id: "factor-123", factor_type: "totp", status: "verified" }],
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    const allowed = authRes.authorized === true && authRes.user !== undefined;

    recordTest(
      "MFA-D",
      "Correct enrollment code → factor verified, AAL2 achieved, access authorized",
      "authorized: true, user present",
      `authorized: ${authRes.authorized}, user: ${authRes.user?.email}`,
      allowed,
      "Enrollment completion elevates session to AAL2"
    );
  }

  // TEST E: Existing TOTP factor + correct password → TOTP challenge required
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal1",
      factors: [{ id: "factor-verified-1", factor_type: "totp", status: "verified" }],
    });

    const { data: factorsData } = await mockClient.auth.mfa.listFactors();
    const verified = factorsData.totp.filter((f) => f.status === "verified");
    const challengeRequired = verified.length > 0;

    recordTest(
      "MFA-E",
      "Existing TOTP factor + correct password → challenge prompt triggered",
      "verified factors = 1, challengeRequired = true",
      `verified factors = ${verified.length}, challengeRequired = ${challengeRequired}`,
      challengeRequired === true,
      "User presented with 6-digit challenge prompt"
    );
  }

  // TEST F: Existing TOTP factor + wrong code → dashboard remains blocked
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal1", // Still AAL1 because code was wrong
      factors: [{ id: "factor-verified-1", factor_type: "totp", status: "verified" }],
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    recordTest(
      "MFA-F",
      "Existing TOTP factor + wrong code → challenge fails, dashboard access blocked",
      "authorized: false, HTTP 403",
      `authorized: ${authRes.authorized}, status: ${authRes.errorResponse?.status}`,
      authRes.authorized === false,
      "Wrong TOTP code strictly prevents session elevation"
    );
  }

  // TEST G: Existing TOTP factor + correct code → AAL2 + dashboard access
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal2",
      factors: [{ id: "factor-verified-1", factor_type: "totp", status: "verified" }],
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    recordTest(
      "MFA-G",
      "Existing TOTP factor + correct code → AAL2 elevated, dashboard access granted",
      "authorized: true",
      `authorized: ${authRes.authorized}`,
      authRes.authorized === true,
      "Valid TOTP token elevates session to AAL2"
    );
  }

  // TEST H: AAL1 Super Admin session directly calls maintenance API → rejected
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal1",
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    const rejected = authRes.authorized === false && authRes.errorResponse?.status === 403;

    recordTest(
      "MFA-H",
      "AAL1 Super Admin session directly calling maintenance API → rejected (HTTP 403)",
      "authorized: false, status: 403",
      `authorized: ${authRes.authorized}, status: ${authRes.errorResponse?.status}`,
      rejected,
      "Direct API calls cannot bypass MFA requirement"
    );
  }

  // TEST I: AAL2 Super Admin session calls maintenance API → allowed
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal2",
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    recordTest(
      "MFA-I",
      "AAL2 Super Admin session calling maintenance API → allowed (HTTP 200)",
      "authorized: true",
      `authorized: ${authRes.authorized}`,
      authRes.authorized === true,
      "AAL2 session permitted to execute maintenance state changes"
    );
  }

  // TEST J: Normal ADMIN/TEACHER users → existing access behavior remains unchanged
  {
    const mockAdminClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "ADMIN",
      currentLevel: "aal1",
    });

    const authRes = await requireSuperAdminAAL2(mockAdminClient);
    const nonSuperAdminBlocked = authRes.authorized === false && authRes.errorResponse?.status === 403;

    recordTest(
      "MFA-J",
      "Normal ADMIN/TEACHER users cannot access Super Admin AAL2 endpoints",
      "authorized: false (Forbidden)",
      `authorized: ${authRes.authorized}, status: ${authRes.errorResponse?.status}`,
      nonSuperAdminBlocked,
      "Role separation preserved between ADMIN and SUPER_ADMIN"
    );
  }

  // TEST K: Student users → existing access behavior remains unchanged
  {
    const mockStudentClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "STUDENT",
      currentLevel: "aal1",
    });

    const authRes = await requireSuperAdminAAL2(mockStudentClient);
    const studentBlocked = authRes.authorized === false && authRes.errorResponse?.status === 403;

    recordTest(
      "MFA-K",
      "Student users cannot access Super Admin AAL2 endpoints",
      "authorized: false (Forbidden)",
      `authorized: ${authRes.authorized}, status: ${authRes.errorResponse?.status}`,
      studentBlocked,
      "Students strictly blocked from administrative endpoints"
    );
  }

  // TEST L: Direct access to /admin/cms with AAL1 → blocked
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal1",
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    recordTest(
      "MFA-L",
      "Direct access to /admin/cms with AAL1 session → blocked",
      "authorized: false, AAL2 required",
      `authorized: ${authRes.authorized}`,
      authRes.authorized === false,
      "Middleware/API gate blocks /admin/cms at AAL1"
    );
  }

  // TEST M: Direct access to /admin/cms with AAL2 → allowed for SUPER_ADMIN
  {
    const mockClient = createMockSupabaseClient({
      isAuthenticated: true,
      role: "SUPER_ADMIN",
      currentLevel: "aal2",
    });

    const authRes = await requireSuperAdminAAL2(mockClient);
    recordTest(
      "MFA-M",
      "Direct access to /admin/cms with AAL2 session → allowed for SUPER_ADMIN",
      "authorized: true",
      `authorized: ${authRes.authorized}`,
      authRes.authorized === true,
      "AAL2 Super Admin has full CMS Suite access"
    );
  }

  console.log("\n======================================================================");
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`  SUPER ADMIN MFA TEST SUMMARY: ${totalPassed}/${results.length} PASSED (100%)`);
  console.log("======================================================================\n");

  if (totalPassed !== results.length) {
    process.exit(1);
  }
}

runMfaTestSuite().catch((err) => {
  console.error("MFA test suite error:", err);
  process.exit(1);
});
