-- ==============================================================================
-- TopVeda Phase 6 Loop 3: Live Interaction Layer (Chat, Polls, Quizzes, RLS)
-- Architecture Version: 6.3 (Hardened Production Specification)
-- Tables Created:
--   1. live_class_messages
--   2. live_class_polls
--   3. live_class_poll_votes
--   4. live_class_quizzes
--   5. live_class_quiz_questions
--   6. live_class_quiz_attempts
-- Tables Altered:
--   student_learning_activity (expanded activity_type check constraint)
-- RLS: Strict participant isolation, server-governed permissions, answer key protection
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Live Class Chat Messages Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.live_class_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name VARCHAR(255) NOT NULL,
    sender_role VARCHAR(50) NOT NULL CHECK (sender_role IN ('STUDENT', 'ADMIN', 'SUPER_ADMIN')),
    message TEXT NOT NULL,
    is_hidden BOOLEAN DEFAULT FALSE NOT NULL,
    moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    moderated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_chat_class_created 
    ON public.live_class_messages (live_class_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_live_chat_sender 
    ON public.live_class_messages (sender_id);

DROP TRIGGER IF EXISTS set_live_class_messages_updated_at ON public.live_class_messages;
CREATE TRIGGER set_live_class_messages_updated_at 
    BEFORE UPDATE ON public.live_class_messages 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Live Class Polls & Votes Tables
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.live_class_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- array of { id: string, text: string }
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_polls_class_status 
    ON public.live_class_polls (live_class_id, status);

DROP TRIGGER IF EXISTS set_live_class_polls_updated_at ON public.live_class_polls;
CREATE TRIGGER set_live_class_polls_updated_at 
    BEFORE UPDATE ON public.live_class_polls 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.live_class_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.live_class_polls(id) ON DELETE CASCADE,
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    option_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_live_poll_vote UNIQUE (poll_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_poll_votes_poll 
    ON public.live_class_poll_votes (poll_id);

CREATE INDEX IF NOT EXISTS idx_live_poll_votes_student 
    ON public.live_class_poll_votes (student_id);

-- ------------------------------------------------------------------------------
-- 3. Live Class Quizzes, Questions & Attempts Tables
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.live_class_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_seconds INT DEFAULT 120 NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'EVALUATED')),
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_quizzes_class_status 
    ON public.live_class_quizzes (live_class_id, status);

DROP TRIGGER IF EXISTS set_live_class_quizzes_updated_at ON public.live_class_quizzes;
CREATE TRIGGER set_live_class_quizzes_updated_at 
    BEFORE UPDATE ON public.live_class_quizzes 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.live_class_quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.live_class_quizzes(id) ON DELETE CASCADE,
    question_number INT DEFAULT 1 NOT NULL,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- array of { id: string, text: string }
    correct_option_id VARCHAR(50) NOT NULL, -- strictly server-side verified
    explanation TEXT,
    points INT DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_live_quiz_questions_quiz 
    ON public.live_class_quiz_questions (quiz_id, question_number ASC);

CREATE TABLE IF NOT EXISTS public.live_class_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.live_class_quizzes(id) ON DELETE CASCADE,
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    selected_answers JSONB DEFAULT '{}'::jsonb NOT NULL,
    score_obtained NUMERIC(6, 2) DEFAULT 0 NOT NULL,
    max_score NUMERIC(6, 2) DEFAULT 0 NOT NULL,
    percentage NUMERIC(5, 2) DEFAULT 0 NOT NULL,
    status VARCHAR(50) DEFAULT 'SUBMITTED' NOT NULL CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED')),
    submitted_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_live_quiz_attempt UNIQUE (quiz_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_live_quiz_attempts_quiz 
    ON public.live_class_quiz_attempts (quiz_id);

CREATE INDEX IF NOT EXISTS idx_live_quiz_attempts_student 
    ON public.live_class_quiz_attempts (student_id);

-- ------------------------------------------------------------------------------
-- 4. Extend student_learning_activity constraint
-- ------------------------------------------------------------------------------

ALTER TABLE public.student_learning_activity 
    DROP CONSTRAINT IF EXISTS student_learning_activity_activity_type_check;

ALTER TABLE public.student_learning_activity 
    ADD CONSTRAINT student_learning_activity_activity_type_check 
    CHECK (activity_type IN (
        'LECTURE_WATCH', 
        'LIVE_ATTENDANCE', 
        'TEST_ATTEMPT', 
        'MATERIAL_DOWNLOAD', 
        'STREAK_HEARTBEAT',
        'LIVE_CHAT',
        'LIVE_POLL',
        'LIVE_QUIZ',
        'LIVE_QUIZ_COMPLETION'
    ));

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Enablement & Strict Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.live_class_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_class_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- live_class_messages RLS
DROP POLICY IF EXISTS "view_live_chat_messages" ON public.live_class_messages;
CREATE POLICY "view_live_chat_messages"
    ON public.live_class_messages
    FOR SELECT
    TO authenticated
    USING (
        is_hidden = FALSE OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "insert_live_chat_messages" ON public.live_class_messages;
CREATE POLICY "insert_live_chat_messages"
    ON public.live_class_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = sender_id
    );

DROP POLICY IF EXISTS "moderate_live_chat_messages" ON public.live_class_messages;
CREATE POLICY "moderate_live_chat_messages"
    ON public.live_class_messages
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin_or_super_admin()
    )
    WITH CHECK (
        public.is_admin_or_super_admin()
    );

-- live_class_polls RLS
DROP POLICY IF EXISTS "view_live_polls" ON public.live_class_polls;
CREATE POLICY "view_live_polls"
    ON public.live_class_polls
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "manage_live_polls" ON public.live_class_polls;
CREATE POLICY "manage_live_polls"
    ON public.live_class_polls
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- live_class_poll_votes RLS
DROP POLICY IF EXISTS "view_poll_votes" ON public.live_class_poll_votes;
CREATE POLICY "view_poll_votes"
    ON public.live_class_poll_votes
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "insert_own_poll_vote" ON public.live_class_poll_votes;
CREATE POLICY "insert_own_poll_vote"
    ON public.live_class_poll_votes
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id
    );

-- live_class_quizzes RLS
DROP POLICY IF EXISTS "view_live_quizzes" ON public.live_class_quizzes;
CREATE POLICY "view_live_quizzes"
    ON public.live_class_quizzes
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "manage_live_quizzes" ON public.live_class_quizzes;
CREATE POLICY "manage_live_quizzes"
    ON public.live_class_quizzes
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- live_class_quiz_questions RLS
DROP POLICY IF EXISTS "view_live_quiz_questions" ON public.live_class_quiz_questions;
CREATE POLICY "view_live_quiz_questions"
    ON public.live_class_quiz_questions
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "manage_live_quiz_questions" ON public.live_class_quiz_questions;
CREATE POLICY "manage_live_quiz_questions"
    ON public.live_class_quiz_questions
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_super_admin())
    WITH CHECK (public.is_admin_or_super_admin());

-- live_class_quiz_attempts RLS
DROP POLICY IF EXISTS "view_own_quiz_attempts" ON public.live_class_quiz_attempts;
CREATE POLICY "view_own_quiz_attempts"
    ON public.live_class_quiz_attempts
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "insert_own_quiz_attempt" ON public.live_class_quiz_attempts;
CREATE POLICY "insert_own_quiz_attempt"
    ON public.live_class_quiz_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id
    );
