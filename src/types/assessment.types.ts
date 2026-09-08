/**
 * Assessment & Test Engine Domain Models
 * Represents tests, questions, options, student attempts, and results.
 */

export type TestType = "chapter_quiz" | "mock_exam" | "sample_paper_test" | "live_test";

export interface Test {
  id: string;
  courseId?: string;
  chapterId?: string;
  title: string;
  slug: string;
  description?: string;
  testType: TestType;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType =
  | "single_choice"
  | "multiple_choice"
  | "numerical"
  | "assertion_reason";

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  optionLabel: string; // "A", "B", "C", "D"
  isCorrect?: boolean; // Hidden from student until evaluation
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

export type AttemptStatus = "in_progress" | "submitted" | "evaluated" | "abandoned";

export interface TestAttempt {
  id: string;
  studentId: string;
  testId: string;
  startedAt: string;
  submittedAt?: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number;
  maxScore: number;
  percentage: number;
  status: AttemptStatus;
}

export interface StudentAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedOptionIds: string[];
  numericalAnswer?: string;
  isCorrect?: boolean;
  marksAwarded: number;
  timeSpentSeconds?: number;
}
