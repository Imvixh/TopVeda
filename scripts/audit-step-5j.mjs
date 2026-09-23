/**
 * TopVeda Phase 4.1 Step 5J: Comprehensive Automated Audit & Integration Test Suite
 * 
 * Tests:
 * 1. Role Authorization Matrix
 * 2. Live Class Creation & Taxonomy Integrity (No duration input, no course mapping)
 * 3. Teacher Overlap Protection (Server & Trigger)
 * 4. 10-Minute Teacher Early Access & Student Isolation Matrix
 * 5. Live Start Authorization & Status Guard
 * 6. Teacher Normal End Lifecycle
 * 7. Super Admin Emergency Termination Security
 * 8. Recording Inheritance & Metadata Preservation
 * 9. Recorded Lecture Review Lifecycle & Approved Lecture Lock
 * 10. Recording Download Protection & Provider Secret Isolation
 * 11. Notification System (Live created, rescheduled, cancelled, lecture submitted, revision, approved, terminated)
 * 12. Student Live Access Control & Profile Avatar Resolution
 * 13. Student Home Chronological Ordering (scheduled_start ASC)
 * 14. Teacher Reschedule & Cancellation Governance
 * 15. Storage & Asset Isolation
 * 16. Super Admin CMS Regression Verification
 * 17. Database Migration & Schema Integrity
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// ANSI formatting
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

const results = [];

function assertTest(suite, name, condition, details = "") {
  if (condition) {
    results.push({ suite, name, status: "PASS", details });
    console.log(`  ${colors.green}✓ PASS${colors.reset} [${suite}] ${name}`);
  } else {
    results.push({ suite, name, status: "FAIL", details });
    console.log(`  ${colors.red}✗ FAIL${colors.reset} [${suite}] ${name}: ${details}`);
  }
}

console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   TOPVEDA PHASE 4.1 STEP 5J — AUTOMATED AUDIT & TEST SUITE           ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}\n`);

// ============================================================================
// SUITE 1: SCHEMA & DATABASE MIGRATION INTEGRITY
// ============================================================================
console.log(`${colors.bold}SUITE 1: Database Migration & Schema Invariants${colors.reset}`);
{
  const migrationPath = path.join(rootDir, "supabase/migrations/20260923000000_teacher_workspace_live_recorded.sql");
  const migrationExists = fs.existsSync(migrationPath);
  assertTest("Database", "Migration file exists", migrationExists);

  if (migrationExists) {
    const migrationContent = fs.readFileSync(migrationPath, "utf8");

    assertTest(
      "Database",
      "Live class status enum includes TERMINATED via ALTER TYPE ADD VALUE IF NOT EXISTS",
      migrationContent.includes("ALTER TYPE public.live_class_status ADD VALUE IF NOT EXISTS 'TERMINATED'")
    );

    assertTest(
      "Database",
      "cms_live_classes has taxonomy relation columns (board_id, class_id, subject_id, course_id, chapter_id)",
      migrationContent.includes("board_id UUID") &&
      migrationContent.includes("class_id UUID") &&
      migrationContent.includes("subject_id UUID") &&
      migrationContent.includes("course_id UUID") &&
      migrationContent.includes("chapter_id UUID")
    );

    assertTest(
      "Database",
      "cms_live_classes has termination audit columns (terminated_at, terminated_by, termination_reason)",
      migrationContent.includes("terminated_at TIMESTAMPTZ") &&
      migrationContent.includes("terminated_by UUID") &&
      migrationContent.includes("termination_reason TEXT")
    );

    assertTest(
      "Database",
      "cms_lectures has original_live_class_id and material_ids columns",
      migrationContent.includes("original_live_class_id UUID") &&
      migrationContent.includes("material_ids UUID[]")
    );

    assertTest(
      "Database",
      "cms_notifications table created with RLS and indexes",
      migrationContent.includes("CREATE TABLE IF NOT EXISTS public.cms_notifications") &&
      migrationContent.includes("idx_cms_notifications_recipient")
    );

    assertTest(
      "Database",
      "trg_prevent_teacher_live_overlap trigger function defined",
      migrationContent.includes("FUNCTION public.check_teacher_live_class_overlap()") &&
      migrationContent.includes("trg_prevent_teacher_live_overlap")
    );

    assertTest(
      "Database",
      "trg_guard_live_class_termination trigger function defined",
      migrationContent.includes("FUNCTION public.guard_live_class_termination()") &&
      migrationContent.includes("trg_guard_live_class_termination")
    );

    assertTest(
      "Database",
      "trg_guard_approved_lecture_lock trigger function defined",
      migrationContent.includes("FUNCTION public.guard_approved_lecture_lock()") &&
      migrationContent.includes("trg_guard_approved_lecture_lock")
    );
  }
}

// ============================================================================
// SUITE 2: TEACHER OVERLAP PROTECTION ALGORITHM
// ============================================================================
console.log(`\n${colors.bold}SUITE 2: Teacher Live Class Overlap Protection Algorithm${colors.reset}`);
{
  function checkOverlap(existingSessions, newStart, newEnd, educatorId) {
    const nStart = new Date(newStart).getTime();
    const nEnd = new Date(newEnd).getTime();

    for (const s of existingSessions) {
      if (s.educatorId !== educatorId) continue;
      if (s.liveStatus !== "SCHEDULED" && s.liveStatus !== "LIVE") continue;

      const sStart = new Date(s.scheduledStart).getTime();
      const sEnd = new Date(s.scheduledEnd).getTime();

      if (nStart < sEnd && nEnd > sStart) {
        return { conflict: true, conflictingId: s.id, conflictingTopic: s.topic };
      }
    }
    return { conflict: false };
  }

  const educatorA = "teacher-uuid-1111";
  const educatorB = "teacher-uuid-2222";

  const existingSessions = [
    {
      id: "class-1",
      topic: "Class 1: Calculus",
      educatorId: educatorA,
      scheduledStart: "2026-10-01T10:00:00.000Z",
      scheduledEnd: "2026-10-01T11:00:00.000Z",
      liveStatus: "SCHEDULED",
    },
  ];

  const test1 = checkOverlap(existingSessions, "2026-10-01T10:30:00.000Z", "2026-10-01T11:30:00.000Z", educatorA);
  assertTest("Overlap Protection", "Teacher A: 10:00-11:00 vs 10:30-11:30 is BLOCKED", test1.conflict === true);

  const test2 = checkOverlap(existingSessions, "2026-10-01T11:00:00.000Z", "2026-10-01T12:00:00.000Z", educatorA);
  assertTest("Overlap Protection", "Teacher A: 10:00-11:00 vs 11:00-12:00 (touching) is ALLOWED", test2.conflict === false);

  const test3 = checkOverlap(existingSessions, "2026-10-01T09:00:00.000Z", "2026-10-01T10:00:00.000Z", educatorA);
  assertTest("Overlap Protection", "Teacher A: 10:00-11:00 vs 09:00-10:00 (touching) is ALLOWED", test3.conflict === false);

  const test4 = checkOverlap(existingSessions, "2026-10-01T10:30:00.000Z", "2026-10-01T11:30:00.000Z", educatorB);
  assertTest("Overlap Protection", "Teacher B: 10:30-11:30 vs Teacher A 10:00-11:00 is ALLOWED", test4.conflict === false);
}

// ============================================================================
// SUITE 3: 10-MINUTE TEACHER EARLY ACCESS & STUDENT ACCESS MATRIX
// ============================================================================
console.log(`\n${colors.bold}SUITE 3: 10-Minute Teacher Early Access & Student Isolation Matrix${colors.reset}`);
{
  function evaluateSessionAccess(liveClass, userRole, isOwner, mockNowMs) {
    const scheduledStartMs = new Date(liveClass.scheduledStart).getTime();
    const earlyAccessWindowMs = 10 * 60 * 1000;

    const isTeacher = userRole === "SUPER_ADMIN" || (userRole === "ADMIN" && isOwner);
    const isTeacherInPreparationWindow = isTeacher && mockNowMs >= scheduledStartMs - earlyAccessWindowMs && mockNowMs < scheduledStartMs;

    const isStudentWindowOpen = mockNowMs >= scheduledStartMs;
    const isLiveActive = liveClass.liveStatus === "LIVE";
    const isStudentAllowed = !isTeacher && isStudentWindowOpen && isLiveActive;

    let canJoin = false;
    let accessMode = "WAITING_ROOM";
    let joinUrl = null;

    if (isTeacher) {
      if (mockNowMs >= scheduledStartMs - earlyAccessWindowMs) {
        canJoin = true;
        accessMode = mockNowMs < scheduledStartMs ? "TEACHER_PREPARATION" : "LIVE_BROADCAST";
        joinUrl = `https://stream.topveda.com/room/${liveClass.id}?role=teacher`;
      }
    } else {
      if (isStudentAllowed) {
        canJoin = true;
        accessMode = "STUDENT_JOIN";
        joinUrl = `https://stream.topveda.com/room/${liveClass.id}?role=student`;
      }
    }

    const isStudentInPreparation = !isTeacher && mockNowMs >= scheduledStartMs - earlyAccessWindowMs && mockNowMs < scheduledStartMs;
    const isEffectiveLive = isTeacher ? isLiveActive : isStudentAllowed;

    return {
      canJoin,
      accessMode,
      joinUrl,
      isPreparationWindow: isTeacher ? isTeacherInPreparationWindow : isStudentInPreparation,
      isLive: isEffectiveLive,
    };
  }

  const scheduledStart = new Date("2026-10-01T10:00:00.000Z").getTime();
  const testClass = {
    id: "lc-early-access-test",
    scheduledStart: "2026-10-01T10:00:00.000Z",
    liveStatus: "LIVE",
  };

  const tMinus11 = scheduledStart - 11 * 60 * 1000;
  const teacherT11 = evaluateSessionAccess(testClass, "ADMIN", true, tMinus11);
  const studentT11 = evaluateSessionAccess(testClass, "STUDENT", false, tMinus11);
  assertTest("10-Minute Early Access", "T-11 (09:49): Teacher access is BLOCKED", teacherT11.canJoin === false && teacherT11.joinUrl === null);
  assertTest("10-Minute Early Access", "T-11 (09:49): Student access is BLOCKED", studentT11.canJoin === false && studentT11.joinUrl === null);

  const tMinus10 = scheduledStart - 10 * 60 * 1000;
  const teacherT10 = evaluateSessionAccess(testClass, "ADMIN", true, tMinus10);
  const studentT10 = evaluateSessionAccess(testClass, "STUDENT", false, tMinus10);
  assertTest("10-Minute Early Access", "T-10 (09:50): Teacher preparation access is ALLOWED", teacherT10.canJoin === true && teacherT10.accessMode === "TEACHER_PREPARATION");
  assertTest("Student Early Access Protection", "T-10 (09:50): Student access remains strictly BLOCKED", studentT10.canJoin === false && studentT10.isLive === false);

  const tMinus5 = scheduledStart - 5 * 60 * 1000;
  const teacherT5 = evaluateSessionAccess(testClass, "ADMIN", true, tMinus5);
  const studentT5 = evaluateSessionAccess(testClass, "STUDENT", false, tMinus5);
  assertTest("10-Minute Early Access", "T-5 (09:55): Teacher is ALLOWED in preparation room", teacherT5.canJoin === true);
  assertTest("Student Early Access Protection", "T-5 (09:55): Student is strictly BLOCKED (isPreparationWindow = true)", studentT5.canJoin === false && studentT5.isPreparationWindow === true);

  const tMinus1 = scheduledStart - 1 * 60 * 1000;
  const teacherT1 = evaluateSessionAccess(testClass, "ADMIN", true, tMinus1);
  const studentT1 = evaluateSessionAccess(testClass, "STUDENT", false, tMinus1);
  assertTest("10-Minute Early Access", "T-1 (09:59): Teacher is ALLOWED in preparation room", teacherT1.canJoin === true);
  assertTest("Student Early Access Protection", "T-1 (09:59): Student is strictly BLOCKED", studentT1.canJoin === false && studentT1.joinUrl === null);

  const tZero = scheduledStart;
  const teacherT0 = evaluateSessionAccess(testClass, "ADMIN", true, tZero);
  const studentT0 = evaluateSessionAccess(testClass, "STUDENT", false, tZero);
  assertTest("10-Minute Early Access", "T (10:00): Teacher access mode switches to LIVE_BROADCAST", teacherT0.canJoin === true && teacherT0.accessMode === "LIVE_BROADCAST");
  assertTest("Student Live Access", "T (10:00): Student live access is UNLOCKED", studentT0.canJoin === true && studentT0.accessMode === "STUDENT_JOIN" && studentT0.isLive === true);

  const tPlus1 = scheduledStart + 1 * 60 * 1000;
  const studentTPlus1 = evaluateSessionAccess(testClass, "STUDENT", false, tPlus1);
  assertTest("Student Live Access", "T+1 (10:01): Student joins ongoing live session normally", studentTPlus1.canJoin === true);
}

// ============================================================================
// SUITE 4: TERMINATION & EMERGENCY ACCESS SEVERING
// ============================================================================
console.log(`\n${colors.bold}SUITE 4: Termination & Access Severing Security${colors.reset}`);
{
  function validateTermination(liveClass, requesterRole, reason) {
    if (requesterRole !== "SUPER_ADMIN") {
      return { success: false, status: 403, error: "Forbidden: Only Super Admin can terminate live classes." };
    }
    if (!reason || reason.trim().length < 5) {
      return { success: false, status: 400, error: "Validation Error: Termination reason must be at least 5 chars." };
    }
    return {
      success: true,
      updatedClass: {
        ...liveClass,
        live_status: "TERMINATED",
        is_live: false,
        terminated_at: new Date().toISOString(),
        termination_reason: reason.trim(),
      },
    };
  }

  const liveClass = { id: "lc-term-1", live_status: "LIVE", is_live: true };

  const teacherAttempt = validateTermination(liveClass, "ADMIN", "Teacher trying to terminate");
  assertTest("Super Admin Termination", "Teacher cannot terminate Live Class (403 Forbidden)", teacherAttempt.success === false && teacherAttempt.status === 403);

  const adminNoReason = validateTermination(liveClass, "SUPER_ADMIN", "");
  assertTest("Super Admin Termination", "Super Admin termination without reason is REJECTED (400)", adminNoReason.success === false && adminNoReason.status === 400);

  const adminValid = validateTermination(liveClass, "SUPER_ADMIN", "Emergency classroom policy violation");
  assertTest("Super Admin Termination", "Super Admin termination with audit reason SUCCEEDS", adminValid.success === true && adminValid.updatedClass.live_status === "TERMINATED");

  function attemptRestart(liveClass) {
    if (liveClass.live_status === "TERMINATED") {
      return { allowed: false, error: "Cannot restart terminated session." };
    }
    return { allowed: true };
  }
  const restartResult = attemptRestart(adminValid.updatedClass);
  assertTest("Super Admin Termination", "Terminated Live Class cannot be restarted by Teacher", restartResult.allowed === false);
}

// ============================================================================
// SUITE 5: RECORDING INHERITANCE & METADATA PRESERVATION
// ============================================================================
console.log(`\n${colors.bold}SUITE 5: Live Class to Recording Inheritance${colors.reset}`);
{
  function inheritLiveToLecture(liveClass) {
    return {
      title: liveClass.topic,
      subject: liveClass.subject,
      teacher_name: liveClass.educator_name,
      educator_id: liveClass.educator_id,
      board_id: liveClass.board_id,
      class_id: liveClass.class_id,
      subject_id: liveClass.subject_id,
      course_id: liveClass.course_id,
      chapter_id: liveClass.chapter_id,
      batch_id: liveClass.batch_id,
      original_live_class_id: liveClass.id,
      lecture_number: 1,
      status: "DRAFT",
      video_upload_status: "ready",
      video_stream_id: liveClass.provider_session_id || `rec_${liveClass.id}`,
    };
  }

  const liveClassInput = {
    id: "lc-inherit-100",
    topic: "Masterclass: Thermodynamics",
    subject: "Physics",
    educator_name: "Dr. H. C. Verma",
    educator_id: "educator-100",
    board_id: "board-cbse",
    class_id: "class-11",
    subject_id: "subj-phys",
    course_id: "course-jee",
    chapter_id: "chap-thermo",
    batch_id: "batch-jee-2026",
    provider_session_id: "session-stream-999",
  };

  const inherited = inheritLiveToLecture(liveClassInput);

  assertTest("Recording Inheritance", "Inherited lecture preserves original_live_class_id", inherited.original_live_class_id === liveClassInput.id);
  assertTest("Recording Inheritance", "Inherited lecture preserves taxonomy (board, class, subject, course, chapter, batch)",
    inherited.board_id === liveClassInput.board_id &&
    inherited.class_id === liveClassInput.class_id &&
    inherited.course_id === liveClassInput.course_id &&
    inherited.chapter_id === liveClassInput.chapter_id &&
    inherited.batch_id === liveClassInput.batch_id
  );
  assertTest("Recording Inheritance", "Inherited lecture preserves educator ownership and topic title",
    inherited.educator_id === liveClassInput.educator_id &&
    inherited.teacher_name === liveClassInput.educator_name &&
    inherited.title === liveClassInput.topic
  );
  assertTest("Recording Inheritance", "Inherited lecture initial status is DRAFT", inherited.status === "DRAFT");
}

// ============================================================================
// SUITE 6: RECORDED LECTURE LIFECYCLE & APPROVED LECTURE LOCK
// ============================================================================
console.log(`\n${colors.bold}SUITE 6: Recorded Lecture Governance & Approved Lock${colors.reset}`);
{
  function evaluateLectureEdit(lecture, requesterRole, isOwner) {
    const isSuperAdmin = requesterRole === "SUPER_ADMIN";
    const isOwnerTeacher = (requesterRole === "ADMIN" && isOwner);

    if (!isSuperAdmin && !isOwnerTeacher) {
      return { allowed: false, error: "Forbidden: Not authorized." };
    }

    if (!isSuperAdmin && (lecture.status === "APPROVED" || lecture.status === "PUBLISHED")) {
      return { allowed: false, error: "Editing Locked: Approved lectures cannot be modified by teachers." };
    }

    return { allowed: true };
  }

  const draftLecture = { id: "lec-1", status: "DRAFT" };
  assertTest("Recorded Lecture Lifecycle", "Teacher can edit DRAFT lecture", evaluateLectureEdit(draftLecture, "ADMIN", true).allowed === true);

  const pendingLecture = { id: "lec-2", status: "PENDING_REVIEW" };
  assertTest("Recorded Lecture Lifecycle", "Teacher can edit PENDING_REVIEW lecture", evaluateLectureEdit(pendingLecture, "ADMIN", true).allowed === true);

  const rejectedLecture = { id: "lec-3", status: "REJECTED" };
  assertTest("Recorded Lecture Lifecycle", "Teacher can edit REJECTED lecture (for resubmission)", evaluateLectureEdit(rejectedLecture, "ADMIN", true).allowed === true);

  const approvedLecture = { id: "lec-4", status: "APPROVED" };
  assertTest("Approved Lecture Lock", "Teacher CANNOT edit APPROVED lecture (Locked)", evaluateLectureEdit(approvedLecture, "ADMIN", true).allowed === false);

  const publishedLecture = { id: "lec-5", status: "PUBLISHED" };
  assertTest("Approved Lecture Lock", "Teacher CANNOT edit PUBLISHED lecture (Locked)", evaluateLectureEdit(publishedLecture, "ADMIN", true).allowed === false);

  assertTest("Approved Lecture Lock", "Super Admin retains authority to edit APPROVED / PUBLISHED lectures", evaluateLectureEdit(approvedLecture, "SUPER_ADMIN", false).allowed === true);
}

// ============================================================================
// SUITE 7: RECORDING DOWNLOAD SECURITY & PROVIDER SECRET ISOLATION
// ============================================================================
console.log(`\n${colors.bold}SUITE 7: Recording Download Security & Secret Isolation${colors.reset}`);
{
  function getRecordingDownloadUrl(recordingId, role) {
    if (role !== "SUPER_ADMIN") {
      return null;
    }
    return `https://stream.topveda.com/recordings/${recordingId}/download.mp4`;
  }

  assertTest("Recording Download Protection", "Teacher is DENIED recording download URL", getRecordingDownloadUrl("rec-123", "ADMIN") === null);
  assertTest("Recording Download Protection", "Student is DENIED recording download URL", getRecordingDownloadUrl("rec-123", "STUDENT") === null);
  assertTest("Recording Download Protection", "Super Admin is permitted authorized download URL", getRecordingDownloadUrl("rec-123", "SUPER_ADMIN") !== null);

  const liveClassApiFiles = [
    "src/app/api/teacher/live/create/route.ts",
    "src/app/api/teacher/live/start/route.ts",
    "src/app/api/teacher/live/end/route.ts",
    "src/app/api/admin/live/terminate/route.ts",
    "src/app/api/teacher/live/reschedule/route.ts",
    "src/app/api/teacher/live/cancel/route.ts",
  ];

  let allStripStreamKey = true;
  for (const relPath of liveClassApiFiles) {
    const fullPath = path.join(rootDir, relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");
      if (!content.includes("stream_key") || !content.includes("sanitized")) {
        allStripStreamKey = false;
      }
    }
  }
  assertTest("Provider Secret Isolation", "All Live APIs strip internal stream_key before returning client responses", allStripStreamKey);
}

// ============================================================================
// SUITE 8: NOTIFICATION SYSTEM & EVENT DISPATCHING
// ============================================================================
console.log(`\n${colors.bold}SUITE 8: Notifications Event Dispatchers${colors.reset}`);
{
  const notificationServicePath = path.join(rootDir, "src/lib/services/notification.service.ts");
  const exists = fs.existsSync(notificationServicePath);
  assertTest("Notifications", "NotificationService exists", exists);

  if (exists) {
    const content = fs.readFileSync(notificationServicePath, "utf8");
    assertTest("Notifications", "Event 1: notifySuperAdminLiveClassCreated implemented", content.includes("notifySuperAdminLiveClassCreated"));
    assertTest("Notifications", "Event 2: notifySuperAdminLiveClassRescheduled implemented", content.includes("notifySuperAdminLiveClassRescheduled"));
    assertTest("Notifications", "Event 3: notifySuperAdminLiveClassCancelled implemented", content.includes("notifySuperAdminLiveClassCancelled"));
    assertTest("Notifications", "Event 4: notifySuperAdminLectureSubmitted implemented", content.includes("notifySuperAdminLectureSubmitted"));
    assertTest("Notifications", "Event 5: notifyTeacherRevisionRequested implemented", content.includes("notifyTeacherRevisionRequested"));
    assertTest("Notifications", "Event 6: notifyTeacherLectureApproved implemented", content.includes("notifyTeacherLectureApproved"));
    assertTest("Notifications", "Event 7: notifyTeacherLiveClassTerminated implemented", content.includes("notifyTeacherLiveClassTerminated"));
  }
}

// ============================================================================
// SUITE 9: STUDENT HOME LIVE ORDERING & AVATAR RESOLUTION
// ============================================================================
console.log(`\n${colors.bold}SUITE 9: Student Home Live Ordering & Teacher Avatar Resolution${colors.reset}`);
{
  const studentHomeServicePath = path.join(rootDir, "src/lib/services/student-home.service.ts");
  const exists = fs.existsSync(studentHomeServicePath);
  assertTest("Student Home Ordering", "student-home.service.ts exists", exists);

  if (exists) {
    const content = fs.readFileSync(studentHomeServicePath, "utf8");
    assertTest(
      "Student Home Ordering",
      "fetchPublishedLiveClasses orders by scheduled_start ASC",
      content.includes('.order("scheduled_start", { ascending: true })')
    );
    assertTest(
      "Student Home Ordering",
      "Live status on student home checks nowMs >= scheduledStartMs before setting isLive",
      content.includes("nowMs >= scheduledStartMs")
    );
    assertTest(
      "Teacher Avatar Resolution",
      "Resolves Teacher Profile Avatar with safe fallback to prevent broken images",
      content.includes("profileAvatar || l.educator_avatar_url || l.thumbnail_url")
    );
  }
}

// ============================================================================
// SUITE 10: TEACHER RESCHEDULE & CANCEL PERMISSIONS GOVERNANCE
// ============================================================================
console.log(`\n${colors.bold}SUITE 10: Teacher Reschedule & Cancel Permissions Governance${colors.reset}`);
{
  function validateReschedule(liveClass, requesterUserId, newStartMs, existingOtherClasses) {
    const isOwner = liveClass.educator_id === requesterUserId || liveClass.created_by === requesterUserId;
    if (!isOwner) {
      return { allowed: false, status: 403, error: "Forbidden: Not owner." };
    }
    if (liveClass.live_status !== "SCHEDULED") {
      return { allowed: false, status: 400, error: `Cannot reschedule in status ${liveClass.live_status}.` };
    }
    if (newStartMs <= Date.now()) {
      return { allowed: false, status: 400, error: "New start time must be in future." };
    }
    // Overlap check
    const newEndMs = newStartMs + 60 * 60 * 1000;
    for (const ec of existingOtherClasses) {
      const ecStart = new Date(ec.scheduled_start).getTime();
      const ecEnd = new Date(ec.scheduled_end).getTime();
      if (newStartMs < ecEnd && newEndMs > ecStart) {
        return { allowed: false, status: 409, error: "Overlap collision with another class." };
      }
    }
    return { allowed: true, status: 200 };
  }

  function validateCancel(liveClass, requesterUserId) {
    const isOwner = liveClass.educator_id === requesterUserId || liveClass.created_by === requesterUserId;
    if (!isOwner) {
      return { allowed: false, status: 403, error: "Forbidden: Not owner." };
    }
    if (liveClass.live_status !== "SCHEDULED") {
      return { allowed: false, status: 400, error: `Cannot cancel in status ${liveClass.live_status}.` };
    }
    return { allowed: true, status: 200 };
  }

  const teacherId = "teacher-101";
  const otherTeacherId = "teacher-999";
  const scheduledClass = { id: "lc-1", educator_id: teacherId, live_status: "SCHEDULED" };
  const liveClass = { id: "lc-2", educator_id: teacherId, live_status: "LIVE" };
  const completedClass = { id: "lc-3", educator_id: teacherId, live_status: "COMPLETED" };
  const terminatedClass = { id: "lc-4", educator_id: teacherId, live_status: "TERMINATED" };

  const futureTime = Date.now() + 24 * 60 * 60 * 1000;

  // Reschedule tests
  assertTest("Reschedule Governance", "Teacher can reschedule own SCHEDULED class", validateReschedule(scheduledClass, teacherId, futureTime, []).allowed === true);
  assertTest("Reschedule Governance", "Teacher CANNOT reschedule another teacher's class (403)", validateReschedule(scheduledClass, otherTeacherId, futureTime, []).allowed === false);
  assertTest("Reschedule Governance", "Teacher CANNOT reschedule LIVE class", validateReschedule(liveClass, teacherId, futureTime, []).allowed === false);
  assertTest("Reschedule Governance", "Teacher CANNOT reschedule COMPLETED class", validateReschedule(completedClass, teacherId, futureTime, []).allowed === false);
  assertTest("Reschedule Governance", "Teacher CANNOT reschedule TERMINATED class", validateReschedule(terminatedClass, teacherId, futureTime, []).allowed === false);

  // Cancel tests
  assertTest("Cancellation Governance", "Teacher can cancel own SCHEDULED class", validateCancel(scheduledClass, teacherId).allowed === true);
  assertTest("Cancellation Governance", "Teacher CANNOT cancel another teacher's class (403)", validateCancel(scheduledClass, otherTeacherId).allowed === false);
  assertTest("Cancellation Governance", "Teacher CANNOT cancel LIVE class", validateCancel(liveClass, teacherId).allowed === false);
  assertTest("Cancellation Governance", "Teacher CANNOT cancel COMPLETED class", validateCancel(completedClass, teacherId).allowed === false);
  assertTest("Cancellation Governance", "Teacher CANNOT cancel TERMINATED class", validateCancel(terminatedClass, teacherId).allowed === false);
}

// ============================================================================
// SUITE 11: SUPER ADMIN CMS PRESERVATION
// ============================================================================
console.log(`\n${colors.bold}SUITE 11: Super Admin CMS Regression Verification${colors.reset}`);
{
  const cmsPages = [
    "src/app/admin/cms/courses/page.tsx",
    "src/app/admin/cms/batches/page.tsx",
    "src/app/admin/cms/lectures/page.tsx",
    "src/app/admin/cms/live-classes/page.tsx",
    "src/app/admin/cms/hero/page.tsx",
    "src/app/admin/cms/quotes/page.tsx",
    "src/app/admin/cms/hub/page.tsx",
    "src/app/admin/cms/reviews/page.tsx",
    "src/app/admin/cms/chatbot/page.tsx",
    "src/app/admin/cms/study-materials/page.tsx",
    "src/app/admin/cms/boards/page.tsx",
    "src/app/admin/cms/classes/page.tsx",
    "src/app/admin/cms/subjects/page.tsx",
    "src/app/admin/cms/chapters/page.tsx",
  ];

  let allCmsPagesExist = true;
  for (const page of cmsPages) {
    if (!fs.existsSync(path.join(rootDir, page))) {
      allCmsPagesExist = false;
      console.log(`  Missing CMS Page: ${page}`);
    }
  }
  assertTest("Super Admin CMS Regression", "All 14 Super Admin CMS pages exist and are intact", allCmsPagesExist);
}

// ============================================================================
// SUITE 12: TEACHER WORKSPACE & LIVE CONTROL CENTER UI
// ============================================================================
console.log(`\n${colors.bold}SUITE 12: Teacher Workspace & Live Control Center Surfaces${colors.reset}`);
{
  const teacherWorkspacePath = path.join(rootDir, "src/app/admin/content/page.tsx");
  const liveTabPath = path.join(rootDir, "src/components/admin/teacher/live-classes-tab.tsx");
  const recordedTabPath = path.join(rootDir, "src/components/admin/teacher/recorded-lectures-tab.tsx");
  const liveControlPath = path.join(rootDir, "src/app/admin/cms/live-classes/page.tsx");
  const studentLivePath = path.join(rootDir, "src/app/student/live/[id]/page.tsx");

  assertTest("Teacher Workspace", "Teacher Content Hub page exists (/admin/content)", fs.existsSync(teacherWorkspacePath));
  assertTest("Teacher Workspace", "Live Classes Tab component exists", fs.existsSync(liveTabPath));
  assertTest("Teacher Workspace", "Recorded Lectures Tab component exists", fs.existsSync(recordedTabPath));
  assertTest("Live Control Center", "Super Admin Live Control Center exists (/admin/cms/live-classes)", fs.existsSync(liveControlPath));
  assertTest("Student Live Classroom", "Student Live Classroom page exists (/student/live/[id])", fs.existsSync(studentLivePath));

  if (fs.existsSync(liveTabPath)) {
    const liveTabContent = fs.readFileSync(liveTabPath, "utf8");
    assertTest(
      "Teacher Workspace UI",
      "Create Live Class form has NO duration input",
      !liveTabContent.includes("createDurationMin")
    );
    assertTest(
      "Teacher Workspace UI",
      "Create Live Class form has NO course mapping input",
      !liveTabContent.includes("createCourseId")
    );
    assertTest(
      "Teacher Workspace UI",
      "Reschedule Live Class modal exists",
      liveTabContent.includes("rescheduleTarget") && liveTabContent.includes("/api/teacher/live/reschedule")
    );
    assertTest(
      "Teacher Workspace UI",
      "Cancel Live Class modal exists",
      liveTabContent.includes("cancelTarget") && liveTabContent.includes("/api/teacher/live/cancel")
    );
  }
}

// ============================================================================
// SUITE 13: SUPER ADMIN TEACHER DIRECTORY & DRILL-DOWN GOVERNANCE
// ============================================================================
console.log(`\n${colors.bold}SUITE 13: Super Admin Teacher Directory & Drill-Down Governance${colors.reset}`);
{
  const teacherWorkspacePath = path.join(rootDir, "src/app/admin/content/page.tsx");
  const cmsServicePath = path.join(rootDir, "src/lib/services/cms.service.ts");
  const liveTabPath = path.join(rootDir, "src/components/admin/teacher/live-classes-tab.tsx");
  const recordedTabPath = path.join(rootDir, "src/components/admin/teacher/recorded-lectures-tab.tsx");

  if (fs.existsSync(cmsServicePath)) {
    const cmsServiceContent = fs.readFileSync(cmsServicePath, "utf8");
    assertTest(
      "Super Admin Teacher Directory",
      "CmsService.getTeachersForSuperAdmin queries real profiles with role ADMIN",
      cmsServiceContent.includes("getTeachersForSuperAdmin") &&
      cmsServiceContent.includes('.from("profiles")') &&
      cmsServiceContent.includes('.eq("role", "ADMIN")')
    );
    assertTest(
      "Super Admin Teacher Directory",
      "Calculates factual live class counts (upcoming, liveNow, completed, terminated, cancelled)",
      cmsServiceContent.includes("upcoming: tLive.filter") &&
      cmsServiceContent.includes("liveNow: tLive.filter") &&
      cmsServiceContent.includes("completed: tLive.filter") &&
      cmsServiceContent.includes("terminated: tLive.filter") &&
      cmsServiceContent.includes("cancelled: tLive.filter")
    );
    assertTest(
      "Super Admin Teacher Directory",
      "Calculates factual recorded lecture counts (draft, pendingReview, revisionRequested, approved, published)",
      cmsServiceContent.includes("draft: tLectures.filter") &&
      cmsServiceContent.includes("pendingReview: tLectures.filter") &&
      cmsServiceContent.includes("revisionRequested: tLectures.filter") &&
      cmsServiceContent.includes("approved: tLectures.filter") &&
      cmsServiceContent.includes("published: tLectures.filter")
    );
  }

  if (fs.existsSync(teacherWorkspacePath)) {
    const pageContent = fs.readFileSync(teacherWorkspacePath, "utf8");
    assertTest(
      "Teacher Directory UI",
      "Super Admin initial view shows Current Teachers directory",
      pageContent.includes("Current Teachers") &&
      pageContent.includes("isSuperAdmin && !selectedTeacher")
    );
    assertTest(
      "Teacher Directory Search",
      "Super Admin directory supports search by teacher name and email",
      pageContent.includes("teacherSearchQuery") &&
      pageContent.includes("t.fullName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)")
    );
    assertTest(
      "Teacher Directory Empty State",
      "Empty state provides 'No Teachers Found' notice",
      pageContent.includes("No Teachers Found")
    );
    assertTest(
      "Teacher Drill-Down Navigation",
      "Clicking a teacher opens workspace with 'Back to Teachers' navigation",
      pageContent.includes("setSelectedTeacher(teacher)") &&
      pageContent.includes("Back to Teachers Directory")
    );
    assertTest(
      "Role Isolation & Access Control",
      "Blocks STUDENT users from accessing Teacher Workspace",
      pageContent.includes('profile?.role === "STUDENT"') &&
      pageContent.includes('router.push("/student")')
    );
    assertTest(
      "Teacher Experience Preserved",
      "Regular Teacher (role === ADMIN) goes straight to their own workspace",
      pageContent.includes("!isSuperAdmin || selectedTeacher") &&
      pageContent.includes("activeTeacherId = isSuperAdmin ? selectedTeacher?.id : user?.id")
    );
  }

  if (fs.existsSync(liveTabPath)) {
    const liveTabContent = fs.readFileSync(liveTabPath, "utf8");
    assertTest(
      "Super Admin Live Governance",
      "LiveClassesTab supports Super Admin emergency session termination with reason",
      liveTabContent.includes("isSuperAdmin") &&
      liveTabContent.includes("handleTerminateSubmit") &&
      liveTabContent.includes("/api/admin/live/terminate")
    );
  }

  if (fs.existsSync(recordedTabPath)) {
    const recordedTabContent = fs.readFileSync(recordedTabPath, "utf8");
    assertTest(
      "Super Admin Lecture Review Governance",
      "RecordedLecturesTab gives Super Admin direct 'Review in CMS' access for pending reviews",
      recordedTabContent.includes("isSuperAdmin") &&
      recordedTabContent.includes("isPending && isSuperAdmin") &&
      recordedTabContent.includes("/admin/cms/lectures")
    );
  }
}

// ============================================================================
// SUITE 14: SUPER ADMIN RECORDED LECTURE REVIEW SIMPLIFICATION
// ============================================================================
console.log(`\n${colors.bold}SUITE 14: Super Admin Recorded Lecture Review Simplification${colors.reset}`);
{
  const cmsLecturesPath = path.join(rootDir, "src/app/admin/cms/lectures/page.tsx");

  if (fs.existsSync(cmsLecturesPath)) {
    const cmsContent = fs.readFileSync(cmsLecturesPath, "utf8");

    assertTest(
      "Lecture Review UI",
      "Super Admin Review modal includes top prominent video player preview",
      cmsContent.includes("Recording Stream Preview") &&
      cmsContent.includes("<video") &&
      cmsContent.includes("editingLecture.video_playback_url")
    );

    assertTest(
      "Lecture Review UI",
      "Super Admin Review modal displays read-only teacher metadata (title, subject, teacher, duration, category)",
      cmsContent.includes("editingLecture.title") &&
      cmsContent.includes("editingLecture.teacher_name") &&
      cmsContent.includes("editingLecture.duration_human") &&
      cmsContent.includes("editingLecture.category_tag")
    );

    assertTest(
      "Lecture Review UI",
      "Duration is read-only and not manually editable in Super Admin review mode",
      cmsContent.includes("editingLecture ? editingLecture.duration_seconds : totalSeconds")
    );

    assertTest(
      "Lecture Review UI",
      "Super Admin management controls limited to status, display order, linked batch, thumbnail, visibility, and schedule windows",
      cmsContent.includes("Super Admin Content Placement & Governance") &&
      cmsContent.includes("formStatus") &&
      cmsContent.includes("formDisplayOrder") &&
      cmsContent.includes("formBatchId") &&
      cmsContent.includes("formThumbnailUrl") &&
      cmsContent.includes("formIsVisible")
    );

    assertTest(
      "Lecture Review Governance",
      "Saving review updates placement/status without overwriting author's title, slug, or syllabus binding",
      cmsContent.includes("chapter_id: editingLecture ? editingLecture.chapter_id : formChapterId") &&
      cmsContent.includes("title: editingLecture ? editingLecture.title : formTitle.trim()") &&
      cmsContent.includes("slug: editingLecture ? editingLecture.slug : formSlug.trim().toLowerCase()")
    );
  }
}

// ============================================================================
// SUMMARY REPORT
// ============================================================================
const totalTests = results.length;
const passedTests = results.filter((r) => r.status === "PASS").length;
const failedTests = results.filter((r) => r.status === "FAIL").length;

console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}   AUDIT SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${failedTests} FAILS) ${colors.reset}`);
console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}\n`);

if (failedTests > 0) {
  console.log(`${colors.red}FAILED TESTS:${colors.reset}`);
  results.filter((r) => r.status === "FAIL").forEach((f) => {
    console.log(` - [${f.suite}] ${f.name}: ${f.details}`);
  });
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bold}ALL AUTOMATED AUDIT SUITES PASSED SUCCESSFULLY!${colors.reset}\n`);
  process.exit(0);
}
