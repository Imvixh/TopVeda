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

          const query = supabase
            .from("student_enrollments")
            .select("id")
            .eq("student_id", userId)
            .eq("status", "ACTIVE");

          if (liveClass.batch_id && liveClass.course_id) {
            query.or(`batch_id.eq.${liveClass.batch_id},course_id.eq.${liveClass.course_id}`);
          } else if (liveClass.batch_id) {
            query.eq("batch_id", liveClass.batch_id);
          } else if (liveClass.course_id) {
            query.eq("course_id", liveClass.course_id);
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

      // 2. Evaluate Standard Learning Content (Course, Batch, Lecture, Study Material, Test)
      let tableName = "cms_courses";
      if (contentType === "BATCH") tableName = "cms_batches";
      if (contentType === "LECTURE") tableName = "cms_lectures";
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
}
