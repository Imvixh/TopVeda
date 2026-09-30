/**
 * TopVeda Student Progress Service (Phase 5B & Personalization Polish)
 * Core business engine for Overall Learning Progress (Lecture-Weighted Metric),
 * Course/Batch Progress Breakdown, Subject-Wise Progress Aggregation,
 * Server-Authoritative Live Attendance Tracking, Assessment Analytics,
 * Learning Confidence Signal, and Dynamic Actionable Focus Areas.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  StudentProgressSummary,
  CourseBatchProgressItem,
  SubjectProgressItem,
  RecentTestResultItem,
  FocusAreaItem,
  LearningConfidenceSignal,
} from "@/types/student-learning.types";

// Subject Visual Style Resolver matching the TopVeda Reference Palette
function getSubjectTheme(subjectName: string) {
  const name = (subjectName || "").toLowerCase();

  if (name.includes("math")) {
    return {
      iconBg: "bg-[#FFE8EC] border border-[#FFD0D9] text-[#F43F5E]", // Rose/pink square
      barColor: "bg-[#059669]", // Emerald bar
    };
  }
  if (name.includes("sci") || name.includes("phy") || name.includes("chem") || name.includes("bio")) {
    return {
      iconBg: "bg-[#EBF3FF] border border-[#CFE2FE] text-[#2563EB]", // Blue square
      barColor: "bg-[#0D9488]", // Teal bar
    };
  }
  if (name.includes("eng") || name.includes("lang")) {
    return {
      iconBg: "bg-[#FFF4E8] border border-[#FFE2C2] text-[#F97316]", // Amber/orange square
      barColor: "bg-[#0284C7]", // Sky blue bar
    };
  }
  if (name.includes("social") || name.includes("hist") || name.includes("geo") || name.includes("civ")) {
    return {
      iconBg: "bg-[#F5EDFF] border border-[#E7D6FF] text-[#9333EA]", // Purple square
      barColor: "bg-[#3B82F6]", // Blue bar
    };
  }
  if (name.includes("comp") || name.includes("tech") || name.includes("app")) {
    return {
      iconBg: "bg-[#EAF5FF] border border-[#CCE5FE] text-[#0284C7]", // Light blue square
      barColor: "bg-[#2563EB]", // Royal blue bar
    };
  }

  return {
    iconBg: "bg-[#FFF0EB] border border-[#FFD9CC] text-[#FF5722]",
    barColor: "bg-[#FF5722]",
  };
}

export class StudentProgressService {
  /**
   * Aggregates factual, non-fake student learning progress metrics.
   * Computes exact lecture weights, real attendance, test statistics, and confidence signals.
   */
  public static async getProgressSummary(
    supabase: SupabaseClient,
    userId: string
  ): Promise<StudentProgressSummary> {
    try {
      // 1. Fetch Student Enrollments with joined course and batch data
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_enrollments")
        .select(`
          id,
          course_id,
          batch_id,
          status,
          enrolled_at,
          last_accessed_at,
          course:cms_courses(
            id,
            title,
            category,
            subject_id,
            board:cms_boards(id, name, code),
            subject:cms_subjects(id, name, code),
            class_level:cms_class_levels(id, name, code)
          ),
          batch:cms_batches(
            id,
            title,
            board_label,
            subtitle,
            educator_name,
            batch_teachers:cms_batch_teachers(
              display_order,
              teacher:profiles(id, full_name)
            )
          )
        `)
        .eq("student_id", userId);

      if (enrollError) {
        console.warn("[StudentProgressService] Enrollments fetch warning:", enrollError.message);
      }

      const enrolledList = enrollments || [];
      const enrolledBatchIds = enrolledList
        .map((e) => (e.batch as { id?: string })?.id || e.batch_id)
        .filter(Boolean) as string[];

      // 2. Fetch Published Lectures
      const { data: allLectures } = await supabase
        .from("cms_lectures")
        .select(`
          id,
          title,
          subject,
          duration_seconds,
          batch_id,
          chapter_id,
          chapter:cms_chapters(
            id,
            title,
            course_id
          )
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true);

      const courseLecturesMap = new Map<string, Array<{ id: string }>>();
      const batchLecturesMap = new Map<string, Array<{ id: string }>>();
      const chapterList: { id: string; title: string; courseId: string; subjectName: string }[] = [];

      (allLectures || []).forEach((lec) => {
        const chapter = lec.chapter as { id?: string; title?: string; course_id?: string };
        const courseId = chapter?.course_id;

        if (courseId) {
          const list = courseLecturesMap.get(courseId) || [];
          list.push(lec);
          courseLecturesMap.set(courseId, list);

          if (chapter.id && chapter.title) {
            chapterList.push({
              id: chapter.id,
              title: chapter.title,
              courseId,
              subjectName: lec.subject || "General",
            });
          }
        }

        if (lec.batch_id) {
          const bList = batchLecturesMap.get(lec.batch_id) || [];
          bList.push(lec);
          batchLecturesMap.set(lec.batch_id, bList);
        }
      });

      // 3. Fetch Student Lecture Progress
      const { data: progressRecords } = await supabase
        .from("student_lecture_progress")
        .select("id, lecture_id, course_id, watch_duration_seconds, last_position_seconds, is_completed")
        .eq("student_id", userId);

      const completedLectureIds = new Set<string>();
      const inProgressLectureIds = new Set<string>();

      (progressRecords || []).forEach((prog) => {
        if (prog.watch_duration_seconds > 0 || prog.last_position_seconds > 0) {
          inProgressLectureIds.add(prog.lecture_id);
        }
        if (prog.is_completed) {
          completedLectureIds.add(prog.lecture_id);
        }
      });

      // 4. Fetch Server-Authoritative Live Class Attendance & Scheduled Counts
      let liveClassesAttended = 0;
      try {
        const { count } = await supabase
          .from("student_live_attendance")
          .select("id", { count: "exact", head: true })
          .eq("student_id", userId)
          .eq("is_attended", true);

        liveClassesAttended = count || 0;
      } catch {
        const { count } = await supabase
          .from("student_learning_activity")
          .select("id", { count: "exact", head: true })
          .eq("student_id", userId)
          .eq("activity_type", "LIVE_ATTENDANCE");

        liveClassesAttended = count || 0;
      }

      // Fetch past / completed live classes accessible to the student
      let totalLiveClassesScheduled = 0;
      try {
        let liveQuery = supabase
          .from("cms_live_classes")
          .select("id", { count: "exact", head: true })
          .in("live_status", ["COMPLETED", "TERMINATED", "LIVE", "SCHEDULED"]);

        if (enrolledBatchIds.length > 0) {
          liveQuery = liveQuery.in("batch_id", enrolledBatchIds);
        }

        const { count: liveCount } = await liveQuery;
        totalLiveClassesScheduled = liveCount || 0;
      } catch (liveErr) {
        console.warn("[StudentProgressService] Non-blocking live count warning:", liveErr);
      }

      const liveAttendancePercent =
        totalLiveClassesScheduled > 0
          ? Math.min(100, Math.round((liveClassesAttended / totalLiveClassesScheduled) * 100))
          : liveClassesAttended > 0
          ? 100
          : 0;

      // 5. Fetch Assessment / Test Performance from student_test_attempts
      let testsAttempted = 0;
      let quizzesAttempted = 0;
      let scoreSumPercent = 0;
      let scoreCount = 0;
      let bestTestScorePercent: number | null = null;
      const recentTestResults: RecentTestResultItem[] = [];
      const testAttemptsByCourse = new Map<string, number>();

      try {
        const { data: attempts } = await supabase
          .from("student_test_attempts")
          .select(`
            id,
            test_id,
            score_obtained,
            max_score,
            passed,
            created_at,
            test:student_tests(
              id,
              title,
              subject_name,
              test_type,
              course_id
            )
          `)
          .eq("student_id", userId)
          .in("status", ["SUBMITTED", "EVALUATED"])
          .order("created_at", { ascending: false });

        (attempts || []).forEach((att) => {
          const testData = att.test as {
            id?: string;
            title?: string;
            subject_name?: string;
            test_type?: string;
            course_id?: string;
            batch_id?: string;
          } | null;

          testsAttempted++;
          if (testData?.test_type === "chapter_quiz" || testData?.test_type === "quiz") {
            quizzesAttempted++;
          }

          if (testData?.course_id) {
            testAttemptsByCourse.set(
              testData.course_id,
              (testAttemptsByCourse.get(testData.course_id) || 0) + 1
            );
          }

          const maxSc = att.max_score || 100;
          const obtSc = att.score_obtained || 0;
          const attemptPct = maxSc > 0 ? Math.round((obtSc / maxSc) * 100) : 0;

          scoreSumPercent += attemptPct;
          scoreCount++;

          if (bestTestScorePercent === null || attemptPct > bestTestScorePercent) {
            bestTestScorePercent = attemptPct;
          }

          if (recentTestResults.length < 6) {
            recentTestResults.push({
              id: att.id,
              testTitle: testData?.title || "Academic Assessment",
              subjectName: testData?.subject_name || "General",
              scoreObtained: obtSc,
              maxScore: maxSc,
              percentage: attemptPct,
              passed: !!att.passed,
              attemptedAt: att.created_at,
            });
          }
        });
      } catch (testErr) {
        console.warn("[StudentProgressService] Non-blocking test attempts fetch warning:", testErr);
      }

      const averageTestScorePercent =
        scoreCount > 0 ? Math.round(scoreSumPercent / scoreCount) : null;

      // 6. Build Course / Batch Progress Breakdown
      const courseProgress: CourseBatchProgressItem[] = [];
      const distinctAccessibleLectureIds = new Set<string>();
      let totalAccessibleLectures = 0;

      // Subject aggregation map
      const subjectAggregationMap = new Map<
        string,
        { subjectName: string; totalLecs: number; completedLecs: number; lectureIds: Set<string> }
      >();

      enrolledList.forEach((e) => {
        const course = e.course as {
          id?: string;
          title?: string;
          category?: string;
          class_level?: { name?: string };
          subject?: { name?: string };
          board?: { name?: string };
        } | null;
        const batch = e.batch as {
          id?: string;
          title?: string;
          board_label?: string;
          educator_name?: string | null;
          batch_teachers?: Array<{ teacher?: { full_name?: string } }>;
        } | null;
        const courseId = course?.id || e.course_id;
        const batchId = batch?.id || e.batch_id || null;

        // Distinct accessible lectures for this enrollment
        const enrollmentLectureIds = new Set<string>();
        if (courseId && courseLecturesMap.has(courseId)) {
          courseLecturesMap.get(courseId)!.forEach((l) => enrollmentLectureIds.add(l.id));
        }
        if (batchId && batchLecturesMap.has(batchId)) {
          batchLecturesMap.get(batchId)!.forEach((l) => enrollmentLectureIds.add(l.id));
        }

        const enrollmentTotalLecs = enrollmentLectureIds.size;
        let enrollmentCompletedLecs = 0;

        enrollmentLectureIds.forEach((lid) => {
          distinctAccessibleLectureIds.add(lid);
          if (completedLectureIds.has(lid)) {
            enrollmentCompletedLecs++;
          }
        });

        const progressPercent =
          enrollmentTotalLecs > 0
            ? Math.round((enrollmentCompletedLecs / enrollmentTotalLecs) * 100)
            : 0;

        const isCompleted = e.status === "COMPLETED" || (enrollmentTotalLecs > 0 && enrollmentCompletedLecs >= enrollmentTotalLecs);

        // Faculty name
        let educatorName = batch?.educator_name || null;
        if (batch?.batch_teachers && batch.batch_teachers.length > 0) {
          educatorName = batch.batch_teachers[0]?.teacher?.full_name || educatorName;
        }

        const classTitle = course?.class_level?.name || course?.title || batch?.title || "Academic Course";
        const subjectTitle = course?.subject?.name || course?.category || "Comprehensive";
        const formattedTitle = course ? `${classTitle} – ${subjectTitle}` : batch?.title || "Batch Enrollment";
        const boardLabel = course?.board?.name ? `${course.board.name} Board` : batch?.board_label || "TopVeda Board";

        const resumeUrl = courseId ? `/student/courses/${courseId}` : `/student/batches/${batchId}`;

        courseProgress.push({
          enrollmentId: e.id,
          courseId,
          batchId,
          title: formattedTitle,
          boardLabel,
          subjectName: subjectTitle,
          educatorName,
          progressPercent,
          completedLectures: enrollmentCompletedLecs,
          totalLectures: enrollmentTotalLecs,
          liveClassesAttended: liveClassesAttended,
          liveClassesTotal: totalLiveClassesScheduled,
          testsAttempted: testAttemptsByCourse.get(courseId) || 0,
          quizzesAttempted: 0,
          resumeUrl,
          isCompleted,
        });

        // Add to subject aggregation map
        const subName = course?.subject?.name || course?.category || "General";
        const existingSub = subjectAggregationMap.get(subName) || {
          subjectName: subName,
          totalLecs: 0,
          completedLecs: 0,
          lectureIds: new Set<string>(),
        };

        enrollmentLectureIds.forEach((lid) => {
          if (!existingSub.lectureIds.has(lid)) {
            existingSub.lectureIds.add(lid);
            existingSub.totalLecs++;
            if (completedLectureIds.has(lid)) {
              existingSub.completedLecs++;
            }
          }
        });
        subjectAggregationMap.set(subName, existingSub);
      });

      totalAccessibleLectures = distinctAccessibleLectureIds.size;
      const overallProgressPercent =
        totalAccessibleLectures > 0
          ? Math.round((completedLectureIds.size / totalAccessibleLectures) * 100)
          : 0;

      const coursesCompletedCount = courseProgress.filter((c) => c.isCompleted).length;

      // 7. Calculate Subject-Wise Progress
      const subjectProgress: SubjectProgressItem[] = [];
      subjectAggregationMap.forEach((subData, subName) => {
        const subProgressPercent =
          subData.totalLecs > 0
            ? Math.round((subData.completedLecs / subData.totalLecs) * 100)
            : 0;

        const theme = getSubjectTheme(subName);

        subjectProgress.push({
          subjectId: subName,
          subjectName: subName,
          iconBg: theme.iconBg,
          iconColor: "",
          barColor: theme.barColor,
          progressPercent: subProgressPercent,
          totalLectures: subData.totalLecs,
          completedLectures: subData.completedLecs,
        });
      });

      // Sort subjects by lowest progress first to identify improvement areas
      const sortedSubjects = [...subjectProgress].sort(
        (a, b) => a.progressPercent - b.progressPercent
      );

      // 8. Areas to Improve & Detailed Focus Areas (Strictly based on measurable learning signals)
      const areasToImprove: string[] = [];
      const detailedFocusAreas: FocusAreaItem[] = [];

      sortedSubjects.forEach((sub) => {
        if (sub.progressPercent < 100) {
          const remainingLecs = sub.totalLectures - sub.completedLectures;
          const desc = remainingLecs > 0
            ? `${remainingLecs} lecture${remainingLecs > 1 ? "s" : ""} remaining to complete syllabus.`
            : `Complete subject chapters and attempt practice tests.`;

          areasToImprove.push(`${sub.subjectName}: ${desc}`);
          detailedFocusAreas.push({
            subject: sub.subjectName,
            reason: desc,
            actionLabel: "Watch Next Lecture",
            actionUrl: "/student/learning",
          });
        }
      });

      if (averageTestScorePercent !== null && averageTestScorePercent < 70) {
        areasToImprove.push(`Assessment: Overall test average is ${averageTestScorePercent}%. Practice chapter quizzes to strengthen accuracy.`);
        detailedFocusAreas.push({
          subject: "Assessment Practice",
          reason: `Current test score average is ${averageTestScorePercent}%. Revision quizzes recommended.`,
          actionLabel: "Take Practice Test",
          actionUrl: "/student/tests",
        });
      }

      if (totalLiveClassesScheduled > 0 && liveAttendancePercent < 75) {
        areasToImprove.push(`Live Classes: Attendance is ${liveAttendancePercent}%. Join live sessions for interactive doubt resolution.`);
      }

      if (areasToImprove.length === 0) {
        if (enrolledList.length > 0) {
          areasToImprove.push("All enrolled syllabus on track. Keep revising formulas and practicing tests.");
          detailedFocusAreas.push({
            subject: "Daily Revision",
            reason: "All current coursework is progressing well. Maintain your daily study streak.",
            actionLabel: "Explore Practice Tests",
            actionUrl: "/student/tests",
          });
        } else {
          areasToImprove.push("Enroll in your target class and board courses to start your personalized progress tracker.");
          detailedFocusAreas.push({
            subject: "Course Enrollment",
            reason: "No active enrollments found. Choose your course to begin.",
            actionLabel: "Browse Courses",
            actionUrl: "/student/learning",
          });
        }
      }

      // 9. TopVeda Learning Confidence Signal (Clearly defined educational signal)
      let learningConfidence: LearningConfidenceSignal;

      if (enrolledList.length === 0 || (completedLectureIds.size === 0 && testsAttempted === 0)) {
        learningConfidence = {
          level: "BUILDING_PROFILE",
          label: "Building Your Profile",
          description: "Watch lectures and attempt chapter quizzes to establish your initial learning velocity and confidence benchmark.",
          scoreSignal: "Awaiting Initial Activity",
        };
      } else if (
        overallProgressPercent >= 65 &&
        (averageTestScorePercent === null || averageTestScorePercent >= 70)
      ) {
        learningConfidence = {
          level: "HIGH",
          label: "High Concept Confidence",
          description: "Outstanding lecture completion pace and strong assessment retention across your enrolled subjects.",
          scoreSignal: `${overallProgressPercent}% Syllabus Covered`,
        };
      } else if (
        overallProgressPercent >= 30 ||
        (averageTestScorePercent !== null && averageTestScorePercent >= 50)
      ) {
        learningConfidence = {
          level: "MEDIUM",
          label: "Steady Learning Momentum",
          description: "Consistent progress across lecture chapters. Completing remaining lectures and weekly tests will elevate confidence to High.",
          scoreSignal: `${overallProgressPercent}% Completion Pace`,
        };
      } else {
        learningConfidence = {
          level: "DEVELOPING",
          label: "Foundational Progress",
          description: "Early phase of curriculum coverage. Build regular study habits by watching scheduled lectures and attempting practice sets.",
          scoreSignal: `${overallProgressPercent}% Progress`,
        };
      }

      return {
        overallProgressPercent,
        coursesCompleted: coursesCompletedCount,
        totalEnrolledCourses: enrolledList.length,
        lecturesWatched: completedLectureIds.size + inProgressLectureIds.size,
        totalAccessibleLectures,
        liveClassesAttended,
        totalLiveClassesScheduled,
        liveAttendancePercent,
        testsAttempted,
        quizzesAttempted,
        averageTestScorePercent,
        bestTestScorePercent,
        courseProgress,
        subjectProgress,
        recentTestResults,
        areasToImprove: areasToImprove.slice(0, 5),
        detailedFocusAreas: detailedFocusAreas.slice(0, 4),
        learningConfidence,
      };
    } catch (err) {
      console.error("[StudentProgressService] Error in getProgressSummary:", err);
      return {
        overallProgressPercent: 0,
        coursesCompleted: 0,
        totalEnrolledCourses: 0,
        lecturesWatched: 0,
        totalAccessibleLectures: 0,
        liveClassesAttended: 0,
        totalLiveClassesScheduled: 0,
        liveAttendancePercent: 0,
        testsAttempted: 0,
        quizzesAttempted: 0,
        averageTestScorePercent: null,
        bestTestScorePercent: null,
        courseProgress: [],
        subjectProgress: [],
        recentTestResults: [],
        areasToImprove: ["Enroll in courses to start tracking your learning progress."],
        detailedFocusAreas: [],
        learningConfidence: {
          level: "BUILDING_PROFILE",
          label: "Building Your Profile",
          description: "Begin watching lectures and attempting tests to establish your performance profile.",
          scoreSignal: "No Activity",
        },
      };
    }
  }

  /**
   * Server-Authoritative Live Class Attendance Tracker
   * Validates live session timing server-side before recording attendance.
   */
  public static async recordLiveAttendance(
    supabase: SupabaseClient,
    params: {
      userId: string;
      liveClassId: string;
      heartbeatDurationSeconds?: number;
    }
  ): Promise<{ success: boolean; isAttended: boolean; error?: string }> {
    const { userId, liveClassId, heartbeatDurationSeconds = 30 } = params;

    try {
      const now = new Date();

      // 1. Fetch live class to verify timing and status server-side
      const { data: liveClass, error: fetchErr } = await supabase
        .from("cms_live_classes")
        .select("id, live_status, scheduled_start, scheduled_end")
        .eq("id", liveClassId)
        .single();

      if (fetchErr || !liveClass) {
        return { success: false, isAttended: false, error: "Live class not found." };
      }

      // Live class must be active (LIVE or within scheduled window)
      const scheduledStart = new Date(liveClass.scheduled_start);
      if (now < scheduledStart && liveClass.live_status === "SCHEDULED") {
        return {
          success: false,
          isAttended: false,
          error: "Session has not started yet. Early access window is reserved for educators.",
        };
      }

      if (["TERMINATED", "CANCELLED"].includes(liveClass.live_status)) {
        return {
          success: false,
          isAttended: false,
          error: `Live class is ${liveClass.live_status.toLowerCase()}. Attendance cannot be recorded.`,
        };
      }

      const nowIso = now.toISOString();

      // 2. Fetch existing attendance row
      const { data: existing } = await supabase
        .from("student_live_attendance")
        .select("id, duration_seconds")
        .eq("student_id", userId)
        .eq("live_class_id", liveClassId)
        .maybeSingle();

      const newDuration = (existing?.duration_seconds || 0) + Math.min(heartbeatDurationSeconds, 60);

      // 3. Server-authoritative upsert into student_live_attendance
      await supabase.from("student_live_attendance").upsert(
        {
          student_id: userId,
          live_class_id: liveClassId,
          joined_at: existing ? undefined : nowIso,
          last_heartbeat_at: nowIso,
          duration_seconds: newDuration,
          is_attended: true,
          updated_at: nowIso,
        },
        { onConflict: "student_id, live_class_id" }
      );

      // 4. Append to student_learning_activity log
      await supabase.from("student_learning_activity").insert({
        student_id: userId,
        activity_type: "LIVE_ATTENDANCE",
        entity_type: "LIVE_CLASS",
        entity_id: liveClassId,
        duration_seconds: Math.min(heartbeatDurationSeconds, 60),
        activity_date: nowIso.split("T")[0],
        metadata: { liveClassId, totalAttendedSeconds: newDuration },
      });

      return { success: true, isAttended: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, isAttended: false, error: error.message };
    }
  }
}
