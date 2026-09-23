/**
 * TopVeda Phase 5E: Student Study Material Domain Types
 * Defines data structures for Enrolled-Only Study Materials, Batch Associations, Filters, and Activity Tracking.
 */

import { ContentAccessTier } from "./student-learning.types";

export type MaterialType =
  | "notes"
  | "formula_sheet"
  | "ncert_solution"
  | "pyq_paper"
  | "worksheet"
  | "question_bank"
  | "sample_paper"
  | "revision";

export interface StudentStudyMaterialItem {
  id: string;
  batchId: string;
  batchTitle: string;
  courseId: string;
  courseTitle: string;
  chapterId?: string | null;
  chapterTitle?: string | null;
  subjectName: string;
  title: string;
  materialType: MaterialType;
  materialTypeLabel: string;
  fileUrl: string;
  fileSizeBytes: number;
  fileSizeHuman: string;
  pageCount: number;
  downloadCount: number;
  accessTier: ContentAccessTier;
  isEnrolled: boolean;
  createdAt: string;
}

export interface EnrolledBatchItem {
  id: string;
  title: string;
  code?: string;
  boardLabel: string;
  boardName: string;
  className: string;
  materialsCount: number;
}

export interface StudyMaterialFilterParams {
  batchId?: string;
  subjectName?: string;
  materialType?: string;
  chapterId?: string;
  search?: string;
}

export interface StudyMaterialDownloadResponse {
  materialId: string;
  title: string;
  downloadUrl: string;
  fileSizeBytes: number;
  pageCount: number;
  recordedActivity: boolean;
}
