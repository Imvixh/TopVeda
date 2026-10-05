-- ==============================================================================
-- TopVeda Forward Migration: Phase M5 — Application RPCs & Storage Policies
-- File: supabase/migrations/20261006000005_m5_application_rpcs_and_storage.sql
-- Architecture: Version 7.0 Server-Authoritative RPC Layer & Hardened Storage Policies
-- Governs: Test Flow RPCs, Attendance & Progress RPCs, Storage Object CRUD RLS
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Precondition Safety Check & Ancillary Schema Hardening
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_tests') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_tests does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_test_versions') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_test_versions does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_test_attempts') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_test_attempts does not exist.';
    END IF;
END $$;

-- 1.1 Relax legacy non-null constraint on student_test_answers.question_id for versioned engine
ALTER TABLE public.student_test_answers ALTER COLUMN question_id DROP NOT NULL;

-- 1.2 Unique composite index on attempt_id and question_version_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_answers_attempt_qver 
    ON public.student_test_answers (attempt_id, question_version_id);

-- 1.3 Live Attendance Table (Idempotent Creation)
CREATE TABLE IF NOT EXISTS public.live_class_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES public.cms_batches(id) ON DELETE CASCADE,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_minutes INT NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    heartbeat_count INT NOT NULL DEFAULT 1 CHECK (heartbeat_count >= 0),
    status TEXT NOT NULL CHECK (status IN ('PRESENT', 'ABSENT', 'LEFT_EARLY')) DEFAULT 'PRESENT',
    finalized_at TIMESTAMPTZ,
    finalized_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    CONSTRAINT uq_live_attendance_student UNIQUE (live_class_id, student_id)
);

ALTER TABLE public.live_class_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_view_own_live_attendance" ON public.live_class_attendance;
CREATE POLICY "students_view_own_live_attendance"
    ON public.live_class_attendance FOR SELECT TO authenticated
    USING (auth.uid() = student_id OR public.is_super_admin() OR public.is_batch_teacher(batch_id));

-- ------------------------------------------------------------------------------
-- 2. Test Flow RPCs (Server-Authoritative Test Lifecycle)
-- ------------------------------------------------------------------------------

-- 2.1 RPC: Start or Resume Student Test Attempt
CREATE OR REPLACE FUNCTION public.start_student_test_attempt(
    p_test_id UUID,
    p_batch_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_test RECORD;
    v_version RECORD;
    v_existing_attempt RECORD;
    v_resumed_version RECORD;
    v_attempt_id UUID;
    v_started_at TIMESTAMPTZ;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF NOT public.is_actively_enrolled_in_batch(p_batch_id) AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Active batch enrollment required to start test.';
    END IF;

    -- Resumption Check
    SELECT id, test_version_id, started_at INTO v_existing_attempt
    FROM public.student_test_attempts
    WHERE student_id = auth.uid()
      AND test_id = p_test_id
      AND batch_id = p_batch_id
      AND status = 'IN_PROGRESS';

    IF FOUND THEN
        SELECT * INTO v_resumed_version
        FROM public.student_test_versions
        WHERE id = v_existing_attempt.test_version_id;

        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'test_version_id', v_resumed_version.id,
            'started_at', v_existing_attempt.started_at,
            'duration_minutes', v_resumed_version.duration_minutes,
            'is_resumed', TRUE
        );
    END IF;

    -- Validate test catalog record & active finalized version
    SELECT * INTO v_test
    FROM public.student_tests
    WHERE id = p_test_id;

    IF NOT FOUND OR (v_test.status <> 'PUBLISHED' AND NOT public.is_super_admin()) THEN
        RAISE EXCEPTION 'Test is not published or does not exist.';
    END IF;

    IF v_test.active_version_id IS NOT NULL THEN
        SELECT * INTO v_version
        FROM public.student_test_versions
        WHERE id = v_test.active_version_id;
    ELSE
        SELECT * INTO v_version
        FROM public.student_test_versions
        WHERE test_id = p_test_id
        ORDER BY version_number DESC
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No active version found for test %.', p_test_id;
    END IF;

    -- Atomic Insert of New Attempt
    BEGIN
        INSERT INTO public.student_test_attempts (
            test_id,
            test_version_id,
            student_id,
            batch_id,
            status,
            started_at
        ) VALUES (
            p_test_id,
            v_version.id,
            auth.uid(),
            p_batch_id,
            'IN_PROGRESS',
            now()
        )
        RETURNING id, started_at INTO v_attempt_id, v_started_at;

        RETURN jsonb_build_object(
            'attempt_id', v_attempt_id,
            'test_version_id', v_version.id,
            'started_at', v_started_at,
            'duration_minutes', v_version.duration_minutes,
            'is_resumed', FALSE
        );
    EXCEPTION WHEN unique_violation THEN
        SELECT id, test_version_id, started_at INTO v_existing_attempt
        FROM public.student_test_attempts
        WHERE student_id = auth.uid()
          AND test_id = p_test_id
          AND batch_id = p_batch_id
          AND status = 'IN_PROGRESS';

        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'test_version_id', v_existing_attempt.test_version_id,
            'started_at', v_existing_attempt.started_at,
            'duration_minutes', v_version.duration_minutes,
            'is_resumed', TRUE
        );
    END;
