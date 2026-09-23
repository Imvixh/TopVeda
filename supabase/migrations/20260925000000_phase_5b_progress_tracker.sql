-- ==============================================================================
-- TopVeda Phase 5B: Progress Tracker & Server-Authoritative Live Attendance
-- Architecture Version: 5.0 (Hardened Production Specification)
-- Tables: student_live_attendance
-- Role Security: Isolated per authenticated student (auth.uid() = student_id)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Student Live Attendance Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_live_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    last_heartbeat_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    left_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0 NOT NULL,
    is_attended BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_student_live_attendance UNIQUE (student_id, live_class_id)
);

CREATE INDEX IF NOT EXISTS idx_student_live_attendance_student 
    ON public.student_live_attendance (student_id, is_attended);

CREATE INDEX IF NOT EXISTS idx_student_live_attendance_class 
    ON public.student_live_attendance (live_class_id);

DROP TRIGGER IF EXISTS set_student_live_attendance_updated_at ON public.student_live_attendance;
CREATE TRIGGER set_student_live_attendance_updated_at
    BEFORE UPDATE ON public.student_live_attendance
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Row Level Security (RLS) Enablement & Strict Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.student_live_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_view_own_live_attendance" ON public.student_live_attendance;
CREATE POLICY "students_view_own_live_attendance"
    ON public.student_live_attendance
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_admin_or_super_admin()
    );

DROP POLICY IF EXISTS "students_insert_own_live_attendance" ON public.student_live_attendance;
CREATE POLICY "students_insert_own_live_attendance"
    ON public.student_live_attendance
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = student_id OR
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "students_update_own_live_attendance" ON public.student_live_attendance;
CREATE POLICY "students_update_own_live_attendance"
    ON public.student_live_attendance
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = student_id OR
        public.is_super_admin()
    )
    WITH CHECK (
        auth.uid() = student_id OR
        public.is_super_admin()
    );

DROP POLICY IF EXISTS "students_no_delete_live_attendance" ON public.student_live_attendance;
CREATE POLICY "students_no_delete_live_attendance"
    ON public.student_live_attendance
    FOR DELETE
    TO authenticated
    USING (public.is_super_admin());
