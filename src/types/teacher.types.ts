/**
 * TopVeda — Phase 4.1 Step 5J: Teacher Workspace & Live Control Room Types
 */

import { LiveClassStatus, ContentStatus, CmsLiveClass, CmsLecture, CmsStudyMaterial } from "./cms.types";

export interface TeacherStatistics {
  // Live Classes Metrics
  totalLiveClasses: number;
  upcomingLiveClasses: number;
  liveNowClasses: number;
  completedLiveClasses: number;
  terminatedLiveClasses: number;
  // Recorded Lectures Metrics
  totalLecturesSubmitted: number;
  draftLectures: number;
  pendingReviewLectures: number;
  revisionRequestedLectures: number;
  approvedLectures: number;
  publishedLectures: number;
}

export interface TeacherSummaryStats {
  teacherId: string;
  teacherName: string;
  teacherAvatarUrl?: string;
  teacherEmail: string;
  liveClassesConducted: number;
  upcomingLiveClasses: number;
  completedLiveClasses: number;
  terminatedLiveClasses: number;
  recordedLecturesSubmitted: number;
  pendingReviewLectures: number;
  approvedLectures: number;
  publishedLectures: number;
  revisionRequestedLectures: number;
}

export interface CreateLiveClassDTO {
  boardId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  courseId?: string | null;
  chapterId?: string | null;
  batchId?: string | null;
  subject: string;
  topic: string;
  description?: string;
  scheduledStart: string; // ISO string
  scheduledEnd?: string | null; // ISO string
  timeDisplay?: string;
  thumbnailUrl?: string;
}

export interface UploadRecordedLectureDTO {
  title: string;
  boardId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  courseId?: string | null;
  chapterId?: string | null;
  batchId?: string | null;
  subject: string;
  lectureNumber: number;
  description?: string;
  thumbnailUrl: string;
  thumbnailBg?: string;
  videoStreamId?: string;
  videoPlaybackUrl?: string;
  durationSeconds?: number;
  durationFormatted?: string;
  durationHuman?: string;
  categoryTag?: string;
  isFreePreview?: boolean;
  materialIds?: string[];
  status?: "DRAFT" | "PENDING_REVIEW";
}

export interface UpdateRecordedLectureDTO {
  id: string;
  title?: string;
  boardId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  courseId?: string | null;
  chapterId?: string | null;
  batchId?: string | null;
  subject?: string;
  lectureNumber?: number;
  description?: string;
  thumbnailUrl?: string;
  thumbnailBg?: string;
  videoPlaybackUrl?: string;
  durationFormatted?: string;
  durationHuman?: string;
  categoryTag?: string;
  isFreePreview?: boolean;
  materialIds?: string[];
  status?: "DRAFT" | "PENDING_REVIEW";
}

export interface LiveControlSessionItem extends CmsLiveClass {
  teacherEmail?: string;
  courseTitle?: string;
  boardName?: string;
  className?: string;
  chapterTitle?: string;
  canStartEarly?: boolean; // True if now >= scheduled_start - 10 minutes
  canStudentJoin?: boolean; // True if is_live || now >= scheduled_start
}

export interface SuperAdminLiveControlData {
  liveNow: LiveControlSessionItem[];
  upcoming: LiveControlSessionItem[];
  completed: LiveControlSessionItem[];
  terminated: LiveControlSessionItem[];
  recordingsProcessing: LiveControlSessionItem[];
  recordingsAwaitingReview: LiveControlSessionItem[];
  teacherStats: TeacherSummaryStats[];
}
