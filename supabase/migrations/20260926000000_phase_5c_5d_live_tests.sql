-- ==============================================================================
-- TopVeda Phase 5C + 5D: Student Live Classes & Tests / Practice Engine
-- Architecture Version: 5.1 (Hardened Production Specification)
-- Tables: 
--   1. student_tests
--   2. student_test_questions
--   3. student_test_question_options (Private / Server-Only Correctness Key)
--   4. student_test_attempts (Server-Authoritative Attempts)
--   5. student_test_answers (Server-Authoritative Evaluated Answers)
-- Views:
--   1. student_test_question_options_safe (Public Safe Projection without is_correct)
-- Security: Row Level Security on all tables, server-authoritative grading,
--           answer keys strictly hidden at both Database View & API levels.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Student Tests Catalog
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE SET NULL,
    subject_name TEXT NOT NULL,
    course_id UUID REFERENCES public.cms_courses(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES public.cms_chapters(id) ON DELETE SET NULL,
    test_type TEXT DEFAULT 'chapter_quiz' NOT NULL, -- 'chapter_quiz', 'mock_exam', 'practice_drill'
    duration_minutes INT DEFAULT 30 NOT NULL,
    total_marks INT DEFAULT 100 NOT NULL,
    passing_marks INT DEFAULT 40 NOT NULL,
    total_questions INT DEFAULT 0 NOT NULL,
    access_tier public.content_access_tier DEFAULT 'FREE' NOT NULL,
    status TEXT DEFAULT 'PUBLISHED' NOT NULL, -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_tests_subject 
    ON public.student_tests (subject_id, status, is_visible);

CREATE INDEX IF NOT EXISTS idx_student_tests_course 
    ON public.student_tests (course_id, status, is_visible);

CREATE INDEX IF NOT EXISTS idx_student_tests_type 
    ON public.student_tests (test_type, status, is_visible);

DROP TRIGGER IF EXISTS set_student_tests_updated_at ON public.student_tests;
CREATE TRIGGER set_student_tests_updated_at
    BEFORE UPDATE ON public.student_tests
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Student Test Questions
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_test_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.student_tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'single_choice' NOT NULL, -- 'single_choice', 'multiple_choice', 'numerical'
    marks INT DEFAULT 4 NOT NULL,
    negative_marks INT DEFAULT 0 NOT NULL,
    explanation TEXT,
    display_order INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_test_questions_test 
    ON public.student_test_questions (test_id, display_order);

DROP TRIGGER IF EXISTS set_student_test_questions_updated_at ON public.student_test_questions;
CREATE TRIGGER set_student_test_questions_updated_at
    BEFORE UPDATE ON public.student_test_questions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Student Test Question Options (Private / Server-Only is_correct Column)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_test_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.student_test_questions(id) ON DELETE CASCADE,
    option_label TEXT NOT NULL, -- 'A', 'B', 'C', 'D'
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE NOT NULL,
    display_order INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_test_question_options_q 
    ON public.student_test_question_options (question_id, display_order);

-- ------------------------------------------------------------------------------
-- 4. Safe Student Question Options View (Zero is_correct Exposure)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.student_test_question_options_safe AS
SELECT 
    o.id,
    o.question_id,
    o.option_label,
    o.option_text,
    o.display_order
FROM public.student_test_question_options o
JOIN public.student_test_questions q ON q.id = o.question_id
JOIN public.student_tests t ON t.id = q.test_id
WHERE (t.status = 'PUBLISHED' AND t.is_visible = TRUE) OR public.is_admin_or_super_admin();

-- ------------------------------------------------------------------------------
-- 5. Student Test Attempts (Server-Authoritative Records)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_test_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_id UUID NOT NULL REFERENCES public.student_tests(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'IN_PROGRESS' NOT NULL, -- 'IN_PROGRESS', 'SUBMITTED', 'EVALUATED', 'ABANDONED'
    started_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    submitted_at TIMESTAMPTZ,
    total_questions INT DEFAULT 0 NOT NULL,
    attempted_count INT DEFAULT 0 NOT NULL,
    correct_count INT DEFAULT 0 NOT NULL,
    incorrect_count INT DEFAULT 0 NOT NULL,
    unanswered_count INT DEFAULT 0 NOT NULL,
    score_obtained INT DEFAULT 0 NOT NULL,
    max_score INT DEFAULT 0 NOT NULL,
    percentage INT DEFAULT 0 NOT NULL,
    passed BOOLEAN DEFAULT FALSE NOT NULL,
    time_spent_seconds INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_test_attempts_student 
    ON public.student_test_attempts (student_id, status);

CREATE INDEX IF NOT EXISTS idx_student_test_attempts_test 
    ON public.student_test_attempts (test_id, student_id);

DROP TRIGGER IF EXISTS set_student_test_attempts_updated_at ON public.student_test_attempts;
CREATE TRIGGER set_student_test_attempts_updated_at
    BEFORE UPDATE ON public.student_test_attempts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Student Test Answers (Server-Authoritative Individual Question Answers)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_test_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES public.student_test_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.student_test_questions(id) ON DELETE CASCADE,
    selected_option_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL,
    numerical_answer TEXT,
    is_correct BOOLEAN,
    marks_awarded INT DEFAULT 0 NOT NULL,
    time_spent_seconds INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_student_attempt_question UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_student_test_answers_attempt 
    ON public.student_test_answers (attempt_id);

-- ------------------------------------------------------------------------------
-- 7. Hardened Row Level Security (RLS) Enablement & Strict Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.student_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_answers ENABLE ROW LEVEL SECURITY;

-- student_tests policies
DROP POLICY IF EXISTS "students_view_published_tests" ON public.student_tests;
CREATE POLICY "students_view_published_tests"
    ON public.student_tests
    FOR SELECT
    TO authenticated
    USING (
        (status = 'PUBLISHED' AND is_visible = TRUE) OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "admin_manage_tests" ON public.student_tests;
CREATE POLICY "admin_manage_tests"
    ON public.student_tests
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- student_test_questions policies
DROP POLICY IF EXISTS "students_view_test_questions" ON public.student_test_questions;
CREATE POLICY "students_view_test_questions"
    ON public.student_test_questions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.student_tests t
            WHERE t.id = student_test_questions.test_id
            AND (t.status = 'PUBLISHED' OR public.is_admin_or_super_admin())
        )
    );

DROP POLICY IF EXISTS "admin_manage_test_questions" ON public.student_test_questions;
CREATE POLICY "admin_manage_test_questions"
    ON public.student_test_questions
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- student_test_question_options policies (RESTRICTED: Admin & Super Admin Only for Raw Option Table)
DROP POLICY IF EXISTS "admin_only_raw_test_options" ON public.student_test_question_options;
CREATE POLICY "admin_only_raw_test_options"
    ON public.student_test_question_options
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- student_test_attempts policies (Hardened: Server-authoritative mutation, student read-only for own attempts)
DROP POLICY IF EXISTS "students_view_own_attempts" ON public.student_test_attempts;
CREATE POLICY "students_view_own_attempts"
    ON public.student_test_attempts
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "server_only_insert_attempts" ON public.student_test_attempts;
CREATE POLICY "server_only_insert_attempts"
    ON public.student_test_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "server_only_update_attempts" ON public.student_test_attempts;
CREATE POLICY "server_only_update_attempts"
    ON public.student_test_attempts
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_delete_attempts" ON public.student_test_attempts;
CREATE POLICY "super_admin_delete_attempts"
    ON public.student_test_attempts
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- student_test_answers policies (Hardened: Server-authoritative mutation, student read-only for own evaluated answers)
DROP POLICY IF EXISTS "students_view_own_answers" ON public.student_test_answers;
CREATE POLICY "students_view_own_answers"
    ON public.student_test_answers
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.student_test_attempts a
            WHERE a.id = student_test_answers.attempt_id
            AND (a.student_id = auth.uid() OR public.is_admin_or_super_admin())
        )
    );

