/**
 * TopVeda Phase 6 Loop 3: Live Interaction Types
 * Defines data structures for Live Chat, Live Polls, Live Quizzes, and Realtime Events.
 */

export interface LiveChatMessage {
  id: string;
  liveClassId: string;
  senderId: string;
  senderName: string;
  senderRole: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
  message: string;
  isHidden: boolean;
  moderatedBy?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SendLiveChatMessageDTO {
  liveClassId: string;
  message: string;
}

export interface ModerateChatMessageDTO {
  messageId: string;
  liveClassId: string;
  isHidden: boolean;
  reason?: string;
}

export interface LivePollOption {
  id: string;
  text: string;
  voteCount?: number;
  votePercentage?: number;
}

export interface LivePoll {
  id: string;
  liveClassId: string;
  createdBy: string;
  question: string;
  options: LivePollOption[];
  status: "ACTIVE" | "CLOSED" | "ARCHIVED";
  totalVotes?: number;
  userVotedOptionId?: string | null;
  createdAt: string;
  closedAt?: string | null;
}

export interface CreateLivePollDTO {
  liveClassId: string;
  question: string;
  options: string[];
}

export interface VoteLivePollDTO {
  pollId: string;
  liveClassId: string;
  optionId: string;
}

export interface LiveQuizQuestionOption {
  id: string;
  text: string;
}

export interface LiveQuizQuestion {
  id: string;
  quizId: string;
  questionNumber: number;
  questionText: string;
  options: LiveQuizQuestionOption[];
  correctOptionId?: string; // ONLY visible to teacher/admin, redacted for students before submission
  explanation?: string;
  points: number;
}

export interface LiveQuiz {
  id: string;
  liveClassId: string;
  createdBy: string;
  title: string;
  description?: string;
  durationSeconds: number;
  status: "DRAFT" | "ACTIVE" | "CLOSED" | "EVALUATED";
  questions: LiveQuizQuestion[];
  totalQuestions?: number;
  totalPoints?: number;
  hasAttempted?: boolean;
  userScore?: number | null;
  userPercentage?: number | null;
  createdAt: string;
  closedAt?: string | null;
}

export interface CreateLiveQuizDTO {
  liveClassId: string;
  title: string;
  description?: string;
  durationSeconds?: number;
  questions: {
    questionText: string;
    options: { id: string; text: string }[];
    correctOptionId: string;
    explanation?: string;
    points?: number;
  }[];
}

export interface SubmitLiveQuizDTO {
  quizId: string;
  liveClassId: string;
  answers: Record<string, string>; // questionId -> selectedOptionId
}

export interface LiveQuizResult {
  attemptId: string;
  quizId: string;
  studentId: string;
  scoreObtained: number;
  maxScore: number;
  percentage: number;
  answers: Record<string, string>;
  questionResults: {
    questionId: string;
    questionText: string;
    selectedOptionId: string;
    correctOptionId: string;
    isCorrect: boolean;
    pointsAwarded: number;
    explanation?: string;
  }[];
  submittedAt: string;
}
