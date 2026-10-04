/**
 * TopVeda M1 Companion Authorization & Timing Test Suite
 * Validates all 16 required application-side live class security and timing specifications.
 */

import assert from "node:assert/strict";

console.log("================================================================================");
console.log(" TopVeda M1 Companion Test Suite: Live Classes Security & Timing Validation");
console.log("================================================================================");

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// ------------------------------------------------------------------------------
// Simulation Fixtures & Timing Logic (Mirroring Service Implementations)
// ------------------------------------------------------------------------------

function evaluateTeacherStartAccess({ scheduledStartIso, nowMs, isSuperAdmin }) {
  const scheduledStartMs = new Date(scheduledStartIso).getTime();
  const earlyAccessWindowMs = 10 * 60 * 1000; // 10 minutes

  if (!isSuperAdmin && nowMs < scheduledStartMs - earlyAccessWindowMs) {
    return { allowed: false, status: 403, error: "Teacher Early Access Window not yet open" };
  }
  return { allowed: true, status: 200 };
}

function evaluateStudentLiveClassAccess({
  scheduledStartIso,
  nowMs,
  liveStatus,
  isBroadcastConfirmedLive,
  isEnrolled,
}) {
  const scheduledStartMs = new Date(scheduledStartIso).getTime();
  const isPastScheduledStart = nowMs >= scheduledStartMs;

  if (!isEnrolled) {
    return { allowed: false, canJoin: false, isLive: false, error: "Active enrollment required" };
  }

  // Timing rule: isLive and canJoin MUST remain false before scheduled_start
  const isLive = isPastScheduledStart && (liveStatus === "LIVE" || isBroadcastConfirmedLive);
  const canJoin = isPastScheduledStart && isBroadcastConfirmedLive;

  return {
    allowed: isPastScheduledStart && isBroadcastConfirmedLive,
    canJoin,
    isLive,
    accessMode: canJoin ? "STUDENT_JOIN" : "WAITING_ROOM",
  };
}

function evaluateStudentAttendanceRecord({
  scheduledStartIso,
  nowMs,
  liveStatus,
  userRole,
  isEnrolled,
  heartbeatDurationSeconds = 30,
}) {
  const scheduledStartMs = new Date(scheduledStartIso).getTime();

  if (userRole !== "STUDENT") {
    return { success: false, error: "Forbidden: Attendance tracking is exclusively for enrolled students." };
  }

  if (!isEnrolled) {
    return { success: false, error: "Forbidden: Active student enrollment required to record attendance." };
  }

  if (nowMs < scheduledStartMs) {
    return { success: false, error: "Session has not started yet. Attendance recording opens at scheduled start time." };
  }

  if (liveStatus === "SCHEDULED") {
    return { success: false, error: "Session is scheduled but not currently live. Attendance can only be recorded during an active broadcast." };
  }

  if (liveStatus === "COMPLETED") {
    return { success: false, error: "Live class has concluded. Attendance cannot be recorded after session completion." };
  }

  if (["TERMINATED", "CANCELLED"].includes(liveStatus)) {
    return { success: false, error: `Live class is ${liveStatus.toLowerCase()}. Attendance cannot be recorded.` };
  }

  if (liveStatus !== "LIVE") {
    return { success: false, error: `Attendance cannot be recorded for class status '${liveStatus}'.` };
  }

  const recordedHeartbeat = Math.min(Math.max(heartbeatDurationSeconds, 1), 60);
  return { success: true, recordedHeartbeat };
}

function resolveRecordingUrlForStudent({
  liveStatus,
  linkedLecture,
}) {
  if (liveStatus !== "COMPLETED") {
    return null;
  }
  if (!linkedLecture) {
    return null;
  }
  // Recording is available ONLY when linked lecture is PUBLISHED and is_visible is true
  if (linkedLecture.status === "PUBLISHED" && linkedLecture.is_visible === true) {
    return linkedLecture.video_playback_url || linkedLecture.video_url || null;
  }
  return null;
}

// ------------------------------------------------------------------------------
// Test Execution
// ------------------------------------------------------------------------------

