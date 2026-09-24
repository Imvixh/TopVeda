/**
 * TopVeda Phase 6 Loop 3: Live Quiz Service
 * Server-authoritative quiz creation, answer key protection, server-side grading, and activity tracking.
 * 
 * SECURITY RULES:
 * 1. Correct answer keys (correct_option_id) are STRICTLY REDACTED for student queries before submission.
 * 2. Grading is 100% server-authoritative.
 * 3. Enforces single attempt per student per live quiz.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  LiveQuiz,
  LiveQuizQuestion,
  CreateLiveQuizDTO,
  SubmitLiveQuizDTO,
  LiveQuizResult,
} from "@/types/live-interaction.types";

export class LiveQuizService {
  /**
   * Creates a new live quiz and its associated question catalog.
   */
  public static async createQuiz(
    supabase: SupabaseClient,
    params: {
      liveClassId: string;
      teacherId: string;
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
  ): Promise<{ success: boolean; quiz?: LiveQuiz; error?: string }> {
    const { liveClassId, teacherId, title, description, durationSeconds = 120, questions } = params;

    if (!title?.trim()) {
      return { success: false, error: "Quiz title is required." };
    }

    if (!questions || questions.length === 0) {
      return { success: false, error: "Quiz must contain at least one question." };
    }

    try {
      const nowIso = new Date().toISOString();

      // 1. Close any currently active quizzes in this live class
      await supabase
        .from("live_class_quizzes")
        .update({ status: "CLOSED", closed_at: nowIso, updated_at: nowIso })
        .eq("live_class_id", liveClassId)
        .eq("status", "ACTIVE");

      // 2. Insert new quiz container
      const { data: newQuiz, error: quizErr } = await supabase
        .from("live_class_quizzes")
        .insert({
          live_class_id: liveClassId,
          created_by: teacherId,
          title: title.trim(),
          description: description?.trim() || null,
          duration_seconds: durationSeconds,
          status: "ACTIVE",
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("*")
        .single();

      if (quizErr || !newQuiz) {
        return { success: false, error: quizErr?.message || "Failed to create live quiz." };
      }

      // 3. Insert questions
      const questionsToInsert = questions.map((q, idx) => ({
        quiz_id: newQuiz.id,
        question_number: idx + 1,
        question_text: q.questionText.trim(),
        options: q.options,
        correct_option_id: q.correctOptionId,
        explanation: q.explanation?.trim() || null,
        points: q.points || 1,
        created_at: nowIso,
      }));

      const { data: insertedQuestions, error: qErr } = await supabase
        .from("live_class_quiz_questions")
        .insert(questionsToInsert)
        .select("*")
        .order("question_number", { ascending: true });

      if (qErr) {
        return { success: false, error: qErr.message || "Failed to save quiz questions." };
      }

      const mappedQuestions: LiveQuizQuestion[] = (insertedQuestions || []).map((q) => ({
        id: q.id,
        quizId: q.quiz_id,
        questionNumber: q.question_number,
        questionText: q.question_text,
        options: q.options,
        correctOptionId: q.correct_option_id,
        explanation: q.explanation,
        points: q.points,
      }));

      const totalPoints = mappedQuestions.reduce((acc, curr) => acc + curr.points, 0);

      const mappedQuiz: LiveQuiz = {
        id: newQuiz.id,
        liveClassId: newQuiz.live_class_id,
        createdBy: newQuiz.created_by,
        title: newQuiz.title,
        description: newQuiz.description,
        durationSeconds: newQuiz.duration_seconds,
        status: newQuiz.status,
        questions: mappedQuestions,
        totalQuestions: mappedQuestions.length,
        totalPoints,
        hasAttempted: false,
        userScore: null,
        userPercentage: null,
        createdAt: newQuiz.created_at,
        closedAt: newQuiz.closed_at,
      };

      return { success: true, quiz: mappedQuiz };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetches the active live quiz.
   * STRICT SECURITY: Redacts correct_option_id for non-admin students who haven't completed it!
   */
  public static async getActiveQuiz(
    supabase: SupabaseClient,
    params: {
      liveClassId: string;
      studentId?: string | null;
      isTeacherOrAdmin?: boolean;
    }
  ): Promise<{ quiz: LiveQuiz | null; attempt?: any; error?: string }> {
    const { liveClassId, studentId, isTeacherOrAdmin = false } = params;

    try {
      // 1. Fetch active quiz (or latest closed)
      let { data: quiz } = await supabase
        .from("live_class_quizzes")
        .select("*")
        .eq("live_class_id", liveClassId)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!quiz) {
        const { data: latestClosed } = await supabase
          .from("live_class_quizzes")
          .select("*")
          .eq("live_class_id", liveClassId)
          .in("status", ["ACTIVE", "CLOSED"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        quiz = latestClosed;
      }

      if (!quiz) {
        return { quiz: null };
      }

      // 2. Fetch questions
      const { data: rawQuestions, error: qErr } = await supabase
        .from("live_class_quiz_questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("question_number", { ascending: true });

      if (qErr) {
        return { quiz: null, error: qErr.message };
      }

      // 3. Check student attempt status
      let attempt = null;
      if (studentId) {
        const { data: attemptRecord } = await supabase
          .from("live_class_quiz_attempts")
          .select("*")
          .eq("quiz_id", quiz.id)
          .eq("student_id", studentId)
          .maybeSingle();

        attempt = attemptRecord;
      }

      const hasAttempted = Boolean(attempt);

      // 4. Map questions with STRICT ANSWER REDACTION
      // Answer key is ONLY included if user is teacher/admin OR student has already submitted attempt!
      const mappedQuestions: LiveQuizQuestion[] = (rawQuestions || []).map((q) => {
        const showCorrectAnswer = isTeacherOrAdmin || hasAttempted;
        return {
          id: q.id,
          quizId: q.quiz_id,
          questionNumber: q.question_number,
          questionText: q.question_text,
          options: q.options,
          correctOptionId: showCorrectAnswer ? q.correct_option_id : undefined,
          explanation: showCorrectAnswer ? q.explanation : undefined,
          points: q.points,
        };
      });

      const totalPoints = mappedQuestions.reduce((acc, curr) => acc + curr.points, 0);

      const mappedQuiz: LiveQuiz = {
        id: quiz.id,
        liveClassId: quiz.live_class_id,
        createdBy: quiz.created_by,
        title: quiz.title,
        description: quiz.description,
        durationSeconds: quiz.duration_seconds,
        status: quiz.status,
        questions: mappedQuestions,
        totalQuestions: mappedQuestions.length,
        totalPoints,
        hasAttempted,
        userScore: attempt ? Number(attempt.score_obtained) : null,
        userPercentage: attempt ? Number(attempt.percentage) : null,
        createdAt: quiz.created_at,
        closedAt: quiz.closed_at,
      };

      return { quiz: mappedQuiz, attempt };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { quiz: null, error: error.message };
    }
  }

  /**
   * Submits student quiz answers with 100% server-authoritative grading.
   */
  public static async submitQuiz(
    supabase: SupabaseClient,
    params: {
      quizId: string;
      liveClassId: string;
      studentId: string;
      answers: Record<string, string>; // questionId -> selectedOptionId
    }
  ): Promise<{ success: boolean; result?: LiveQuizResult; error?: string }> {
    const { quizId, liveClassId, studentId, answers } = params;

    try {
      // 1. Fetch quiz to verify state
      const { data: quiz, error: quizErr } = await supabase
        .from("live_class_quizzes")
        .select("id, status")
        .eq("id", quizId)
        .eq("live_class_id", liveClassId)
        .single();

      if (quizErr || !quiz) {
        return { success: false, error: "Live quiz not found." };
      }

      if (quiz.status !== "ACTIVE") {
        return { success: false, error: "This quiz is no longer active." };
      }

      // 2. Check for duplicate attempt (single attempt rule)
      const { data: existingAttempt } = await supabase
        .from("live_class_quiz_attempts")
        .select("id")
        .eq("quiz_id", quizId)
        .eq("student_id", studentId)
        .maybeSingle();

      if (existingAttempt) {
        return { success: false, error: "You have already submitted an attempt for this quiz." };
      }

      // 3. Fetch questions WITH authoritative correct answers server-side
      const { data: questions, error: qErr } = await supabase
        .from("live_class_quiz_questions")
        .select("*")
        .eq("quiz_id", quizId)
        .order("question_number", { ascending: true });

      if (qErr || !questions || questions.length === 0) {
        return { success: false, error: "Quiz questions not found." };
      }

      // 4. Authoritative Server-Side Grading
      let scoreObtained = 0;
      let maxScore = 0;

      const questionResults = questions.map((q) => {
        const selectedOptionId = answers[q.id] || "";
        const isCorrect = selectedOptionId === q.correct_option_id;
        const pointsAwarded = isCorrect ? q.points : 0;

        scoreObtained += pointsAwarded;
        maxScore += q.points;

        return {
          questionId: q.id,
          questionText: q.question_text,
          selectedOptionId,
          correctOptionId: q.correct_option_id,
          isCorrect,
          pointsAwarded,
          explanation: q.explanation,
        };
      });

      const percentage = maxScore > 0 ? Math.round((scoreObtained / maxScore) * 100) : 0;
      const nowIso = new Date().toISOString();

      // 5. Insert attempt record
      const { data: attemptRecord, error: insertErr } = await supabase
        .from("live_class_quiz_attempts")
        .insert({
          quiz_id: quizId,
          live_class_id: liveClassId,
          student_id: studentId,
          selected_answers: answers,
          score_obtained: scoreObtained,
          max_score: maxScore,
          percentage,
          status: "GRADED",
          submitted_at: nowIso,
          created_at: nowIso,
        })
        .select("*")
        .single();

      if (insertErr || !attemptRecord) {
        if (insertErr?.code === "23505") {
          return { success: false, error: "You have already submitted an attempt for this quiz." };
        }
        return { success: false, error: insertErr?.message || "Failed to record quiz submission." };
      }

      // 6. Log study activity
      try {
        await supabase.from("student_learning_activity").insert({
          student_id: studentId,
          activity_type: "LIVE_QUIZ_COMPLETION",
          entity_type: "LIVE_CLASS",
          entity_id: liveClassId,
          duration_seconds: 60,
          activity_date: nowIso.split("T")[0],
          metadata: { quizId, scoreObtained, maxScore, percentage },
        });
      } catch (logErr) {
        console.warn("[LiveQuizService] Non-blocking activity log warning:", logErr);
      }

      const result: LiveQuizResult = {
        attemptId: attemptRecord.id,
        quizId,
        studentId,
        scoreObtained,
        maxScore,
        percentage,
        answers,
        questionResults,
        submittedAt: nowIso,
      };

      return { success: true, result };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Closes an active live quiz.
   */
  public static async closeQuiz(
    supabase: SupabaseClient,
    params: {
      quizId: string;
      liveClassId: string;
      teacherId: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const { quizId, liveClassId } = params;

    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("live_class_quizzes")
        .update({
          status: "CLOSED",
          closed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", quizId)
        .eq("live_class_id", liveClassId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }
}
