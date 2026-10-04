-- ==============================================================================
-- TopVeda Forward Migration: Phase M3 — Live Interaction Tables & RLS Policies
-- File: supabase/migrations/20261006000003_m3_live_interaction_tables.sql
-- Architecture: Version 7.0 Live Interactive Classroom Layer
-- Governs: Live Instances, In-Session Chat, Polls & Quizzes with Scoped RLS
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Precondition Safety Check
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_live_classes') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_live_classes does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.profiles does not exist.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Live Instances & Transition Audit Tables (Idempotent Creation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_live_class_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    youtube_broadcast_id VARCHAR(255) NOT NULL,
    youtube_video_id VARCHAR(255) NOT NULL,
    youtube_stream_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'CREATED' NOT NULL,
    lifecycle_status VARCHAR(50),
    stream_status VARCHAR(50),
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_live_instances_single_current 
    ON public.cms_live_class_instances (live_class_id) 
    WHERE is_current = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_live_instances_broadcast_unique 
    ON public.cms_live_class_instances (youtube_broadcast_id);

CREATE TABLE IF NOT EXISTS public.cms_live_instance_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    previous_instance_id UUID REFERENCES public.cms_live_class_instances(id) ON DELETE SET NULL,
    new_instance_id UUID REFERENCES public.cms_live_class_instances(id) ON DELETE SET NULL,
    previous_broadcast_id VARCHAR(255),
    new_broadcast_id VARCHAR(255),
    transition_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. Live Chat Messages Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_class_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')),
    message TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
    moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_chat_class_created 
    ON public.live_class_messages (live_class_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_live_chat_sender 
    ON public.live_class_messages (sender_id);

-- ------------------------------------------------------------------------------
-- 4. Live Polls & Votes Tables
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_class_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_polls_class_status 
    ON public.live_class_polls (live_class_id, status);

CREATE TABLE IF NOT EXISTS public.live_class_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.live_class_polls(id) ON DELETE CASCADE,
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    option_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_live_poll_vote UNIQUE (poll_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_poll_votes_poll 
    ON public.live_class_poll_votes (poll_id);

CREATE INDEX IF NOT EXISTS idx_live_poll_votes_student 
    ON public.live_class_poll_votes (student_id);

-- ------------------------------------------------------------------------------
-- 5. Live Quizzes, Questions & Attempts Tables
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_class_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_seconds INT DEFAULT 120 NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'EVALUATED')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.live_class_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.live_class_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_id VARCHAR(50) NOT NULL,
    explanation TEXT,
    order_index INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.live_class_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.live_class_quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selected_option_id VARCHAR(50) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    CONSTRAINT uq_live_quiz_attempt UNIQUE (quiz_id, student_id)
);

-- ------------------------------------------------------------------------------
-- 6. Reconciled RLS Policies for All Live Interaction Tables
-- ------------------------------------------------------------------------------
ALTER TABLE public.cms_live_class_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_live_instance_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 6.1 Chat RLS
DROP POLICY IF EXISTS "live_chat_select_policy" ON public.live_class_messages;
CREATE POLICY "live_chat_select_policy" ON public.live_class_messages FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.cms_live_classes lc
        WHERE lc.id = live_class_messages.live_class_id
          AND (
              (is_hidden = FALSE AND public.is_actively_enrolled_in_batch(lc.batch_id))
              OR public.is_batch_subject_teacher(lc.batch_id, lc.subject_id)
          )
    )
);

DROP POLICY IF EXISTS "live_chat_insert_policy" ON public.live_class_messages;
CREATE POLICY "live_chat_insert_policy" ON public.live_class_messages FOR INSERT TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.cms_live_classes lc
        WHERE lc.id = live_class_messages.live_class_id
          AND (
              public.is_super_admin()
              OR public.is_batch_subject_teacher(lc.batch_id, lc.subject_id)
              OR public.is_actively_enrolled_in_batch(lc.batch_id)
          )
    )
);

DROP POLICY IF EXISTS "live_chat_moderate_policy" ON public.live_class_messages;
CREATE POLICY "live_chat_moderate_policy" ON public.live_class_messages FOR UPDATE TO authenticated
USING (
    public.is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.cms_live_classes lc
        WHERE lc.id = live_class_messages.live_class_id
          AND public.is_batch_subject_teacher(lc.batch_id, lc.subject_id)
    )
);

-- 6.2 Polls & Votes RLS
DROP POLICY IF EXISTS "live_polls_select_policy" ON public.live_class_polls;
CREATE POLICY "live_polls_select_policy" ON public.live_class_polls FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.cms_live_classes lc
        WHERE lc.id = live_class_polls.live_class_id
          AND (
              public.is_actively_enrolled_in_batch(lc.batch_id)
              OR public.is_batch_subject_teacher(lc.batch_id, lc.subject_id)
          )
    )
);

DROP POLICY IF EXISTS "live_poll_votes_insert_policy" ON public.live_class_poll_votes;
CREATE POLICY "live_poll_votes_insert_policy" ON public.live_class_poll_votes FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.cms_live_classes lc
        WHERE lc.id = live_class_poll_votes.live_class_id
          AND public.is_actively_enrolled_in_batch(lc.batch_id)
    )
);

-- 6.3 Quizzes & Attempts RLS
DROP POLICY IF EXISTS "live_quizzes_select_policy" ON public.live_class_quizzes;
CREATE POLICY "live_quizzes_select_policy" ON public.live_class_quizzes FOR SELECT TO authenticated
USING (
    public.is_super_admin()
    OR EXISTS (
        SELECT 1 FROM public.cms_live_classes lc
        WHERE lc.id = live_class_quizzes.live_class_id
          AND (
              public.is_actively_enrolled_in_batch(lc.batch_id)
              OR public.is_batch_subject_teacher(lc.batch_id, lc.subject_id)
          )
    )
);

DROP POLICY IF EXISTS "live_quiz_attempts_insert_policy" ON public.live_class_quiz_attempts;
CREATE POLICY "live_quiz_attempts_insert_policy" ON public.live_class_quiz_attempts FOR INSERT TO authenticated
WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.live_class_quizzes q
        JOIN public.cms_live_classes lc ON lc.id = q.live_class_id
        WHERE q.id = live_class_quiz_attempts.quiz_id
          AND q.status = 'ACTIVE'
          AND public.is_actively_enrolled_in_batch(lc.batch_id)
    )
);

-- ------------------------------------------------------------------------------
-- 7. Table Grants
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT ON public.live_class_messages TO authenticated;
GRANT UPDATE ON public.live_class_messages TO authenticated;
GRANT SELECT ON public.live_class_polls TO authenticated;
GRANT SELECT, INSERT ON public.live_class_poll_votes TO authenticated;
GRANT SELECT ON public.live_class_quizzes TO authenticated;
GRANT SELECT, INSERT ON public.live_class_quiz_attempts TO authenticated;

GRANT ALL ON public.cms_live_class_instances TO service_role;
GRANT ALL ON public.cms_live_instance_transitions TO service_role;
GRANT ALL ON public.live_class_messages TO service_role;
GRANT ALL ON public.live_class_polls TO service_role;
GRANT ALL ON public.live_class_poll_votes TO service_role;
GRANT ALL ON public.live_class_quizzes TO service_role;
GRANT ALL ON public.live_class_quiz_questions TO service_role;
GRANT ALL ON public.live_class_quiz_attempts TO service_role;

COMMIT;