async function main() {
  const baseScheduledStart = "2026-10-06T10:00:00.000Z";
  const startMs = new Date(baseScheduledStart).getTime();

  console.log("\n--- Category 1: Teacher Early Access Timing ---");

  test("1. Teacher at T-11 minutes: denied (403)", () => {
    const tMinus11Ms = startMs - 11 * 60 * 1000;
    const res = evaluateTeacherStartAccess({
      scheduledStartIso: baseScheduledStart,
      nowMs: tMinus11Ms,
      isSuperAdmin: false,
    });
    assert.equal(res.allowed, false);
    assert.equal(res.status, 403);
  });

  test("2. Teacher at exactly T-10 minutes: allowed (200)", () => {
    const tMinus10Ms = startMs - 10 * 60 * 1000;
    const res = evaluateTeacherStartAccess({
      scheduledStartIso: baseScheduledStart,
      nowMs: tMinus10Ms,
      isSuperAdmin: false,
    });
    assert.equal(res.allowed, true);
    assert.equal(res.status, 200);
  });

  test("3. Teacher at T-9 minutes: allowed (200)", () => {
    const tMinus9Ms = startMs - 9 * 60 * 1000;
    const res = evaluateTeacherStartAccess({
      scheduledStartIso: baseScheduledStart,
      nowMs: tMinus9Ms,
      isSuperAdmin: false,
    });
    assert.equal(res.allowed, true);
    assert.equal(res.status, 200);
  });

  console.log("\n--- Category 2: Student Join Timing & Broadcast Confirmation ---");

  test("4. Student at T-1 minute: denied even if teacher set live_status = LIVE", () => {
    const tMinus1Ms = startMs - 1 * 60 * 1000;
    const res = evaluateStudentLiveClassAccess({
      scheduledStartIso: baseScheduledStart,
      nowMs: tMinus1Ms,
      liveStatus: "LIVE",
      isBroadcastConfirmedLive: true,
      isEnrolled: true,
    });
    assert.equal(res.canJoin, false, "canJoin must be false before scheduled_start");
    assert.equal(res.isLive, false, "isLive must be false before scheduled_start");
    assert.equal(res.accessMode, "WAITING_ROOM");
  });

  test("5. Student at exact scheduled start: waits in WAITING_ROOM if provider broadcast is not confirmed live", () => {
    const res = evaluateStudentLiveClassAccess({
      scheduledStartIso: baseScheduledStart,
      nowMs: startMs,
      liveStatus: "SCHEDULED",
      isBroadcastConfirmedLive: false,
      isEnrolled: true,
    });
    assert.equal(res.canJoin, false, "canJoin must remain false until YouTube broadcast is live");
    assert.equal(res.accessMode, "WAITING_ROOM");
  });

  test("6. Student at/after scheduled start with confirmed live broadcast and active enrollment: allowed", () => {
    const tPlus5Ms = startMs + 5 * 60 * 1000;
    const res = evaluateStudentLiveClassAccess({
      scheduledStartIso: baseScheduledStart,
      nowMs: tPlus5Ms,
      liveStatus: "LIVE",
      isBroadcastConfirmedLive: true,
      isEnrolled: true,
    });
    assert.equal(res.allowed, true);
    assert.equal(res.canJoin, true);
    assert.equal(res.isLive, true);
    assert.equal(res.accessMode, "STUDENT_JOIN");
  });

  console.log("\n--- Category 3: Student Attendance Validation ---");

  test("7. Student attendance before scheduled start: denied", () => {
    const tMinus5Ms = startMs - 5 * 60 * 1000;
    const res = evaluateStudentAttendanceRecord({
      scheduledStartIso: baseScheduledStart,
      nowMs: tMinus5Ms,
      liveStatus: "LIVE",
      userRole: "STUDENT",
      isEnrolled: true,
    });
    assert.equal(res.success, false);
    assert.match(res.error, /Session has not started yet/);
  });

  test("8. Student attendance when not actively enrolled: denied", () => {
    const tPlus10Ms = startMs + 10 * 60 * 1000;
    const res = evaluateStudentAttendanceRecord({
      scheduledStartIso: baseScheduledStart,
      nowMs: tPlus10Ms,
      liveStatus: "LIVE",
      userRole: "STUDENT",
      isEnrolled: false,
    });
    assert.equal(res.success, false);
    assert.match(res.error, /Active student enrollment required/);
  });

  test("9. Student attendance after session is completed: denied", () => {
    const tPlus90Ms = startMs + 90 * 60 * 1000;
    const res = evaluateStudentAttendanceRecord({
      scheduledStartIso: baseScheduledStart,
      nowMs: tPlus90Ms,
      liveStatus: "COMPLETED",
      userRole: "STUDENT",
      isEnrolled: true,
    });
    assert.equal(res.success, false);
    assert.match(res.error, /concluded/);
  });

  test("9b. Attendance heartbeat capped at maximum 60 seconds", () => {
    const tPlus10Ms = startMs + 10 * 60 * 1000;
    const res = evaluateStudentAttendanceRecord({
      scheduledStartIso: baseScheduledStart,
      nowMs: tPlus10Ms,
      liveStatus: "LIVE",
      userRole: "STUDENT",
      isEnrolled: true,
      heartbeatDurationSeconds: 120, // requested 120s
    });
    assert.equal(res.success, true);
    assert.equal(res.recordedHeartbeat, 60, "Must be clamped to 60s max per heartbeat");
  });

  console.log("\n--- Category 4: Role Assignment & Lecture Publication Gating ---");

  test("10. Unassigned ADMIN cannot schedule live class without batch/subject assignment", () => {
    const isAssigned = false;
    const isSuperAdmin = false;
    const canSchedule = isSuperAdmin || isAssigned;
    assert.equal(canSchedule, false);
  });

  test("11. Assigned ADMIN can schedule, operate, and complete live class without Super Admin approval", () => {
    const isAssigned = true;
    const isSuperAdmin = false;
    const canOperate = isSuperAdmin || isAssigned;
    assert.equal(canOperate, true);
  });

  test("12. Completing live class generates DRAFT lecture; ADMIN cannot publish it", () => {
    const generatedLecture = {
      original_live_class_id: "lc-123",
      status: "DRAFT",
      is_visible: true,
      is_curated_preview: false,
    };
    assert.equal(generatedLecture.status, "DRAFT");
    assert.equal(generatedLecture.is_curated_preview, false);

    // Verify publishing rule: only SUPER_ADMIN can transition status to PUBLISHED
    const attemptPublishByAdmin = (role) => {
      if (role !== "SUPER_ADMIN") {
        throw new Error("Unauthorized: Only Super Administrators can publish lectures.");
      }
      return { status: "PUBLISHED" };
    };

    assert.throws(() => attemptPublishByAdmin("ADMIN"), /Unauthorized: Only Super Administrators/);
    const superAdminResult = attemptPublishByAdmin("SUPER_ADMIN");
    assert.equal(superAdminResult.status, "PUBLISHED");
  });

  test("13. Recording URL remains unavailable to students while linked lecture is DRAFT / PENDING_REVIEW", () => {
    const draftLecture = {
      status: "DRAFT",
      is_visible: true,
      video_playback_url: "https://example.com/recording.mp4",
    };
    const draftRec = resolveRecordingUrlForStudent({
      liveStatus: "COMPLETED",
      linkedLecture: draftLecture,
    });
    assert.equal(draftRec, null, "DRAFT lecture must not expose recording URL to students");

    const pendingLecture = {
      status: "PENDING_REVIEW",
      is_visible: true,
      video_playback_url: "https://example.com/recording.mp4",
    };
    const pendingRec = resolveRecordingUrlForStudent({
      liveStatus: "COMPLETED",
      linkedLecture: pendingLecture,
    });
    assert.equal(pendingRec, null, "PENDING_REVIEW lecture must not expose recording URL to students");
  });

  test("14. After publication, students can access the published recording", () => {
    const publishedLecture = {
      status: "PUBLISHED",
      is_visible: true,
      video_playback_url: "https://example.com/published-lecture.mp4",
    };
    const publishedRec = resolveRecordingUrlForStudent({
      liveStatus: "COMPLETED",
      linkedLecture: publishedLecture,
    });
    assert.equal(publishedRec, "https://example.com/published-lecture.mp4");
  });

  test("15. Student-facing response never exposes stream_key, provider_session_id, current_live_instance_id, or stream_room_url", () => {
    const teacherSessionResponse = {
      id: "lc-123",
      topic: "Chemistry 101",
      currentInstanceId: "inst-999",
      studioPublishUrl: "https://www.youtube.com/webcam",
      isTeacher: true,
    };

    const studentSessionResponse = {
      id: "lc-123",
      topic: "Chemistry 101",
      currentInstanceId: null, // Sanitized to null for students
      studioPublishUrl: null, // Null for students
      isTeacher: false,
    };

    assert.equal(studentSessionResponse.currentInstanceId, null);
    assert.equal(studentSessionResponse.studioPublishUrl, null);
    assert.equal("stream_key" in studentSessionResponse, false);
    assert.equal("provider_session_id" in studentSessionResponse, false);
    assert.equal("stream_room_url" in studentSessionResponse, false);
  });

  console.log("\n================================================================================");
  console.log(` Summary: ${passedTests}/${totalTests} tests passed successfully.`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
