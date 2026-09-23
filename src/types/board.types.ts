/**
 * TopVeda Phase 5F: Student Boards Domain Types
 * Defines data structures for Board Discovery, Class Hierarchies, Enrolled Batches, and Course Links.
 */

import { ContentAccessTier } from "./student-learning.types";

export interface BoardClassLevel {
  id: string;
  name: string;
  code: string;
  slug: string;
  displayOrder: number;
}

export interface BoardBatchCard {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  boardId: string;
  boardLabel: string;
  classId: string;
  className: string;
  courseId?: string | null;
  courseTitle?: string | null;
  educatorName: string;
  educatorAvatarUrl: string;
  accessTier: ContentAccessTier;
  isEnrolled: boolean;
  isOngoing: boolean;
  isFeatured: boolean;
  startsAt?: string | null;
  badgeText?: string | null;
  badgeVariant?: string | null;
  lecturesCount: number;
  materialsCount: number;
  testsCount: number;
}

export interface StudentBoardItem {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string;
  iconName: string;
  displayOrder: number;
  classLevels: BoardClassLevel[];
  activeBatchesCount: number;
  isEnrolled: boolean;
  enrolledBatchesCount: number;
}

export interface StudentBoardCourseCard {
  id: string;
  title: string;
  category: string;
  slug: string;
  classLevel: string;
  subjectName: string;
  shortDescription?: string | null;
  isEnrolled: boolean;
}

export interface StudentBoardDetail {
  board: StudentBoardItem;
  classLevels: BoardClassLevel[];
  enrolledBatches: BoardBatchCard[];
  availableBatches: BoardBatchCard[];
  upcomingBatches: BoardBatchCard[];
  courses: StudentBoardCourseCard[];
}
