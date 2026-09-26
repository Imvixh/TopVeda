/**
 * TopVeda In-App & Transactional Notification Service (Phase 4.1 Step 5J + Phase 5G)
 * Governs notifications for Super Admins, Teachers, and Students.
 * Unified storage table: cms_notifications.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  CmsNotification,
  NotificationCategory,
  NotificationFilterCategory,
} from "@/types/cms.types";
import {
  formatLiveTimeDisplay,
  formatLiveDateIST,
  formatLiveTimeIST,
} from "@/lib/utils/timezone";

export class NotificationService {
  /**
   * Dispatches an in-app notification to the database.
   */
  public static async createNotification(
    supabase: SupabaseClient,
    payload: {
      recipientId?: string | null;
      recipientRole?: "SUPER_ADMIN" | "ADMIN" | "STUDENT" | null;
      senderId?: string | null;
      type: string;
      category?: NotificationCategory;
      title: string;
      message: string;
      entityType?:
        | "LIVE_CLASS"
        | "LECTURE"
        | "BATCH"
        | "STUDY_MATERIAL"
        | "TEST"
        | "ANNOUNCEMENT"
        | "COURSE"
        | "SYSTEM"
        | null;
      entityId?: string | null;
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ data: CmsNotification | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("cms_notifications")
        .insert({
          recipient_id: payload.recipientId || null,
          recipient_role: payload.recipientRole || null,
          sender_id: payload.senderId || null,
          type: payload.type,
          category: payload.category || "CLASSES",
          title: payload.title,
          message: payload.message,
          entity_type: payload.entityType || null,
          entity_id: payload.entityId || null,
          is_read: false,
          metadata: payload.metadata || {},
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      return { data: data as CmsNotification, error: null };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { data: null, error };
    }
  }

  // ============================================================================
  // STUDENT NOTIFICATION METHODS (Phase 5G)
  // ============================================================================

  /**
   * Fetch notifications and unread count for a student
   */
  public static async getStudentNotifications(
    supabase: SupabaseClient,
    studentId: string,
    filterCategory: NotificationFilterCategory = "ALL"
  ): Promise<{ notifications: CmsNotification[]; unreadCount: number }> {
    try {
      let query = supabase
        .from("cms_notifications")
        .select("*")
        .eq("recipient_id", studentId);

      if (filterCategory && filterCategory !== "ALL") {
        if (filterCategory === "CLASSES") {
          query = query.or(
            "category.eq.CLASSES,type.in.(LIVE_CLASS_CREATED,LIVE_CLASS_RESCHEDULED,LIVE_CLASS_CANCELLED,LECTURE_PUBLISHED,LECTURE_ADDED,NEW_LECTURE)"
          );
        } else if (filterCategory === "TESTS") {
          query = query.or(
            "category.eq.TESTS,type.in.(TEST_RESULT_AVAILABLE,TEST_UPCOMING,TEST_SUBMITTED,NEW_TEST)"
          );
        } else if (filterCategory === "ANNOUNCEMENTS") {
          query = query.or(
            "category.eq.ANNOUNCEMENTS,type.in.(ANNOUNCEMENT_PUBLISHED,HUB_ANNOUNCEMENT,PLATFORM_ANNOUNCEMENT)"
          );
        } else if (filterCategory === "STUDY_MATERIAL") {
          query = query.or(
            "category.eq.STUDY_MATERIAL,type.in.(STUDY_MATERIAL_PUBLISHED,NEW_STUDY_MATERIAL)"
          );
        } else {
          query = query.eq("category", filterCategory);
        }
      }

      const { data: notificationsData, error: notifError } = await query
        .order("created_at", { ascending: false })
        .limit(100);

      if (notifError) throw new Error(notifError.message);

      // Get accurate unread count across all categories
      const { count: unreadCount, error: countError } = await supabase
        .from("cms_notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", studentId)
        .eq("is_read", false);

      if (countError) throw new Error(countError.message);

      return {
        notifications: (notificationsData as CmsNotification[]) || [],
        unreadCount: unreadCount || 0,
      };
    } catch {
      return { notifications: [], unreadCount: 0 };
    }
  }

  /**
   * Get unread count for badge indicators
   */
  public static async getStudentUnreadCount(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("cms_notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", studentId)
        .eq("is_read", false);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Mark all notifications as read for a student
   */
  public static async markAllAsRead(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("cms_notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("recipient_id", studentId)
        .eq("is_read", false);

      return !error;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // EVENT-DRIVEN STUDENT NOTIFICATION DISPATCHERS (Phase 5G Event Integration)
  // ============================================================================

  /**
   * Find students enrolled in a course or batch
   */
  private static async getEnrolledStudentIds(
    supabase: SupabaseClient,
    target: { courseId?: string; batchId?: string }
  ): Promise<string[]> {
    try {
      let query = supabase
        .from("student_enrollments")
        .select("student_id")
        .eq("status", "ACTIVE");

      if (target.batchId) {
        query = query.eq("batch_id", target.batchId);
      } else if (target.courseId) {
        query = query.eq("course_id", target.courseId);
      }

      const { data, error } = await query;
      if (error || !data) return [];
      return Array.from(new Set(data.map((r: { student_id: string }) => r.student_id)));
    } catch {
      return [];
    }
  }

  /**
   * Notify enrolled students when a new lecture is published
   */
  public static async notifyStudentsLecturePublished(
    supabase: SupabaseClient,
    params: {
      lectureId: string;
      title: string;
      courseId: string;
      batchId?: string;
      subjectName?: string;
    }
  ): Promise<void> {
    const studentIds = await this.getEnrolledStudentIds(supabase, {
      courseId: params.courseId,
      batchId: params.batchId,
    });

    if (studentIds.length === 0) return;

    const inserts = studentIds.map((studentId) => ({
      recipient_id: studentId,
      recipient_role: "STUDENT",
      type: "NEW_LECTURE",
      category: "CLASSES",
      title: "New Lecture Added",
      message: `${params.subjectName ? `${params.subjectName} — ` : ""}${params.title} is now available.`,
      entity_type: "LECTURE",
      entity_id: params.lectureId,
      is_read: false,
      metadata: {
        courseId: params.courseId,
        batchId: params.batchId,
        lectureId: params.lectureId,
      },
    }));

    await supabase.from("cms_notifications").insert(inserts);
  }

  /**
   * Notify enrolled students when a new study material is published
   */
  public static async notifyStudentsStudyMaterialPublished(
    supabase: SupabaseClient,
    params: {
      materialId: string;
      title: string;
      batchId: string;
      materialType?: string;
    }
  ): Promise<void> {
    const studentIds = await this.getEnrolledStudentIds(supabase, {
      batchId: params.batchId,
    });

    if (studentIds.length === 0) return;

    const inserts = studentIds.map((studentId) => ({
      recipient_id: studentId,
      recipient_role: "STUDENT",
      type: "NEW_STUDY_MATERIAL",
      category: "STUDY_MATERIAL",
      title: "New Study Material",
      message: `A new ${params.materialType || "resource"} ("${params.title}") has been added to your batch.`,
      entity_type: "STUDY_MATERIAL",
      entity_id: params.materialId,
      is_read: false,
      metadata: {
        batchId: params.batchId,
        materialId: params.materialId,
      },
    }));

    await supabase.from("cms_notifications").insert(inserts);
  }

  /**
   * Notify enrolled students about an upcoming or rescheduled Live Class
   */
  public static async notifyStudentsLiveClassCreated(
    supabase: SupabaseClient,
    params: {
      liveClassId: string;
      title: string;
      courseId?: string;
      batchId?: string;
      scheduledStart: string;
    }
  ): Promise<void> {
    const studentIds = await this.getEnrolledStudentIds(supabase, {
      courseId: params.courseId,
      batchId: params.batchId,
    });

    if (studentIds.length === 0) return;

    const formattedTime = formatLiveTimeDisplay(params.scheduledStart);

    const inserts = studentIds.map((studentId) => ({
      recipient_id: studentId,
      recipient_role: "STUDENT",
      type: "LIVE_CLASS_CREATED",
      category: "CLASSES",
      title: "Live Class Starting Soon",
      message: `Your live class "${params.title}" is scheduled for ${formattedTime}.`,
      entity_type: "LIVE_CLASS",
      entity_id: params.liveClassId,
      is_read: false,
      metadata: {
        liveClassId: params.liveClassId,
        scheduledStart: params.scheduledStart,
      },
    }));

    await supabase.from("cms_notifications").insert(inserts);
  }

  /**
   * Notify a student that their test result is available
   */
  public static async notifyStudentTestResultAvailable(
    supabase: SupabaseClient,
    params: {
      studentId: string;
      testId: string;
      testTitle: string;
      score: number;
      maxScore: number;
    }
  ): Promise<void> {
    await this.createNotification(supabase, {
      recipientId: params.studentId,
      recipientRole: "STUDENT",
      type: "TEST_RESULT_AVAILABLE",
      category: "TESTS",
      title: "Test Result Available",
      message: `Your score for "${params.testTitle}" is ${params.score}/${params.maxScore}. Check detailed analytics.`,
      entityType: "TEST",
      entityId: params.testId,
      metadata: {
        testId: params.testId,
        score: params.score,
        maxScore: params.maxScore,
      },
    });
  }

  /**
   * Notify students when a general announcement is published
   */
  public static async notifyStudentsAnnouncementPublished(
    supabase: SupabaseClient,
    params: {
      hubItemId: string;
      title: string;
      message: string;
    }
  ): Promise<void> {
    // Fetch active student IDs (limited to 500 for broadcast efficiency)
    const { data: students, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "STUDENT")
      .limit(500);

    if (error || !students || students.length === 0) return;

    const inserts = students.map((s: { id: string }) => ({
      recipient_id: s.id,
      recipient_role: "STUDENT",
      type: "ANNOUNCEMENT_PUBLISHED",
      category: "ANNOUNCEMENTS",
      title: params.title || "Announcement",
      message: params.message || "TopVeda has published a new announcement.",
      entity_type: "ANNOUNCEMENT",
      entity_id: params.hubItemId,
      is_read: false,
      metadata: {
        hubItemId: params.hubItemId,
      },
    }));

    await supabase.from("cms_notifications").insert(inserts);
  }

  // ============================================================================
  // ADMIN & TEACHER NOTIFICATION METHODS (Step 5J Preserved)
  // ============================================================================

  public static async notifySuperAdminLiveClassCreated(
    supabase: SupabaseClient,
    params: {
      teacherId: string;
      teacherName: string;
      liveClassId: string;
      title: string;
      scheduledStart: string;
    }
  ): Promise<void> {
    const formattedTime = formatLiveTimeDisplay(params.scheduledStart);

    await this.createNotification(supabase, {
      recipientRole: "SUPER_ADMIN",
      senderId: params.teacherId,
      type: "LIVE_CLASS_CREATED",
      category: "CLASSES",
      title: `New Live Class Scheduled: ${params.title}`,
      message: `Teacher ${params.teacherName} scheduled a live class for ${formattedTime}. No approval required.`,
      entityType: "LIVE_CLASS",
      entityId: params.liveClassId,
      metadata: {
        teacherName: params.teacherName,
        scheduledStart: params.scheduledStart,
      },
    });
  }

  public static async notifySuperAdminLiveClassRescheduled(
    supabase: SupabaseClient,
    params: {
      teacherId: string;
      teacherName: string;
      liveClassId: string;
      title: string;
      newStart: string;
    }
  ): Promise<void> {
    const formattedNewTime = formatLiveTimeDisplay(params.newStart);

    await this.createNotification(supabase, {
      recipientRole: "SUPER_ADMIN",
      senderId: params.teacherId,
      type: "LIVE_CLASS_RESCHEDULED",
      category: "CLASSES",
      title: `Live Class Rescheduled: ${params.title}`,
      message: `Teacher ${params.teacherName} rescheduled Live Class "${params.title}" to ${formattedNewTime}.`,
      entityType: "LIVE_CLASS",
      entityId: params.liveClassId,
      metadata: {
        teacherName: params.teacherName,
        newStart: params.newStart,
      },
    });
  }

  public static async notifySuperAdminLiveClassCancelled(
    supabase: SupabaseClient,
    params: {
      teacherId: string;
      teacherName: string;
      liveClassId: string;
      title: string;
      scheduledStart: string;
      reason?: string;
    }
  ): Promise<void> {
    const formattedTime = new Date(params.scheduledStart).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await this.createNotification(supabase, {
      recipientRole: "SUPER_ADMIN",
      senderId: params.teacherId,
      type: "LIVE_CLASS_CANCELLED",
      category: "CLASSES",
      title: `Live Class Cancelled: ${params.title}`,
      message: `Teacher ${params.teacherName} cancelled Live Class "${params.title}" originally scheduled for ${formattedTime}.${params.reason ? ` Reason: ${params.reason}` : ""}`,
      entityType: "LIVE_CLASS",
      entityId: params.liveClassId,
      metadata: {
        teacherName: params.teacherName,
        scheduledStart: params.scheduledStart,
        reason: params.reason,
      },
    });
  }

  public static async notifySuperAdminLectureSubmitted(
    supabase: SupabaseClient,
    params: {
      teacherId: string;
      teacherName: string;
      lectureId: string;
      title: string;
      subject: string;
    }
  ): Promise<void> {
    await this.createNotification(supabase, {
      recipientRole: "SUPER_ADMIN",
      senderId: params.teacherId,
      type: "LECTURE_SUBMITTED",
      category: "CLASSES",
      title: `Recorded Lecture Submitted: ${params.title}`,
      message: `Teacher ${params.teacherName} submitted a new recorded lecture (${params.subject}) for Super Admin verification and publishing.`,
      entityType: "LECTURE",
      entityId: params.lectureId,
      metadata: {
        teacherName: params.teacherName,
        subject: params.subject,
      },
    });
  }

  public static async notifyTeacherRevisionRequested(
    supabase: SupabaseClient,
    params: {
      teacherId: string;
      teacherEmail?: string;
      teacherName?: string;
      lectureId: string;
      title: string;
      reviewerName: string;
      reviewNote: string;
    }
  ): Promise<void> {
    await this.createNotification(supabase, {
      recipientId: params.teacherId,
      type: "LECTURE_REVISION_REQUESTED",
      category: "CLASSES",
      title: `Revision Requested: ${params.title}`,
      message: `Your recorded lecture requires revisions. Note from ${params.reviewerName}: "${params.reviewNote}"`,
      entityType: "LECTURE",
      entityId: params.lectureId,
      metadata: {
        reviewerName: params.reviewerName,
        reviewNote: params.reviewNote,
      },
    });
  }

  public static async notifyTeacherLectureApproved(
    supabase: SupabaseClient,
    params: {
      teacherId: string;
      lectureId: string;
      title: string;
      status: "APPROVED" | "PUBLISHED";
    }
  ): Promise<void> {
    await this.createNotification(supabase, {
      recipientId: params.teacherId,
      type: "LECTURE_APPROVED",
      category: "CLASSES",
      title: `Lecture ${params.status}: ${params.title}`,
      message: `Your recorded lecture "${params.title}" has been ${params.status.toLowerCase()} by Super Admin.`,
      entityType: "LECTURE",
      entityId: params.lectureId,
    });
  }

  public static async notifyTeacherLiveClassTerminated(
    supabase: SupabaseClient,
    params: {
      teacherId: string;
      liveClassId: string;
      title: string;
      terminationReason: string;
      adminName: string;
    }
  ): Promise<void> {
    await this.createNotification(supabase, {
      recipientId: params.teacherId,
      type: "LIVE_CLASS_TERMINATED",
      category: "CLASSES",
      title: `Live Session Terminated: ${params.title}`,
      message: `Your live class session was terminated by Super Admin (${params.adminName}). Reason: ${params.terminationReason}`,
      entityType: "LIVE_CLASS",
      entityId: params.liveClassId,
      metadata: {
        terminationReason: params.terminationReason,
        terminatedBy: params.adminName,
      },
    });
  }

  /**
   * Fetch unread/all notifications for current user (admin/super admin)
   */
  public static async getUserNotifications(
    supabase: SupabaseClient,
    userId: string,
    isSuperAdmin = false
  ): Promise<CmsNotification[]> {
    try {
      let query = supabase.from("cms_notifications").select("*");

      if (isSuperAdmin) {
        query = query.or(`recipient_id.eq.${userId},recipient_role.eq.SUPER_ADMIN`);
      } else {
        query = query.or(`recipient_id.eq.${userId},recipient_role.eq.ADMIN`);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw new Error(error.message);
      return (data as CmsNotification[]) || [];
    } catch {
      return [];
    }
  }

  /**
   * Mark single notification as read
   */
  public static async markAsRead(
    supabase: SupabaseClient,
    notificationId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("cms_notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId);

      return !error;
    } catch {
      return false;
    }
  }
}
