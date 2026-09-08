/**
 * Educational Hierarchy Domain Models
 * Structured for future expansion across boards, classes, subjects, courses, and lessons.
 * Non-hardcoded database entities.
 */

export interface Board {
  id: string;
  name: string; // e.g. "Central Board of Secondary Education", "Bihar School Examination Board"
  code: string; // e.g. "CBSE", "BSEB"
  slug: string; // e.g. "cbse", "bihar-board"
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassLevel {
  id: string;
  name: string; // e.g. "Class 10", "Class 11", "Class 12"
  code: string; // e.g. "10", "11", "12"
  slug: string; // e.g. "class-10", "class-11"
  description?: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string; // e.g. "Mathematics", "Science", "Social Science"
  slug: string; // e.g. "mathematics", "science"
  code?: string;
  iconName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  boardId: string;
  classId: string;
  subjectId: string;
  thumbnailUrl?: string;
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  description?: string;
  chapterNumber: number;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type LessonType = "video" | "live" | "interactive" | "reading";

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  slug: string;
  description?: string;
  lessonType: LessonType;
  contentUrl?: string;
  durationSeconds?: number;
  isFreePreview: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ResourceType = "pdf" | "notes" | "sample_paper" | "formula_sheet" | "solution";

export interface LearningResource {
  id: string;
  lessonId?: string;
  chapterId?: string;
  title: string;
  resourceType: ResourceType;
  fileUrl: string;
  fileSizeBytes?: number;
  downloadCount?: number;
  createdAt: string;
  updatedAt: string;
}