END;
$$;

-- 2.2 RPC: Get Enrolled Student Test Questions (Strict Answer-Key Stripping)
CREATE OR REPLACE FUNCTION public.get_enrolled_student_test_questions(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt RECORD;
    v_version RECORD;
    v_deadline TIMESTAMPTZ;
    v_result JSONB;
BEGIN
    SELECT * INTO v_attempt
    FROM public.student_test_attempts
    WHERE id = p_attempt_id;

    IF NOT FOUND OR (v_attempt.student_id <> auth.uid() AND NOT public.is_super_admin()) THEN
        RAISE EXCEPTION 'Attempt not found or unauthorized.';
    END IF;

    IF v_attempt.status <> 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'Attempt is not in progress.';
    END IF;

    SELECT * INTO v_version
    FROM public.student_test_versions
    WHERE id = v_attempt.test_version_id;

    v_deadline := v_attempt.started_at + (v_version.duration_minutes || ' minutes')::INTERVAL + interval '2 minutes';

    SELECT jsonb_build_object(
        'attempt_id', v_attempt.id,
        'test_title', v_version.title,
        'duration_minutes', v_version.duration_minutes,
        'started_at', v_attempt.started_at,
        'deadline', v_deadline,
        'questions', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_id', qv.id,
                    'question_text', qv.question_text,
                    'question_type', qv.question_type,
                    'marks', qv.marks,
                    'negative_marks', qv.negative_marks,
                    'display_order', qv.display_order,
                    'options', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'option_id', ov.id,
                                'option_label', ov.option_label,
                                'option_text', ov.option_text,
                                'display_order', ov.display_order
                            ) ORDER BY ov.display_order
                        )
                        FROM public.student_test_option_versions ov
                        WHERE ov.question_version_id = qv.id
                    )
                ) ORDER BY qv.display_order
            )
            FROM public.student_test_question_versions qv
            WHERE qv.test_version_id = v_attempt.test_version_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- 2.3 RPC: Save Student Test Answer