DROP POLICY IF EXISTS "server_only_insert_answers" ON public.student_test_answers;
CREATE POLICY "server_only_insert_answers"
    ON public.student_test_answers
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "server_only_update_answers" ON public.student_test_answers;
CREATE POLICY "server_only_update_answers"
    ON public.student_test_answers
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "super_admin_delete_answers" ON public.student_test_answers;
CREATE POLICY "super_admin_delete_answers"
    ON public.student_test_answers
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 8. Seed Academic Practice Tests, Questions & Options (Initial Demo Data)
-- ------------------------------------------------------------------------------

DO $$
DECLARE
    v_sub_math_id UUID := '30000000-0000-0000-0000-000000000001'::uuid;
    v_sub_sci_id  UUID := '30000000-0000-0000-0000-000000000002'::uuid;

    v_crs_math10_id UUID := '40000000-0000-0000-0000-000000000001'::uuid;
    v_crs_sci10_id  UUID := '40000000-0000-0000-0000-000000000002'::uuid;

    v_ch1_id UUID := '60000000-0000-0000-0000-000000000001'::uuid;
    v_ch2_id UUID := '60000000-0000-0000-0000-000000000002'::uuid;

    -- Dedicated Deterministic Test UUIDs (Unique 77000000 Series)
    v_test1_id UUID := '77000000-0000-0000-0000-000000000001'::uuid;
    v_test2_id UUID := '77000000-0000-0000-0000-000000000002'::uuid;
    v_test3_id UUID := '77000000-0000-0000-0000-000000000003'::uuid;

    -- Dedicated Deterministic Question UUIDs (Unique 88000000 Series)
    v_q1_id UUID := '88000000-0000-0000-0000-000000000001'::uuid;
    v_q2_id UUID := '88000000-0000-0000-0000-000000000002'::uuid;
    v_q3_id UUID := '88000000-0000-0000-0000-000000000003'::uuid;
    v_q4_id UUID := '88000000-0000-0000-0000-000000000004'::uuid;

    v_q5_id UUID := '88000000-0000-0000-0000-000000000005'::uuid;
    v_q6_id UUID := '88000000-0000-0000-0000-000000000006'::uuid;
    v_q7_id UUID := '88000000-0000-0000-0000-000000000007'::uuid;
