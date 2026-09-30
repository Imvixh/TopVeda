import { SupabaseClient } from "@supabase/supabase-js";

export interface AcademicTaxonomy {
  boards: { id: string; name: string; code: string }[];
  classes: { id: string; name: string; code: string }[];
  subjects: { id: string; name: string; code: string }[];
  courses: {
    id: string;
    title: string;
    board_id: string;
    class_id: string;
    subject_id: string;
    board?: { id: string; name: string; code: string };
    class?: { id: string; name: string; code: string };
    subject?: { id: string; name: string; code: string };
  }[];
  chapters: { id: string; title: string; course_id: string; chapter_number?: number }[];
}

export interface AdminTestListItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  testType: string; // 'chapter_quiz' | 'quiz' | 'test' | 'practice_drill' | 'mock_exam'
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isVisible: boolean;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  totalQuestions: number;
  accessTier: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  // Academic Targeting
  subjectId?: string;
  subjectName: string;
  courseId?: string;
  chapterId?: string;
  chapterTitle?: string;
  boardName?: string;
  boardCode?: string;
  className?: string;
  classCode?: string;
  // Stats
  attemptsCount: number;
  questionsCount: number;
}

export interface AdminTestStats {
  totalTests: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  quizCount: number;
  testCount: number;
  practiceDrillCount: number;
  mockExamCount: number;
  totalQuestions: number;
  totalAttempts: number;
}

export interface AdminQuestionOptionPayload {
  id?: string;
  optionLabel: string; // 'A' | 'B' | 'C' | 'D'
  optionText: string;
  isCorrect: boolean;
  displayOrder: number;
}

export interface AdminQuestionPayload {
  id?: string;
  questionText: string;
  questionType: string; // 'single_choice' | 'multiple_choice' | 'mcq' | 'numerical'
  marks: number;
  negativeMarks: number;
  explanation?: string;
  displayOrder: number;
  options: AdminQuestionOptionPayload[];
}

export interface AdminTestUpsertPayload {
  id?: string;
  title: string;
  slug?: string;
  description?: string;
  testType: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isVisible?: boolean;
  durationMinutes: number;
  totalMarks: number;
  passingMarks?: number;
  accessTier?: string;
  displayOrder?: number;
  // Academic targeting
  subjectId?: string;
  subjectName?: string;
  courseId?: string;
  chapterId?: string;
  // Nested questions
  questions: AdminQuestionPayload[];
}

export interface JsonImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  parsedPayload?: AdminTestUpsertPayload;
}

export class CmsTestService {
  /**
   * Fetches the complete academic taxonomy (Boards, Classes, Subjects, Courses, Chapters)
   */
  public static async getAcademicTaxonomy(supabase: SupabaseClient): Promise<AcademicTaxonomy> {
    try {
      const [
        { data: boards },
        { data: classes },
        { data: subjects },
        { data: courses },
        { data: chapters },
      ] = await Promise.all([
        supabase.from("cms_boards").select("id, name, code").order("display_order", { ascending: true }),
        supabase.from("cms_class_levels").select("id, name, code").order("display_order", { ascending: true }),
        supabase.from("cms_subjects").select("id, name, code").order("display_order", { ascending: true }),
        supabase.from("cms_courses").select(`
          id,
          title,
          board_id,
          class_id,
          subject_id,
          cms_boards ( id, name, code ),
          cms_class_levels ( id, name, code ),
          cms_subjects ( id, name, code )
        `).order("created_at", { ascending: true }),
        supabase.from("cms_chapters").select("id, title, course_id, chapter_number").order("chapter_number", { ascending: true }),
      ]);

      const formattedCourses = ((courses || []) as unknown as Array<{
        id: string;
        title: string;
        board_id?: string;
        class_id?: string;
        subject_id?: string;
        cms_boards?: { id: string; name: string; code?: string } | Array<{ id: string; name: string; code?: string }>;
        cms_class_levels?: { id: string; name: string; code?: string } | Array<{ id: string; name: string; code?: string }>;
        cms_subjects?: { id: string; name: string; code?: string } | Array<{ id: string; name: string; code?: string }>;
      }>).map((c) => {
        const board = Array.isArray(c.cms_boards) ? c.cms_boards[0] : c.cms_boards;
        const classLevel = Array.isArray(c.cms_class_levels) ? c.cms_class_levels[0] : c.cms_class_levels;
        const subject = Array.isArray(c.cms_subjects) ? c.cms_subjects[0] : c.cms_subjects;
        return {
          id: c.id,
          title: c.title,
          board_id: c.board_id || "",
          class_id: c.class_id || "",
          subject_id: c.subject_id || "",
          board: board ? { id: board.id, name: board.name, code: board.code || "" } : undefined,
          class: classLevel ? { id: classLevel.id, name: classLevel.name, code: classLevel.code || "" } : undefined,
          subject: subject ? { id: subject.id, name: subject.name, code: subject.code || "" } : undefined,
        };
      });

      return {
        boards: boards || [],
        classes: classes || [],
        subjects: subjects || [],
        courses: formattedCourses,
        chapters: chapters || [],
      };
    } catch (err) {
      console.error("[CmsTestService] Error loading academic taxonomy:", err);
      return {
        boards: [],
        classes: [],
        subjects: [],
        courses: [],
        chapters: [],
      };
    }
  }