CREATE OR REPLACE FUNCTION public.save_student_test_answer(
    p_attempt_id UUID,
    p_question_version_id UUID,
    p_selected_option_ids UUID[] DEFAULT NULL,
    p_numerical_answer TEXT DEFAULT NULL,
    p_time_spent_seconds INT DEFAULT 0,
    p_is_marked_for_review BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt RECORD;
    v_primary_option_id UUID;
BEGIN
    SELECT * INTO v_attempt
    FROM public.student_test_attempts
    WHERE id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND OR v_attempt.student_id <> auth.uid() THEN
        RAISE EXCEPTION 'Attempt not found or unauthorized.';
    END IF;

    IF v_attempt.status <> 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'Cannot modify answers for a submitted attempt.';
    END IF;

    IF p_selected_option_ids IS NOT NULL AND array_length(p_selected_option_ids, 1) > 0 THEN
        v_primary_option_id := p_selected_option_ids[1];
    ELSE
        v_primary_option_id := NULL;
    END IF;

    INSERT INTO public.student_test_answers (
        attempt_id,
        question_version_id,
        selected_option_ids,
        selected_option_version_id,
        numerical_answer,
        time_spent_seconds,
        is_marked_for_review,
        is_correct,
        marks_awarded
    ) VALUES (
        p_attempt_id,
        p_question_version_id,
        COALESCE(p_selected_option_ids, '{}'::uuid[]),
        v_primary_option_id,
        p_numerical_answer,
        p_time_spent_seconds,
        p_is_marked_for_review,
        NULL,
        0.00
    )
    ON CONFLICT (attempt_id, question_version_id) DO UPDATE SET
        selected_option_ids = EXCLUDED.selected_option_ids,
        selected_option_version_id = EXCLUDED.selected_option_version_id,
        numerical_answer = EXCLUDED.numerical_answer,
        time_spent_seconds = EXCLUDED.time_spent_seconds,
        is_marked_for_review = EXCLUDED.is_marked_for_review,
        is_correct = NULL,
        marks_awarded = 0.00;

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 2.4 RPC: Submit Student Test Attempt & Automated Grading Engine
CREATE OR REPLACE FUNCTION public.submit_student_test_attempt(
    p_attempt_id UUID,
    p_time_spent_seconds INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt RECORD;
    v_version RECORD;
    v_total_score NUMERIC(6,2) := 0.00;
    v_percentage NUMERIC(5,2) := 0.00;
    v_passed BOOLEAN := FALSE;
    v_q RECORD;
    v_correct_ids UUID[];
    v_is_correct BOOLEAN;
    v_marks NUMERIC(6,2);
    v_correct_count INT := 0;
    v_incorrect_count INT := 0;
    v_unanswered_count INT := 0;
BEGIN
    SELECT * INTO v_attempt
    FROM public.student_test_attempts
    WHERE id = p_attempt_id
    FOR UPDATE;

    IF NOT FOUND OR (v_attempt.student_id <> auth.uid() AND NOT public.is_super_admin()) THEN
        RAISE EXCEPTION 'Attempt not found or unauthorized.';
    END IF;

    IF v_attempt.status <> 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'Attempt is already submitted.';
    END IF;

    SELECT * INTO v_version
    FROM public.student_test_versions
    WHERE id = v_attempt.test_version_id;

    -- Evaluate each question in the test version
    FOR v_q IN (
        SELECT qv.*, sta.selected_option_ids, sta.numerical_answer
        FROM public.student_test_question_versions qv
        LEFT JOIN public.student_test_answers sta 
          ON sta.question_version_id = qv.id AND sta.attempt_id = v_attempt.id
        WHERE qv.test_version_id = v_attempt.test_version_id
    ) LOOP
        -- Unanswered
        IF (v_q.selected_option_ids IS NULL OR array_length(v_q.selected_option_ids, 1) = 0)
           AND (v_q.numerical_answer IS NULL OR trim(v_q.numerical_answer) = '') THEN
            v_is_correct := NULL;
            v_marks := 0.00;
            v_unanswered_count := v_unanswered_count + 1;
        ELSE
            -- Fetch correct options for question
            SELECT ARRAY(
                SELECT id FROM public.student_test_option_versions
                WHERE question_version_id = v_q.id AND is_correct = TRUE
            ) INTO v_correct_ids;

            IF v_q.selected_option_ids = v_correct_ids THEN
                v_is_correct := TRUE;
                v_marks := v_q.marks;
                v_correct_count := v_correct_count + 1;
            ELSE
                v_is_correct := FALSE;
                v_marks := -1.00 * v_q.negative_marks;
                v_incorrect_count := v_incorrect_count + 1;
            END IF;
        END IF;

        v_total_score := v_total_score + v_marks;

        -- Upsert evaluated answer record
        INSERT INTO public.student_test_answers (
            attempt_id,
            question_version_id,
            selected_option_ids,
            numerical_answer,
            is_correct,
            marks_awarded
        ) VALUES (
            v_attempt.id,
            v_q.id,
            COALESCE(v_q.selected_option_ids, '{}'::uuid[]),
            v_q.numerical_answer,
            v_is_correct,
            v_marks
        )
        ON CONFLICT (attempt_id, question_version_id) DO UPDATE SET
            is_correct = EXCLUDED.is_correct,
            marks_awarded = EXCLUDED.marks_awarded;
    END LOOP;

    IF v_version.total_marks > 0 THEN
        v_percentage := round(((GREATEST(v_total_score, 0.00) / v_version.total_marks) * 100.0), 2);
    ELSE
        v_percentage := 0.00;
    END IF;

    v_passed := (v_total_score >= v_version.passing_marks);

    -- Update Attempt Record
    UPDATE public.student_test_attempts SET
        status = 'SUBMITTED',
        score_obtained = v_total_score,
        max_score = v_version.total_marks,
        percentage = v_percentage,
        passed = v_passed,
        submitted_at = now(),
        time_spent_seconds = COALESCE(p_time_spent_seconds, v_attempt.time_spent_seconds),
        correct_count = v_correct_count,
        incorrect_count = v_incorrect_count,
        unanswered_count = v_unanswered_count
    WHERE id = v_attempt.id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt.id,
        'status', 'SUBMITTED',
        'score_obtained', v_total_score,
        'max_score', v_version.total_marks,
        'percentage', v_percentage,
        'passed', v_passed,
        'submitted_at', now()
    );
END;
$$;

-- 2.5 RPC: Get Student Test Scorecard
CREATE OR REPLACE FUNCTION public.get_student_test_scorecard(p_attempt_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_attempt RECORD;
    v_version RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_attempt
    FROM public.student_test_attempts
    WHERE id = p_attempt_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attempt not found.';
    END IF;

    IF v_attempt.student_id <> auth.uid() 
       AND NOT public.is_super_admin() 
       AND NOT public.is_teacher() THEN
        RAISE EXCEPTION 'Unauthorized to view this scorecard.';
    END IF;

    SELECT * INTO v_version
    FROM public.student_test_versions
    WHERE id = v_attempt.test_version_id;

    SELECT jsonb_build_object(
        'attempt_id', v_attempt.id,
        'test_title', v_version.title,
        'status', v_attempt.status,
        'score_obtained', v_attempt.score_obtained,
        'max_score', v_attempt.max_score,
        'percentage', v_attempt.percentage,
        'passed', v_attempt.passed,
        'started_at', v_attempt.started_at,
        'submitted_at', v_attempt.submitted_at,
        'time_spent_seconds', v_attempt.time_spent_seconds,
        'breakdown', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'question_id', qv.id,
                    'question_text', qv.question_text,
                    'question_type', qv.question_type,
                    'marks', qv.marks,
                    'negative_marks', qv.negative_marks,
                    'marks_awarded', sta.marks_awarded,
                    'is_correct', sta.is_correct,
                    'selected_option_ids', sta.selected_option_ids,
                    'explanation', qv.explanation,
                    'options', (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'option_id', ov.id,
                                'option_label', ov.option_label,
                                'option_text', ov.option_text,
                                'is_correct', ov.is_correct,
                                'display_order', ov.display_order
                            ) ORDER BY ov.display_order
                        )
                        FROM public.student_test_option_versions ov
                        WHERE ov.question_version_id = qv.id
                    )
                ) ORDER BY qv.display_order
            )
            FROM public.student_test_question_versions qv
            LEFT JOIN public.student_test_answers sta
              ON sta.question_version_id = qv.id AND sta.attempt_id = v_attempt.id
            WHERE qv.test_version_id = v_attempt.test_version_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Learning & Attendance RPCs
