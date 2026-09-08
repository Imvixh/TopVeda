/**
 * Student Learning & Progress Domain Models
 */

export interface StudentProfile {
  id: string; // References auth.users
  fullName: string;
  email: string;
  phone?: string;
  targetBoardId?: string;
  targetClassId?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type EnrollmentStatus = "active" | "completed" | "paused" | "expired";

export interface CourseEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
  status: EnrollmentStatus;
  completedAt?: string;
}

export type ProgressStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgress {
  id: string;
  studentId: string;
  lessonId: string;
  courseId: string;
  status: ProgressStatus;
  progressPercentage: number;
  lastWatchedSecond?: number;
  completedAt?: string;
  updatedAt: string;
}

export type DoubtStatus = "open" | "in_review" | "answered" | "closed";

export interface DoubtTicket {
  id: string;
  studentId: string;
  subjectId: string;
  lessonId?: string;
  title: string;
  questionText: string;
  attachmentUrl?: string;
  status: DoubtStatus;
  answerText?: string;
  answeredByAdminId?: string;
  createdAt: string;
  answeredAt?: string;
}