  /**
   * Fetches all tests for Super Admin catalog with calculated stats and academic links
   */
  public static async getAdminTestsCatalog(
    supabase: SupabaseClient,
    filters?: {
      search?: string;
      testType?: string;
      status?: string;
      boardId?: string;
      classId?: string;
      subjectId?: string;
    }
  ): Promise<{ tests: AdminTestListItem[]; stats: AdminTestStats }> {
    try {
      // 1. Query tests with course and chapter joins
      let query = supabase
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
          status,
          is_visible,
          display_order,
          created_at,
          updated_at,
          cms_courses (
            id,
            board_id,
            class_id,
            subject_id,
            cms_boards ( id, name, code ),
            cms_class_levels ( id, name, code ),
            cms_subjects ( id, name, code )
          ),
          cms_chapters (
            id,
            title
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "ALL") {
        query = query.eq("status", filters.status);
      }

      if (filters?.testType && filters.testType !== "ALL") {
        if (filters.testType === "quiz") {
          query = query.in("test_type", ["quiz", "chapter_quiz"]);
        } else if (filters.testType === "mock") {
          query = query.in("test_type", ["mock_exam", "mock_test", "sample_paper_test"]);
        } else if (filters.testType === "drill") {
          query = query.eq("test_type", "practice_drill");
        } else if (filters.testType === "test") {
          query = query.eq("test_type", "test");
        } else {
          query = query.eq("test_type", filters.testType);
        }
      }

      if (filters?.subjectId && filters.subjectId !== "ALL") {
        query = query.eq("subject_id", filters.subjectId);
      }

      const { data: rawTests, error } = await query;

      if (error) {
        console.error("[CmsTestService] Error querying tests:", error);
        return {
          tests: [],
          stats: {
            totalTests: 0,
            publishedCount: 0,
            draftCount: 0,
            archivedCount: 0,
            quizCount: 0,
            testCount: 0,
            practiceDrillCount: 0,
            mockExamCount: 0,
            totalQuestions: 0,
            totalAttempts: 0,
          },
        };
      }

      // 2. Fetch attempt counts grouped by test_id
      const { data: attemptRows } = await supabase
        .from("student_test_attempts")
        .select("test_id");

      const attemptCounts = new Map<string, number>();
      (attemptRows || []).forEach((row) => {
        attemptCounts.set(row.test_id, (attemptCounts.get(row.test_id) || 0) + 1);
      });

      // 3. Fetch question counts grouped by test_id
      const { data: questionRows } = await supabase
        .from("student_test_questions")
        .select("test_id");

      const questionCounts = new Map<string, number>();
      (questionRows || []).forEach((row) => {
        questionCounts.set(row.test_id, (questionCounts.get(row.test_id) || 0) + 1);
      });

      // 4. Map tests and compute stats
      let totalQuestionsAcrossAll = 0;
      const totalAttemptsAcrossAll = attemptRows?.length || 0;

      interface RawTestWithJoins {
        id: string;
        title: string;
        slug: string;
        description?: string | null;
        test_type: string;
        status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        is_visible: boolean;
        duration_minutes: number;
        total_marks: number;
        passing_marks?: number | null;
        total_questions?: number | null;
        access_tier: "FREE" | "PREMIUM" | "ENROLLED_ONLY";
        display_order: number;
        created_at: string;
        updated_at: string;
        subject_id?: string | null;
        subject_name?: string | null;
        course_id?: string | null;
        chapter_id?: string | null;
        cms_courses?: {
          id: string;
          board_id?: string;
          class_id?: string;
          subject_id?: string;
          cms_boards?: { id: string; name: string; code?: string };
          cms_class_levels?: { id: string; name: string; code?: string };
          cms_subjects?: { id: string; name: string; code?: string };
        } | Array<{
          id: string;
          board_id?: string;
          class_id?: string;
          subject_id?: string;
          cms_boards?: { id: string; name: string; code?: string };
          cms_class_levels?: { id: string; name: string; code?: string };
          cms_subjects?: { id: string; name: string; code?: string };
        }> | null;
        cms_chapters?: { id: string; title: string; chapter_number?: number } | null;
      }

      const formattedTests: AdminTestListItem[] = ((rawTests || []) as unknown as RawTestWithJoins[]).map((t) => {
        const course = Array.isArray(t.cms_courses) ? t.cms_courses[0] : t.cms_courses;
        const chapter = t.cms_chapters;
        const board = course?.cms_boards;
        const classLevel = course?.cms_class_levels;
        const realQuestionsCount = questionCounts.get(t.id) || t.total_questions || 0;
        totalQuestionsAcrossAll += realQuestionsCount;

        return {
          id: t.id,
          title: t.title,
          slug: t.slug,
          description: t.description || undefined,
          testType: t.test_type,
          status: t.status,
          isVisible: t.is_visible,
          durationMinutes: t.duration_minutes,
          totalMarks: t.total_marks,
          passingMarks: t.passing_marks ?? Math.round(t.total_marks * 0.4),
          totalQuestions: realQuestionsCount,
          accessTier: t.access_tier,
          displayOrder: t.display_order,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          subjectId: t.subject_id || undefined,
          subjectName: t.subject_name || course?.cms_subjects?.name || "General",
          courseId: t.course_id || undefined,
          chapterId: t.chapter_id || undefined,
          chapterTitle: chapter?.title || undefined,
          boardName: board?.name,
          boardCode: board?.code,
          className: classLevel?.name,
          classCode: classLevel?.code,
          attemptsCount: attemptCounts.get(t.id) || 0,
          questionsCount: realQuestionsCount,
        };
      });

      // Client-side search and course filters if passed
      let filteredTests = formattedTests;
      if (filters?.search && filters.search.trim() !== "") {
        const queryTerm = filters.search.toLowerCase().trim();
        filteredTests = filteredTests.filter(
          (t) =>
            t.title.toLowerCase().includes(queryTerm) ||
            t.subjectName.toLowerCase().includes(queryTerm) ||
            (t.chapterTitle && t.chapterTitle.toLowerCase().includes(queryTerm)) ||
            (t.boardName && t.boardName.toLowerCase().includes(queryTerm)) ||
            (t.className && t.className.toLowerCase().includes(queryTerm))
        );
      }

      if (filters?.boardId && filters.boardId !== "ALL") {
        filteredTests = filteredTests.filter((t) => {
          const raw = ((rawTests || []) as unknown as RawTestWithJoins[]).find((rt) => rt.id === t.id);
          const course = Array.isArray(raw?.cms_courses) ? raw?.cms_courses[0] : raw?.cms_courses;
          return course?.board_id === filters.boardId;
        });
      }

      if (filters?.classId && filters.classId !== "ALL") {
        filteredTests = filteredTests.filter((t) => {
          const raw = ((rawTests || []) as unknown as RawTestWithJoins[]).find((rt) => rt.id === t.id);
          const course = Array.isArray(raw?.cms_courses) ? raw?.cms_courses[0] : raw?.cms_courses;
          return course?.class_id === filters.classId;
        });
      }

      // Calculate Stats across all tests in DB
      const testList = (rawTests || []) as unknown as RawTestWithJoins[];
      const stats: AdminTestStats = {
        totalTests: testList.length,
        publishedCount: testList.filter((t) => t.status === "PUBLISHED").length,
        draftCount: testList.filter((t) => t.status === "DRAFT").length,
        archivedCount: testList.filter((t) => t.status === "ARCHIVED").length,
        quizCount: testList.filter((t) => t.test_type === "quiz" || t.test_type === "chapter_quiz").length,
        testCount: testList.filter((t) => t.test_type === "test").length,
        practiceDrillCount: testList.filter((t) => t.test_type === "practice_drill").length,
        mockExamCount: testList.filter((t) => t.test_type === "mock_exam" || t.test_type === "mock_test").length,
        totalQuestions: totalQuestionsAcrossAll,
        totalAttempts: totalAttemptsAcrossAll,
      };

      return { tests: filteredTests, stats };
    } catch (err) {
      console.error("[CmsTestService] Exception in getAdminTestsCatalog:", err);
      return {
        tests: [],
        stats: {
          totalTests: 0,
          publishedCount: 0,
          draftCount: 0,
          archivedCount: 0,
          quizCount: 0,
          testCount: 0,
          practiceDrillCount: 0,
          mockExamCount: 0,
          totalQuestions: 0,
          totalAttempts: 0,
        },
      };
    }
  }