-- ------------------------------------------------------------------------------

-- 3.1 RPC: Sync Lecture Progress
CREATE OR REPLACE FUNCTION public.sync_lecture_progress(
    p_lecture_id UUID,
    p_watch_time_increment_seconds INT,
    p_last_position_seconds INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_lecture RECORD;
    v_course_id UUID;
    v_clamped_increment INT;
    v_new_watch_time INT;
    v_is_completed BOOLEAN;
    v_valid_position INT;
    v_res RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT l.*, c.course_id INTO v_lecture
    FROM public.cms_lectures l
    JOIN public.cms_chapters c ON c.id = l.chapter_id
    WHERE l.id = p_lecture_id;

    IF NOT FOUND OR (v_lecture.status <> 'PUBLISHED' AND NOT public.is_super_admin()) THEN
        RAISE EXCEPTION 'Lecture not found or not published.';
    END IF;

    v_course_id := v_lecture.course_id;
    v_clamped_increment := LEAST(GREATEST(p_watch_time_increment_seconds, 0), 60);

    SELECT watch_time_seconds INTO v_new_watch_time
    FROM public.student_lecture_progress
    WHERE student_id = auth.uid() AND lecture_id = p_lecture_id;

    IF FOUND THEN
        v_new_watch_time := v_new_watch_time + v_clamped_increment;
    ELSE
        v_new_watch_time := v_clamped_increment;
    END IF;

    IF v_lecture.duration_seconds > 0 THEN
        v_new_watch_time := LEAST(v_new_watch_time, v_lecture.duration_seconds);
        v_valid_position := LEAST(GREATEST(p_last_position_seconds, 0), v_lecture.duration_seconds);
        v_is_completed := (v_new_watch_time >= (v_lecture.duration_seconds * 0.90));
    ELSE
        v_valid_position := GREATEST(p_last_position_seconds, 0);
        v_is_completed := FALSE;
    END IF;

    INSERT INTO public.student_lecture_progress (
        student_id,
        lecture_id,
        course_id,
        watch_time_seconds,
        last_position_seconds,
        is_completed,
        completed_at,
        updated_at
    ) VALUES (
        auth.uid(),
        p_lecture_id,
        v_course_id,
        v_new_watch_time,
        v_valid_position,
        v_is_completed,
        CASE WHEN v_is_completed THEN now() ELSE NULL END,
        now()
    )
    ON CONFLICT (student_id, lecture_id) DO UPDATE SET
        watch_time_seconds = EXCLUDED.watch_time_seconds,
        last_position_seconds = EXCLUDED.last_position_seconds,
        is_completed = (student_lecture_progress.is_completed OR EXCLUDED.is_completed),
        completed_at = COALESCE(student_lecture_progress.completed_at, EXCLUDED.completed_at),
        updated_at = now()
    RETURNING * INTO v_res;

    RETURN jsonb_build_object(
        'lecture_id', v_res.lecture_id,
        'watch_time_seconds', v_res.watch_time_seconds,
        'last_position_seconds', v_res.last_position_seconds,
        'is_completed', v_res.is_completed
    );
END;
$$;

-- 3.2 RPC: Record Live Attendance Heartbeat
CREATE OR REPLACE FUNCTION public.record_live_attendance_heartbeat(
    p_live_class_id UUID,
    p_heartbeat_seconds INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_live_class RECORD;
    v_clamped_seconds INT;
    v_now TIMESTAMPTZ := now();
    v_res RECORD;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_live_class
    FROM public.cms_live_classes
    WHERE id = p_live_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Live class not found.';
    END IF;

    IF NOT public.is_actively_enrolled_in_batch(v_live_class.batch_id) AND NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Active batch enrollment required.';
    END IF;

    v_clamped_seconds := LEAST(GREATEST(p_heartbeat_seconds, 1), 60);

    INSERT INTO public.live_class_attendance (
        live_class_id,
        student_id,
        batch_id,
        first_seen_at,
        last_seen_at,
        duration_minutes,
        heartbeat_count,
        status
    ) VALUES (
        p_live_class_id,
        auth.uid(),
        v_live_class.batch_id,
        v_now,
        v_now,
        v_clamped_seconds / 60,
        1,
        'PRESENT'
    )
    ON CONFLICT (live_class_id, student_id) DO UPDATE SET
        last_seen_at = v_now,
        duration_minutes = GREATEST(
            live_class_attendance.duration_minutes,
            EXTRACT(EPOCH FROM (v_now - live_class_attendance.first_seen_at))::INTEGER / 60
        ),
        heartbeat_count = live_class_attendance.heartbeat_count + 1
    RETURNING * INTO v_res;

    RETURN jsonb_build_object(
        'live_class_id', v_res.live_class_id,
        'duration_minutes', v_res.duration_minutes,
        'heartbeat_count', v_res.heartbeat_count,
        'status', v_res.status
    );
END;
$$;

-- 3.3 RPC: Finalize Live Class Attendance
CREATE OR REPLACE FUNCTION public.finalize_live_class_attendance(p_live_class_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_live_class RECORD;
    v_enrollee RECORD;
    v_present_count INT := 0;
    v_absent_count INT := 0;
BEGIN
    SELECT * INTO v_live_class
    FROM public.cms_live_classes
    WHERE id = p_live_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Live class not found.';
    END IF;

    IF NOT (public.is_super_admin() OR public.is_batch_teacher(v_live_class.batch_id)) THEN
        RAISE EXCEPTION 'Unauthorized to finalize attendance.';
    END IF;

    SELECT COUNT(*) INTO v_present_count
    FROM public.live_class_attendance
    WHERE live_class_id = p_live_class_id AND status = 'PRESENT';

    -- Mark missing enrollees as ABSENT
    FOR v_enrollee IN (
        SELECT se.student_id
        FROM public.student_enrollments se
        WHERE se.batch_id = v_live_class.batch_id
          AND se.status = 'ACTIVE'
          AND NOT EXISTS (
              SELECT 1 FROM public.live_class_attendance lca
              WHERE lca.live_class_id = p_live_class_id 
                AND lca.student_id = se.student_id
          )
    ) LOOP
        INSERT INTO public.live_class_attendance (
            live_class_id,
            student_id,
            batch_id,
            first_seen_at,
            last_seen_at,
            duration_minutes,
            heartbeat_count,
            status,
            finalized_at,
            finalized_by
        ) VALUES (
            p_live_class_id,
            v_enrollee.student_id,
            v_live_class.batch_id,
            now(),
            now(),
            0,
            0,
            'ABSENT',
            now(),
            auth.uid()
        )
        ON CONFLICT (live_class_id, student_id) DO NOTHING;

        v_absent_count := v_absent_count + 1;
    END LOOP;

    UPDATE public.live_class_attendance SET
        finalized_at = now(),
        finalized_by = auth.uid()
    WHERE live_class_id = p_live_class_id AND finalized_at IS NULL;

    RETURN jsonb_build_object(
        'live_class_id', p_live_class_id,
        'present_students', v_present_count,
        'absent_students', v_absent_count,
        'finalized_at', now()
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Function Execution Grants & Public Revocations
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.start_student_test_attempt(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_enrolled_student_test_questions(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_student_test_answer(UUID, UUID, UUID[], TEXT, INT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_student_test_attempt(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_test_scorecard(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_lecture_progress(UUID, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_live_attendance_heartbeat(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_live_class_attendance(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.start_student_test_attempt(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_enrolled_student_test_questions(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_student_test_answer(UUID, UUID, UUID[], TEXT, INT, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_student_test_attempt(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_student_test_scorecard(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_lecture_progress(UUID, INT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_live_attendance_heartbeat(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_live_class_attendance(UUID) TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE ON public.live_class_attendance TO authenticated;
GRANT ALL ON public.live_class_attendance TO service_role;

-- ------------------------------------------------------------------------------
-- 5. Exhaustive Supabase Storage Policies
-- ------------------------------------------------------------------------------

-- 5.1 Study Materials Bucket
DROP POLICY IF EXISTS "study_materials_select_policy" ON storage.objects;
CREATE POLICY "study_materials_select_policy"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'study-materials'
    AND (
        public.is_super_admin()
        OR public.is_teacher()
        OR (
            public.is_actively_enrolled_in_batch(((storage.foldername(name))[1])::UUID)
        )
    )
);

DROP POLICY IF EXISTS "study_materials_insert_policy" ON storage.objects;
CREATE POLICY "study_materials_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'study-materials'
    AND (
        public.is_super_admin()
        OR (
            public.is_teacher() 
            AND public.is_batch_teacher(((storage.foldername(name))[1])::UUID)
        )
    )
);

DROP POLICY IF EXISTS "study_materials_delete_policy" ON storage.objects;
CREATE POLICY "study_materials_delete_policy"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'study-materials'
    AND (
        public.is_super_admin()
        OR (
            public.is_teacher() 
            AND public.is_batch_teacher(((storage.foldername(name))[1])::UUID)
        )
    )
);

-- 5.2 Test Attachments Bucket
DROP POLICY IF EXISTS "test_attachments_select_policy" ON storage.objects;
CREATE POLICY "test_attachments_select_policy"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'test-attachments'
    AND (
        public.is_super_admin()
        OR public.is_teacher()
        OR public.is_actively_enrolled_in_batch(((storage.foldername(name))[1])::UUID)
    )
);

DROP POLICY IF EXISTS "test_attachments_insert_policy" ON storage.objects;
CREATE POLICY "test_attachments_insert_policy"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'test-attachments'
    AND (
        public.is_super_admin()
        OR public.is_teacher()
    )
);

COMMIT;
