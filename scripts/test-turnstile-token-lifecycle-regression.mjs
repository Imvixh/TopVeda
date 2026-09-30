/**
 * TopVeda Turnstile Token Lifecycle Regression Test
 * Verifies single-use token consumption, reset behavior, and token refresh.
 */

import { validateTurnstileToken } from "../src/lib/utils/security.ts";

async function runRegressionTest() {
  console.log("\n======================================================================");
  console.log("  TOPVEDA: TURNSTILE SINGLE-USE TOKEN LIFECYCLE REGRESSION TEST       ");
  console.log("======================================================================\n");

  const results = [];

  function record(id, name, passed, details = "") {
    results.push({ id, name, passed, details });
    const icon = passed ? "✔ PASS" : "✖ FAIL";
    console.log(`  ${icon} [${id}] ${name}`);
    if (details) console.log(`     Details: ${details}`);
  }

  // TEST STEP 1: Obtain & Submit Token A for first login attempt
  const tokenA = `test-turnstile-token-pass-lifecycle-A-${Date.now()}`;
  const firstAttempt = await validateTurnstileToken(tokenA, "127.0.0.1");
  record(
    "LIFECYCLE-001",
    "First login attempt consumes Token A successfully",
    firstAttempt.success === true,
    `success: ${firstAttempt.success}`
  );

  // TEST STEP 2: Simulate second login attempt reusing Token A without widget reset
  const secondAttempt = await validateTurnstileToken(tokenA, "127.0.0.1");
  const replayBlocked = secondAttempt.success === false && secondAttempt.error?.includes("already been used");
  record(
    "LIFECYCLE-002",
    "Token A reuse is strictly rejected by server replay defense",
    replayBlocked,
    `error: "${secondAttempt.error}"`
  );

  // TEST STEP 3: Simulate widget reset issuing fresh Token B for subsequent login attempt
  const tokenB = `test-turnstile-token-pass-lifecycle-B-${Date.now()}`;
  const thirdAttempt = await validateTurnstileToken(tokenB, "127.0.0.1");
  record(
    "LIFECYCLE-003",
    "Post-reset login attempt succeeds with fresh Token B",
    thirdAttempt.success === true,
    `success: ${thirdAttempt.success}`
  );

  // TEST STEP 4: Verify Token B is also single-use and cannot be submitted again
  const fourthAttempt = await validateTurnstileToken(tokenB, "127.0.0.1");
  const tokenBReplayBlocked = fourthAttempt.success === false && fourthAttempt.error?.includes("already been used");
  record(
    "LIFECYCLE-004",
    "Token B is single-use and blocked on immediate re-submission",
    tokenBReplayBlocked,
    `error: "${fourthAttempt.error}"`
  );

  console.log("\n======================================================================");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`  REGRESSION TEST SUMMARY: ${passedCount}/${results.length} PASSED (${Math.round((passedCount / results.length) * 100)}%)`);
  console.log("======================================================================\n");

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runRegressionTest().catch((err) => {
  console.error("Regression test crashed:", err);
  process.exit(1);
});
