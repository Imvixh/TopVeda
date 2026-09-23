/**
 * TopVeda Phase 5: Student Learning Platform Domain Types
 * Defines data structures for My Learning, Content Access, Enrollments, Progress, and Entitlements.
 */

export type ContentAccessTier = "FREE" | "PAID_ONLY" | "PREMIUM_INCLUDED";

export type StudentEnrollmentStatus = "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

export type StudentEntitlementStatus = "ACTIVE" | "EXPIRED" | "REVOKED";

export interface StudentLearningPreferences {
  id: string;
  studentId: string;
  boardId?: string | null;
  classId?: string | null;
  targetYear?: number | null;
  dailyGoalMinutes: number;
  notificationPreferences: {
    liveReminders: boolean;
    lectureUpdates: boolean;
    testResults: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface StudentContentEntitlement {
  id: string;
  studentId: string;
  contentType: "COURSE" | "BATCH" | "BOARD_BUNDLE" | "ALL_ACCESS";
  contentId?: string | null;
  accessTier: ContentAccessTier;
  status: StudentEntitlementStatus;
  grantedBy?: string | null;
  orderReferenceId?: string | null;
  startsAt: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  courseId: string;
  batchId?: string | null;
  status: StudentEnrollmentStatus;
  enrolledAt: string;
  completedAt?: string | null;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentLectureProgress {
  id: string;
  studentId: string;
  lectureId: string;
  courseId: string;
  lastPositionSeconds: number;
  watchDurationSeconds: number;
  isCompleted: boolean;
  completedAt?: string | null;
  lastWatchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentLearningActivity {
  id: string;
  studentId: string;
  activityType: "LECTURE_WATCH" | "LIVE_ATTENDANCE" | "TEST_ATTEMPT" | "MATERIAL_DOWNLOAD" | "STREAK_HEARTBEAT";
  entityType: "LECTURE" | "LIVE_CLASS" | "TEST" | "STUDY_MATERIAL" | "COURSE";
  entityId: string;
  durationSeconds: number;
  activityDate: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

/**
 * Enrolled Course Card Presentation Data (Used by My Learning UI)
 */
export interface EnrolledCourseCardData {
  id: string; // Enrollment ID
  courseId: string;
  title: string;
  category: string;
  boardName: string;
  subjectName: string;
  batchTitle?: string | null;
  progressPercent: number;
  totalLectures: number;
  completedLectures: number;
  lastWatchedLectureId?: string | null;
  lastWatchedLectureTitle?: string | null;
  lastWatchedPosition?: number;
  resumeUrl: string;
  detailsUrl: string;
  iconType: string;
  iconBg: string;
  iconColor: string;
  status: StudentEnrollmentStatus;
  enrolledAt: string;
  lastAccessedAt: string;
  accessTier: ContentAccessTier;
}

/**
 * Recommended Course Card Presentation Data (Used by My Learning UI)
 */
export interface RecommendedCourseCardData {
  id: string; // Course ID
  title: string;
  category: string;
  boardName: string;
  subjectName: string;
  topicsSubtitle?: string;
  iconType: string;
  iconBg: string;
  iconColor: string;
  exploreUrl: string;
  accessTier: ContentAccessTier;
}

/**
 * Aggregated My Learning Response
 */
export interface MyLearningData {
  enrolledCourses: EnrolledCourseCardData[];
  completedCourses: EnrolledCourseCardData[];
  recommendedCourses: RecommendedCourseCardData[];
}

/**
 * Content Access Result (Evaluated by ContentAccessService)
 */
export interface ContentAccessResult {
  granted: boolean;
  isLocked: boolean;
  accessTier: ContentAccessTier;
  reason?: string;
}