BEGIN

    -- TEST 1: Trigonometry Basics Chapter Quiz
    INSERT INTO public.student_tests (
        id, title, slug, description, subject_id, subject_name, course_id, chapter_id,
        test_type, duration_minutes, total_marks, passing_marks, total_questions, access_tier, status, is_visible, display_order
    ) VALUES (
        v_test1_id,
        'Trigonometry Concept Mastery Drill',
        'trigonometry-concept-mastery-drill',
        'Assess your foundational knowledge of trigonometric ratios, reciprocal identities, and standard angle values.',
        v_sub_math_id,
        'Mathematics',
        v_crs_math10_id,
        v_ch1_id,
        'chapter_quiz',
        20,
        16,
        10,
        4,
        'FREE',
        'PUBLISHED',
        TRUE,
        1
    ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        total_marks = EXCLUDED.total_marks,
        total_questions = EXCLUDED.total_questions;

    -- Questions for Test 1
    INSERT INTO public.student_test_questions (id, test_id, question_text, question_type, marks, negative_marks, explanation, display_order)
    VALUES
        (v_q1_id, v_test1_id, 'What is the exact value of sin²(30°) + cos²(30°)?', 'single_choice', 4, 1, 'By the fundamental Pythagorean trigonometric identity, sin²θ + cos²θ = 1 for any angle θ.', 1),
        (v_q2_id, v_test1_id, 'If tan θ = 4/3, what is the value of sec θ in a right-angled triangle?', 'single_choice', 4, 1, 'sec²θ = 1 + tan²θ = 1 + (16/9) = 25/9. Taking square root gives sec θ = 5/3.', 2),
        (v_q3_id, v_test1_id, 'Which of the following is equivalent to (1 - sin²θ)?', 'single_choice', 4, 1, 'From identity sin²θ + cos²θ = 1, we get cos²θ = 1 - sin²θ.', 3),
        (v_q4_id, v_test1_id, 'What is the value of tan(45°) * cot(45°)?', 'single_choice', 4, 1, 'tan(45°) = 1 and cot(45°) = 1, so their product is 1 * 1 = 1.', 4)
    ON CONFLICT (id) DO UPDATE SET
        question_text = EXCLUDED.question_text,
        explanation = EXCLUDED.explanation;

    -- Options for Question 1 to 4 (Deterministic Cleanup for Seeded Question IDs Only)
    DELETE FROM public.student_test_question_options WHERE question_id IN (v_q1_id, v_q2_id, v_q3_id, v_q4_id);

    INSERT INTO public.student_test_question_options (question_id, option_label, option_text, is_correct, display_order)
    VALUES
        (v_q1_id, 'A', '1/2', FALSE, 1),
        (v_q1_id, 'B', '1', TRUE, 2),
        (v_q1_id, 'C', '√3/2', FALSE, 3),
        (v_q1_id, 'D', '2', FALSE, 4),

        (v_q2_id, 'A', '3/5', FALSE, 1),
        (v_q2_id, 'B', '4/5', FALSE, 2),
        (v_q2_id, 'C', '5/3', TRUE, 3),
        (v_q2_id, 'D', '7/3', FALSE, 4),

        (v_q3_id, 'A', 'cos²θ', TRUE, 1),
        (v_q3_id, 'B', 'tan²θ', FALSE, 2),
        (v_q3_id, 'C', 'cosec²θ', FALSE, 3),
        (v_q3_id, 'D', 'sec²θ', FALSE, 4),

        (v_q4_id, 'A', '0', FALSE, 1),
        (v_q4_id, 'B', '1', TRUE, 2),
        (v_q4_id, 'C', '2', FALSE, 3),
        (v_q4_id, 'D', 'Undefined', FALSE, 4);

    -- TEST 2: Chemical Reactions & Equations Practice Drill
    INSERT INTO public.student_tests (
        id, title, slug, description, subject_id, subject_name, course_id, chapter_id,
        test_type, duration_minutes, total_marks, passing_marks, total_questions, access_tier, status, is_visible, display_order
    ) VALUES (
        v_test2_id,
        'Chemical Reactions & Equations Practice Drill',
        'chemical-reactions-practice-drill',
        'Test your understanding of balancing equations, oxidation-reduction processes, and reaction classification.',
        v_sub_sci_id,
        'Science',
        v_crs_sci10_id,
        v_ch2_id,
        'chapter_quiz',
        15,
        12,
        8,
        3,
        'FREE',
        'PUBLISHED',
        TRUE,
        2
    ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        total_marks = EXCLUDED.total_marks,
        total_questions = EXCLUDED.total_questions;

    -- Questions for Test 2
    INSERT INTO public.student_test_questions (id, test_id, question_text, question_type, marks, negative_marks, explanation, display_order)
    VALUES
        (v_q5_id, v_test2_id, 'When magnesium ribbon burns in air, what is formed?', 'single_choice', 4, 1, '2Mg + O2 -> 2MgO (Magnesium Oxide, a white powder).', 1),
        (v_q6_id, v_test2_id, 'Which type of reaction is: CaO + H2O -> Ca(OH)2 + Heat?', 'single_choice', 4, 1, 'Two reactants combine to form a single product with evolution of heat, so it is both a Combination and Exothermic reaction.', 2),
        (v_q7_id, v_test2_id, 'What is the color of ferrous sulphate crystals (FeSO4·7H2O)?', 'single_choice', 4, 1, 'Ferrous sulphate heptahydrate crystals are pale green in color.', 3)
    ON CONFLICT (id) DO UPDATE SET
        question_text = EXCLUDED.question_text,
        explanation = EXCLUDED.explanation;

    DELETE FROM public.student_test_question_options WHERE question_id IN (v_q5_id, v_q6_id, v_q7_id);

    INSERT INTO public.student_test_question_options (question_id, option_label, option_text, is_correct, display_order)
    VALUES
        (v_q5_id, 'A', 'Magnesium Nitride', FALSE, 1),
        (v_q5_id, 'B', 'Magnesium Oxide', TRUE, 2),
        (v_q5_id, 'C', 'Magnesium Carbonate', FALSE, 3),
        (v_q5_id, 'D', 'Magnesium Hydroxide', FALSE, 4),

        (v_q6_id, 'A', 'Combination & Exothermic', TRUE, 1),
        (v_q6_id, 'B', 'Decomposition & Endothermic', FALSE, 2),
        (v_q6_id, 'C', 'Displacement Reaction', FALSE, 3),
        (v_q6_id, 'D', 'Double Displacement Reaction', FALSE, 4),

        (v_q7_id, 'A', 'Blue', FALSE, 1),
        (v_q7_id, 'B', 'Green', TRUE, 2),
        (v_q7_id, 'C', 'White', FALSE, 3),
        (v_q7_id, 'D', 'Brown', FALSE, 4);

    -- TEST 3: Full-Length Board Mock Exam
    INSERT INTO public.student_tests (
        id, title, slug, description, subject_id, subject_name, course_id, chapter_id,
        test_type, duration_minutes, total_marks, passing_marks, total_questions, access_tier, status, is_visible, display_order
    ) VALUES (
        v_test3_id,
        'Class 10 CBSE Science All-India Mock Exam',
        'class-10-cbse-science-mock-exam',
        'Comprehensive full syllabus mock test simulating real CBSE board examination patterns and marking scheme.',
        v_sub_sci_id,
        'Science',
        v_crs_sci10_id,
        NULL,
        'mock_exam',
        45,
        50,
        20,
        15,
        'FREE',
        'PUBLISHED',
        TRUE,
        3
    ) ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description;

END $$;
