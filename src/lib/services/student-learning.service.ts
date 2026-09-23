/**
 * TopVeda Student Learning Service (Phase 5A)
 * Core business engine for My Learning, Course Enrollments, Dynamic Progress Calculation,
 * Continue Learning checkpoints, and Non-Enrolled Recommendations.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  MyLearningData,
  EnrolledCourseCardData,
  RecommendedCourseCardData,
  StudentEnrollment,
  ContentAccessTier,
} from "@/types/student-learning.types";
import { ContentAccessService } from "./content-access.service";

export class StudentLearningService {
  /**
   * Fetches personalized My Learning dashboard data for an authenticated student.
   * Real database queries: Enrolled courses, dynamic calculated progress, resume links, and recommendations.
   */
  public static async getMyLearning(
    supabase: SupabaseClient,
    userId: string
  ): Promise<MyLearningData> {
    try {
      // 1. Fetch Student Enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_enrollments")
        .select(`
          id,
          student_id,
          course_id,
          batch_id,
          status,
          enrolled_at,
          completed_at,
          last_accessed_at,
          course:cms_courses(
            id,
            title,
            category,
            slug,
            icon_type,
            icon_color,
            icon_bg,
            access_tier,
            board:cms_boards(id, name, code),
            subject:cms_subjects(id, name, code),
            class_level:cms_class_levels(id, name, code)
          ),
          batch:cms_batches(
            id,
            title,
            board_label
          )
        `)
        .eq("student_id", userId)
        .order("last_accessed_at", { ascending: false });

      if (enrollError) {
        console.warn("[StudentLearningService] Failed to fetch enrollments:", enrollError.message);
      }

      const enrolledList = enrollments || [];
      const enrolledCourseIds = enrolledList
        .map((e) => (e.course as { id?: string })?.id)
        .filter(Boolean) as string[];

      // 2. Fetch Published Lectures count per course to calculate dynamic progress
      const { data: allLectures } = await supabase
        .from("cms_lectures")
        .select(`
          id,
          title,
          chapter:cms_chapters(
            course_id
          )
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true);

      // Group total lectures by course_id
      const courseTotalLecturesMap = new Map<string, number>();
      const courseFirstLectureMap = new Map<string, { id: string; title: string }>();

      (allLectures || []).forEach((lec) => {
        const courseId = (lec.chapter as { course_id?: string })?.course_id;
        if (courseId) {
          const currentCount = courseTotalLecturesMap.get(courseId) || 0;
          courseTotalLecturesMap.set(courseId, currentCount + 1);
          if (!courseFirstLectureMap.has(courseId)) {
            courseFirstLectureMap.set(courseId, { id: lec.id, title: lec.title });
          }
        }
      });

      // 3. Fetch Student Lecture Progress
      const { data: progressRecords } = await supabase
        .from("student_lecture_progress")
        .select("id, lecture_id, course_id, last_position_seconds, is_completed, last_watched_at")
        .eq("student_id", userId);

      const courseCompletedLecturesMap = new Map<string, number>();
      const courseLastWatchedMap = new Map<string, { lectureId: string; position: number; lastWatchedAt: string }>();

      (progressRecords || []).forEach((prog) => {
        if (prog.is_completed) {
          const currentCount = courseCompletedLecturesMap.get(prog.course_id) || 0;
          courseCompletedLecturesMap.set(prog.course_id, currentCount + 1);
        }

        const existingLast = courseLastWatchedMap.get(prog.course_id);
        if (!existingLast || new Date(prog.last_watched_at) > new Date(existingLast.lastWatchedAt)) {
          courseLastWatchedMap.set(prog.course_id, {
            lectureId: prog.lecture_id,
            position: prog.last_position_seconds,
            lastWatchedAt: prog.last_watched_at,
          });
        }
      });

      // 4. Map Enrolled Courses into Presentational Model
      const mappedEnrolled: EnrolledCourseCardData[] = [];
      const mappedCompleted: EnrolledCourseCardData[] = [];

      for (const e of enrolledList) {
        const course = e.course as any;
        if (!course) continue;

        const courseId = course.id;
        const totalLecs = courseTotalLecturesMap.get(courseId) || 0;
        const completedLecs = courseCompletedLecturesMap.get(courseId) || 0;

        // Dynamic, non-fake mathematically exact progress
        const progressPercent = totalLecs > 0 ? Math.round((completedLecs / totalLecs) * 100) : 0;

        const lastWatched = courseLastWatchedMap.get(courseId);
        const firstLecture = courseFirstLectureMap.get(courseId);

        const resumeLectureId = lastWatched ? lastWatched.lectureId : firstLecture?.id;
        const resumeUrl = resumeLectureId
          ? `/student/lectures/${resumeLectureId}`
          : `/student/courses/${courseId}`;
        const detailsUrl = `/student/courses/${courseId}`;

        // Format board and subject titles (matching the reference image layout e.g. "Class 10 – Mathematics", "CBSE Board")
        const classTitle = course.class_level?.name || course.title;
        const subjectTitle = course.subject?.name || course.category;
        const formattedTitle = `${classTitle} – ${subjectTitle}`;
        const boardName = course.board?.name ? `${course.board.name} Board` : "TopVeda Board";

        const cardData: EnrolledCourseCardData = {
          id: e.id,
          courseId,
          title: formattedTitle,
          category: course.category,
          boardName,
          subjectName: subjectTitle,
          batchTitle: (e.batch as any)?.title || null,
          progressPercent,
          totalLectures: totalLecs,
          completedLectures: completedLecs,
          lastWatchedLectureId: lastWatched?.lectureId || null,
          lastWatchedPosition: lastWatched?.position || 0,
          resumeUrl,
          detailsUrl,
          iconType: course.icon_type || "school",
          iconBg: course.icon_bg || "bg-rose-50 border-rose-100",
          iconColor: course.icon_color || "text-rose-500",
          status: e.status,
          enrolledAt: e.enrolled_at,
          lastAccessedAt: e.last_accessed_at,
          accessTier: (course.access_tier as ContentAccessTier) || "FREE",
        };

        if (e.status === "COMPLETED" || progressPercent >= 100) {
          mappedCompleted.push(cardData);
        } else {
          mappedEnrolled.push(cardData);
        }
      }

      // 5. Fetch Recommended for You (Published courses not yet enrolled in)
      const { data: rawRecommended } = await supabase
        .from("cms_courses")
        .select(`
          id,
          title,
          category,
          slug,
          icon_type,
          icon_color,
          icon_bg,
          access_tier,
          short_description,
          board:cms_boards(id, name, code),
          subject:cms_subjects(id, name, code),
          class_level:cms_class_levels(id, name, code)
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true })
        .limit(10);

      const recommendedCourses: RecommendedCourseCardData[] = (rawRecommended || [])
        .filter((c) => !enrolledCourseIds.includes(c.id))
        .map((c: any) => {
          const classTitle = c.class_level?.name || c.title;
          const subjectTitle = c.subject?.name || c.category;
          const formattedTitle = `${classTitle} – ${subjectTitle}`;
          const boardName = c.board?.name ? `${c.board.name} Board` : "TopVeda Board";

          return {
            id: c.id,
            title: formattedTitle,
            category: c.category,
            boardName,
            subjectName: subjectTitle,
            topicsSubtitle: c.short_description || "Comprehensive syllabus coverage & practice",
            iconType: c.icon_type || "school",
            iconBg: c.icon_bg || "bg-sky-50 border-sky-100",
            iconColor: c.icon_color || "text-sky-500",
            exploreUrl: `/student/courses/${c.id}`,
            accessTier: (c.access_tier as ContentAccessTier) || "FREE",
          };
        });

      return {
        enrolledCourses: mappedEnrolled,
        completedCourses: mappedCompleted,
        recommendedCourses,
      };
    } catch (err) {
      console.error("[StudentLearningService] Error in getMyLearning:", err);
      return {
        enrolledCourses: [],
        completedCourses: [],
        recommendedCourses: [],
      };
    }
  }

  /**
   * Explicit Student Course Enrollment Action
   * Validates access tier, prevents duplicate enrollment, and records in database.
   */
  public static async enrollInCourse(
    supabase: SupabaseClient,
    params: {
      userId: string;
      courseId: string;
      batchId?: string | null;
    }
  ): Promise<{ success: boolean; enrollment?: StudentEnrollment; error?: string }> {
    const { userId, courseId, batchId } = params;

    try {
      // 1. Validate Access via ContentAccessService
      const access = await ContentAccessService.checkAccess(supabase, {
        userId,
        contentType: "COURSE",
        contentId: courseId,
      });

      if (!access.granted || access.isLocked) {
        return {
          success: false,
          error: access.reason || "You are not eligible to enroll in this course.",
        };
      }

      // 2. Resolve target batch binding (if not explicitly passed, find the primary active batch for this course)
      let resolvedBatchId = batchId || null;
      if (!resolvedBatchId) {
        const { data: defaultBatch } = await supabase
          .from("cms_batches")
          .select("id")
          .eq("course_id", courseId)
          .eq("status", "PUBLISHED")
          .eq("is_visible", true)
          .order("display_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (defaultBatch?.id) {
          resolvedBatchId = defaultBatch.id;
        }
      }

      // 3. Check for Duplicate Enrollment & Update Batch Binding if unlinked
      const { data: existing } = await supabase
        .from("student_enrollments")
        .select("*")
        .eq("student_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existing) {
        if (resolvedBatchId && (!existing.batch_id || existing.batch_id !== resolvedBatchId)) {
          const { data: updated, error: updateErr } = await supabase
            .from("student_enrollments")
            .update({
              batch_id: resolvedBatchId,
              status: "ACTIVE",
              last_accessed_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .select("*")
            .single();

          if (!updateErr && updated) {
            return {
              success: true,
              enrollment: updated as StudentEnrollment,
            };
          }
        }

        return {
          success: true,
          enrollment: existing as StudentEnrollment,
        };
      }

      // 4. Insert New Enrollment Record with resolved batch_id
      const { data: newEnrollment, error: insertError } = await supabase
        .from("student_enrollments")
        .insert({
          student_id: userId,
          course_id: courseId,
          batch_id: resolvedBatchId,
          status: "ACTIVE",
          enrolled_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (insertError) {
        return {
          success: false,
          error: insertError.message,
        };
      }

      return {
        success: true,
        enrollment: newEnrollment as StudentEnrollment,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Updates Lecture Progress and Study Activity from video player heartbeat
   */
  public static async updateLectureProgress(
    supabase: SupabaseClient,
    params: {
      userId: string;
      lectureId: string;
      courseId: string;
      lastPositionSeconds: number;
      watchDurationSeconds: number;
      totalDurationSeconds: number;
    }
  ): Promise<{ success: boolean; isCompleted: boolean }> {
    const {
      userId,
      lectureId,
      courseId,
      lastPositionSeconds,
      watchDurationSeconds,
      totalDurationSeconds,
    } = params;

    try {
      const isCompleted =
        totalDurationSeconds > 0 && lastPositionSeconds / totalDurationSeconds >= 0.85;

      const now = new Date().toISOString();

      // Upsert lecture progress checkpoint
      await supabase.from("student_lecture_progress").upsert(
        {
          student_id: userId,
          lecture_id: lectureId,
          course_id: courseId,
          last_position_seconds: lastPositionSeconds,
          watch_duration_seconds: watchDurationSeconds,
          is_completed: isCompleted,
          completed_at: isCompleted ? now : null,
          last_watched_at: now,
        },
        { onConflict: "student_id, lecture_id" }
      );

      // Append granular study log
      await supabase.from("student_learning_activity").insert({
        student_id: userId,
        activity_type: "LECTURE_WATCH",
        entity_type: "LECTURE",
        entity_id: lectureId,
        duration_seconds: Math.min(watchDurationSeconds, 60), // capped heartbeat
        activity_date: new Date().toISOString().split("T")[0],
        metadata: { courseId, lastPositionSeconds, isCompleted },
      });

      // Update enrollment last_accessed_at
      await supabase
        .from("student_enrollments")
        .update({ last_accessed_at: now })
        .eq("student_id", userId)
        .eq("course_id", courseId);

      return { success: true, isCompleted };
    } catch (err) {
      console.error("[StudentLearningService] Failed to update progress:", err);
      return { success: false, isCompleted: false };
    }
  }
}