  /**
   * Fetches full test details including questions and TRUE answer keys for Super Admin
   */
  public static async getTestWithQuestions(
    supabase: SupabaseClient,
    testId: string
  ): Promise<{ success: boolean; test?: AdminTestUpsertPayload; error?: string }> {
    try {
      const { data: testRow, error: tErr } = await supabase
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
          status,
          is_visible,
          display_order,
          cms_courses (
            id,
            board_id,
            class_id,
            subject_id,
            cms_boards ( id, name, code ),
            cms_class_levels ( id, name, code ),
            cms_subjects ( id, name, code )
          ),
          cms_chapters (
            id,
            title
          )
        `)
        .eq("id", testId)
        .single();

      if (tErr || !testRow) {
        return { success: false, error: "Test not found." };
      }

      // Fetch all questions and options with is_correct
      const { data: questionsData, error: qErr } = await supabase
        .from("student_test_questions")
        .select(`
          id,
          test_id,
          question_text,
          question_type,
          marks,
          negative_marks,
          explanation,
          display_order,
          options:student_test_question_options(
            id,
            question_id,
            option_label,
            option_text,
            is_correct,
            display_order
          )
        `)
        .eq("test_id", testId)
        .order("display_order", { ascending: true });

      if (qErr) {
        return { success: false, error: `Failed to load questions: ${qErr.message}` };
      }

      interface RawQuestionRow {
        id: string;
        question_text: string;
        question_type?: string;
        marks: number;
        negative_marks?: number;
        explanation?: string | null;
        display_order: number;
        options?: Array<{
          id: string;
          question_id: string;
          option_label: string;
          option_text: string;
          is_correct: boolean;
          display_order: number;
        }>;
      }

      const questions: AdminQuestionPayload[] = ((questionsData || []) as unknown as RawQuestionRow[]).map((q) => {
        const sortedOptions = (q.options || []).sort(
          (a, b) => (a.display_order || 0) - (b.display_order || 0)
        );

        return {
          id: q.id,
          questionText: q.question_text,
          questionType: q.question_type || "mcq",
          marks: q.marks,
          negativeMarks: q.negative_marks || 0,
          explanation: q.explanation || "",
          displayOrder: q.display_order,
          options: sortedOptions.map((opt) => ({
            id: opt.id,
            optionLabel: opt.option_label,
            optionText: opt.option_text,
            isCorrect: Boolean(opt.is_correct),
            displayOrder: opt.display_order,
          })),
        };
      });

      const payload: AdminTestUpsertPayload = {
        id: testRow.id,
        title: testRow.title,
        slug: testRow.slug,
        description: testRow.description || "",
        testType: testRow.test_type,
        status: testRow.status,
        isVisible: testRow.is_visible,
        durationMinutes: testRow.duration_minutes,
        totalMarks: testRow.total_marks,
        passingMarks: testRow.passing_marks,
        accessTier: testRow.access_tier,
        displayOrder: testRow.display_order,
        subjectId: testRow.subject_id || undefined,
        subjectName: testRow.subject_name,
        courseId: testRow.course_id || undefined,
        chapterId: testRow.chapter_id || undefined,
        questions,
      };

      return { success: true, test: payload };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Safe atomic upsert of test, questions, and options
   */
  public static async upsertTestWithQuestions(
    adminClient: SupabaseClient,
    payload: AdminTestUpsertPayload,
    adminUserId?: string
  ): Promise<{ success: boolean; testId?: string; error?: string }> {
    try {
      // 1. Validate Basic Info
      if (!payload.title || payload.title.trim() === "") {
        return { success: false, error: "Test title is required." };
      }
      if (!payload.testType) {
        return { success: false, error: "Content type is required." };
      }
      if (!payload.questions || payload.questions.length === 0) {
        return { success: false, error: "Test must have at least one question." };
      }

      // 2. Validate Questions & Options Integrity
      let calculatedTotalMarks = 0;
      for (let i = 0; i < payload.questions.length; i++) {
        const q = payload.questions[i];
        if (!q.questionText || q.questionText.trim() === "") {
          return { success: false, error: `Question ${i + 1} is missing question text.` };
        }
        if (!q.options || q.options.length < 2) {
          return { success: false, error: `Question ${i + 1} must have at least 2 options (standard 4 options recommended).` };
        }
        const hasCorrectAnswer = q.options.some((opt) => opt.isCorrect);
        if (!hasCorrectAnswer) {
          return { success: false, error: `Question ${i + 1} does not have any correct answer selected.` };
        }
        calculatedTotalMarks += q.marks || 1;
      }

      const totalMarks = payload.totalMarks || calculatedTotalMarks;
      const passingMarks = payload.passingMarks || Math.round(totalMarks * 0.4);
      const isPracticeDrill = payload.testType === "practice_drill";
      const durationMinutes = isPracticeDrill ? 0 : (payload.durationMinutes || 30);

      // Auto-generate slug if not provided
      const slug =
        payload.slug ||
        payload.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
          "-" +
          Date.now().toString(36);

      const nowIso = new Date().toISOString();

      // 3. Upsert student_tests record
      const testRowData: Record<string, unknown> = {
        title: payload.title.trim(),
        slug,
        description: payload.description || null,
        subject_id: payload.subjectId || null,
        subject_name: payload.subjectName || "General",
        course_id: payload.courseId || null,
        chapter_id: payload.chapterId || null,
        test_type: payload.testType,
        duration_minutes: durationMinutes,
        total_marks: totalMarks,
        passing_marks: passingMarks,
        total_questions: payload.questions.length,
        access_tier: payload.accessTier || "FREE",
        status: payload.status || "DRAFT",
        is_visible: payload.isVisible ?? true,
        display_order: payload.displayOrder || 1,
        updated_at: nowIso,
      };

      if (adminUserId) {
        testRowData.created_by = adminUserId;
      }

      let savedTestId = payload.id;

      if (savedTestId) {
        const { error: updErr } = await adminClient
          .from("student_tests")
          .update(testRowData)
          .eq("id", savedTestId);

        if (updErr) {
          return { success: false, error: `Failed to update test: ${updErr.message}` };
        }
      } else {
        testRowData.created_at = nowIso;
        const { data: newTest, error: insErr } = await adminClient
          .from("student_tests")
          .insert(testRowData)
          .select("id")
          .single();

        if (insErr || !newTest) {
          return { success: false, error: `Failed to create test: ${insErr?.message}` };
        }
        savedTestId = newTest.id;
      }

      if (!savedTestId) {
        return { success: false, error: "Failed to obtain test identifier." };
      }

      // 4. Upsert Questions & Options
      // If updating, clean up previous questions and re-insert cleanly
      if (payload.id) {
        const { data: oldQuestions } = await adminClient
          .from("student_test_questions")
          .select("id")
          .eq("test_id", savedTestId);

        const oldQIds = (oldQuestions || []).map((q) => q.id);
        if (oldQIds.length > 0) {
          await adminClient.from("student_test_question_options").delete().in("question_id", oldQIds);
          await adminClient.from("student_test_questions").delete().eq("test_id", savedTestId);
        }
      }

      const insertedQIds: string[] = [];

      // Insert all questions and options sequentially/safely
      for (let i = 0; i < payload.questions.length; i++) {
        const q = payload.questions[i];
        const { data: newQ, error: qInsErr } = await adminClient
          .from("student_test_questions")
          .insert({
            test_id: savedTestId,
            question_text: q.questionText.trim(),
            question_type: q.questionType || "single_choice",
            marks: typeof q.marks === "number" ? q.marks : (parseFloat(String(q.marks)) || 1),
            negative_marks: typeof q.negativeMarks === "number" ? q.negativeMarks : (parseFloat(String(q.negativeMarks)) || 0),
            explanation: q.explanation || null,
            display_order: i + 1,
          })
          .select("id")
          .single();

        if (qInsErr || !newQ) {
          // Atomicity rollback for new test creation to prevent partially created tests
          if (!payload.id && savedTestId) {
            if (insertedQIds.length > 0) {
              await adminClient.from("student_test_question_options").delete().in("question_id", insertedQIds);
              await adminClient.from("student_test_questions").delete().eq("test_id", savedTestId);
            }
            await adminClient.from("student_tests").delete().eq("id", savedTestId);
          }
          return { success: false, error: `Failed to save question ${i + 1}: ${qInsErr?.message}` };
        }

        insertedQIds.push(newQ.id);

        const optionsToInsert = q.options.map((opt, optIdx) => ({
          question_id: newQ.id,
          option_label: opt.optionLabel || String.fromCharCode(65 + optIdx),
          option_text: opt.optionText.trim(),
          is_correct: Boolean(opt.isCorrect),
          display_order: optIdx + 1,
        }));

        const { error: optInsErr } = await adminClient
          .from("student_test_question_options")
          .insert(optionsToInsert);

        if (optInsErr) {
          // Atomicity rollback for new test creation to prevent partially created tests
          if (!payload.id && savedTestId) {
            await adminClient.from("student_test_question_options").delete().in("question_id", insertedQIds);
            await adminClient.from("student_test_questions").delete().eq("test_id", savedTestId);
            await adminClient.from("student_tests").delete().eq("id", savedTestId);
          }
          return { success: false, error: `Failed to save options for question ${i + 1}: ${optInsErr.message}` };
        }
      }

      return { success: true, testId: savedTestId };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, error: error.message };
    }
  }

  /**
   * Deletes a test safely (soft-archives if student attempts exist to protect historical grades)
   */
  public static async deleteOrArchiveTest(
    adminClient: SupabaseClient,
    testId: string
  ): Promise<{ success: boolean; action: "DELETED" | "ARCHIVED"; message: string }> {
    try {
      // Check if student attempts exist
      const { data: attempts } = await adminClient
        .from("student_test_attempts")
        .select("id")
        .eq("test_id", testId)
        .limit(1);

      if (attempts && attempts.length > 0) {
        // Attempts exist -> Soft Archive to preserve historical student data
        await adminClient
          .from("student_tests")
          .update({
            status: "ARCHIVED",
            is_visible: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", testId);

        return {
          success: true,
          action: "ARCHIVED",
          message: "Test has completed student attempts. It has been archived and hidden to preserve student scorecard integrity.",
        };
      }

      // No student attempts -> Hard delete
      const { error: delErr } = await adminClient
        .from("student_tests")
        .delete()
        .eq("id", testId);

      if (delErr) {
        return { success: false, action: "DELETED", message: `Failed to delete test: ${delErr.message}` };
      }

      return {
        success: true,
        action: "DELETED",
        message: "Test and all associated questions were permanently deleted.",
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { success: false, action: "DELETED", message: error.message };
    }
  }

  /**
   * JSON Validator & Academic Entity Resolver
   * Strictly validates JSON structure, question options, correct answers, and matches Boards/Classes/Subjects
   */
  public static validateAndParseJson(
    jsonString: string,
    taxonomy: AcademicTaxonomy
  ): JsonImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      return {
        valid: false,
        errors: [`Invalid JSON format: ${errMsg}`],
        warnings: [],
      };
    }

    if (!parsed || typeof parsed !== "object") {
      return {
        valid: false,
        errors: ["JSON must be a valid object representing the test."],
        warnings: [],
      };
    }

    // 1. Validate required test metadata
    if (!parsed.title || typeof parsed.title !== "string" || parsed.title.trim() === "") {
      errors.push("Missing required field: 'title' (string).");
    }

    const rawType = String(parsed.type || "quiz").toLowerCase();
    let normalizedType = "quiz";
    if (rawType.includes("drill") || rawType.includes("practice")) {
      normalizedType = "practice_drill";
    } else if (rawType.includes("mock") || rawType.includes("exam")) {
      normalizedType = "mock_exam";
    } else if (rawType === "test" || rawType.includes("series")) {
      normalizedType = "test";
    } else {
      normalizedType = "chapter_quiz";
    }

    // 2. Resolve Academic Targeting
    let resolvedBoardId: string | undefined;
    let resolvedClassId: string | undefined;
    let resolvedSubjectId: string | undefined;
    let resolvedSubjectName: string = "General";
    let resolvedCourseId: string | undefined;
    let resolvedChapterId: string | undefined;

    // Resolve Board
    if (parsed.board) {
      const boardStr = String(parsed.board).toLowerCase().trim();
      const matchBoard = taxonomy.boards.find(
        (b) =>
          b.name.toLowerCase() === boardStr ||
          b.code.toLowerCase() === boardStr ||
          b.id === parsed.board ||
          (boardStr.includes("cbse") && b.code === "CBSE") ||
          (boardStr.includes("bihar") && b.code === "BSEB") ||
          (boardStr.includes("icse") && b.code === "ICSE")
      );
      if (matchBoard) {
        resolvedBoardId = matchBoard.id;
      } else {
        warnings.push(`Board '${parsed.board}' could not be matched with active taxonomy.`);
      }
    }

    // Resolve Class
    if (parsed.class !== undefined && parsed.class !== null) {
      const classStr = String(parsed.class).toLowerCase().trim();
      const matchClass = taxonomy.classes.find(
        (c) =>
          c.name.toLowerCase() === classStr ||
          c.name.toLowerCase() === `class ${classStr}` ||
          c.code.toLowerCase() === classStr ||
          c.code.toLowerCase() === `class_${classStr}` ||
          c.id === parsed.class
      );
      if (matchClass) {
        resolvedClassId = matchClass.id;
      } else {
        warnings.push(`Class '${parsed.class}' could not be matched with active taxonomy.`);
      }
    }

    // Resolve Subject
    if (parsed.subject) {
      const subjectStr = String(parsed.subject).toLowerCase().trim();
      const matchSubject = taxonomy.subjects.find(
        (s) =>
          s.name.toLowerCase() === subjectStr ||
          s.code.toLowerCase() === subjectStr ||
          s.id === parsed.subject ||
          (subjectStr.includes("math") && s.code === "MATH") ||
          (subjectStr.includes("sci") && s.code === "SCI") ||
          (subjectStr.includes("phy") && s.code === "PHY") ||
          (subjectStr.includes("chem") && s.code === "CHEM") ||
          (subjectStr.includes("bio") && s.code === "BIO")
      );
      if (matchSubject) {
        resolvedSubjectId = matchSubject.id;
        resolvedSubjectName = matchSubject.name;
      } else {
        resolvedSubjectName = String(parsed.subject);
        warnings.push(`Subject '${parsed.subject}' not found in standard taxonomy, using custom label.`);
      }
    }

    // Match Course from Board + Class + Subject
    if (resolvedBoardId && resolvedClassId && resolvedSubjectId) {
      const matchCourse = taxonomy.courses.find(
        (c) =>
          c.board_id === resolvedBoardId &&
          c.class_id === resolvedClassId &&
          c.subject_id === resolvedSubjectId
      );
      if (matchCourse) {
        resolvedCourseId = matchCourse.id;
      }
    } else if (resolvedSubjectId) {
      // Fallback: match by subject alone
      const matchCourse = taxonomy.courses.find((c) => c.subject_id === resolvedSubjectId);
      if (matchCourse) resolvedCourseId = matchCourse.id;
    }

    // Match Chapter if specified
    if (parsed.chapter && resolvedCourseId) {
      const chStr = String(parsed.chapter).toLowerCase().trim();
      const matchChapter = taxonomy.chapters.find(
        (ch) =>
          ch.course_id === resolvedCourseId &&
          (ch.title.toLowerCase().includes(chStr) || ch.id === parsed.chapter)
      );
      if (matchChapter) {
        resolvedChapterId = matchChapter.id;
      }
    }

    // 3. Validate Questions array
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      errors.push("Missing or empty 'questions' array. At least 1 question is required.");
      return { valid: false, errors, warnings };
    }

    const defaultNegativeMark = typeof parsed.negative_marking === "number"
      ? parsed.negative_marking
      : (typeof parsed.negative_marking === "string" ? (parseFloat(parsed.negative_marking) || 0) : 0);
    let computedTotalMarks = 0;
    const questionsPayload: AdminQuestionPayload[] = [];

    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i] as Record<string, unknown>;
      const qNum = i + 1;

      if (!q || typeof q !== "object") {
        errors.push(`Question ${qNum}: Invalid question format.`);
        continue;
      }

      const qText = (q.question || q.question_text || q.text) as string | undefined;
      if (!qText || typeof qText !== "string" || qText.trim() === "") {
        errors.push(`Question ${qNum}: Missing question text.`);
      }

      const qMarks = typeof q.marks === "number" && q.marks > 0
        ? q.marks
        : (typeof q.marks === "string" ? (parseFloat(q.marks) || 1) : 1);
      const qNegative = typeof q.negative_marks === "number"
        ? q.negative_marks
        : (typeof q.negative_marks === "string" ? (parseFloat(q.negative_marks) || defaultNegativeMark) : defaultNegativeMark);
      computedTotalMarks += qMarks;

      // Validate Options
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question ${qNum}: Must have at least 2 options.`);
        continue;
      }

