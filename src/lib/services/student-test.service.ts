/**
 * TopVeda Student Test & Practice Engine Service (Phase 5D)
 * Provides secure test delivery (zero leaked answer keys prior to submission),
 * server-authoritative grading, attempt lifecycle management, and scorecard evaluation.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import {
  StudentTestItem,
  SafeTestQuestion,
  TestSubmissionPayload,
  TestScorecardResult,
  QuestionEvaluationResult,
} from "@/types/assessment.types";

// Subject Visual Style Resolver
function getSubjectTestTheme(subjectName: string) {
  const name = (subjectName || "").toLowerCase();

  if (name.includes("math")) {
    return {
      iconBg: "bg-[#FFE8EC] border border-[#FFD0D9]",
      iconColor: "text-[#F43F5E]",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
      badgeText: "Mathematics",
    };
  }
  if (name.includes("sci") || name.includes("phy") || name.includes("chem") || name.includes("bio")) {
    return {
      iconBg: "bg-[#EBF3FF] border border-[#CFE2FE]",
      iconColor: "text-[#2563EB]",
      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badgeText: "Science",
    };
  }
  if (name.includes("eng") || name.includes("lang")) {
    return {
      iconBg: "bg-[#FFF4E8] border border-[#FFE2C2]",
      iconColor: "text-[#F97316]",
      badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
      badgeText: "English",
    };
  }
  return {
    iconBg: "bg-[#F5EDFF] border border-[#E7D6FF]",
    iconColor: "text-[#9333EA]",
    badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
    badgeText: "General",
  };
}

export class StudentTestService {
  /**
   * Fetches published tests catalog with student attempt summaries
   */
  public static async getPublishedTests(
    supabase: SupabaseClient,
    userId?: string
  ): Promise<StudentTestItem[]> {
    try {
      // 1. Fetch published tests
      const { data: tests, error } = await supabase
        .from("student_tests")
        .select(`
          id,
          title,
          slug,
          description,
          subject_id,
          subject_name,
          course_id,
          chapter_id,
          test_type,
          duration_minutes,
          total_marks,
          passing_marks,
          total_questions,
          access_tier,
          display_order
        `)
        .eq("status", "PUBLISHED")
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("[StudentTestService] Error fetching tests:", error.message);
        return [];
      }

      // 2. Fetch student's previous attempts if authenticated
      const attemptsMap = new Map<string, { attemptId: string; score: number; percentage: number; passed: boolean }>();
      if (userId) {
        const { data: attempts } = await supabase
          .from("student_test_attempts")
          .select("id, test_id, score_obtained, percentage, passed, status, created_at")
          .eq("student_id", userId)
          .in("status", ["SUBMITTED", "EVALUATED"])
          .order("created_at", { ascending: false });

        (attempts || []).forEach((att) => {
          if (!attemptsMap.has(att.test_id)) {
            attemptsMap.set(att.test_id, {
              attemptId: att.id,
              score: att.score_obtained,
              percentage: att.percentage,
              passed: att.passed,
            });
          }
        });
      }

      return (tests || []).map((t) => {
        const theme = getSubjectTestTheme(t.subject_name);
        const prevAttempt = attemptsMap.get(t.id);

        return {
          id: t.id,
          title: t.title,
          slug: t.slug,
          description: t.description || undefined,
          subjectId: t.subject_id || undefined,
          subjectName: t.subject_name,
          courseId: t.course_id || undefined,
          chapterId: t.chapter_id || undefined,
          testType: t.test_type,
          durationMinutes: t.duration_minutes,
          totalMarks: t.total_marks,
          passingMarks: t.passing_marks,
          totalQuestions: t.total_questions,
          accessTier: t.access_tier,
          iconBg: theme.iconBg,
          iconColor: theme.iconColor,
          badgeBg: theme.badgeBg,
          badgeText: theme.badgeText,
          isAttempted: Boolean(prevAttempt),
          lastAttemptId: prevAttempt?.attemptId,
          lastScore: prevAttempt?.score,
          lastPercentage: prevAttempt?.percentage,
          lastPassed: prevAttempt?.passed,
        };
      });
    } catch (err) {
      console.error("[StudentTestService] Exception in getPublishedTests:", err);
      return [];
    }
  }

  /**
   * Fetches single test details and instruction parameters
   */
  public static async getTestDetail(
    supabase: SupabaseClient,
    userId: string,
    testId: string
  ) {
    try {
      const { data: test, error } = await supabase
        .from("student_tests")
        .select(`
          id,
          title,
          slug,
          description,
          subject_name,
          course_id,
          chapter_id,
          test_type,
          duration_minutes,
          total_marks,
          passing_marks,
          total_questions,
          access_tier
        `)
        .eq("id", testId)
        .eq("status", "PUBLISHED")
        .single();

      if (error || !test) {
        return { success: false, error: "Test not found or unavailable." };
      }

      // Check for recent completed attempt
      const { data: lastAttempt } = await supabase
        .from("student_test_attempts")
        .select("id, status, score_obtained, percentage, passed, submitted_at")
        .eq("student_id", userId)
        .eq("test_id", testId)
        .in("status", ["SUBMITTED", "EVALUATED"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        success: true,
        data: {
          ...test,
          previousAttempt: lastAttempt
            ? {
                attemptId: lastAttempt.id,
                scoreObtained: lastAttempt.score_obtained,
                percentage: lastAttempt.percentage,
                passed: lastAttempt.passed,
                submittedAt: lastAttempt.submitted_at,
              }
            : null,
        },
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Starts a new test attempt and returns SAFE questions (WITHOUT correct answer keys)
   */
  public static async startTestAttempt(
    supabase: SupabaseClient,
    userId: string,
    testId: string
  ): Promise<{ success: boolean; attemptId?: string; questions?: SafeTestQuestion[]; durationMinutes?: number; error?: string }> {
    try {
      // 1. Verify test is published
      const { data: test, error: testErr } = await supabase
        .from("student_tests")
        .select("id, title, duration_minutes, total_questions, status")
        .eq("id", testId)
        .single();

      if (testErr || !test || test.status !== "PUBLISHED") {
        return { success: false, error: "Test is not published or active." };
      }

      // 2. Fetch questions and safe options (Omits is_correct)
      const { data: questions, error: qErr } = await supabase
        .from("student_test_questions")
        .select(`
          id,
          test_id,
          question_text,
          question_type,
          marks,
          negative_marks,
          display_order,
          options:student_test_question_options(
            id,
            question_id,
            option_label,
            option_text,
            display_order
          )
        `)
        .eq("test_id", testId)
        .order("display_order", { ascending: true });

      if (qErr || !questions || questions.length === 0) {
        return { success: false, error: "No questions found for this test." };
      }

      // 3. Format safe questions (Ensuring zero exposure of is_correct)
      const safeQuestions: SafeTestQuestion[] = questions.map((q) => {
        const sortedOptions = (q.options || []).sort(
          (a: { display_order?: number }, b: { display_order?: number }) => (a.display_order || 0) - (b.display_order || 0)
        );

        return {
          id: q.id,
          testId: q.test_id,
          questionText: q.question_text,
          questionType: q.question_type,
          marks: q.marks,
          negativeMarks: q.negative_marks,
          displayOrder: q.display_order,
          options: sortedOptions.map((opt: { id: string; question_id: string; option_label: string; option_text: string; display_order: number }) => ({
            id: opt.id,
            questionId: opt.question_id,
            optionLabel: opt.option_label,
            optionText: opt.option_text,
            displayOrder: opt.display_order,
          })),
        };
      });

      // 4. Create new student_test_attempts row
      const nowIso = new Date().toISOString();
      const { data: attempt, error: attErr } = await supabase
        .from("student_test_attempts")
        .insert({
          student_id: userId,
          test_id: testId,
          status: "IN_PROGRESS",
          started_at: nowIso,
          total_questions: safeQuestions.length,
          attempted_count: 0,
          correct_count: 0,
          incorrect_count: 0,
          unanswered_count: safeQuestions.length,
          score_obtained: 0,
          max_score: 0,
          percentage: 0,
          passed: false,
          time_spent_seconds: 0,
        })
        .select("id")
        .single();

      if (attErr || !attempt) {
        return { success: false, error: `Failed to initialize test attempt: ${attErr?.message}` };
      }

      return {
        success: true,
        attemptId: attempt.id,
        questions: safeQuestions,
        durationMinutes: test.duration_minutes,
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Server-Authoritative Test Submission & Evaluation Engine
   * Grades answers against true keys server-side, updates attempt, and logs activity.
   */
  public static async submitTestAttempt(
    supabase: SupabaseClient,
    userId: string,
    testId: string,
    payload: TestSubmissionPayload
  ): Promise<{ success: boolean; scorecard?: TestScorecardResult; error?: string }> {
    try {
      const { attemptId, timeSpentSeconds, answers } = payload;

      if (!attemptId) {
        return { success: false, error: "Missing required attempt ID." };
      }

      // 1. Fetch and verify attempt ownership
      const { data: attempt, error: attErr } = await supabase
        .from("student_test_attempts")
        .select("id, student_id, test_id, status, started_at")
        .eq("id", attemptId)
        .single();

      if (attErr || !attempt) {
        return { success: false, error: "Attempt record not found." };
      }

      if (attempt.student_id !== userId) {
        return { success: false, error: "Unauthorized attempt manipulation." };
      }

      // 2. Fetch test metadata
      const { data: test, error: testErr } = await supabase
        .from("student_tests")
        .select("id, title, subject_name, duration_minutes, passing_marks")
        .eq("id", testId)
        .single();

      if (testErr || !test) {
        return { success: false, error: "Test metadata not found." };
      }

      // 3. Fetch questions with TRUE is_correct options for server evaluation
      const { data: fullQuestions, error: qErr } = await supabase
        .from("student_test_questions")
        .select(`
          id,
          question_text,
          question_type,
          marks,
          negative_marks,
          explanation,
          display_order,
          options:student_test_question_options(
            id,
            option_label,
            option_text,
            is_correct,
            display_order
          )
        `)
        .eq("test_id", testId)
        .order("display_order", { ascending: true });

      if (qErr || !fullQuestions) {
        return { success: false, error: "Failed to load evaluation questions." };
      }

      // Map submitted answers by question_id
      const studentAnswersMap = new Map<string, { selectedOptionIds: string[]; numericalAnswer?: string; timeSpent?: number }>();
      (answers || []).forEach((a) => {
        studentAnswersMap.set(a.questionId, {
          selectedOptionIds: a.selectedOptionIds || [],
          numericalAnswer: a.numericalAnswer,
          timeSpent: a.timeSpentSeconds || 0,
        });
      });

      // 4. Server-Side Grading Calculation
      let totalCalculatedScore = 0;
      let totalMaxScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      let attemptedCount = 0;

      const evaluations: QuestionEvaluationResult[] = [];
      const answersToUpsert: any[] = [];

      fullQuestions.forEach((q) => {
        totalMaxScore += q.marks;

        const studentAns = studentAnswersMap.get(q.id);
        const selectedOptionIds = studentAns?.selectedOptionIds || [];
        const isAttempted = selectedOptionIds.length > 0 || Boolean(studentAns?.numericalAnswer);

        const correctOptionIds = (q.options || [])
          .filter((opt: { is_correct: boolean }) => opt.is_correct)
          .map((opt: { id: string }) => opt.id);

        let isCorrect = false;
        let marksAwarded = 0;

        if (isAttempted) {
          attemptedCount++;
          // Compare selected vs correct
          if (
            selectedOptionIds.length === correctOptionIds.length &&
            selectedOptionIds.every((id) => correctOptionIds.includes(id))
          ) {
            isCorrect = true;
            marksAwarded = q.marks;
            correctCount++;
          } else {
            isCorrect = false;
            marksAwarded = -Math.abs(q.negative_marks || 0);
            incorrectCount++;
          }
        } else {
          unansweredCount++;
          marksAwarded = 0;
        }

        totalCalculatedScore += marksAwarded;

        // Collect DB answer row
        answersToUpsert.push({
          attempt_id: attemptId,
          question_id: q.id,
          selected_option_ids: selectedOptionIds,
          numerical_answer: studentAns?.numericalAnswer || null,
          is_correct: isAttempted ? isCorrect : null,
          marks_awarded: marksAwarded,
          time_spent_seconds: studentAns?.timeSpent || 0,
        });

        // Collect evaluation for post-submission scorecard
        evaluations.push({
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          marks: q.marks,
          negativeMarks: q.negative_marks,
          marksAwarded,
          isCorrect,
          isAttempted,
          explanation: q.explanation || undefined,
          studentSelectedOptionIds: selectedOptionIds,
          correctOptionIds,
          options: (q.options || []).map((opt: { id: string; option_label: string; option_text: string; is_correct: boolean }) => ({
            id: opt.id,
            optionLabel: opt.option_label,
            optionText: opt.option_text,
            isCorrect: opt.is_correct,
          })),
        });
      });

      // Ensure final score is non-negative
      totalCalculatedScore = Math.max(0, totalCalculatedScore);
      const percentage = totalMaxScore > 0 ? Math.round((totalCalculatedScore / totalMaxScore) * 100) : 0;
      const passed = totalCalculatedScore >= test.passing_marks;
      const nowIso = new Date().toISOString();

      // 5. Upsert answers into student_test_answers
      for (const ans of answersToUpsert) {
        await supabase
          .from("student_test_answers")
          .upsert(ans, { onConflict: "attempt_id, question_id" });
      }

      // 6. Update student_test_attempts with final authoritative results
      await supabase
        .from("student_test_attempts")
        .update({
          status: "EVALUATED",
          submitted_at: nowIso,
          total_questions: fullQuestions.length,
          attempted_count: attemptedCount,
          correct_count: correctCount,
          incorrect_count: incorrectCount,
          unanswered_count: unansweredCount,
          score_obtained: totalCalculatedScore,
          max_score: totalMaxScore,
          percentage,
          passed,
          time_spent_seconds: timeSpentSeconds || 0,
          updated_at: nowIso,
        })
        .eq("id", attemptId);

      // 7. Insert into student_learning_activity log
      await supabase.from("student_learning_activity").insert({
        student_id: userId,
        activity_type: "TEST_ATTEMPT",
        entity_type: "TEST",
        entity_id: testId,
        duration_seconds: timeSpentSeconds || 0,
        activity_date: nowIso.split("T")[0],
        metadata: {
          attemptId,
          testTitle: test.title,
          scoreObtained: totalCalculatedScore,
          maxScore: totalMaxScore,
          percentage,
          passed,
        },
      });

      const scorecard: TestScorecardResult = {
        attemptId,
        testId,
        testTitle: test.title,
        subjectName: test.subject_name,
        durationMinutes: test.duration_minutes,
        startedAt: attempt.started_at,
        submittedAt: nowIso,
        timeSpentSeconds: timeSpentSeconds || 0,
        totalQuestions: fullQuestions.length,
        attemptedCount,
        correctCount,
        incorrectCount,
        unansweredCount,
        scoreObtained: totalCalculatedScore,
        maxScore: totalMaxScore,
        passingMarks: test.passing_marks,
        percentage,
        passed,
        evaluations,
      };

      return { success: true, scorecard };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Reconstructs full scorecard for a previously completed attempt
   */
  public static async getAttemptScorecard(
    supabase: SupabaseClient,
    userId: string,
    attemptId: string
  ): Promise<{ success: boolean; scorecard?: TestScorecardResult; error?: string }> {
    try {
      const { data: attempt, error: attErr } = await supabase
        .from("student_test_attempts")
        .select(`
          id,
          student_id,
          test_id,
          status,
          started_at,
          submitted_at,
          total_questions,
          attempted_count,
          correct_count,
          incorrect_count,
          unanswered_count,
          score_obtained,
          max_score,
          percentage,
          passed,
          time_spent_seconds,
          test:student_tests(
            id,
            title,
            subject_name,
            duration_minutes,
            passing_marks
          )
        `)
        .eq("id", attemptId)
        .single();

      if (attErr || !attempt) {
        return { success: false, error: "Attempt record not found." };
      }

      if (attempt.student_id !== userId) {
        return { success: false, error: "Unauthorized access to scorecard." };
      }

      const testData = (Array.isArray(attempt.test) ? attempt.test[0] : attempt.test) as { id: string; title: string; subject_name: string; duration_minutes: number; passing_marks: number } | null;

      // Fetch questions and answers
      const { data: fullQuestions } = await supabase
        .from("student_test_questions")
        .select(`
          id,
          question_text,
          question_type,
          marks,
          negative_marks,
          explanation,
          display_order,
          options:student_test_question_options(
            id,
            option_label,
            option_text,
            is_correct,
            display_order
          )
        `)
        .eq("test_id", attempt.test_id)
        .order("display_order", { ascending: true });

      const { data: savedAnswers } = await supabase
        .from("student_test_answers")
        .select("question_id, selected_option_ids, numerical_answer, is_correct, marks_awarded")
        .eq("attempt_id", attemptId);

      const answersMap = new Map<string, any>();
      (savedAnswers || []).forEach((a) => answersMap.set(a.question_id, a));

      const evaluations: QuestionEvaluationResult[] = (fullQuestions || []).map((q) => {
        const ans = answersMap.get(q.id);
        const selected = ans?.selected_option_ids || [];
        const correct = (q.options || [])
          .filter((opt: { is_correct: boolean }) => opt.is_correct)
          .map((opt: { id: string }) => opt.id);

        return {
          questionId: q.id,
          questionText: q.question_text,
          questionType: q.question_type,
          marks: q.marks,
          negativeMarks: q.negative_marks,
          marksAwarded: ans?.marks_awarded || 0,
          isCorrect: Boolean(ans?.is_correct),
          isAttempted: selected.length > 0 || Boolean(ans?.numerical_answer),
          explanation: q.explanation || undefined,
          studentSelectedOptionIds: selected,
          correctOptionIds: correct,
          options: (q.options || []).map((opt: { id: string; option_label: string; option_text: string; is_correct: boolean }) => ({
            id: opt.id,
            optionLabel: opt.option_label,
            optionText: opt.option_text,
            isCorrect: opt.is_correct,
          })),
        };
      });

      return {
        success: true,
        scorecard: {
          attemptId,
          testId: attempt.test_id,
          testTitle: testData?.title || "Test",
          subjectName: testData?.subject_name || "Academic",
          durationMinutes: testData?.duration_minutes || 30,
          startedAt: attempt.started_at,
          submittedAt: attempt.submitted_at || attempt.started_at,
          timeSpentSeconds: attempt.time_spent_seconds,
          totalQuestions: attempt.total_questions,
          attemptedCount: attempt.attempted_count,
          correctCount: attempt.correct_count,
          incorrectCount: attempt.incorrect_count,
          unansweredCount: attempt.unanswered_count,
          scoreObtained: attempt.score_obtained,
          maxScore: attempt.max_score,
          passingMarks: testData?.passing_marks || 40,
          percentage: attempt.percentage,
          passed: attempt.passed,
          evaluations,
        },
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }
}
