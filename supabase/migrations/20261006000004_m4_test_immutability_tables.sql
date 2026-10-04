-- ==============================================================================
-- TopVeda Forward Migration: Phase M4 — Test Immutability Tables & Active Version Binding
-- File: supabase/migrations/20261006000004_m4_test_immutability_tables.sql
-- Architecture: Version 7.0 Assessment & Test Immutability Engine
-- Governs: Test Versions, Question Versions, Option Versions, Attempts & Strict Immutability
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Precondition Safety Check
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_tests') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_tests does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.profiles does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_batches') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_batches does not exist.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Student Test Versions Table (Immutable Version Snapshot)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_test_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES public.student_tests(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    slug TEXT,
    description TEXT,
    subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE SET NULL,
    subject_name TEXT,
    course_id UUID REFERENCES public.cms_courses(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES public.cms_chapters(id) ON DELETE SET NULL,
    test_type TEXT DEFAULT 'chapter_quiz' NOT NULL,
    duration_minutes INT DEFAULT 30 NOT NULL,
    total_marks NUMERIC(6,2) DEFAULT 100.00 NOT NULL,
    passing_marks NUMERIC(6,2) DEFAULT 40.00 NOT NULL,
    negative_marking_rate NUMERIC(4,2) DEFAULT 0.00 NOT NULL,
    total_questions INT DEFAULT 0 NOT NULL,
    instructions TEXT,
    is_finalized BOOLEAN DEFAULT FALSE NOT NULL,
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_test_versions_test_version 
    ON public.student_test_versions (test_id, version_number);

CREATE INDEX IF NOT EXISTS idx_student_test_versions_lookup 
    ON public.student_test_versions (test_id, is_finalized);

DROP TRIGGER IF EXISTS set_student_test_versions_updated_at ON public.student_test_versions;
CREATE TRIGGER set_student_test_versions_updated_at
    BEFORE UPDATE ON public.student_test_versions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Active Version Binding on student_tests Catalog
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_tests
    ADD COLUMN IF NOT EXISTS active_version_id UUID REFERENCES public.student_test_versions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_tests_active_version 
    ON public.student_tests (active_version_id);

-- ------------------------------------------------------------------------------
-- 4. Question Versions Table (Frozen Question Snapshots)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_test_question_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_version_id UUID NOT NULL REFERENCES public.student_test_versions(id) ON DELETE CASCADE,
    source_question_id UUID REFERENCES public.student_test_questions(id) ON DELETE SET NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'single_choice' NOT NULL,
    marks NUMERIC(6,2) DEFAULT 4.00 NOT NULL,
    negative_marks NUMERIC(6,2) DEFAULT 0.00 NOT NULL,
    explanation TEXT,
    display_order INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_test_question_versions_test 
    ON public.student_test_question_versions (test_version_id, display_order);

-- ------------------------------------------------------------------------------
-- 5. Option Versions Table (Frozen Options with Ground-Truth is_correct Key)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_test_option_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_version_id UUID NOT NULL REFERENCES public.student_test_question_versions(id) ON DELETE CASCADE,
    source_option_id UUID REFERENCES public.student_test_question_options(id) ON DELETE SET NULL,
    option_label TEXT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE NOT NULL,
    display_order INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_test_option_versions_question 
    ON public.student_test_option_versions (question_version_id, display_order);

-- ------------------------------------------------------------------------------
-- 6. Safe Option Versions Projection View (Zero is_correct Exposure)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.student_test_option_versions_safe AS
SELECT 
    ov.id,
    ov.question_version_id,
    ov.option_label,
    ov.option_text,
    ov.display_order
FROM public.student_test_option_versions ov
JOIN public.student_test_question_versions qv ON qv.id = ov.question_version_id
JOIN public.student_test_versions tv ON tv.id = qv.test_version_id
JOIN public.student_tests t ON t.id = tv.test_id
WHERE (tv.is_finalized = TRUE AND t.status = 'PUBLISHED' AND t.is_visible = TRUE) 
   OR public.is_super_admin() 
   OR public.is_teacher();

-- ------------------------------------------------------------------------------
-- 7. Hardened Columns & Concurrency Constraints on student_test_attempts
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_test_attempts
    ADD COLUMN IF NOT EXISTS test_version_id UUID REFERENCES public.student_test_versions(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.cms_batches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_student_test_attempts_version 
    ON public.student_test_attempts (test_version_id);

CREATE INDEX IF NOT EXISTS idx_student_test_attempts_batch 
    ON public.student_test_attempts (batch_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_one_in_progress_attempt_per_student_test_batch 
    ON public.student_test_attempts (student_id, test_id, batch_id) 
    WHERE status = 'IN_PROGRESS';

-- ------------------------------------------------------------------------------
-- 8. Hardened Columns on student_test_answers
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_test_answers
    ADD COLUMN IF NOT EXISTS question_version_id UUID REFERENCES public.student_test_question_versions(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS selected_option_version_id UUID REFERENCES public.student_test_option_versions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_marked_for_review BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_student_test_answers_question_ver 
    ON public.student_test_answers (question_version_id);

-- ------------------------------------------------------------------------------
-- 9. Test Immutability & Finalization Trigger Engine
-- ------------------------------------------------------------------------------

-- Trigger 9A: Enforce immutability on student_test_versions
CREATE OR REPLACE FUNCTION public.enforce_test_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.is_finalized = TRUE THEN
        IF NEW.is_finalized = FALSE THEN
            RAISE EXCEPTION 'Immutability Violation: Finalized test version % cannot be unfinalized.', OLD.id;
        END IF;

        IF NEW.test_id <> OLD.test_id 
           OR NEW.version_number <> OLD.version_number
           OR NEW.duration_minutes <> OLD.duration_minutes
           OR NEW.total_marks <> OLD.total_marks
           OR NEW.passing_marks <> OLD.passing_marks
           OR NEW.negative_marking_rate <> OLD.negative_marking_rate
           OR NEW.total_questions <> OLD.total_questions THEN
            RAISE EXCEPTION 'Immutability Violation: Finalized test version % cannot modify assessment structure or scoring parameters.', OLD.id;
        END IF;
    END IF;

    IF NEW.is_finalized = TRUE AND OLD.is_finalized = FALSE THEN
        NEW.finalized_at := coalesce(NEW.finalized_at, now());
        NEW.finalized_by := coalesce(NEW.finalized_by, auth.uid());
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_test_version_immutability ON public.student_test_versions;
CREATE TRIGGER trg_enforce_test_version_immutability
    BEFORE UPDATE ON public.student_test_versions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_test_version_immutability();

-- Trigger 9B: Prevent deletion of finalized test version if attempts exist
CREATE OR REPLACE FUNCTION public.prevent_finalized_test_version_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.is_finalized = TRUE THEN
        IF EXISTS (SELECT 1 FROM public.student_test_attempts WHERE test_version_id = OLD.id) THEN
            RAISE EXCEPTION 'Integrity Violation: Cannot delete finalized test version % with existing student attempts.', OLD.id;
        END IF;
    END IF;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_finalized_test_version_deletion ON public.student_test_versions;
CREATE TRIGGER trg_prevent_finalized_test_version_deletion
    BEFORE DELETE ON public.student_test_versions
    FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_test_version_deletion();

-- Trigger 9C: Prevent mutation of question versions on finalized test version
CREATE OR REPLACE FUNCTION public.enforce_question_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_finalized BOOLEAN;
    v_ver_id UUID;
BEGIN
    v_ver_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.test_version_id ELSE NEW.test_version_id END;
    
    SELECT is_finalized INTO v_is_finalized 
    FROM public.student_test_versions 
    WHERE id = v_ver_id;

    IF v_is_finalized = TRUE THEN
        RAISE EXCEPTION 'Immutability Violation: Cannot % question version in finalized test version %.', TG_OP, v_ver_id;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_question_version_immutability ON public.student_test_question_versions;
CREATE TRIGGER trg_enforce_question_version_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.student_test_question_versions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_question_version_immutability();

-- Trigger 9D: Prevent mutation of option versions on finalized test version
CREATE OR REPLACE FUNCTION public.enforce_option_version_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_finalized BOOLEAN;
    v_q_ver_id UUID;
BEGIN
    v_q_ver_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.question_version_id ELSE NEW.question_version_id END;
    
    SELECT tv.is_finalized INTO v_is_finalized 
    FROM public.student_test_question_versions qv
    JOIN public.student_test_versions tv ON tv.id = qv.test_version_id
    WHERE qv.id = v_q_ver_id;

    IF v_is_finalized = TRUE THEN
        RAISE EXCEPTION 'Immutability Violation: Cannot % option version in finalized test version.', TG_OP;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_option_version_immutability ON public.student_test_option_versions;
CREATE TRIGGER trg_enforce_option_version_immutability
    BEFORE INSERT OR UPDATE OR DELETE ON public.student_test_option_versions
    FOR EACH ROW EXECUTE FUNCTION public.enforce_option_version_immutability();

-- Trigger 9E: Prevent answer mutation once attempt is submitted/evaluated
CREATE OR REPLACE FUNCTION public.enforce_submitted_attempt_answer_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt_status TEXT;
    v_attempt_id UUID;
BEGIN
    v_attempt_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.attempt_id ELSE NEW.attempt_id END;

    SELECT status INTO v_attempt_status 
    FROM public.student_test_attempts 
    WHERE id = v_attempt_id;

    IF v_attempt_status IN ('SUBMITTED', 'EVALUATED') AND TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'Immutability Violation: Cannot % answers for attempt % in % status.', TG_OP, v_attempt_id, v_attempt_status;
    END IF;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_submitted_attempt_answer_immutability ON public.student_test_answers;
CREATE TRIGGER trg_enforce_submitted_attempt_answer_immutability
    BEFORE UPDATE OR DELETE ON public.student_test_answers
    FOR EACH ROW EXECUTE FUNCTION public.enforce_submitted_attempt_answer_immutability();

-- ------------------------------------------------------------------------------
-- 10. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.student_test_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_question_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_test_option_versions ENABLE ROW LEVEL SECURITY;

-- 10.1 student_test_versions policies
DROP POLICY IF EXISTS "super_admin_manage_test_versions" ON public.student_test_versions;
CREATE POLICY "super_admin_manage_test_versions"
    ON public.student_test_versions
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "teachers_view_test_versions" ON public.student_test_versions;
CREATE POLICY "teachers_view_test_versions"
    ON public.student_test_versions
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

DROP POLICY IF EXISTS "students_view_finalized_test_versions" ON public.student_test_versions;
CREATE POLICY "students_view_finalized_test_versions"
    ON public.student_test_versions
    FOR SELECT
    TO authenticated
    USING (
        is_finalized = TRUE AND
        EXISTS (
            SELECT 1 FROM public.student_tests t
            WHERE t.id = student_test_versions.test_id
            AND t.status = 'PUBLISHED'
            AND t.is_visible = TRUE
        )
    );

-- 10.2 student_test_question_versions policies
DROP POLICY IF EXISTS "super_admin_manage_question_versions" ON public.student_test_question_versions;
CREATE POLICY "super_admin_manage_question_versions"
    ON public.student_test_question_versions
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "teachers_view_question_versions" ON public.student_test_question_versions;
CREATE POLICY "teachers_view_question_versions"
    ON public.student_test_question_versions
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

DROP POLICY IF EXISTS "students_view_question_versions" ON public.student_test_question_versions;
CREATE POLICY "students_view_question_versions"
    ON public.student_test_question_versions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.student_test_versions tv
            JOIN public.student_tests t ON t.id = tv.test_id
            WHERE tv.id = student_test_question_versions.test_version_id
            AND tv.is_finalized = TRUE
            AND t.status = 'PUBLISHED'
            AND t.is_visible = TRUE
        )
    );

-- 10.3 student_test_option_versions policies (Super Admin & Teacher Full/Read; Students use Safe View)
DROP POLICY IF EXISTS "super_admin_manage_option_versions" ON public.student_test_option_versions;
CREATE POLICY "super_admin_manage_option_versions"
    ON public.student_test_option_versions
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "teachers_view_option_versions" ON public.student_test_option_versions;
CREATE POLICY "teachers_view_option_versions"
    ON public.student_test_option_versions
    FOR SELECT
    TO authenticated
    USING (public.is_teacher());

-- 10.4 student_test_attempts updated policies
DROP POLICY IF EXISTS "teachers_view_batch_attempts" ON public.student_test_attempts;
CREATE POLICY "teachers_view_batch_attempts"
    ON public.student_test_attempts
    FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin() OR
        (public.is_teacher() AND (batch_id IS NULL OR public.is_batch_teacher(batch_id)))
    );

DROP POLICY IF EXISTS "students_manage_own_in_progress_attempts" ON public.student_test_attempts;
CREATE POLICY "students_manage_own_in_progress_attempts"
    ON public.student_test_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id AND
        (batch_id IS NULL OR public.is_actively_enrolled_in_batch(batch_id))
    );

DROP POLICY IF EXISTS "students_update_own_in_progress_attempts" ON public.student_test_attempts;
CREATE POLICY "students_update_own_in_progress_attempts"
    ON public.student_test_attempts
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = student_id AND
        status = 'IN_PROGRESS'
    )
    WITH CHECK (
        auth.uid() = student_id
    );

