/**
 * TopVeda Phase 5H: Student Profile & Settings Service
 * Retrieves authenticated student profile, resolves enrollment hierarchy,
 * and manages learning / notification preferences.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  StudentProfileSummary,
  UpdateStudentProfilePayload,
  UpdateStudentPreferencesPayload,
  StudentActiveEnrollmentInfo,
  StudentLearningPreferencesDTO,
} from "@/types/student-profile.types";

const DEFAULT_NOTIFICATIONS = {
  live_reminders: true,
  lecture_updates: true,
  test_results: true,
  study_materials: true,
  announcements: true,
};

export class StudentProfileService {
  /**
   * Get full student profile summary with real database hierarchy
   */
  public static async getStudentProfile(
    supabase: SupabaseClient,
    studentId: string
  ): Promise<StudentProfileSummary | null> {
    try {
      // 1. Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, avatar_url, qualification, bio, created_at")
        .eq("id", studentId)
        .single();

      if (profileError || !profile) {
        return null;
      }

      // 2. Fetch Active Enrollments with nested course, batch, board, class details
      const { data: enrollments, error: enrollError } = await supabase
        .from("student_enrollments")
        .select(`
          id,
          course_id,
          batch_id,
          created_at,
          course:cms_courses (
            id,
            title,
            board:cms_boards (id, name, code),
            class_level:cms_class_levels (id, name, code)
          ),
          batch:cms_batches (
            id,
            title,
            educator_name,
            board_label
          )
        `)
        .eq("student_id", studentId)
        .eq("status", "ACTIVE");

      const activeEnrollments: StudentActiveEnrollmentInfo[] = [];

      if (!enrollError && enrollments) {
        for (const e of enrollments as any[]) {
          activeEnrollments.push({
            enrollment_id: e.id,
            course_id: e.course_id,
            course_title: e.course?.title || "Enrolled Course",
            batch_id: e.batch_id || null,
            batch_name: e.batch?.title || null,
            faculty_name: e.batch?.educator_name || null,
            board_name: e.course?.board?.name || e.batch?.board_label || null,
            class_name: e.course?.class_level?.name || null,
            enrolled_at: e.created_at,
          });
        }
      }

      // 3. Fetch Learning & Notification Preferences
      const { data: prefsData } = await supabase
        .from("student_learning_preferences")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      const preferences: StudentLearningPreferencesDTO = {
        id: prefsData?.id,
        student_id: studentId,
        board_id: prefsData?.board_id || null,
        class_id: prefsData?.class_id || null,
        target_year: prefsData?.target_year || new Date().getFullYear(),
        daily_goal_minutes: prefsData?.daily_goal_minutes ?? 60,
        notification_preferences: {
          ...DEFAULT_NOTIFICATIONS,
          ...(prefsData?.notification_preferences || {}),
        },
      };

      // 4. Derive display labels
      let displayClass = "Class 10";
      let displayBoard = "CBSE";
      let displayBatch = "Board Mastery Batch";
      let displayFaculty = "TopVeda Faculty";

      if (activeEnrollments.length > 0) {
        const primary = activeEnrollments[0];
        if (primary.class_name) displayClass = primary.class_name;
        if (primary.board_name) displayBoard = primary.board_name;
        if (primary.batch_name) displayBatch = primary.batch_name;
        if (primary.faculty_name) displayFaculty = primary.faculty_name;
      }

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        role: profile.role,
        avatar_url: profile.avatar_url,
        qualification: profile.qualification,
        bio: profile.bio,
        display_class: displayClass,
        display_board: displayBoard,
        display_batch: displayBatch,
        display_faculty: displayFaculty,
        active_enrollments: activeEnrollments,
        preferences,
      };
    } catch {
      return null;
    }
  }

  /**
   * Update student personal profile information (role and email protected)
   */
  public static async updateStudentProfile(
    supabase: SupabaseClient,
    studentId: string,
    payload: UpdateStudentProfilePayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (payload.full_name !== undefined) updateData.full_name = payload.full_name.trim();
      if (payload.phone !== undefined) updateData.phone = payload.phone.trim();
      if (payload.qualification !== undefined) updateData.qualification = payload.qualification?.trim() || null;
      if (payload.bio !== undefined) updateData.bio = payload.bio?.trim() || null;
      if (payload.avatar_url !== undefined) updateData.avatar_url = payload.avatar_url;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", studentId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update profile";
      return { success: false, error: message };
    }
  }

  /**
   * Update student learning and notification preferences
   */
  public static async updateStudentPreferences(
    supabase: SupabaseClient,
    studentId: string,
    payload: UpdateStudentPreferencesPayload
  ): Promise<{ success: boolean; preferences?: StudentLearningPreferencesDTO; error?: string }> {
    try {
      // First get existing preferences
      const { data: existing } = await supabase
        .from("student_learning_preferences")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      const mergedNotificationPrefs = {
        ...DEFAULT_NOTIFICATIONS,
        ...(existing?.notification_preferences || {}),
        ...(payload.notification_preferences || {}),
      };

      const upsertData: Record<string, unknown> = {
        student_id: studentId,
        board_id: payload.board_id !== undefined ? payload.board_id : existing?.board_id || null,
        class_id: payload.class_id !== undefined ? payload.class_id : existing?.class_id || null,
        target_year: payload.target_year !== undefined ? payload.target_year : existing?.target_year || new Date().getFullYear(),
        daily_goal_minutes: payload.daily_goal_minutes !== undefined ? payload.daily_goal_minutes : existing?.daily_goal_minutes ?? 60,
        notification_preferences: mergedNotificationPrefs,
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error } = await supabase
        .from("student_learning_preferences")
        .upsert(upsertData, { onConflict: "student_id" })
        .select("*")
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        preferences: {
          id: saved.id,
          student_id: saved.student_id,
          board_id: saved.board_id,
          class_id: saved.class_id,
          target_year: saved.target_year,
          daily_goal_minutes: saved.daily_goal_minutes,
          notification_preferences: saved.notification_preferences,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update preferences";
      return { success: false, error: message };
    }
  }
}
