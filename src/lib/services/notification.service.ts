/**
 * TopVeda In-App & Transactional Notification Service (Phase 4.1 Step 5J)
 * Governs notifications for Live Class creation, Lecture reviews, revision requests,
 * and emergency terminations.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { CmsNotification } from "@/types/cms.types";
import { EmailService } from "@/lib/email/email-service";

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
      title: string;
      message: string;
      entityType?: "LIVE_CLASS" | "LECTURE" | "BATCH" | "STUDY_MATERIAL" | "SYSTEM" | null;
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

  /**
   * 1. Alert Super Admin when a Teacher creates a Live Class
   */
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
    const formattedTime = new Date(params.scheduledStart).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await this.createNotification(supabase, {
      recipientRole: "SUPER_ADMIN",
      senderId: params.teacherId,
      type: "LIVE_CLASS_CREATED",
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

  /**
   * Alert Super Admin when a Teacher reschedules a Live Class
   */
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
    const formattedNewTime = new Date(params.newStart).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    await this.createNotification(supabase, {
      recipientRole: "SUPER_ADMIN",
      senderId: params.teacherId,
      type: "LIVE_CLASS_RESCHEDULED",
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

  /**
   * Alert Super Admin when a Teacher cancels a scheduled Live Class
   */
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

  /**
   * 2. Alert Super Admin when a Teacher submits a recorded lecture
   */
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

  /**
   * 3. Alert Teacher when Super Admin requests revision / rejects a lecture
   */
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

  /**
   * 4. Alert Teacher when Super Admin approves / publishes a lecture
   */
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
      title: `Lecture ${params.status}: ${params.title}`,
      message: `Your recorded lecture "${params.title}" has been ${params.status.toLowerCase()} by Super Admin.`,
      entityType: "LECTURE",
      entityId: params.lectureId,
    });
  }

  /**
   * 5. Alert Teacher when Super Admin terminates a Live Class
   */
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
   * Fetch unread/all notifications for current user
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
   * Mark notification as read
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
