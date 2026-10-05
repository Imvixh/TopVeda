/**
 * TopVeda Student Learning Service (Phase 5A & Personalization Polish)
 * Core business engine for My Learning, Course Enrollments, Dynamic Progress Calculation,
 * Continue Learning checkpoints, and Non-Enrolled Content Recommendations.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  MyLearningData,
  EnrolledCourseCardData,
  RecommendedCourseCardData,
  ContinueLearningCheckpoint,
  StudentEnrollment,
  ContentAccessTier,
} from "@/types/student-learning.types";
import { ContentAccessService } from "./content-access.service";

export class StudentLearningService {
  /**
   * Fetches personalized My Learning dashboard data for an authenticated student.
   * Real database queries: Enrolled courses/batches, dynamic calculated progress,
   * continue learning checkpoint, completed courses, and recommendations.
   */
  public static async getMyLearning(
    supabase: SupabaseClient,
    userId: string
  ): Promise<MyLearningData> {
    try {
      // 1. Fetch Student Enrollments with Relational Course & Batch metadata
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
            short_description,
            board:cms_boards(id, name, code),
            subject:cms_subjects(id, name, code),
            class_level:cms_class_levels(id, name, code)
          ),
          batch:cms_batches(
            id,
            title,
            board_label,
            subtitle,
            description,
            educator_name,
            educator_avatar_url,
            batch_teachers:cms_batch_teachers(
              display_order,
              teacher:profiles!teacher_id(id, full_name, avatar_url, qualification)
            )
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
      const enrolledBatchIds = enrolledList
        .map((e) => (e.batch as { id?: string })?.id)
        .filter(Boolean) as string[];

      // 2. Fetch Published Lectures to calculate exact dynamic progress
      const { data: allLectures } = await supabase
        .from("cms_lectures")
        .select(`
          id,
          title,
          subject,
          teacher_name,
          duration_seconds,
          duration_formatted,
          thumbnail_url,
          batch_id,
          chapter_id,
          display_order,
          created_at,
          chapter:cms_chapters(
            id,
            title,
            course_id
          )
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      // Group published lectures by course_id and batch_id
      const courseLecturesMap = new Map<string, any[]>();
      const batchLecturesMap = new Map<string, any[]>();
      const allLecturesById = new Map<string, any>();

      (allLectures || []).forEach((lec) => {
        allLecturesById.set(lec.id, lec);
        const courseId = (lec.chapter as { course_id?: string })?.course_id;
        if (courseId) {
          const list = courseLecturesMap.get(courseId) || [];
          list.push(lec);
          courseLecturesMap.set(courseId, list);
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
        .select("id, lecture_id, course_id, last_position_seconds, watch_duration_seconds, is_completed, last_watched_at")
        .eq("student_id", userId);

      const completedLectureIds = new Set<string>();
      const lectureProgressMap = new Map<string, { lastPosition: number; isCompleted: boolean; lastWatchedAt: string }>();

      (progressRecords || []).forEach((prog) => {
        if (prog.is_completed) {
          completedLectureIds.add(prog.lecture_id);
        }
        lectureProgressMap.set(prog.lecture_id, {
          lastPosition: prog.last_position_seconds || 0,
          isCompleted: !!prog.is_completed,
          lastWatchedAt: prog.last_watched_at,
        });
      });

      // 4. Map Enrolled Courses into Presentation Models
      const mappedEnrolled: EnrolledCourseCardData[] = [];
      const mappedCompleted: EnrolledCourseCardData[] = [];

      let candidateCheckpoint: ContinueLearningCheckpoint | null = null;
      let latestProgressWatchedAt = 0;

      for (const e of enrolledList) {
        const course = e.course as any;
        const batch = e.batch as any;
        if (!course && !batch) continue;

        const courseId = course?.id || e.course_id;
        const batchId = batch?.id || e.batch_id || null;

        // Collect distinct accessible lectures for this enrollment
        const distinctLectureIds = new Set<string>();
        const enrollmentLectures: any[] = [];

        if (courseId && courseLecturesMap.has(courseId)) {
          for (const lec of courseLecturesMap.get(courseId)!) {
            if (!distinctLectureIds.has(lec.id)) {
              distinctLectureIds.add(lec.id);
              enrollmentLectures.push(lec);
            }
          }
        }
        if (batchId && batchLecturesMap.has(batchId)) {
          for (const lec of batchLecturesMap.get(batchId)!) {
            if (!distinctLectureIds.has(lec.id)) {
              distinctLectureIds.add(lec.id);
              enrollmentLectures.push(lec);
            }
          }
        }

        const totalLecs = enrollmentLectures.length;
        let completedLecs = 0;
        let lastWatchedLec: any = null;
        let firstIncompleteLec: any = null;

        for (const lec of enrollmentLectures) {
          const prog = lectureProgressMap.get(lec.id);
          if (prog?.isCompleted || completedLectureIds.has(lec.id)) {
            completedLecs++;
          } else if (!firstIncompleteLec) {
            firstIncompleteLec = lec;
          }

          if (prog) {
            const watchedTime = new Date(prog.lastWatchedAt).getTime();
            if (!lastWatchedLec || watchedTime > lastWatchedLec.watchedTime) {
              lastWatchedLec = { ...lec, lastPosition: prog.lastPosition, isCompleted: prog.isCompleted, watchedTime };
            }
          }
        }

        // Dynamic mathematically exact progress percentage
        const progressPercent = totalLecs > 0 ? Math.round((completedLecs / totalLecs) * 100) : 0;

        // Determine resume lecture target
        const targetLecture = lastWatchedLec && !lastWatchedLec.isCompleted
          ? lastWatchedLec
          : firstIncompleteLec || lastWatchedLec || enrollmentLectures[0] || null;

        const resumeUrl = targetLecture?.id
          ? `/student/lectures/${targetLecture.id}`
          : courseId
          ? `/student/courses/${courseId}`
          : `/student/batches/${batchId}`;

        const detailsUrl = courseId ? `/student/courses/${courseId}` : `/student/batches/${batchId}`;

        // Faculty extraction
        let educatorName = batch?.educator_name || null;
        let educatorAvatarUrl = batch?.educator_avatar_url || null;
        if (batch?.batch_teachers && batch.batch_teachers.length > 0) {
          const primaryTeacher = batch.batch_teachers[0]?.teacher;
          if (primaryTeacher?.full_name) {
            educatorName = primaryTeacher.full_name;
            educatorAvatarUrl = primaryTeacher.avatar_url || educatorAvatarUrl;
          }
        }

        // Format titles
        const classTitle = course?.class_level?.name || course?.title || batch?.title || "Academic Course";
        const subjectTitle = course?.subject?.name || course?.category || "Comprehensive";
        const formattedTitle = course ? `${classTitle} – ${subjectTitle}` : batch?.title || "Batch Enrollment";
        const boardName = course?.board?.name
          ? `${course.board.name} Board`
          : batch?.board_label
          ? `${batch.board_label}`
          : "TopVeda Board";

        const cardData: EnrolledCourseCardData = {
          id: e.id,
          courseId,
          batchId,
          title: formattedTitle,
          category: course?.category || "Academics",
          boardName,
          subjectName: subjectTitle,
          batchTitle: batch?.title || null,
          batchSubtitle: batch?.subtitle || null,
          educatorName,
          educatorAvatarUrl,
          progressPercent,
          totalLectures: totalLecs,
          completedLectures: completedLecs,
          lastWatchedLectureId: lastWatchedLec?.id || null,
          lastWatchedLectureTitle: lastWatchedLec?.title || null,
          lastWatchedPosition: lastWatchedLec?.lastPosition || 0,
          resumeUrl,
          detailsUrl,
          iconType: course?.icon_type || "school",
          iconBg: course?.icon_bg || "bg-rose-50 border-rose-100",
          iconColor: course?.icon_color || "text-rose-500",
          status: e.status,
          enrolledAt: e.enrolled_at,
          lastAccessedAt: e.last_accessed_at,
          accessTier: (course?.access_tier as ContentAccessTier) || "FREE",
        };

        if (e.status === "COMPLETED" || (totalLecs > 0 && completedLecs >= totalLecs)) {
          mappedCompleted.push(cardData);
        } else {
          mappedEnrolled.push(cardData);
        }

        // Check if this enrolled course provides the best Continue Learning checkpoint
        if (targetLecture && (!candidateCheckpoint || (lastWatchedLec?.watchedTime || 0) > latestProgressWatchedAt)) {
          latestProgressWatchedAt = lastWatchedLec?.watchedTime || 0;
          const prog = lectureProgressMap.get(targetLecture.id);
          const duration = targetLecture.duration_seconds || 2700;
          const pos = prog?.lastPosition || 0;
          const lecProgPercent = duration > 0 ? Math.min(100, Math.round((pos / duration) * 100)) : 0;

          candidateCheckpoint = {
            courseId,
            batchId,
            courseTitle: formattedTitle,
            batchTitle: batch?.title || null,
            boardName,
            subjectName: subjectTitle,
            chapterTitle: (targetLecture.chapter as any)?.title || null,
            lectureId: targetLecture.id,
            lectureTitle: targetLecture.title,
            educatorName: targetLecture.teacher_name || educatorName,
            lastPositionSeconds: pos,
            totalDurationSeconds: duration,
            durationFormatted: targetLecture.duration_formatted || "45:00",
            progressPercent: lecProgPercent,
            resumeUrl,
            thumbnailUrl: targetLecture.thumbnail_url || null,
          };
        }
      }

      // 5. Fetch Recommended for You (Published courses/batches not yet enrolled in)
      const { data: rawRecommendedCourses } = await supabase
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

      const recommendedCourses: RecommendedCourseCardData[] = (rawRecommendedCourses || [])
        .filter((c) => !enrolledCourseIds.includes(c.id))
        .map((c: any) => {
          const classTitle = c.class_level?.name || c.title;
          const subjectTitle = c.subject?.name || c.category;
          const formattedTitle = `${classTitle} – ${subjectTitle}`;
          const boardName = c.board?.name ? `${c.board.name} Board` : "TopVeda Board";

          return {
            id: c.id,
            courseId: c.id,
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

      // 5B. Append ONLY published & visible ONGOING batches that are not yet enrolled
      const nowIso = new Date().toISOString();
      const { data: rawRecommendedBatches } = await supabase
        .from("cms_batches")
        .select(`
          id,
          title,
          board_label,
          subtitle,
          description,
          educator_name,
          educator_avatar_url,
          course_id,
          is_featured,
          is_ongoing,
          pricing_type,
          price_inr,
          discount_percent
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .or(`is_ongoing.eq.true,starts_at.lte.${nowIso}`)
        .limit(8);

      (rawRecommendedBatches || []).forEach((b: any) => {
        if (!enrolledBatchIds.includes(b.id) && (!b.course_id || !enrolledCourseIds.includes(b.course_id))) {
          if (!recommendedCourses.some((r) => r.id === b.id || (b.course_id && r.courseId === b.course_id))) {
            const isFree = !b.pricing_type || b.pricing_type === "FREE" || !b.price_inr;
            recommendedCourses.push({
              id: b.id,
              batchId: b.id,
              courseId: b.course_id || undefined,
              title: b.title,
              category: "Ongoing Batch",
              boardName: b.board_label ? `${b.board_label}` : "TopVeda",
              subjectName: "Batch",
              topicsSubtitle: b.subtitle || b.description || "Structured ongoing batch with live classes & faculty guidance",
              educatorName: b.educator_name,
              educatorAvatarUrl: b.educator_avatar_url,
              iconType: "users",
              iconBg: "bg-orange-50 border-orange-100",
              iconColor: "text-brand-orange",
              exploreUrl: `/student/batches/${b.id}`,
              accessTier: isFree ? "FREE" : "PRO",
            });
          }
        }
      });

      return {
        enrolledCourses: mappedEnrolled,
        completedCourses: mappedCompleted,
        recommendedCourses,
        continueLearningItem: candidateCheckpoint,
      };
    } catch (err) {
      console.error("[StudentLearningService] Error in getMyLearning:", err);
      return {
        enrolledCourses: [],
        completedCourses: [],
        recommendedCourses: [],
        continueLearningItem: null,
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
