-- ==============================================================================
-- TopVeda Forward Migration: Phase M10 — Standalone Batch Enrollments & Course Nullability
-- File: supabase/migrations/20261006000010_m10_standalone_batch_enrollments.sql
-- Architecture: Resolves student enrollment failure for standalone cohorts (where course_id IS NULL)
-- Governs: student_enrollments, cms_batches, RLS permissions
-- ==============================================================================

BEGIN;

-- 1. Drop the composite foreign key that forced (batch_id, course_id) to match
ALTER TABLE public.student_enrollments 
    DROP CONSTRAINT IF EXISTS fk_student_enrollments_batch_course;

-- 1b. Drop erroneous trigger on cms_batches that referenced nonexistent batch_id
DROP TRIGGER IF EXISTS trg_guard_cms_batches_review ON public.cms_batches;


-- 2. Make course_id nullable on student_enrollments
ALTER TABLE public.student_enrollments 
    ALTER COLUMN course_id DROP NOT NULL;

-- 3. Ensure independent foreign keys for batch_id and course_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_student_enrollments_batch' AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments
            ADD CONSTRAINT fk_student_enrollments_batch
            FOREIGN KEY (batch_id)
            REFERENCES public.cms_batches(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_student_enrollments_course' AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments
            ADD CONSTRAINT fk_student_enrollments_course
            FOREIGN KEY (course_id)
            REFERENCES public.cms_courses(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Ensure unique constraint per student per batch
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_student_batch_enrollment' AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments
            ADD CONSTRAINT uq_student_batch_enrollment UNIQUE (student_id, batch_id);
    END IF;
END $$;

-- 5. Ensure student_enrollments RLS policies allow student self-enrollment and viewing
DROP POLICY IF EXISTS "students_view_own_enrollments" ON public.student_enrollments;
CREATE POLICY "students_view_own_enrollments"
    ON public.student_enrollments
    FOR SELECT
    TO authenticated
    USING (
        student_id = auth.uid() 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

DROP POLICY IF EXISTS "students_insert_own_enrollments" ON public.student_enrollments;
CREATE POLICY "students_insert_own_enrollments"
    ON public.student_enrollments
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

DROP POLICY IF EXISTS "students_update_own_enrollments" ON public.student_enrollments;
CREATE POLICY "students_update_own_enrollments"
    ON public.student_enrollments
    FOR UPDATE
    TO authenticated
    USING (
        student_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

COMMIT;
