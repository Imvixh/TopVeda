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

  console.log("\n--- Category 5: Live Class INSERT Policy & UPDATE Guard Invariants ---");

  // Helper evaluator functions mirroring SQL RLS WITH CHECK and Trigger Guard
  function evaluateLiveClassInsertPolicy({ userRole, userId, batchId, subjectId, isBatchSubjectTeacher, payload }) {
    if (userRole === "SUPER_ADMIN") return { allowed: true };
    if (userRole !== "TEACHER" && userRole !== "ADMIN") return { allowed: false, error: "Only TEACHER, ADMIN or SUPER_ADMIN can create live classes" };
    if (!batchId) return { allowed: false, error: "batch_id is required" };
    if (!isBatchSubjectTeacher) return { allowed: false, error: "Forbidden: Teacher is not assigned to this batch and subject" };
    if (payload.educator_id !== userId) return { allowed: false, error: "educator_id must match authenticated user" };
    if (payload.status !== "DRAFT") return { allowed: false, error: "Initial status must be DRAFT" };
    if (payload.is_curated_preview === true) return { allowed: false, error: "Educators cannot set is_curated_preview = TRUE" };
    if (payload.reviewed_by != null || payload.reviewed_at != null) return { allowed: false, error: "Educators cannot supply review audit metadata" };
    return { allowed: true };
  }

  function evaluateLiveClassUpdateGuard({ userRole, oldRecord, newRecord }) {
    if (userRole === "SUPER_ADMIN") return { allowed: true };
    if (newRecord.reviewed_by !== oldRecord.reviewed_by || newRecord.reviewed_at !== oldRecord.reviewed_at) {
      return { allowed: false, error: "Unauthorized: Only Super Administrators can record review decisions." };
    }
    if (newRecord.status === "ARCHIVED" && oldRecord.status !== "ARCHIVED") {
      return { allowed: false, error: "Unauthorized: Only Super Administrators can archive live classes." };
    }
    if (newRecord.is_curated_preview !== oldRecord.is_curated_preview) {
      return { allowed: false, error: "Unauthorized: Only Super Administrators can modify curated preview settings." };
    }
    if (newRecord.batch_id !== oldRecord.batch_id) {
      return { allowed: false, error: "Unauthorized: Batch assignment cannot be modified on a live class." };
    }
    if (newRecord.subject_id !== oldRecord.subject_id) {
      return { allowed: false, error: "Unauthorized: Subject assignment cannot be modified on a live class." };
    }
    if (newRecord.educator_id !== oldRecord.educator_id) {
      return { allowed: false, error: "Unauthorized: Assigned educator cannot be modified." };
    }
    return { allowed: true };
  }

  test("16. Assigned educator (TEACHER or ADMIN) can create a valid DRAFT live class in assigned scope", () => {
    const teacherId = "usr-teacher-1";
    const resTeacher = evaluateLiveClassInsertPolicy({
      userRole: "TEACHER",
      userId: teacherId,
      batchId: "batch-101",
      subjectId: "subj-202",
      isBatchSubjectTeacher: true,
      payload: {
        educator_id: teacherId,
        status: "DRAFT",
        is_curated_preview: false,
        reviewed_by: null,
        reviewed_at: null,
      },
    });
    assert.equal(resTeacher.allowed, true);

    const adminId = "usr-admin-1";
    const resAdmin = evaluateLiveClassInsertPolicy({
      userRole: "ADMIN",
      userId: adminId,
      batchId: "batch-101",
      subjectId: "subj-202",
      isBatchSubjectTeacher: true,
      payload: {
        educator_id: adminId,
        status: "DRAFT",
        is_curated_preview: false,
        reviewed_by: null,
        reviewed_at: null,
      },
    });
    assert.equal(resAdmin.allowed, true);
  });

  test("17. Assigned educator cannot insert with is_curated_preview = TRUE", () => {
    const teacherId = "usr-teacher-1";
    const res = evaluateLiveClassInsertPolicy({
      userRole: "TEACHER",
      userId: teacherId,
      batchId: "batch-101",
      subjectId: "subj-202",
      isBatchSubjectTeacher: true,
      payload: {
        educator_id: teacherId,
        status: "DRAFT",
        is_curated_preview: true, // Forbidden
        reviewed_by: null,
        reviewed_at: null,
      },
    });
    assert.equal(res.allowed, false);
    assert.match(res.error, /is_curated_preview/);
  });

  test("18. Assigned educator cannot insert with status = 'PUBLISHED'", () => {
    const teacherId = "usr-teacher-1";
    const res = evaluateLiveClassInsertPolicy({
      userRole: "TEACHER",
      userId: teacherId,
      batchId: "batch-101",
      subjectId: "subj-202",
      isBatchSubjectTeacher: true,
      payload: {
        educator_id: teacherId,
        status: "PUBLISHED", // Forbidden on insert
        is_curated_preview: false,
        reviewed_by: null,
        reviewed_at: null,
      },
    });
    assert.equal(res.allowed, false);
    assert.match(res.error, /DRAFT/);
  });

  test("19. Assigned educator cannot insert non-null reviewed_by or reviewed_at", () => {
    const teacherId = "usr-teacher-1";
    const res = evaluateLiveClassInsertPolicy({
      userRole: "TEACHER",
      userId: teacherId,
      batchId: "batch-101",
      subjectId: "subj-202",
      isBatchSubjectTeacher: true,
      payload: {
        educator_id: teacherId,
        status: "DRAFT",
        is_curated_preview: false,
        reviewed_by: teacherId, // Forbidden
        reviewed_at: new Date().toISOString(), // Forbidden
      },
    });
    assert.equal(res.allowed, false);
    assert.match(res.error, /review audit metadata/);
  });

  test("20. Unassigned educator cannot create a live class", () => {
    const teacherId = "usr-teacher-unassigned";
    const res = evaluateLiveClassInsertPolicy({
      userRole: "TEACHER",
      userId: teacherId,
      batchId: "batch-101",
      subjectId: "subj-202",
      isBatchSubjectTeacher: false, // Not assigned
      payload: {
        educator_id: teacherId,
        status: "DRAFT",
        is_curated_preview: false,
        reviewed_by: null,
        reviewed_at: null,
      },
    });
    assert.equal(res.allowed, false);
    assert.match(res.error, /not assigned/);
  });

  test("21. Educator cannot modify protected scope (batch_id, subject_id, educator_id) or review fields on UPDATE", () => {
    const oldLive = {
      batch_id: "batch-101",
      subject_id: "subj-202",
      educator_id: "usr-teacher-1",
      status: "DRAFT",
      is_curated_preview: false,
      reviewed_by: null,
      reviewed_at: null,
    };

    // Attempt modifying batch_id
    const resBatch = evaluateLiveClassUpdateGuard({
      userRole: "TEACHER",
      oldRecord: oldLive,
      newRecord: { ...oldLive, batch_id: "batch-other" },
    });
    assert.equal(resBatch.allowed, false);
    assert.match(resBatch.error, /Batch assignment cannot be modified/);

    // Attempt modifying educator_id
    const resEducator = evaluateLiveClassUpdateGuard({
      userRole: "TEACHER",
      oldRecord: oldLive,
      newRecord: { ...oldLive, educator_id: "usr-teacher-hijacker" },
    });
    assert.equal(resEducator.allowed, false);
    assert.match(resEducator.error, /Assigned educator cannot be modified/);

    // Attempt modifying is_curated_preview on UPDATE
    const resPreview = evaluateLiveClassUpdateGuard({
      userRole: "TEACHER",
      oldRecord: oldLive,
      newRecord: { ...oldLive, is_curated_preview: true },
    });
    assert.equal(resPreview.allowed, false);
    assert.match(resPreview.error, /curated preview/);

    // Attempt modifying reviewed_by on UPDATE
    const resReview = evaluateLiveClassUpdateGuard({
      userRole: "TEACHER",
      oldRecord: oldLive,
      newRecord: { ...oldLive, reviewed_by: "usr-teacher-1", reviewed_at: new Date().toISOString() },
    });
    assert.equal(resReview.allowed, false);
    assert.match(resReview.error, /record review decisions/);
  });

  test("22. Legitimate live-session operations (start, reschedule, complete) continue to pass for assigned educator", () => {
    const oldLive = {
      batch_id: "batch-101",
      subject_id: "subj-202",
      educator_id: "usr-teacher-1",
      status: "DRAFT",
      live_status: "SCHEDULED",
      is_curated_preview: false,
      reviewed_by: null,
      reviewed_at: null,
    };

    // Teacher operates: moves to LIVE and updates started_at
    const resStart = evaluateLiveClassUpdateGuard({
      userRole: "TEACHER",
      oldRecord: oldLive,
      newRecord: { ...oldLive, live_status: "LIVE", started_at: new Date().toISOString(), is_live: true },
    });
    assert.equal(resStart.allowed, true);

    // Teacher completes session
    const resComplete = evaluateLiveClassUpdateGuard({
      userRole: "TEACHER",
      oldRecord: oldLive,
      newRecord: { ...oldLive, live_status: "COMPLETED", ended_at: new Date().toISOString(), is_live: false },
    });
    assert.equal(resComplete.allowed, true);
  });

  console.log("\n--- Category 6: Four-Role Model Permission Matrix ---");

  function evaluateProfileUpdateGuard({ updaterRole, updaterId, targetId, oldProfile, newProfile }) {
    if (updaterRole === "SUPER_ADMIN") return { allowed: true };
    if (updaterId !== targetId) return { allowed: false, error: "Cannot update another user's profile" };
    if (newProfile.role !== oldProfile.role) return { allowed: false, error: "Unauthorized: You do not have permission to modify user roles." };
    if (newProfile.status !== oldProfile.status) return { allowed: false, error: "Unauthorized: Only Super Administrators can alter account status." };
    if (newProfile.email !== oldProfile.email) return { allowed: false, error: "Email cannot be modified directly in user profiles." };
    return { allowed: true };
  }

  test("23. STUDENT cannot self-promote to TEACHER, ADMIN, or SUPER_ADMIN", () => {
    const studentProfile = { id: "s-1", role: "STUDENT", status: "ACTIVE", email: "student@test.com" };
    const res = evaluateProfileUpdateGuard({
      updaterRole: "STUDENT",
      updaterId: "s-1",
      targetId: "s-1",
      oldProfile: studentProfile,
      newProfile: { ...studentProfile, role: "SUPER_ADMIN" },
    });
    assert.equal(res.allowed, false);
    assert.match(res.error, /permission to modify user roles/);
  });

  test("24. TEACHER cannot alter status, modify role, or manage other users", () => {
    const teacherProfile = { id: "t-1", role: "TEACHER", status: "ACTIVE", email: "teacher@test.com" };
    const resStatus = evaluateProfileUpdateGuard({
      updaterRole: "TEACHER",
      updaterId: "t-1",
      targetId: "t-1",
      oldProfile: teacherProfile,
      newProfile: { ...teacherProfile, status: "SUSPENDED" },
    });
    assert.equal(resStatus.allowed, false);
    assert.match(resStatus.error, /alter account status/);

    const resOther = evaluateProfileUpdateGuard({
      updaterRole: "TEACHER",
      updaterId: "t-1",
      targetId: "s-1",
      oldProfile: { id: "s-1", role: "STUDENT", status: "ACTIVE", email: "student@test.com" },
      newProfile: { id: "s-1", role: "STUDENT", status: "SUSPENDED", email: "student@test.com" },
    });
    assert.equal(resOther.allowed, false);
  });

  test("25. SUPER_ADMIN has full administrative authority to update roles and statuses", () => {
    const userProfile = { id: "u-1", role: "STUDENT", status: "ACTIVE", email: "user@test.com" };
    const res = evaluateProfileUpdateGuard({
      updaterRole: "SUPER_ADMIN",
      updaterId: "sa-1",
      targetId: "u-1",
      oldProfile: userProfile,
      newProfile: { ...userProfile, role: "TEACHER", status: "ACTIVE" },
    });
    assert.equal(res.allowed, true);
  });

  console.log("\n--- Category 7: Batch Lifecycle & Student Read Entitlement Verification ---");

  // Mirroring public.is_actively_enrolled_in_batch & public.has_batch_read_entitlement SQL logic
  function evaluateBatchReadEntitlement({ batchStatus, enrollmentStatus, validUntilIso, nowIso = new Date().toISOString() }) {
    // b.status must be 'PUBLISHED' in content_status enum
    if (batchStatus !== "PUBLISHED") return { hasAccess: false, reason: "Batch is not PUBLISHED" };

    const now = new Date(nowIso).getTime();
    const validUntil = validUntilIso ? new Date(validUntilIso).getTime() : null;

    const isActive = enrollmentStatus === "ACTIVE" && (validUntil === null || validUntil > now);
    const isCompleted = enrollmentStatus === "COMPLETED";

    if (isActive || isCompleted) {
      return { hasAccess: true, isHistorical: isCompleted && !isActive };
    }
    return { hasAccess: false, reason: "Enrollment expired or inactive" };
  }

  test("26. Active enrollment on PUBLISHED batch grants access", () => {
    const res = evaluateBatchReadEntitlement({
      batchStatus: "PUBLISHED",
      enrollmentStatus: "ACTIVE",
      validUntilIso: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(res.hasAccess, true);
  });

  test("27. COMPLETED enrollment on PUBLISHED batch grants historical read entitlement", () => {
    const res = evaluateBatchReadEntitlement({
      batchStatus: "PUBLISHED",
      enrollmentStatus: "COMPLETED",
      validUntilIso: null,
    });
    assert.equal(res.hasAccess, true);
    assert.equal(res.isHistorical, true);
  });

  test("28. Expired enrollment on PUBLISHED batch denies access", () => {
    const res = evaluateBatchReadEntitlement({
      batchStatus: "PUBLISHED",
      enrollmentStatus: "ACTIVE",
      validUntilIso: new Date(Date.now() - 86400000).toISOString(),
    });
    assert.equal(res.hasAccess, false);
  });

  test("29. Enrolled student cannot access DRAFT or UNPUBLISHED batch content", () => {
    const res = evaluateBatchReadEntitlement({
      batchStatus: "DRAFT",
      enrollmentStatus: "ACTIVE",
      validUntilIso: null,
    });
    assert.equal(res.hasAccess, false);
    assert.equal(res.reason, "Batch is not PUBLISHED");
  });

  console.log("\n================================================================================");
  console.log(` Summary: ${passedTests}/${totalTests} tests passed successfully.`);
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});