-- 10.5 student_test_answers updated policies
DROP POLICY IF EXISTS "students_insert_own_answers" ON public.student_test_answers;
CREATE POLICY "students_insert_own_answers"
    ON public.student_test_answers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_test_attempts a
            WHERE a.id = student_test_answers.attempt_id
            AND a.student_id = auth.uid()
            AND a.status = 'IN_PROGRESS'
        )
    );

DROP POLICY IF EXISTS "students_update_own_answers" ON public.student_test_answers;
CREATE POLICY "students_update_own_answers"
    ON public.student_test_answers
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.student_test_attempts a
            WHERE a.id = student_test_answers.attempt_id
            AND a.student_id = auth.uid()
            AND a.status = 'IN_PROGRESS'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.student_test_attempts a
            WHERE a.id = student_test_answers.attempt_id
            AND a.student_id = auth.uid()
            AND a.status = 'IN_PROGRESS'
        )
    );

-- ------------------------------------------------------------------------------
-- 11. Table Permissions & Grants
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.student_test_versions TO authenticated;
GRANT SELECT ON public.student_test_question_versions TO authenticated;
GRANT SELECT ON public.student_test_option_versions_safe TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_test_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_test_answers TO authenticated;

GRANT ALL ON public.student_test_versions TO service_role;
GRANT ALL ON public.student_test_question_versions TO service_role;
GRANT ALL ON public.student_test_option_versions TO service_role;
GRANT ALL ON public.student_test_attempts TO service_role;
GRANT ALL ON public.student_test_answers TO service_role;

COMMIT;
