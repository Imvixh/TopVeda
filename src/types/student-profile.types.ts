/**
 * TopVeda Phase 5H: Student & Admin Profile and Settings Types
 */

export interface StudentNotificationPreferences {
  live_reminders: boolean;
  lecture_updates: boolean;
  test_results: boolean;
  study_materials: boolean;
  announcements: boolean;
}

export interface StudentLearningPreferencesDTO {
  id?: string;
  student_id?: string;
  board_id?: string | null;
  class_id?: string | null;
  target_year?: number | null;
  daily_goal_minutes: number;
  notification_preferences: StudentNotificationPreferences;
}

export interface StudentActiveEnrollmentInfo {
  enrollment_id: string;
  course_id: string;
  course_title: string;
  batch_id?: string | null;
  batch_name?: string | null;
  faculty_name?: string | null;
  board_name?: string | null;
  class_name?: string | null;
  enrolled_at: string;
}

export interface StudentProfileSummary {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  avatar_url?: string | null;
  qualification?: string | null;
  bio?: string | null;
  display_class?: string;
  display_board?: string;
  display_batch?: string;
  display_faculty?: string;
  active_enrollments: StudentActiveEnrollmentInfo[];
  preferences: StudentLearningPreferencesDTO;
}

export interface UpdateStudentProfilePayload {
  full_name?: string;
  phone?: string;
  qualification?: string;
  bio?: string;
  avatar_url?: string;
}

export interface UpdateStudentPreferencesPayload {
  board_id?: string | null;
  class_id?: string | null;
  target_year?: number | null;
  daily_goal_minutes?: number;
  notification_preferences?: Partial<StudentNotificationPreferences>;
}

export interface AdminProfileSummary {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "SUPER_ADMIN";
  avatar_url?: string | null;
  qualification?: string | null;
  bio?: string | null;
  created_at: string;
  unread_notifications_count: number;
}

export interface UpdateAdminProfilePayload {
  full_name?: string;
  phone?: string;
  qualification?: string;
  bio?: string;
  avatar_url?: string;
}