      const rawCorrect = String(q.correct_answer || q.correct_option || q.answer || "").trim();
      let correctFound = false;

      const formattedOptions: AdminQuestionOptionPayload[] = (q.options as unknown[]).map((opt, optIdx) => {
        const defaultLabel = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'
        let optLabel = defaultLabel;
        let optText = "";
        let isCorrect = false;

        if (typeof opt === "string") {
          optText = opt;
          if (rawCorrect.toLowerCase() === defaultLabel.toLowerCase() || rawCorrect.toLowerCase() === opt.toLowerCase()) {
            isCorrect = true;
            correctFound = true;
          }
        } else if (typeof opt === "object" && opt !== null) {
          const optObj = opt as Record<string, unknown>;
          optLabel = String(optObj.id || optObj.label || defaultLabel);
          optText = String(optObj.text || optObj.option_text || "");
          if (
            optObj.is_correct === true ||
            rawCorrect.toLowerCase() === String(optLabel).toLowerCase() ||
            rawCorrect.toLowerCase() === String(optText).toLowerCase()
          ) {
            isCorrect = true;
            correctFound = true;
          }
        }

        if (!optText || optText.trim() === "") {
          errors.push(`Question ${qNum}: Option ${optLabel} has empty text.`);
        }

        return {
          optionLabel: optLabel,
          optionText: optText.trim(),
          isCorrect,
          displayOrder: optIdx + 1,
        };
      });

