/**
 * Assessment & Test Engine Domain Models (Phase 5D)
 * Represents tests, questions, options, student attempts, evaluations, and scorecards.
 */

import { ContentAccessTier } from "@/types/student-learning.types";

export type TestType = "chapter_quiz" | "mock_exam" | "practice_drill" | "sample_paper_test" | "live_test";

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "numerical"
  | "assertion_reason";

export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "EVALUATED" | "ABANDONED";

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  optionLabel: string; // "A", "B", "C", "D"
  isCorrect?: boolean; // STRICTLY HIDDEN from student until evaluation
  displayOrder: number;
}

export interface SafeQuestionOption {
  id: string;
  questionId: string;
  optionLabel: string;
  optionText: string;
  displayOrder: number;
}

export interface Question {
  id: string;
  testId: string;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  negativeMarks: number;
  explanation?: string;
  displayOrder: number;
  options?: QuestionOption[];
}

export interface SafeTestQuestion {
  id: string;
  testId: string;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  negativeMarks: number;
  displayOrder: number;
  options: SafeQuestionOption[];
}

export interface StudentTestItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  subjectId?: string;
  subjectName: string;
  courseId?: string;
  chapterId?: string;
  testType: TestType;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  totalQuestions: number;
  accessTier: ContentAccessTier;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  // Student state
  isAttempted?: boolean;
  lastAttemptId?: string;
  lastScore?: number;
  lastPercentage?: number;
  lastPassed?: boolean;
}

export interface TestAttempt {
  id: string;
  studentId: string;
  testId: string;
  status: AttemptStatus;
  startedAt: string;
  submittedAt?: string;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  scoreObtained: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionSubmissionItem {
  questionId: string;
  selectedOptionIds: string[];
  numericalAnswer?: string;
  timeSpentSeconds?: number;
}

export interface TestSubmissionPayload {
  attemptId: string;
  timeSpentSeconds: number;
  answers: QuestionSubmissionItem[];
}

export interface QuestionEvaluationResult {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  negativeMarks: number;
  marksAwarded: number;
  isCorrect: boolean;
  isAttempted: boolean;
  explanation?: string;
  studentSelectedOptionIds: string[];
  correctOptionIds: string[];
  options: {
    id: string;
    optionLabel: string;
    optionText: string;
    isCorrect: boolean;
  }[];
}

export interface TestScorecardResult {
  attemptId: string;
  testId: string;
  testTitle: string;
  subjectName: string;
  durationMinutes: number;
  startedAt: string;
  submittedAt: string;
  timeSpentSeconds: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  scoreObtained: number;
  maxScore: number;
  passingMarks: number;
  percentage: number;
  passed: boolean;
  evaluations: QuestionEvaluationResult[];
}
