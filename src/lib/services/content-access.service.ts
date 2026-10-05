/**
 * TopVeda Content Access Service (Phase 5 Architecture)
 * Unified 10-step authorization and commercial access gatekeeper.
 * Evaluates Content Existence, Publication, Visibility, Scheduling, and Access Tier Entitlements.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { ContentAccessResult, ContentAccessTier } from "@/types/student-learning.types";

export type SupportedContentType =
  | "COURSE"
  | "BATCH"
  | "LECTURE"
  | "LIVE_CLASS"
  | "STUDY_MATERIAL"
  | "TEST";

export interface CheckAccessParams {
  userId?: string | null;
  contentType: SupportedContentType;
  contentId: string;
  isTeacherOrAdmin?: boolean;
}

export class ContentAccessService {
  /**
   * Authoritative content access evaluator
   */
  public static async checkAccess(
    supabase: SupabaseClient,
    params: CheckAccessParams
  ): Promise<ContentAccessResult> {
    const { userId, contentType, contentId, isTeacherOrAdmin = false } = params;

    // Super Admins and Teachers previewing content bypass student gating
    if (isTeacherOrAdmin) {
      return {
        granted: true,
        isLocked: false,
        accessTier: "FREE",
      };
    }

    try {
      const now = new Date();

      // 1. Evaluate Live Classes using Step 5J Lifecycle Rules & Enrollment Gating
      if (contentType === "LIVE_CLASS") {
        const { data: liveClass, error } = await supabase
          .from("cms_live_classes")
          .select("id, status, live_status, is_visible, scheduled_start, scheduled_end, batch_id, course_id")
          .eq("id", contentId)
          .single();

        if (error || !liveClass) {
          return {
            granted: false,
            isLocked: true,
            accessTier: "FREE",
            reason: "Live class not found",
          };
        }

        if (!liveClass.is_visible) {
          return {
            granted: false,
            isLocked: true,
            accessTier: "FREE",
            reason: "Live class is not visible",
          };
        }

        const effectiveStatus = liveClass.live_status || liveClass.status;
        if (effectiveStatus === "TERMINATED" || effectiveStatus === "CANCELLED") {
          return {
            granted: false,
            isLocked: true,
            accessTier: "FREE",
            reason: `Live class is ${effectiveStatus.toLowerCase()}`,
          };
        }

        if (!userId) {
          return {
            granted: false,
            isLocked: true,
            accessTier: "FREE",
            reason: "Authentication required to access live class session",
          };
        }

        // Check active enrollment if class is associated with a specific batch or course
        if (liveClass.batch_id || liveClass.course_id) {
          let hasEnrollment = false;

          const { data: enrollments } = await supabase
            .from("student_enrollments")
            .select("batch_id, course_id")
            .eq("student_id", userId)
            .eq("status", "ACTIVE");

          const enrolledBatchIds = new Set<string>(
            (enrollments || []).map((e) => e.batch_id).filter(Boolean)
          );
          const enrolledCourseIds = new Set<string>(
            (enrollments || []).map((e) => e.course_id).filter(Boolean)
          );

          // Check direct content entitlements
          const { data: entitlements } = await supabase
            .from("student_content_entitlements")
            .select("content_type, content_id, expires_at")
            .eq("student_id", userId)
            .eq("status", "ACTIVE");

          const validEntitlements = (entitlements || []).filter(
            (e) => !e.expires_at || new Date(e.expires_at) >= now
          );

          validEntitlements.forEach((e) => {
            if (e.content_type === "COURSE" && e.content_id) {
              enrolledCourseIds.add(e.content_id);
            }
            if (e.content_type === "BATCH" && e.content_id) {
              enrolledBatchIds.add(e.content_id);
            }
          });

          // Resolve courses from enrolled batches
          if (enrolledBatchIds.size > 0) {
            const { data: batches } = await supabase
              .from("cms_batches")
              .select("id, course_id")
              .in("id", Array.from(enrolledBatchIds));
            (batches || []).forEach((b) => {
              if (b.course_id) enrolledCourseIds.add(b.course_id);
            });
          }

          if (
            validEntitlements.some(
              (e) =>
                e.content_type === "ALL_ACCESS" ||
                (e.content_type === "LIVE_CLASS" && e.content_id === contentId)
            )
          ) {
            hasEnrollment = true;
          } else if (liveClass.batch_id && enrolledBatchIds.has(liveClass.batch_id)) {
            hasEnrollment = true;
          } else if (liveClass.course_id && enrolledCourseIds.has(liveClass.course_id)) {
            hasEnrollment = true;
          }

          if (!hasEnrollment) {
            return {
              granted: false,
              isLocked: true,
              accessTier: "PAID_ONLY",
              reason: "Active batch or course enrollment required to join this live classroom.",
            };
          }
        }

        return {
          granted: true,
          isLocked: false,
          accessTier: "FREE",
        };
      }

      // 2. Evaluate Recorded Lectures using Batch/Course Enrollment & Entitlements
      if (contentType === "LECTURE") {
        const { data: lecture, error } = await supabase
          .from("cms_lectures")
          .select("id, status, is_visible, starts_at, ends_at, access_tier, is_free_preview, batch_id, course_id")
          .eq("id", contentId)
          .single();

        if (error || !lecture) {
          return {
            granted: false,
            isLocked: true,
            accessTier: "FREE",
            reason: "Lecture not found",
          };
        }

        if (lecture.status !== "PUBLISHED") {
          return {
            granted: false,
            isLocked: true,
            accessTier: (lecture.access_tier as ContentAccessTier) || "FREE",
            reason: "Lecture is not published",
          };
        }

        if (!lecture.is_visible) {
          return {
            granted: false,
            isLocked: true,
            accessTier: (lecture.access_tier as ContentAccessTier) || "FREE",
            reason: "Lecture is hidden",
          };
        }

        if (lecture.starts_at && new Date(lecture.starts_at) > now) {
          return {
            granted: false,
            isLocked: true,
            accessTier: (lecture.access_tier as ContentAccessTier) || "FREE",
            reason: "Lecture schedule window has not started",
          };
        }

        if (lecture.ends_at && new Date(lecture.ends_at) < now) {
          return {
            granted: false,
            isLocked: true,
            accessTier: (lecture.access_tier as ContentAccessTier) || "FREE",
            reason: "Lecture schedule window has expired",
          };
        }

        const accessTier: ContentAccessTier =
          (lecture.access_tier as ContentAccessTier) || "FREE";

        // Free tier or free preview: access granted immediately
        if (lecture.is_free_preview === true || accessTier === "FREE") {
          return {
            granted: true,
            isLocked: false,
            accessTier: "FREE",
          };
        }

        if (!userId) {
          return {
            granted: false,
            isLocked: true,
            accessTier,
            reason: "Authentication required to access lecture",
          };
        }

        // Check active enrollment if lecture is associated with a specific batch or course
        if (lecture.batch_id || lecture.course_id) {
          let hasEnrollment = false;

          const query = supabase
            .from("student_enrollments")
            .select("id")
            .eq("student_id", userId)
            .eq("status", "ACTIVE");

          if (lecture.batch_id && lecture.course_id) {
            query.or(`batch_id.eq.${lecture.batch_id},course_id.eq.${lecture.course_id}`);
          } else if (lecture.batch_id) {
            query.eq("batch_id", lecture.batch_id);
          } else if (lecture.course_id) {
            query.eq("course_id", lecture.course_id);
          }

          const { data: enrollments } = await query.maybeSingle();
          if (enrollments) {
            hasEnrollment = true;
          }

          // Check direct content or ALL_ACCESS entitlements
          if (!hasEnrollment) {
            const { data: entitlement } = await supabase
              .from("student_content_entitlements")
              .select("id, expires_at")
              .eq("student_id", userId)
              .eq("status", "ACTIVE")
              .or(`content_id.eq.${contentId},content_type.eq.ALL_ACCESS`)
              .maybeSingle();

            if (entitlement && (!entitlement.expires_at || new Date(entitlement.expires_at) >= now)) {
              hasEnrollment = true;
            }
          }

          if (!hasEnrollment) {
            return {
              granted: false,
              isLocked: true,
              accessTier: "PAID_ONLY",
              reason: "Active batch or course enrollment required to access this lecture.",
            };
          }
        } else {
          // No batch/course specified: check direct entitlement
          const { data: entitlement } = await supabase
            .from("student_content_entitlements")
            .select("id, expires_at")
            .eq("student_id", userId)
            .eq("status", "ACTIVE")
            .or(`content_id.eq.${contentId},content_type.eq.ALL_ACCESS`)
            .maybeSingle();

          if (!entitlement || (entitlement.expires_at && new Date(entitlement.expires_at) < now)) {
            return {
              granted: false,
              isLocked: true,
              accessTier: "PAID_ONLY",
              reason: "Active entitlement required to access this lecture.",
            };
          }
        }

        return {
          granted: true,
          isLocked: false,
          accessTier,
        };
      }

      // 3. Evaluate Standard Learning Content (Course, Batch, Study Material, Test)
      let tableName = "cms_courses";
      if (contentType === "BATCH") tableName = "cms_batches";
      if (contentType === "STUDY_MATERIAL") tableName = "cms_study_materials";
      if (contentType === "TEST") tableName = "student_tests";

      const { data: entity, error } = await supabase
        .from(tableName)
        .select("id, status, is_visible, starts_at, ends_at, access_tier")
        .eq("id", contentId)
        .single();

      if (error || !entity) {
        return {
          granted: false,
          isLocked: true,
          accessTier: "FREE",
          reason: "Content not found",
        };
      }

      // Publication check
      if (entity.status !== "PUBLISHED") {
        return {
          granted: false,
          isLocked: true,
          accessTier: (entity.access_tier as ContentAccessTier) || "FREE",
          reason: "Content is not published",
        };
      }

      // Visibility check
      if (!entity.is_visible) {
        return {
          granted: false,
          isLocked: true,
          accessTier: (entity.access_tier as ContentAccessTier) || "FREE",
          reason: "Content is hidden",
        };
      }

      // Schedule window check (Strict Null Semantics: NULL = unrestricted)
      if (entity.starts_at && new Date(entity.starts_at) > now) {
        return {
          granted: false,
          isLocked: true,
          accessTier: (entity.access_tier as ContentAccessTier) || "FREE",
          reason: "Content schedule window has not started",
        };
      }

      if (entity.ends_at && new Date(entity.ends_at) < now) {
        return {
          granted: false,
          isLocked: true,
          accessTier: (entity.access_tier as ContentAccessTier) || "FREE",
          reason: "Content schedule window has expired",
        };
      }

      const accessTier: ContentAccessTier =
        (entity.access_tier as ContentAccessTier) || "FREE";

      // Free tier: access granted immediately
      if (accessTier === "FREE") {
        return {
          granted: true,
          isLocked: false,
          accessTier: "FREE",
        };
      }

      // Paid / Premium tier check
      if (!userId) {
        return {
          granted: false,
          isLocked: true,
          accessTier,
          reason: "Authentication required for premium content",
        };
      }

      // Check student entitlements vault
      const { data: entitlement } = await supabase
        .from("student_content_entitlements")
        .select("id, status, expires_at")
        .eq("student_id", userId)
        .eq("status", "ACTIVE")
        .or(`content_id.eq.${contentId},content_type.eq.ALL_ACCESS`)
        .maybeSingle();

      if (entitlement) {
        if (!entitlement.expires_at || new Date(entitlement.expires_at) >= now) {
          return {
            granted: true,
            isLocked: false,
            accessTier,
          };
        }
      }

      return {
        granted: false,
        isLocked: true,
        accessTier,
        reason: "Active entitlement or purchase required",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err : new Error(String(err));
      return {
        granted: false,
        isLocked: true,
        accessTier: "FREE",
        reason: message.message,
      };
    }
  }

  /**
   * Resolves the student's unified academic enrollment scope (course, batch, board, class, subject)
   * exactly matching the active enrollment data source used by My Learning.
   */
  public static async resolveStudentAcademicScope(
    supabase: SupabaseClient,
    userId: string
  ): Promise<StudentAcademicScope> {
    const scope: StudentAcademicScope = {
      hasAllAccess: false,
      hasActiveEnrollments: false,
      enrolledCourseIds: new Set<string>(),
      enrolledBatchIds: new Set<string>(),
      enrolledBoardIds: new Set<string>(),
      enrolledClassIds: new Set<string>(),
      enrolledSubjectIds: new Set<string>(),
      enrolledSubjectNames: new Set<string>(),
      validEntitlements: [],
    };

    if (!userId) {
      return scope;
    }

    try {
      // 1. Fetch Active Enrollments matching My Learning relational structure
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_enrollments")
        .select(`
          id,
          student_id,
          course_id,
          batch_id,
          status,
          course:cms_courses(
            id,
            title,
            board_id,
            class_id,
            subject_id,
            board:cms_boards(id, name, code),
            subject:cms_subjects(id, name, code),
            class_level:cms_class_levels(id, name, code)
          ),
          batch:cms_batches(
            id,
            title,
            course_id,
            board_id,
            class_id,
            batch_subjects:cms_batch_subjects(
              subject_id,
              subject:cms_subjects(id, name, code)
            ),
            course:cms_courses(
              id,
              title,
              board_id,
              class_id,
              subject_id,
              board:cms_boards(id, name, code),
              subject:cms_subjects(id, name, code),
              class_level:cms_class_levels(id, name, code)
            )
          )
        `)
        .eq("student_id", userId)
        .eq("status", "ACTIVE");

      if (enrollError) {
        console.warn("[ContentAccessService] Failed to fetch enrollments:", enrollError.message);
      }

      // 2. Fetch Active Entitlements
      const { data: entitlements, error: entError } = await supabase
        .from("student_content_entitlements")
        .select("content_type, content_id, expires_at")
        .eq("student_id", userId)
        .eq("status", "ACTIVE");

      if (entError) {
        console.warn("[ContentAccessService] Failed to fetch entitlements:", entError.message);
      }

      const now = new Date();
      const validEntitlements = (entitlements || []).filter(
        (e: any) => !e.expires_at || new Date(e.expires_at) >= now
      );

      scope.validEntitlements = validEntitlements;
      scope.hasAllAccess = validEntitlements.some((e: any) => e.content_type === "ALL_ACCESS");

      // 3. Process enrollments into academic scope
      (enrollments || []).forEach((e: any) => {
        const course = e.course || e.batch?.course;
        const batch = e.batch;
        if (e.course_id) scope.enrolledCourseIds.add(e.course_id);
        if (course?.id) scope.enrolledCourseIds.add(course.id);
        if (e.batch_id) scope.enrolledBatchIds.add(e.batch_id);
        if (batch?.id) scope.enrolledBatchIds.add(batch.id);

        if (batch?.board_id) scope.enrolledBoardIds.add(batch.board_id);
        if (batch?.class_id) scope.enrolledClassIds.add(batch.class_id);

        if (course?.board_id) scope.enrolledBoardIds.add(course.board_id);
        if (course?.board?.id) scope.enrolledBoardIds.add(course.board.id);
        if (course?.class_id) scope.enrolledClassIds.add(course.class_id);
        if (course?.class_level?.id) scope.enrolledClassIds.add(course.class_level.id);
        if (course?.subject_id) scope.enrolledSubjectIds.add(course.subject_id);
        if (course?.subject?.id) scope.enrolledSubjectIds.add(course.subject.id);

        // Process batch multi-subjects
        if (batch?.batch_subjects && Array.isArray(batch.batch_subjects)) {
          batch.batch_subjects.forEach((bs: any) => {
            if (bs.subject_id) scope.enrolledSubjectIds.add(bs.subject_id);
            if (bs.subject?.id) scope.enrolledSubjectIds.add(bs.subject.id);
            if (bs.subject?.name) {
              const subName = bs.subject.name.trim().toLowerCase();
              scope.enrolledSubjectNames.add(subName);
              if (subName.includes("sci")) {
                scope.enrolledSubjectNames.add("science");
                scope.enrolledSubjectNames.add("physics");
                scope.enrolledSubjectNames.add("chemistry");
                scope.enrolledSubjectNames.add("biology");
              }
              if (subName.includes("math")) {
                scope.enrolledSubjectNames.add("mathematics");
                scope.enrolledSubjectNames.add("maths");
                scope.enrolledSubjectNames.add("math");
              }
            }
          });
        }

        if (course?.subject?.name) {
          const name = course.subject.name.trim().toLowerCase();
          scope.enrolledSubjectNames.add(name);
          if (name.includes("sci")) {
            scope.enrolledSubjectNames.add("science");
            scope.enrolledSubjectNames.add("physics");
            scope.enrolledSubjectNames.add("chemistry");
            scope.enrolledSubjectNames.add("biology");
          }
          if (name.includes("math")) {
            scope.enrolledSubjectNames.add("mathematics");
            scope.enrolledSubjectNames.add("maths");
            scope.enrolledSubjectNames.add("math");
          }
        }
      });

      // 4. Resolve Course / Batch Entitlements
      const extraBatchIds: string[] = [];

      validEntitlements.forEach((e: any) => {
        if (e.content_type === "COURSE" && e.content_id) {
          scope.enrolledCourseIds.add(e.content_id);
        }
        if (e.content_type === "BATCH" && e.content_id) {
          scope.enrolledBatchIds.add(e.content_id);
          extraBatchIds.push(e.content_id);
        }
      });

      if (extraBatchIds.length > 0) {
        const { data: batches } = await supabase
          .from("cms_batches")
          .select("id, course_id, course:cms_courses(id, board_id, class_id, subject_id, subject:cms_subjects(name))")
          .in("id", extraBatchIds);

        (batches || []).forEach((b: any) => {
          if (b.course_id) scope.enrolledCourseIds.add(b.course_id);
          if (b.course?.id) scope.enrolledCourseIds.add(b.course.id);
          if (b.course?.board_id) scope.enrolledBoardIds.add(b.course.board_id);
          if (b.course?.class_id) scope.enrolledClassIds.add(b.course.class_id);
          if (b.course?.subject_id) scope.enrolledSubjectIds.add(b.course.subject_id);
          if (b.course?.subject?.name) {
            const name = b.course.subject.name.trim().toLowerCase();
            scope.enrolledSubjectNames.add(name);
            if (name.includes("sci")) {
              scope.enrolledSubjectNames.add("science");
              scope.enrolledSubjectNames.add("physics");
              scope.enrolledSubjectNames.add("chemistry");
              scope.enrolledSubjectNames.add("biology");
            }
            if (name.includes("math")) {
              scope.enrolledSubjectNames.add("mathematics");
              scope.enrolledSubjectNames.add("maths");
              scope.enrolledSubjectNames.add("math");
            }
          }
        });
      }

      scope.hasActiveEnrollments =
        scope.enrolledCourseIds.size > 0 ||
        scope.enrolledBatchIds.size > 0 ||
        validEntitlements.length > 0;

      return scope;
    } catch (err) {
      console.error("[ContentAccessService] Error in resolveStudentAcademicScope:", err);
      return scope;
    }
  }
}

export interface StudentAcademicScope {
  hasAllAccess: boolean;
  hasActiveEnrollments: boolean;
  enrolledCourseIds: Set<string>;
  enrolledBatchIds: Set<string>;
  enrolledBoardIds: Set<string>;
  enrolledClassIds: Set<string>;
  enrolledSubjectIds: Set<string>;
  enrolledSubjectNames: Set<string>;
  validEntitlements: Array<{ content_type: string; content_id?: string | null }>;
}

