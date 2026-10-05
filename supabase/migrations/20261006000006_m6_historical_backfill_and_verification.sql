-- ==============================================================================
-- TopVeda Forward Migration: Phase M6 — Historical Data Backfill & Scorecard Verification
-- File: supabase/migrations/20261006000006_m6_historical_backfill_and_verification.sql
-- Architecture: Version 7.0 Historical Data Reconciliation & Snapshot Engine
-- Governs: Immutable Version 1 Snapshots, Question/Option Backfill & Scorecard Integrity
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_test_versions') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_test_versions does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_test_question_versions') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_test_question_versions does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_test_option_versions') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_test_option_versions does not exist.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Step 1: Create Version 1 Draft Snapshots for Unversioned Tests
-- (Created initially with is_finalized = FALSE to allow question/option population)
-- ------------------------------------------------------------------------------
INSERT INTO public.student_test_versions (
    id,
    test_id,
    version_number,
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
    negative_marking_rate,
    total_questions,
    instructions,
    is_finalized,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    t.id,
    1,
    t.title,
    t.slug,
    t.description,
    t.subject_id,
    t.subject_name,
    t.course_id,
    t.chapter_id,
    t.test_type,
    t.duration_minutes,
    t.total_marks,
    t.passing_marks,
    0.00,
    t.total_questions,
    'Standard examination guidelines and time limits apply.',
    FALSE,
    coalesce(t.created_at, now()),
    now()
FROM public.student_tests t
WHERE NOT EXISTS (
    SELECT 1 FROM public.student_test_versions v WHERE v.test_id = t.id
)
ON CONFLICT (test_id, version_number) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. Step 2: Backfill Question Versions for Unfinalized Versions
-- ------------------------------------------------------------------------------
INSERT INTO public.student_test_question_versions (
    id,
    test_version_id,
    source_question_id,
    question_text,
    question_type,
    marks,
    negative_marks,
    explanation,
    display_order,
    created_at
)
SELECT 
    gen_random_uuid(),
    v.id,
    q.id,
    q.question_text,
    q.question_type,
    q.marks,
    q.negative_marks,
    q.explanation,
    q.display_order,
    coalesce(q.created_at, now())
FROM public.student_test_questions q
JOIN public.student_test_versions v ON v.test_id = q.test_id AND v.version_number = 1
WHERE v.is_finalized = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.student_test_question_versions qv 
    WHERE qv.source_question_id = q.id AND qv.test_version_id = v.id
);

-- ------------------------------------------------------------------------------
-- 4. Step 3: Backfill Option Versions for Unfinalized Versions
-- ------------------------------------------------------------------------------
INSERT INTO public.student_test_option_versions (
    id,
    question_version_id,
    source_option_id,
    option_label,
    option_text,
    is_correct,
    display_order,
    created_at
)
SELECT 
    gen_random_uuid(),
    qv.id,
    o.id,
    o.option_label,
    o.option_text,
    o.is_correct,
    o.display_order,
    coalesce(o.created_at, now())
FROM public.student_test_question_options o
JOIN public.student_test_question_versions qv ON qv.source_question_id = o.question_id
JOIN public.student_test_versions v ON v.id = qv.test_version_id
WHERE v.is_finalized = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.student_test_option_versions ov 
    WHERE ov.source_option_id = o.id AND ov.question_version_id = qv.id
);

-- ------------------------------------------------------------------------------
-- 5. Step 4: Finalize Version 1 Snapshots (Locks Immutability Permanently)
-- ------------------------------------------------------------------------------
UPDATE public.student_test_versions
SET is_finalized = TRUE,
    finalized_at = coalesce(finalized_at, now())
WHERE version_number = 1 AND is_finalized = FALSE;

-- ------------------------------------------------------------------------------
-- 6. Step 5: Bind student_tests.active_version_id to Version 1
-- ------------------------------------------------------------------------------
UPDATE public.student_tests t
SET active_version_id = v.id
FROM public.student_test_versions v
WHERE v.test_id = t.id 
  AND v.version_number = 1 
  AND t.active_version_id IS NULL;

-- ------------------------------------------------------------------------------
-- 7. Step 6: Reconcile Legacy Attempts with Version & Batch Foreign Keys
-- ------------------------------------------------------------------------------
UPDATE public.student_test_attempts a
SET test_version_id = v.id
FROM public.student_test_versions v
WHERE v.test_id = a.test_id 
  AND v.version_number = 1 
  AND a.test_version_id IS NULL;

UPDATE public.student_test_attempts a
SET batch_id = (
    SELECT se.batch_id
    FROM public.student_enrollments se
    JOIN public.student_tests t ON t.id = a.test_id
    WHERE se.student_id = a.student_id
      AND (t.course_id IS NULL OR se.course_id = t.course_id)
    ORDER BY se.enrolled_at DESC
    LIMIT 1
)
WHERE a.batch_id IS NULL;

-- ------------------------------------------------------------------------------
-- 8. Step 7: Reconcile Legacy Answers with question_version_id
-- (Temporarily disable answer immutability trigger to allow backfilling foreign keys)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_test_answers DISABLE TRIGGER trg_enforce_submitted_attempt_answer_immutability;

UPDATE public.student_test_answers ans
SET question_version_id = qv.id
FROM public.student_test_attempts att,
     public.student_test_question_versions qv 
WHERE ans.attempt_id = att.id 
  AND qv.test_version_id = att.test_version_id 
  AND qv.source_question_id = ans.question_id
  AND ans.question_version_id IS NULL;

ALTER TABLE public.student_test_answers ENABLE TRIGGER trg_enforce_submitted_attempt_answer_immutability;

-- ------------------------------------------------------------------------------
-- 9. Step 8: Integrity Assertion Check
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_unversioned_tests_count INT;
    v_unversioned_attempts_count INT;
BEGIN
    SELECT count(*) INTO v_unversioned_tests_count
    FROM public.student_tests
    WHERE active_version_id IS NULL;

    IF v_unversioned_tests_count > 0 THEN
        RAISE NOTICE 'Warning: % tests still have no active_version_id.', v_unversioned_tests_count;
    ELSE
        RAISE NOTICE 'Success: 100 percent of student_tests have active finalized versions bound.';
    END IF;

    SELECT count(*) INTO v_unversioned_attempts_count
    FROM public.student_test_attempts
    WHERE test_version_id IS NULL;

    IF v_unversioned_attempts_count > 0 THEN
        RAISE NOTICE 'Warning: % attempts still have no test_version_id.', v_unversioned_attempts_count;
    ELSE
        RAISE NOTICE 'Success: 100 percent of historical test attempts reconciled to versioned snapshots.';
    END IF;
END $$;

COMMIT;
