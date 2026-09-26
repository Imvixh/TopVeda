/**
 * TopVeda Student Live Classes Service (Phase 5C)
 * Queries live sessions from cms_live_classes, enforces Step 5J timing rules,
 * maps server-authoritative attendance from student_live_attendance, and isolates student state.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { ContentAccessService } from "@/lib/services/content-access.service";
import { formatLiveTimeDisplay } from "@/lib/utils/timezone";

export interface StudentLiveClassCard {
  id: string;
  topic: string;
  subject: string;
  boardLabel?: string;
  educatorName: string;
  educatorAvatar: string;
  timeDisplay: string;
  scheduledStart: string;
  scheduledEnd?: string;
  liveStatus: "SCHEDULED" | "LIVE" | "COMPLETED" | "TERMINATED" | "CANCELLED";
  isLive: boolean;
  isPreparationWindow: boolean;
  canJoin: boolean;
  secondsToStart: number;
  // Attendance details
  isAttended?: boolean;
  attendedDurationSeconds?: number;
  recordingUrl?: string | null;
  categoryTag?: string;
  courseId?: string | null;
}

export interface StudentLiveScheduleGroup {
  liveNow: StudentLiveClassCard[];
  upcoming: StudentLiveClassCard[];
  completed: StudentLiveClassCard[];
}

export class StudentLiveService {
  /**
   * Resolves Teacher Profile Avatar strictly prioritizing joined profile avatar
   */
  private static resolveEducatorAvatar(profileAvatar?: string | null, educatorAvatar?: string | null, thumbnail?: string | null): string {
    if (profileAvatar && profileAvatar !== "undefined" && profileAvatar !== "null") {
      return profileAvatar;
    }
    if (educatorAvatar && !educatorAvatar.startsWith("/avatars/default_teacher.jpg") && educatorAvatar !== "undefined" && educatorAvatar !== "null") {
      return educatorAvatar;
    }
    if (thumbnail && !thumbnail.startsWith("/avatars/default_teacher.jpg") && thumbnail !== "undefined" && thumbnail !== "null") {
      return thumbnail;
    }
    return "";
  }

  /**
   * Fetches all published student live classes categorized by lifecycle status
   */
  public static async getLiveClassesForStudent(
    supabase: SupabaseClient,
    userId?: string
  ): Promise<StudentLiveScheduleGroup> {
    try {
      // 1. Fetch live classes from CMS
      const { data: classes, error } = await supabase
        .from("cms_live_classes")
        .select(`
          id,
          topic,
          subject,
          live_status,
          is_live,
          status_text,
          time_display,
          scheduled_start,
          scheduled_end,
          educator_name,
          educator_avatar_url,
          thumbnail_url,
          course_id,
          batch_id,
          recording_url,
          educator_id,
          profiles:educator_id(avatar_url, full_name)
        `)
        .eq("is_visible", true)
        .in("live_status", ["SCHEDULED", "LIVE", "COMPLETED"])
        .order("scheduled_start", { ascending: true });

      if (error) {
        console.error("[StudentLiveService] Error fetching live classes:", error.message);
        return { liveNow: [], upcoming: [], completed: [] };
      }

      // 2. Fetch student's attendance records if authenticated
      const attendanceMap = new Map<string, { isAttended: boolean; durationSeconds: number }>();
      if (userId) {
        const { data: attendanceData } = await supabase
          .from("student_live_attendance")
          .select("live_class_id, is_attended, duration_seconds")
          .eq("student_id", userId);

        (attendanceData || []).forEach((att) => {
          attendanceMap.set(att.live_class_id, {
            isAttended: att.is_attended,
            durationSeconds: att.duration_seconds,
          });
        });
      }

      const now = new Date();
      const nowMs = now.getTime();

      const liveNowList: StudentLiveClassCard[] = [];
      const upcomingList: StudentLiveClassCard[] = [];
      const completedList: StudentLiveClassCard[] = [];

      (classes || []).forEach((c) => {
        const scheduledStart = new Date(c.scheduled_start);
        const scheduledStartMs = scheduledStart.getTime();
        const scheduledEndMs = c.scheduled_end ? new Date(c.scheduled_end).getTime() : scheduledStartMs + 60 * 60 * 1000;

        const secondsToStart = Math.max(0, Math.floor((scheduledStartMs - nowMs) / 1000));
        const prepStartMs = scheduledStartMs - 10 * 60 * 1000;
        const isPrepWindow = nowMs >= prepStartMs && nowMs < scheduledStartMs && c.live_status === "SCHEDULED";

        const profileData = c.profiles as { avatar_url?: string; full_name?: string } | null;
        const educatorName = profileData?.full_name || c.educator_name || "Educator";
        const educatorAvatar = this.resolveEducatorAvatar(profileData?.avatar_url, c.educator_avatar_url, c.thumbnail_url);

        const attendance = attendanceMap.get(c.id);

        const card: StudentLiveClassCard = {
          id: c.id,
          topic: c.topic,
          subject: c.subject || "Academic",
          educatorName,
          educatorAvatar,
          timeDisplay: c.scheduled_start ? formatLiveTimeDisplay(c.scheduled_start, c.scheduled_end) : (c.time_display || "Live Today"),
          scheduledStart: c.scheduled_start,
          scheduledEnd: c.scheduled_end,
          liveStatus: c.live_status,
          isLive: (c.live_status === "LIVE" || (c.is_live && nowMs >= scheduledStartMs)),
          isPreparationWindow: isPrepWindow,
          canJoin: c.live_status === "LIVE" || (nowMs >= scheduledStartMs && c.live_status === "SCHEDULED"),
          secondsToStart,
          isAttended: attendance?.isAttended || false,
          attendedDurationSeconds: attendance?.durationSeconds || 0,
          recordingUrl: c.recording_url,
          courseId: c.course_id,
        };

        if (c.live_status === "COMPLETED") {
          completedList.push(card);
        } else if (card.isLive && card.canJoin) {
          liveNowList.push(card);
        } else {
          upcomingList.push(card);
        }
      });

      return {
        liveNow: liveNowList,
        upcoming: upcomingList,
        completed: completedList,
      };
    } catch (err) {
      console.error("[StudentLiveService] Error in getLiveClassesForStudent:", err);
      return { liveNow: [], upcoming: [], completed: [] };
    }
  }

  /**
   * Fetches single live class room details with server authorization check
   */
  public static async getLiveClassDetail(
    supabase: SupabaseClient,
    userId: string,
    liveClassId: string
  ) {
    try {
      const { data: liveClass, error } = await supabase
        .from("cms_live_classes")
        .select(`
          id,
          topic,
          subject,
          live_status,
          is_live,
          time_display,
          scheduled_start,
          scheduled_end,
          educator_name,
          educator_avatar_url,
          thumbnail_url,
          course_id,
          batch_id,
          recording_url,
          terminated_by,
          termination_reason,
          educator_id,
          profiles:educator_id(avatar_url, full_name)
        `)
        .eq("id", liveClassId)
        .single();

      if (error || !liveClass) {
        return { success: false, error: "Live class not found." };
      }

      // Check content entitlement access
      const access = await ContentAccessService.checkAccess(supabase, {
        userId,
        contentType: "LIVE_CLASS",
        contentId: liveClassId,
      });

      const now = new Date();
      const nowMs = now.getTime();
      const scheduledStartMs = new Date(liveClass.scheduled_start).getTime();
      const secondsToStart = Math.max(0, Math.floor((scheduledStartMs - nowMs) / 1000));
      const prepStartMs = scheduledStartMs - 10 * 60 * 1000;
      const isPrepWindow = nowMs >= prepStartMs && nowMs < scheduledStartMs && liveClass.live_status === "SCHEDULED";

      const profileData = liveClass.profiles as { avatar_url?: string; full_name?: string } | null;
      const educatorName = profileData?.full_name || liveClass.educator_name || "Educator";
      const educatorAvatar = this.resolveEducatorAvatar(profileData?.avatar_url, liveClass.educator_avatar_url, liveClass.thumbnail_url);

      const isLive = liveClass.live_status === "LIVE" || (liveClass.is_live && nowMs >= scheduledStartMs);
      const canJoin = isLive || (nowMs >= scheduledStartMs && liveClass.live_status === "SCHEDULED");

      // Fetch student attendance state
      const { data: attendance } = await supabase
        .from("student_live_attendance")
        .select("id, is_attended, duration_seconds")
        .eq("student_id", userId)
        .eq("live_class_id", liveClassId)
        .maybeSingle();

      return {
        success: true,
        data: {
          id: liveClass.id,
          topic: liveClass.topic,
          subject: liveClass.subject || "Academic",
          educatorName,
          educatorAvatar,
          timeDisplay: liveClass.time_display,
          scheduledStart: liveClass.scheduled_start,
          scheduledEnd: liveClass.scheduled_end,
          liveStatus: liveClass.live_status,
          isLive,
          isPreparationWindow: isPrepWindow,
          canJoin,
          secondsToStart,
          isTerminated: liveClass.live_status === "TERMINATED",
          isCompleted: liveClass.live_status === "COMPLETED",
          terminationReason: liveClass.termination_reason,
          recordingUrl: liveClass.recording_url,
          access,
          attendance: {
            isAttended: Boolean(attendance?.is_attended),
            durationSeconds: attendance?.duration_seconds || 0,
          },
        },
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }
}
