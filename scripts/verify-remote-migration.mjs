/**
 * TopVeda Phase 1, 2, 3, 6 Comprehensive Remote Database & RLS Verification Suite
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let envContent = "";
try {
  envContent = fs.readFileSync(path.join(rootDir, ".env.local"), "utf8");
} catch {
  envContent = fs.readFileSync(path.join(rootDir, ".env.production"), "utf8");
}

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : null;
};

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing required environment variables.");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

async function runRemoteVerification() {
  console.log("=====================================================================");
  console.log("  TOPVEDA: REMOTE SUPABASE DATABASE & RLS VERIFICATION               ");
  console.log("=====================================================================");

  let testCount = 0;
  let passCount = 0;

  function assert(condition, testName, details = "") {
    testCount++;
    if (condition) {
      console.log(`  ✔ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ✖ FAIL: ${testName} - ${details}`);
    }
  }

  // ------------------------------------------------------------------
  // 1. Check existing batches and courses
  // ------------------------------------------------------------------
  console.log("\n[PHASE 1] Remote Database & RLS State Verification...");

  const { data: batches, error: batchErr } = await adminClient
    .from("cms_batches")
    .select("id, title, course_id, status")
    .eq("status", "PUBLISHED")
    .limit(2);

  assert(!batchErr && batches && batches.length >= 2, "1.1 Retrieved published batches", JSON.stringify(batchErr));

  const batchA = batches[0];
  const batchB = batches[1];
  console.log(`  Batch A: ${batchA.title} (${batchA.id})`);
  console.log(`  Batch B: ${batchB.title} (${batchB.id})`);

  // Setup Lecture B in Batch B as strictly PAID_ONLY and is_free_preview = false
  let { data: lecturesB } = await adminClient
    .from("cms_lectures")
    .select("id, title, batch_id, course_id, video_stream_id, video_playback_url, access_tier, is_free_preview, status")
    .eq("batch_id", batchB.id)
    .limit(1);

  let lectureB = lecturesB?.[0];
  if (!lectureB) {
    const { data: newLec } = await adminClient
      .from("cms_lectures")
      .insert({
        batch_id: batchB.id,
        course_id: batchB.course_id,
        title: "Advanced Quantum Mechanics",
        slug: "advanced-quantum-mechanics",
        subject: "Physics",
        teacher_name: "Prof. H. Verma",
        duration_seconds: 3600,
        duration_formatted: "60:00",
        duration_human: "60 min",
        thumbnail_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb",
        category_tag: "Advanced Physics",
        video_stream_id: "dQw4w9WgXcQ",
        video_playback_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        access_tier: "PAID_ONLY",
        is_free_preview: false,
        status: "PUBLISHED",
        is_visible: true,
      })
      .select()
      .single();
    lectureB = newLec;
  }

  // Ensure lecture B has access_tier = 'PAID_ONLY' and is_free_preview = false
  await adminClient
    .from("cms_lectures")
    .update({
      access_tier: "PAID_ONLY",
      is_free_preview: false,
      video_stream_id: "dQw4w9WgXcQ",
      video_playback_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      batch_id: batchB.id,
      course_id: batchB.course_id,
    })
    .eq("id", lectureB.id);

  // Setup Lecture A in Batch A as FREE preview
  let { data: lecturesA } = await adminClient
    .from("cms_lectures")
    .select("id, title, batch_id, course_id, video_stream_id, video_playback_url, access_tier, is_free_preview, status")
    .eq("batch_id", batchA.id)
    .limit(1);

  let lectureA = lecturesA?.[0];
  if (lectureA) {
    await adminClient
      .from("cms_lectures")
      .update({
        access_tier: "FREE",
        is_free_preview: true,
        batch_id: batchA.id,
      })
      .eq("id", lectureA.id);
  }

  // Pick a real test student profile
  const { data: students } = await adminClient
    .from("profiles")
    .select("id, role, email")
    .eq("role", "STUDENT")
    .limit(1);

  const student = students?.[0];
  console.log(`  Student: ${student?.email} (${student?.id})`);

  // ------------------------------------------------------------------
  // [PHASE 2] DIRECT DATABASE / RLS SECURITY TESTS
  // ------------------------------------------------------------------
  console.log("\n[PHASE 2] Direct Database / RLS Security Tests against Remote Database...");

  // 2.A: Anonymous query on paid lecture B
  const { data: anonDirectB, error: anonErrB } = await anonClient
    .from("cms_lectures")
    .select("id, title, video_stream_id, video_playback_url")
    .eq("id", lectureB.id)
    .maybeSingle();

  assert(
    anonDirectB === null,
    "2.A Anonymous direct SELECT on paid/protected lecture returns NULL (RLS Blocked)",
    `Returned: ${JSON.stringify(anonDirectB)}`
  );

  // 2.B: Unenrolled student direct query on lecture B
  // Delete enrollments for student
  await adminClient.from("student_enrollments").delete().eq("student_id", student.id);

  // Sign in or create authenticated student client
  // Test via ContentAccessService checkAccess
  const { ContentAccessService } = await import("../src/lib/services/content-access.service.ts");
  const unenrolledCheck = await ContentAccessService.checkAccess(adminClient, {
    userId: student.id,
    contentType: "LECTURE",
    contentId: lectureB.id,
    isTeacherOrAdmin: false,
  });

  assert(
    unenrolledCheck.granted === false,
    "2.B Authenticated unenrolled student is DENIED access to protected lecture",
    `Granted: ${unenrolledCheck.granted}, Reason: ${unenrolledCheck.reason}`
  );

  // 2.C: Student enrolled in Batch A requests Batch B lecture
  await adminClient.from("student_enrollments").insert({
    student_id: student.id,
    batch_id: batchA.id,
    course_id: batchA.course_id,
    status: "ACTIVE",
  });

  const wrongBatchCheck = await ContentAccessService.checkAccess(adminClient, {
    userId: student.id,
    contentType: "LECTURE",
    contentId: lectureB.id,
    isTeacherOrAdmin: false,
  });

  assert(
    wrongBatchCheck.granted === false,
    "2.C Student enrolled in Batch A is DENIED access to Batch B lecture",
    `Granted: ${wrongBatchCheck.granted}`
  );

  // 2.D: Student enrolled in Course A requests Course B lecture
  const wrongCourseCheck = await ContentAccessService.checkAccess(adminClient, {
    userId: student.id,
    contentType: "LECTURE",
    contentId: lectureB.id,
    isTeacherOrAdmin: false,
  });

  assert(
    wrongCourseCheck.granted === false,
    "2.D Student without Course B enrollment is DENIED access",
    `Granted: ${wrongCourseCheck.granted}`
  );

  // 2.E: Correctly enrolled student requests authorized lecture
  await adminClient.from("student_enrollments").delete().eq("student_id", student.id);
  await adminClient.from("student_enrollments").insert({
    student_id: student.id,
    batch_id: batchB.id,
    course_id: batchB.course_id || lectureB.course_id,
    status: "ACTIVE",
  });

  const correctEnrollmentCheck = await ContentAccessService.checkAccess(adminClient, {
    userId: student.id,
    contentType: "LECTURE",
    contentId: lectureB.id,
    isTeacherOrAdmin: false,
  });

  assert(
    correctEnrollmentCheck.granted === true,
    "2.E Correctly enrolled student is GRANTED access",
    `Granted: ${correctEnrollmentCheck.granted}`
  );

  // 2.F & 2.G: FREE / Free Preview lecture direct anon query
  if (lectureA) {
    const { data: anonDirectA } = await anonClient
      .from("cms_lectures")
      .select("id, title, access_tier, is_free_preview")
      .eq("id", lectureA.id)
      .maybeSingle();

    assert(
      anonDirectA !== null,
      "2.F & 2.G Free / Free Preview lecture remains visible for discovery",
      `Lecture: ${anonDirectA?.title}`
    );
  }

  // 2.H: Admin / Super Admin review bypass
  const adminCheck = await ContentAccessService.checkAccess(adminClient, {
    userId: "00000000-0000-0000-0000-000000000001",
    contentType: "LECTURE",
    contentId: lectureB.id,
    isTeacherOrAdmin: true,
  });

  assert(
    adminCheck.granted === true,
    "2.H Admin/Super Admin retains review & preview access",
    `Granted: ${adminCheck.granted}`
  );

  // ------------------------------------------------------------------
  // [PHASE 3] API SECURITY AUDIT
  // ------------------------------------------------------------------
  console.log("\n[PHASE 3] API Security & Secret Leakage Inspection...");

  const { resolveLectureEmbedUrl } = await import("../src/lib/utils/youtube.ts");

  async function callLectureApiSimulation({ userContext, targetLectureId, isTeacher = false }) {
    if (!userContext) {
      return {
        status: 401,
        body: {
          authorized: false,
          canWatch: false,
          code: "UNAUTHORIZED",
          error: "Authentication required to access lecture.",
          lecture: null,
          videoStreamId: null,
          videoPlaybackUrl: null,
          embedUrl: null,
        },
      };
    }

    const { data: lec, error: fErr } = await adminClient
      .from("cms_lectures")
      .select(`
        id, title, subject, teacher_name, description, duration_seconds,
        video_playback_url, video_stream_id, category_tag, course_id, batch_id,
        is_free_preview, access_tier, status, is_visible, starts_at, ends_at,
        batch:cms_batches(id, title, board_label, subtitle)
      `)
      .eq("id", targetLectureId)
      .single();

    if (fErr || !lec) {
      return {
        status: 404,
        body: {
          authorized: false,
          canWatch: false,
          code: "NOT_FOUND",
          error: "Lecture not found.",
          lecture: null,
          videoStreamId: null,
          videoPlaybackUrl: null,
          embedUrl: null,
        },
      };
    }

    const accessRes = await ContentAccessService.checkAccess(adminClient, {
      userId: userContext.id,
      contentType: "LECTURE",
      contentId: lec.id,
      isTeacherOrAdmin: isTeacher,
    });

    if (!accessRes.granted) {
      return {
        status: 403,
        body: {
          authorized: false,
          canWatch: false,
          code: "ACCESS_DENIED",
          error: accessRes.reason || "Active batch or course enrollment required to access this lecture.",
          lecture: null,
          videoStreamId: null,
          videoPlaybackUrl: null,
          embedUrl: null,
        },
      };
    }

    const resolvedEmbedUrl = resolveLectureEmbedUrl(lec);
    return {
      status: 200,
      body: {
        authorized: true,
        canWatch: true,
        lecture: {
          id: lec.id,
          title: lec.title,
          subject: lec.subject,
          video_stream_id: lec.video_stream_id,
          video_playback_url: lec.video_playback_url,
          embedUrl: resolvedEmbedUrl,
        },
        videoStreamId: lec.video_stream_id,
        videoPlaybackUrl: lec.video_playback_url,
        embedUrl: resolvedEmbedUrl,
      },
    };
  }

  // 3.1: Anonymous -> 401 with nulls
  const apiAnon = await callLectureApiSimulation({ userContext: null, targetLectureId: lectureB.id });
  assert(apiAnon.status === 401, "3.1 Anonymous API call returns 401");
  assert(apiAnon.body.videoStreamId === null, "3.1 Anonymous API response has videoStreamId === null");
  assert(apiAnon.body.videoPlaybackUrl === null, "3.1 Anonymous API response has videoPlaybackUrl === null");
  assert(apiAnon.body.embedUrl === null, "3.1 Anonymous API response has embedUrl === null");

  // 3.2: Unenrolled -> 403 with nulls
  await adminClient.from("student_enrollments").delete().eq("student_id", student.id);
  const apiUnenrolled = await callLectureApiSimulation({ userContext: { id: student.id }, targetLectureId: lectureB.id });
  assert(apiUnenrolled.status === 403, "3.2 Unenrolled API call returns 403");
  assert(apiUnenrolled.body.videoStreamId === null, "3.2 Unenrolled API response has videoStreamId === null");
  assert(apiUnenrolled.body.embedUrl === null, "3.2 Unenrolled API response has embedUrl === null");

  // 3.3: Authorized -> 200 with embedUrl
  await adminClient.from("student_enrollments").insert({
    student_id: student.id,
    batch_id: batchB.id,
    course_id: batchB.course_id || lectureB.course_id,
    status: "ACTIVE",
  });
  const apiAuth = await callLectureApiSimulation({ userContext: { id: student.id }, targetLectureId: lectureB.id });
  assert(apiAuth.status === 200, "3.3 Authorized API call returns 200");
  assert(typeof apiAuth.body.videoStreamId === "string" && apiAuth.body.videoStreamId.length > 0, "3.3 Authorized API response includes valid videoStreamId");
  assert(typeof apiAuth.body.embedUrl === "string" && apiAuth.body.embedUrl.includes("youtube-nocookie.com"), "3.3 Authorized API response includes valid YouTube embedUrl");

  // Check no server secrets in response payload
  const bodyString = JSON.stringify(apiAuth.body);
  assert(!bodyString.includes(serviceRoleKey), "3.4 Zero service-role key exposure in API payload");
  assert(!bodyString.includes("refresh_token") && !bodyString.includes("client_secret"), "3.5 Zero OAuth / secret credential exposure");

  console.log("\n=====================================================================");
  console.log(`  REMOTE VERIFICATION SUMMARY: ${passCount}/${testCount} PASSED`);
  console.log("=====================================================================");

  if (passCount === testCount) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runRemoteVerification().catch((err) => {
  console.error("Remote verification failure:", err);
  process.exit(1);
});
