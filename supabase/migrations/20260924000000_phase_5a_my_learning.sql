-- ==============================================================================
-- TopVeda Phase 5A: My Learning Database Foundation & Student Learning Schema
-- Architecture Version: 5.0 (Hardened Production Specification)
-- Tables: student_learning_preferences, student_content_entitlements,
--         student_enrollments, student_lecture_progress, student_learning_activity
-- Role Security: Isolated per authenticated student (auth.uid() = student_id)
-- Access Control: content_access_tier (FREE, PAID_ONLY, PREMIUM_INCLUDED)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Custom Enum Types for Student Learning Platform
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_access_tier') THEN
        CREATE TYPE public.content_access_tier AS ENUM (
            'FREE',
            'PAID_ONLY',
            'PREMIUM_INCLUDED'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_enrollment_status') THEN
        CREATE TYPE public.student_enrollment_status AS ENUM (
            'ACTIVE',
            'COMPLETED',
            'PAUSED',
            'CANCELLED'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_entitlement_status') THEN
        CREATE TYPE public.student_entitlement_status AS ENUM (
            'ACTIVE',
            'EXPIRED',
            'REVOKED'
        );
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Extend CMS Entities with Direct Access Tier (Default: 'FREE')
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_courses 
    ADD COLUMN IF NOT EXISTS access_tier public.content_access_tier DEFAULT 'FREE' NOT NULL;

ALTER TABLE public.cms_batches 
    ADD COLUMN IF NOT EXISTS access_tier public.content_access_tier DEFAULT 'FREE' NOT NULL;

ALTER TABLE public.cms_lectures 
    ADD COLUMN IF NOT EXISTS access_tier public.content_access_tier DEFAULT 'FREE' NOT NULL;

ALTER TABLE public.cms_study_materials 
    ADD COLUMN IF NOT EXISTS access_tier public.content_access_tier DEFAULT 'FREE' NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. Student Learning Preferences & Target Configuration
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_learning_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    board_id UUID REFERENCES public.cms_boards(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.cms_class_levels(id) ON DELETE SET NULL,
    target_year INT,
    daily_goal_minutes INT DEFAULT 60 NOT NULL,
    notification_preferences JSONB DEFAULT '{"live_reminders": true, "lecture_updates": true, "test_results": true}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_student_learning_preferences UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_learning_prefs_student 
    ON public.student_learning_preferences (student_id);

DROP TRIGGER IF EXISTS set_student_learning_preferences_updated_at ON public.student_learning_preferences;
CREATE TRIGGER set_student_learning_preferences_updated_at
    BEFORE UPDATE ON public.student_learning_preferences
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 4. Student Content Entitlements (Commercial Authorization Vault)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_content_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('COURSE', 'BATCH', 'BOARD_BUNDLE', 'ALL_ACCESS')),
    content_id UUID,
    access_tier public.content_access_tier DEFAULT 'FREE' NOT NULL,
    status public.student_entitlement_status DEFAULT 'ACTIVE' NOT NULL,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_reference_id VARCHAR(100),
    starts_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_student_content_entitlement UNIQUE (student_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_student_entitlements_lookup 
    ON public.student_content_entitlements (student_id, content_type, status);

DROP TRIGGER IF EXISTS set_student_content_entitlements_updated_at ON public.student_content_entitlements;
CREATE TRIGGER set_student_content_entitlements_updated_at
    BEFORE UPDATE ON public.student_content_entitlements
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Student Course & Batch Enrollments
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.cms_courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL,
    status public.student_enrollment_status DEFAULT 'ACTIVE' NOT NULL,
    enrolled_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_student_course_enrollment UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_student 
    ON public.student_enrollments (student_id, status, last_accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_course 
    ON public.student_enrollments (course_id, status);

DROP TRIGGER IF EXISTS set_student_enrollments_updated_at ON public.student_enrollments;
CREATE TRIGGER set_student_enrollments_updated_at
    BEFORE UPDATE ON public.student_enrollments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. Student Lecture Progress (Current Playback State / Checkpoint)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_lecture_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lecture_id UUID NOT NULL REFERENCES public.cms_lectures(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.cms_courses(id) ON DELETE CASCADE,
    last_position_seconds INT DEFAULT 0 NOT NULL,
    watch_duration_seconds INT DEFAULT 0 NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    completed_at TIMESTAMPTZ,
    last_watched_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_student_lecture_progress UNIQUE (student_id, lecture_id)
);

CREATE INDEX IF NOT EXISTS idx_student_lecture_progress_course 
    ON public.student_lecture_progress (student_id, course_id, is_completed);

CREATE INDEX IF NOT EXISTS idx_student_lecture_progress_lecture 
    ON public.student_lecture_progress (lecture_id, is_completed);

DROP TRIGGER IF EXISTS set_student_lecture_progress_updated_at ON public.student_lecture_progress;
CREATE TRIGGER set_student_lecture_progress_updated_at
    BEFORE UPDATE ON public.student_lecture_progress
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 7. Student Learning Activity (Granular Historical Log & Study Streaks)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_learning_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('LECTURE_WATCH', 'LIVE_ATTENDANCE', 'TEST_ATTEMPT', 'MATERIAL_DOWNLOAD', 'STREAK_HEARTBEAT')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('LECTURE', 'LIVE_CLASS', 'TEST', 'STUDY_MATERIAL', 'COURSE')),
    entity_id UUID NOT NULL,
    duration_seconds INT DEFAULT 0 NOT NULL,
    activity_date DATE DEFAULT CURRENT_DATE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_activity_streak 
    ON public.student_learning_activity (student_id, activity_date DESC);

-- ------------------------------------------------------------------------------
-- 8. Row Level Security (RLS) Enablement & Strict Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.student_learning_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_content_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lecture_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_learning_activity ENABLE ROW LEVEL SECURITY;

-- Preferences Policies
DROP POLICY IF EXISTS "access_own_learning_preferences" ON public.student_learning_preferences;
CREATE POLICY "access_own_learning_preferences"
    ON public.student_learning_preferences
    FOR ALL
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    )
    WITH CHECK (
        auth.uid() = student_id OR
        public.is_super_admin()
    );

-- Entitlements Policies (Read-Only for Students, Super Admin Managed)
DROP POLICY IF EXISTS "read_own_entitlements" ON public.student_content_entitlements;
CREATE POLICY "read_own_entitlements"
    ON public.student_content_entitlements
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "super_admin_manage_entitlements" ON public.student_content_entitlements;
CREATE POLICY "super_admin_manage_entitlements"
    ON public.student_content_entitlements
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- Enrollments Policies (Students view own; direct update/delete blocked)
DROP POLICY IF EXISTS "students_view_own_enrollments" ON public.student_enrollments;
CREATE POLICY "students_view_own_enrollments"
    ON public.student_enrollments
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "students_insert_own_enrollments" ON public.student_enrollments;
CREATE POLICY "students_insert_own_enrollments"
    ON public.student_enrollments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id OR
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "students_no_direct_update_enrollments" ON public.student_enrollments;
CREATE POLICY "students_no_direct_update_enrollments"
    ON public.student_enrollments
    FOR UPDATE
    TO authenticated
    USING (
        public.is_super_admin() OR
        (auth.uid() = student_id AND public.is_admin_or_super_admin())
    )
    WITH CHECK (
        public.is_super_admin() OR
        (auth.uid() = student_id AND public.is_admin_or_super_admin())
    );

DROP POLICY IF EXISTS "students_no_direct_delete_enrollments" ON public.student_enrollments;
CREATE POLICY "students_no_direct_delete_enrollments"
    ON public.student_enrollments
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin());

-- Lecture Progress Policies (Student can read/update own playback state)
DROP POLICY IF EXISTS "access_own_lecture_progress" ON public.student_lecture_progress;
CREATE POLICY "access_own_lecture_progress"
    ON public.student_lecture_progress
    FOR ALL
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    )
    WITH CHECK (
        auth.uid() = student_id OR
        public.is_super_admin()
    );

-- Learning Activity Policies (Append-only for student, immutable log)
DROP POLICY IF EXISTS "read_own_learning_activity" ON public.student_learning_activity;
CREATE POLICY "read_own_learning_activity"
    ON public.student_learning_activity
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "insert_own_learning_activity" ON public.student_learning_activity;
CREATE POLICY "insert_own_learning_activity"
    ON public.student_learning_activity
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id OR
        public.is_super_admin()
    );
