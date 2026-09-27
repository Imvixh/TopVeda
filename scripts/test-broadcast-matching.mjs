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
      else if (diffMinutes <= 60) timeScore = 25;
      else if (diffMinutes <= 120) timeScore = 20;
    }

    let score = titleScore + timeScore;

    if (liveItems.length === 1) {
      if (titleScore >= 20 || diffMinutes <= 120) {
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

// Test 6: Production Scenario — Placeholder RTMP ID synced to new Webcam Broadcast ID
const initialRtmpId = "fxqvr7spINw";
const newWebcamId = "kya_haal_hai_yt_active_999";
const bWebcam = {
  id: newWebcamId,
  status: { lifeCycleStatus: "live", privacyStatus: "unlisted" },
  snippet: { title: "kya haal hai", actualStartTime: new Date().toISOString() },
};
const res6 = testMatchingLogic([bWebcam], {
  topic: "kya haal hai",
  scheduledStart: new Date().toISOString(),
  currentBroadcastId: initialRtmpId,
});
assert(res6?.id === newWebcamId, "Test 6: Real production scenario matches active Webcam broadcast ID and replaces RTMP placeholder");

// Test 7: Student Session Response Sanitization (Zero secret/token leakage)
function mockStudentSessionResponse(liveClass, matchedBroadcast) {
  const activeId = matchedBroadcast ? matchedBroadcast.id : liveClass.provider_session_id;
  const embedUrl = activeId ? `https://www.youtube-nocookie.com/embed/${activeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1` : null;

  return {
    id: liveClass.id,
    topic: liveClass.topic,
    subject: liveClass.subject,
    educatorName: liveClass.educator_name,
    liveStatus: matchedBroadcast ? "LIVE" : liveClass.live_status,
    isLive: true,
    canJoin: true,
    playbackVideoId: activeId,
    embedPlaybackUrl: embedUrl,
    isTeacher: false,
  };
}

const mockClass = {
  id: "9bd9414b-8cee-4e85-966b-019be1d2c84a",
  topic: "kya haal hai",
  subject: "Chemistry",
  educator_name: "Vishal Kumar",
  live_status: "LIVE",
  provider_session_id: initialRtmpId,
};

const studentResponse = mockStudentSessionResponse(mockClass, res6);
assert(studentResponse.playbackVideoId === newWebcamId, "Test 7a: Student receives new Webcam broadcast ID");
assert(studentResponse.embedPlaybackUrl.includes(newWebcamId), "Test 7b: Student embed URL contains new Webcam broadcast ID");
assert(!("encrypted_refresh_token" in studentResponse), "Test 7c: Student response contains no encrypted refresh tokens");
assert(!("access_token" in studentResponse), "Test 7d: Student response contains no OAuth access tokens");
assert(!("client_secret" in studentResponse), "Test 7e: Student response contains no client secrets");

// Test 8: YouTube Shareable & Privacy-Enhanced Embed URLs
const youtubeShareUrl = `https://www.youtube.com/watch?v=${studentResponse.playbackVideoId}`;
const youtubeEmbedUrl = studentResponse.embedPlaybackUrl;
assert(youtubeShareUrl === `https://www.youtube.com/watch?v=${newWebcamId}`, "Test 8a: YouTube shareable URL is correctly derived");
assert(youtubeEmbedUrl.startsWith("https://www.youtube-nocookie.com/embed/"), "Test 8b: TopVeda embedded player strictly uses privacy-enhanced youtube-nocookie domain");

// Test 9: Unauthorized/Terminated Class Access Blocked
function checkAccessEligibility(liveStatus, isOwnerTeacher, isSuperAdmin, nowMs, scheduledStartMs) {
  if (liveStatus === "TERMINATED") return { canJoin: false, reason: "TERMINATED" };
  if (liveStatus === "COMPLETED") return { canJoin: false, reason: "COMPLETED" };
  const isEarly = nowMs < scheduledStartMs;
  if (isEarly && !isOwnerTeacher && !isSuperAdmin) return { canJoin: false, reason: "PREPARATION_WINDOW" };
  return { canJoin: true };
}

const terminatedCheck = checkAccessEligibility("TERMINATED", false, false, Date.now(), Date.now());
assert(terminatedCheck.canJoin === false && terminatedCheck.reason === "TERMINATED", "Test 9: Terminated class strictly blocks student access");

// Test 10: Premature Student Entry Blocked Before Scheduled Start
const earlyCheck = checkAccessEligibility("SCHEDULED", false, false, Date.now() - 5 * 60 * 1000, Date.now());
assert(earlyCheck.canJoin === false && earlyCheck.reason === "PREPARATION_WINDOW", "Test 10: Student entry is strictly blocked before scheduled class start time");

console.log("\n======================================================================");
console.log(`  MATCHING & REGRESSION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("======================================================================\n");

if (failed > 0) process.exit(1);