      if (!correctFound) {
        errors.push(
          `Question ${qNum}: Correct answer '${rawCorrect}' does not match any of the provided options (${formattedOptions.map((o) => o.optionLabel).join(", ")}).`
        );
      }

      questionsPayload.push({
        questionText: (qText || "").trim(),
        questionType: "single_choice",
        marks: qMarks,
        negativeMarks: qNegative,
        explanation: typeof q.explanation === "string" ? q.explanation : "",
        displayOrder: qNum,
        options: formattedOptions,
      });
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    const totalMarks = typeof parsed.total_marks === "number" ? parsed.total_marks : computedTotalMarks;
    const durationMinutes =
      normalizedType === "practice_drill"
        ? 0
        : typeof parsed.duration_minutes === "number"
        ? parsed.duration_minutes
        : 30;

    const upsertPayload: AdminTestUpsertPayload = {
      title: String(parsed.title || "").trim(),
      description: typeof parsed.description === "string" ? parsed.description : "",
      testType: normalizedType,
      status: parsed.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      isVisible: true,
      durationMinutes,
      totalMarks,
      passingMarks: Math.round(totalMarks * 0.4),
      accessTier: "FREE",
      displayOrder: 1,
      subjectId: resolvedSubjectId,
      subjectName: resolvedSubjectName,
      courseId: resolvedCourseId,
      chapterId: resolvedChapterId,
      questions: questionsPayload,
    };

