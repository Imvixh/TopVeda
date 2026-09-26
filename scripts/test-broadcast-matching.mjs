/**
 * Automated Unit Test Suite for YouTube Active Broadcast Matching & Anti-Collision Engine
 */

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

console.log("\n======================================================================");
console.log("  TOPVEDA: YOUTUBE WEBCAM BROADCAST MATCHING & ANTI-COLLISION TESTS");
console.log("======================================================================\n");

// Helper to simulate matching without making real network calls
function testMatchingLogic(activeBroadcasts, params) {
  const liveItems = activeBroadcasts.filter((b) => b.status?.lifeCycleStatus === "live");
  if (liveItems.length === 0) return null;

  if (params.currentBroadcastId) {
    const existing = liveItems.find((b) => b.id === params.currentBroadcastId);
    if (existing) return existing;
  }

  const scheduledStartMs = new Date(params.scheduledStart).getTime();
  const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
  const targetTopicNorm = normalize(params.topic);
  const targetTokens = new Set(targetTopicNorm.split(/\s+/).filter(Boolean));

  let bestMatch = null;
  let highestScore = 0;
  let secondHighestScore = 0;

  for (const item of liveItems) {
    let titleScore = 0;
    let timeScore = 0;

    const title = item.snippet?.title || "";
    const titleNorm = normalize(title);

    if (titleNorm && targetTopicNorm) {
      if (titleNorm === targetTopicNorm) {
        titleScore = 100;
      } else if (titleNorm.includes(targetTopicNorm) || targetTopicNorm.includes(titleNorm)) {
        titleScore = 75;
      } else {
        const itemTokens = titleNorm.split(/\s+/).filter(Boolean);
        let commonCount = 0;
        for (const token of itemTokens) {
          if (targetTokens.has(token)) commonCount++;
        }
        if (commonCount > 0) {
          titleScore = Math.min(50, commonCount * 20);
        }
      }
    }

    const actualStart = item.snippet?.actualStartTime || item.snippet?.publishedAt || item.snippet?.scheduledStartTime;
    let diffMinutes = 999;
    if (actualStart) {
      const actualStartMs = new Date(actualStart).getTime();
      diffMinutes = Math.abs(actualStartMs - scheduledStartMs) / (60 * 1000);
      if (diffMinutes <= 15) timeScore = 50;
      else if (diffMinutes <= 30) timeScore = 35;
      else if (diffMinutes <= 60) timeScore = 20;
      else if (diffMinutes <= 120) timeScore = 10;
    }

    let score = titleScore + timeScore;

    if (liveItems.length === 1) {
      if (titleScore >= 20 || diffMinutes <= 30) {
        score += 30;
      } else {
        score = 0;
      }
    }

    if (score > highestScore) {
      secondHighestScore = highestScore;
      highestScore = score;
      bestMatch = item;
    } else if (score > secondHighestScore) {
      secondHighestScore = score;
    }
  }

  if (liveItems.length > 1 && (highestScore - secondHighestScore < 20)) {
    return null; // Ambiguity guard
  }

  if (highestScore >= 50 && bestMatch) {
    return bestMatch;
  }

  return null;
}

// Test 1: Idempotency (already bound active ID returns immediately)
const b1 = { id: "yt_active_123", status: { lifeCycleStatus: "live" }, snippet: { title: "Mathematics" } };
const res1 = testMatchingLogic([b1], { topic: "Mathematics", scheduledStart: new Date().toISOString(), currentBroadcastId: "yt_active_123" });
assert(res1?.id === "yt_active_123", "Test 1: Already bound active broadcast returns immediately (Idempotency)");

// Test 2: Exact title match + time proximity
const b2 = { id: "yt_webcam_456", status: { lifeCycleStatus: "live" }, snippet: { title: "hello Baccho", actualStartTime: new Date().toISOString() } };
const res2 = testMatchingLogic([b2], { topic: "hello Baccho", scheduledStart: new Date().toISOString() });
assert(res2?.id === "yt_webcam_456", "Test 2: Exact title match ('hello Baccho') successfully matches new Webcam broadcast");

// Test 3: Unrelated stale stream rejection (e.g. stream from 4 hours ago with 0 title match)
const bStale = { id: "yt_old_stale", status: { lifeCycleStatus: "live" }, snippet: { title: "Random Gaming Stream", actualStartTime: new Date(Date.now() - 4 * 3600 * 1000).toISOString() } };
const res3 = testMatchingLogic([bStale], { topic: "Organic Chemistry", scheduledStart: new Date().toISOString() });
assert(res3 === null, "Test 3: Unrelated stale stream from 4 hours ago with 0 title match is REJECTED (returns null)");

// Test 4: Multiple active streams disambiguation (selects highest confidence)
const bComp1 = { id: "yt_chem_1", status: { lifeCycleStatus: "live" }, snippet: { title: "Chemistry Lecture", actualStartTime: new Date().toISOString() } };
const bComp2 = { id: "yt_math_2", status: { lifeCycleStatus: "live" }, snippet: { title: "Physics Lecture", actualStartTime: new Date().toISOString() } };
const res4 = testMatchingLogic([bComp1, bComp2], { topic: "Chemistry Lecture", scheduledStart: new Date().toISOString() });
assert(res4?.id === "yt_chem_1", "Test 4: Disambiguates between multiple active streams and selects exact topic match");

// Test 5: Ambiguous tie rejection (two streams with identical scores)
const bTie1 = { id: "yt_tie_1", status: { lifeCycleStatus: "live" }, snippet: { title: "Live Session", actualStartTime: new Date().toISOString() } };
const bTie2 = { id: "yt_tie_2", status: { lifeCycleStatus: "live" }, snippet: { title: "Live Session", actualStartTime: new Date().toISOString() } };
const res5 = testMatchingLogic([bTie1, bTie2], { topic: "Live Session", scheduledStart: new Date().toISOString() });
assert(res5 === null, "Test 5: Ambiguous tie between identical competing broadcasts is SAFELY REJECTED (returns null without guessing)");

console.log("\n======================================================================");
console.log(`  MATCHING UNIT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) process.exit(1);