    return {
      valid: true,
      errors: [],
      warnings,
      parsedPayload: upsertPayload,
    };
  }

  /**
   * Ensures the standard set of 6 dummy tests (3 Test Series, 2 Practice Drills, 1 Mock Exam) exists
   */
  public static async seedDefaultDummyTests(adminClient: SupabaseClient): Promise<void> {
    try {
      const { data: existing } = await adminClient.from("student_tests").select("id, slug");
      const existingSlugs = new Set((existing || []).map((t) => t.slug));

      const taxonomy = await this.getAcademicTaxonomy(adminClient);
      const mathSub = taxonomy.subjects.find((s) => s.code === "MATH");
      const sciSub = taxonomy.subjects.find((s) => s.code === "SCI");
      const cbseMathCourse = taxonomy.courses.find((c) => c.board?.code === "CBSE" && c.class?.code === "CLASS_10" && c.subject?.code === "MATH");
      const cbseSciCourse = taxonomy.courses.find((c) => c.board?.code === "CBSE" && c.class?.code === "CLASS_10" && c.subject?.code === "SCI");
      const ch1 = taxonomy.chapters.find((ch) => ch.course_id === cbseMathCourse?.id);
      const ch2 = taxonomy.chapters.find((ch) => ch.course_id === cbseSciCourse?.id);

      const defaultTests: AdminTestUpsertPayload[] = [
        // 1. Trigonometry Concept Mastery Drill (Practice Drill)
        {
          title: "Trigonometry Concept Mastery Drill",
          slug: "trigonometry-concept-mastery-drill",
          description: "Assess your foundational knowledge of trigonometric ratios, reciprocal identities, and standard angle values.",
          testType: "practice_drill",
          durationMinutes: 0,
          totalMarks: 16,
          passingMarks: 10,
          status: "PUBLISHED",
          subjectId: mathSub?.id,
          subjectName: "Mathematics",
          courseId: cbseMathCourse?.id,
          chapterId: ch1?.id,
          questions: [
            {
              questionText: "What is the exact value of sin²(30°) + cos²(30°)?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "By the fundamental Pythagorean trigonometric identity, sin²θ + cos²θ = 1 for any angle θ.",
              displayOrder: 1,
              options: [
                { optionLabel: "A", optionText: "1/2", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "1", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "√3/2", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "2", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "If tan θ = 4/3, what is the value of sec θ in a right-angled triangle?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "sec²θ = 1 + tan²θ = 1 + (16/9) = 25/9. Taking square root gives sec θ = 5/3.",
              displayOrder: 2,
              options: [
                { optionLabel: "A", optionText: "3/5", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "4/5", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "5/3", isCorrect: true, displayOrder: 3 },
                { optionLabel: "D", optionText: "7/3", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "Which of the following is equivalent to (1 - sin²θ)?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "From identity sin²θ + cos²θ = 1, we get cos²θ = 1 - sin²θ.",
              displayOrder: 3,
              options: [
                { optionLabel: "A", optionText: "cos²θ", isCorrect: true, displayOrder: 1 },
                { optionLabel: "B", optionText: "tan²θ", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "cosec²θ", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "sec²θ", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "What is the value of tan(45°) * cot(45°)?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "tan(45°) = 1 and cot(45°) = 1, so their product is 1 * 1 = 1.",
              displayOrder: 4,
              options: [
                { optionLabel: "A", optionText: "0", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "1", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "2", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Undefined", isCorrect: false, displayOrder: 4 },
              ],
            },
          ],
        },
        // 2. Chemical Reactions & Equations Practice Drill (Practice Drill)
        {
          title: "Chemical Reactions & Equations Practice Drill",
          slug: "chemical-reactions-practice-drill",
          description: "Test your understanding of balancing equations, oxidation-reduction processes, and reaction classification.",
          testType: "practice_drill",
          durationMinutes: 0,
          totalMarks: 12,
          passingMarks: 8,
          status: "PUBLISHED",
          subjectId: sciSub?.id,
          subjectName: "Science",
          courseId: cbseSciCourse?.id,
          chapterId: ch2?.id,
          questions: [
            {
              questionText: "When magnesium ribbon burns in air, what is formed?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "2Mg + O2 -> 2MgO (Magnesium Oxide, a white powder).",
              displayOrder: 1,
              options: [
                { optionLabel: "A", optionText: "Magnesium Nitride", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "Magnesium Oxide", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "Magnesium Carbonate", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Magnesium Hydroxide", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "Which type of reaction is: CaO + H2O -> Ca(OH)2 + Heat?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Two reactants combine to form a single product with evolution of heat, so it is both a Combination and Exothermic reaction.",
              displayOrder: 2,
              options: [
                { optionLabel: "A", optionText: "Combination & Exothermic", isCorrect: true, displayOrder: 1 },
                { optionLabel: "B", optionText: "Decomposition & Endothermic", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "Displacement Reaction", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Double Displacement Reaction", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "What is the color of ferrous sulphate crystals (FeSO4·7H2O)?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Ferrous sulphate heptahydrate crystals are pale green in color.",
              displayOrder: 3,
              options: [
                { optionLabel: "A", optionText: "Blue", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "Green", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "White", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Brown", isCorrect: false, displayOrder: 4 },
              ],
            },
          ],
        },
        // 3. Class 10 CBSE Science All-India Mock Exam (Mock Exam)
        {
          title: "Class 10 CBSE Science All-India Mock Exam",
          slug: "class-10-cbse-science-mock-exam",
          description: "Comprehensive full syllabus mock test simulating real CBSE board examination patterns and marking scheme.",
          testType: "mock_exam",
          durationMinutes: 45,
          totalMarks: 20,
          passingMarks: 10,
          status: "PUBLISHED",
          subjectId: sciSub?.id,
          subjectName: "Science",
          courseId: cbseSciCourse?.id,
          questions: [
            {
              questionText: "Which part of the human eye controls the amount of light entering the eye?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "The iris adjusts the size of the pupil to regulate the light reaching the retina.",
              displayOrder: 1,
              options: [
                { optionLabel: "A", optionText: "Cornea", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "Iris", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "Lens", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Retina", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "What is the SI unit of electric potential difference?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "The SI unit of electric potential difference is the Volt (V), named after Alessandro Volta.",
              displayOrder: 2,
              options: [
                { optionLabel: "A", optionText: "Ampere", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "Volt", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "Ohm", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Watt", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "Which metal is stored in kerosene to prevent it from reacting with oxygen and moisture?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Sodium (Na) and Potassium (K) are highly reactive metals that catch fire in air and react vigorously with water, so they are kept immersed in kerosene.",
              displayOrder: 3,
              options: [
                { optionLabel: "A", optionText: "Sodium", isCorrect: true, displayOrder: 1 },
                { optionLabel: "B", optionText: "Magnesium", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "Aluminium", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Iron", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "The breakdown of pyruvate into carbon dioxide, water, and energy takes place in which cellular organelle?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Aerobic respiration breaks down pyruvate in the mitochondria releasing 36/38 ATP along with CO2 and H2O.",
              displayOrder: 4,
              options: [
                { optionLabel: "A", optionText: "Cytoplasm", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "Mitochondria", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "Chloroplast", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Nucleus", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "What is the focal length of a plane mirror?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "A plane mirror can be considered a spherical mirror of infinite radius of curvature, hence its focal length is infinity.",
              displayOrder: 5,
              options: [
                { optionLabel: "A", optionText: "Zero", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "Infinity", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "10 cm", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "25 cm", isCorrect: false, displayOrder: 4 },
              ],
            },
          ],
        },
        // 4. Class 10 CBSE Mathematics Test Series 01 - Real Numbers & Polynomials (Test Series)
        {
          title: "Class 10 CBSE Mathematics Test Series 01 - Real Numbers & Polynomials",
          slug: "class-10-cbse-math-test-series-01",
          description: "Targeted chapter exam on Euclid's Division Lemma, Fundamental Theorem of Arithmetic, and Zeroes of Polynomials.",
          testType: "test",
          durationMinutes: 30,
          totalMarks: 16,
          passingMarks: 8,
          status: "PUBLISHED",
          subjectId: mathSub?.id,
          subjectName: "Mathematics",
          courseId: cbseMathCourse?.id,
          chapterId: ch1?.id,
          questions: [
            {
              questionText: "If two positive integers a and b are written as a = x³y² and b = xy³, where x, y are prime numbers, then HCF(a, b) is:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "HCF is the product of the smallest power of each common prime factor: HCF = x¹ · y² = xy².",
              displayOrder: 1,
              options: [
                { optionLabel: "A", optionText: "xy", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "xy²", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "x³y³", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "x²y²", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "If one zero of the quadratic polynomial x² + 3x + k is 2, then the value of k is:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Substitute x = 2 into P(x) = 0: (2)² + 3(2) + k = 0 => 4 + 6 + k = 0 => k = -10.",
              displayOrder: 2,
              options: [
                { optionLabel: "A", optionText: "10", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "-10", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "-7", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "-2", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "The decimal expansion of the rational number 14587 / 1250 will terminate after how many decimal places?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "1250 = 2¹ × 5⁴. The highest power between 2 and 5 in the denominator is 4, so it terminates after 4 decimal places.",
              displayOrder: 3,
              options: [
                { optionLabel: "A", optionText: "1 decimal place", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "2 decimal places", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "3 decimal places", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "4 decimal places", isCorrect: true, displayOrder: 4 },
              ],
            },
            {
              questionText: "A quadratic polynomial whose zeroes are -3 and 4 is:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Sum of zeroes S = -3 + 4 = 1. Product of zeroes P = (-3)(4) = -12. Polynomial = x² - Sx + P = x² - x - 12.",
              displayOrder: 4,
              options: [
                { optionLabel: "A", optionText: "x² - x + 12", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "x² + x + 12", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "x² - x - 12", isCorrect: true, displayOrder: 3 },
                { optionLabel: "D", optionText: "2x² + 2x - 24", isCorrect: false, displayOrder: 4 },
              ],
            },
          ],
        },
        // 5. Class 10 CBSE Mathematics Test Series 02 - Quadratic Equations & AP (Test Series)
        {
          title: "Class 10 CBSE Mathematics Test Series 02 - Quadratic Equations & AP",
          slug: "class-10-cbse-math-test-series-02",
          description: "Chapter assessment evaluating discriminant analysis, nature of roots, and arithmetic progressions nth-term calculations.",
          testType: "test",
          durationMinutes: 30,
          totalMarks: 12,
          passingMarks: 6,
          status: "PUBLISHED",
          subjectId: mathSub?.id,
          subjectName: "Mathematics",
          courseId: cbseMathCourse?.id,
          chapterId: ch1?.id,
          questions: [
            {
              questionText: "If the equation 2x² + kx + 3 = 0 has two equal real roots, then the value of k is:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "For equal roots, discriminant D = b² - 4ac = 0. k² - 4(2)(3) = 0 => k² = 24 => k = ±2√6.",
              displayOrder: 1,
              options: [
                { optionLabel: "A", optionText: "±√6", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "±2√6", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "±3√2", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "±4", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "The 11th term of the AP: -3, -1/2, 2, ... is:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "First term a = -3, common difference d = -1/2 - (-3) = 5/2. 11th term a11 = a + 10d = -3 + 10(5/2) = -3 + 25 = 22.",
              displayOrder: 2,
              options: [
                { optionLabel: "A", optionText: "28", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "22", isCorrect: true, displayOrder: 2 },
                { optionLabel: "C", optionText: "-38", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "47/2", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "How many two-digit numbers are divisible by 3?",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Two-digit multiples of 3 are 12, 15, ..., 99. an = 12 + (n-1)3 = 99 => 3(n-1) = 87 => n - 1 = 29 => n = 30.",
              displayOrder: 3,
              options: [
                { optionLabel: "A", optionText: "25", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "29", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "30", isCorrect: true, displayOrder: 3 },
                { optionLabel: "D", optionText: "33", isCorrect: false, displayOrder: 4 },
              ],
            },
          ],
        },
        // 6. Class 10 CBSE Science Test Series 01 - Physics Electricity & Magnetism (Test Series)
        {
          title: "Class 10 CBSE Science Test Series 01 - Physics Electricity & Magnetism",
          slug: "class-10-cbse-science-test-series-01",
          description: "Assessment covering Ohm's Law, equivalent resistance, Joule's heating effect, and magnetic field lines.",
          testType: "test",
          durationMinutes: 30,
          totalMarks: 12,
          passingMarks: 6,
          status: "PUBLISHED",
          subjectId: sciSub?.id,
          subjectName: "Science",
          courseId: cbseSciCourse?.id,
          chapterId: ch2?.id,
          questions: [
            {
              questionText: "A cylindrical conductor of length l and uniform area of cross-section A has resistance R. Another conductor of length 2l and resistance R of the same material has area of cross-section:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "R = ρ(l/A). For the second conductor, R = ρ(2l / A') => ρ(l/A) = ρ(2l/A') => A' = 2A.",
              displayOrder: 1,
              options: [
                { optionLabel: "A", optionText: "A/2", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "3A/2", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "2A", isCorrect: true, displayOrder: 3 },
                { optionLabel: "D", optionText: "3A", isCorrect: false, displayOrder: 4 },
              ],
            },
            {
              questionText: "The magnetic field inside a long straight solenoid carrying current is:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "The magnetic field lines inside a current-carrying solenoid are parallel straight lines, indicating that the magnetic field is uniform at all points.",
              displayOrder: 2,
              options: [
                { optionLabel: "A", optionText: "Zero", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "Decreases as we move towards its end", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "Increases as we move towards its end", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "Is the same at all points", isCorrect: true, displayOrder: 4 },
              ],
            },
            {
              questionText: "An electric bulb is rated 220 V and 100 W. When it is operated on 110 V, the power consumed will be:",
              questionType: "single_choice",
              marks: 4,
              negativeMarks: 1,
              explanation: "Resistance R = V² / P = (220)² / 100 = 484 Ω. At 110 V, P' = V'² / R = (110)² / 484 = 12100 / 484 = 25 W.",
              displayOrder: 3,
              options: [
                { optionLabel: "A", optionText: "100 W", isCorrect: false, displayOrder: 1 },
                { optionLabel: "B", optionText: "75 W", isCorrect: false, displayOrder: 2 },
                { optionLabel: "C", optionText: "50 W", isCorrect: false, displayOrder: 3 },
                { optionLabel: "D", optionText: "25 W", isCorrect: true, displayOrder: 4 },
              ],
            },
          ],
        },
      ];

      for (const t of defaultTests) {
        if (!existingSlugs.has(t.slug!)) {
          await this.upsertTestWithQuestions(adminClient, t);
        }
      }
    } catch (err) {
      console.error("[CmsTestService] Error syncing default dummy tests:", err);
    }
  }
}
