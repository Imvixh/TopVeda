-- ==============================================================================
-- TopVeda Forward Migration: Phase M2 — Academic Join Tables & Composite Keys
-- File: supabase/migrations/20261006000002_m2_academic_join_tables.sql
-- Architecture: Version 7.0 Approved Taxonomy Hierarchy
-- Governs: Course-Subject Mappings, Batch-Subject Allocations, and Composite Integrity
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Precondition Safety Verification
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_courses') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_courses does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_subjects') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_subjects does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_batches') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_batches does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_enrollments does not exist.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Master Course-Subject Mapping Table (cms_course_subjects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_course_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.cms_courses(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES public.cms_subjects(id) ON DELETE RESTRICT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_course_subject UNIQUE (course_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_course_subjects_course ON public.cms_course_subjects (course_id, display_order);
CREATE INDEX IF NOT EXISTS idx_course_subjects_subject ON public.cms_course_subjects (subject_id);

ALTER TABLE public.cms_course_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_course_subjects_public_select" ON public.cms_course_subjects;
CREATE POLICY "cms_course_subjects_public_select"
    ON public.cms_course_subjects FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "cms_course_subjects_super_admin_manage" ON public.cms_course_subjects;
CREATE POLICY "cms_course_subjects_super_admin_manage"
    ON public.cms_course_subjects FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 3. Batch Composite Unique Key (cms_batches)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_cms_batches_id_course' AND table_name = 'cms_batches'
    ) THEN
        ALTER TABLE public.cms_batches ADD CONSTRAINT uq_cms_batches_id_course UNIQUE (id, course_id);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Batch-Subject Allocation Table (cms_batch_subjects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_batch_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.cms_batches(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES public.cms_subjects(id) ON DELETE RESTRICT,
    primary_teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_batch_subject UNIQUE (batch_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_batch_subjects_batch ON public.cms_batch_subjects (batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_subjects_subject ON public.cms_batch_subjects (subject_id);
CREATE INDEX IF NOT EXISTS idx_batch_subjects_teacher ON public.cms_batch_subjects (primary_teacher_id);

ALTER TABLE public.cms_batch_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_batch_subjects_select_policy" ON public.cms_batch_subjects;
CREATE POLICY "cms_batch_subjects_select_policy"
    ON public.cms_batch_subjects FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_batch_subject_teacher(batch_id, subject_id)
        OR public.has_batch_read_entitlement(batch_id)
    );

DROP POLICY IF EXISTS "cms_batch_subjects_super_admin_manage" ON public.cms_batch_subjects;
CREATE POLICY "cms_batch_subjects_super_admin_manage"
    ON public.cms_batch_subjects FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 5. Student Enrollment Composite Foreign Key & Constraint Reconciliation
-- ------------------------------------------------------------------------------
-- Backfill course_id on student_enrollments from cms_batches if missing
UPDATE public.student_enrollments se
SET course_id = b.course_id
FROM public.cms_batches b
WHERE se.batch_id = b.id
  AND (se.course_id IS NULL OR se.course_id IS DISTINCT FROM b.course_id);

-- Replace single-course uniqueness with cohort batch uniqueness
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_student_course_enrollment' AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments DROP CONSTRAINT uq_student_course_enrollment;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'uq_student_batch_enrollment' AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments ADD CONSTRAINT uq_student_batch_enrollment UNIQUE (student_id, batch_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_student_enrollments_batch_course' AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments 
            ADD CONSTRAINT fk_student_enrollments_batch_course 
            FOREIGN KEY (batch_id, course_id) 
            REFERENCES public.cms_batches(id, course_id) 
            ON DELETE RESTRICT;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. Table Grants
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.cms_course_subjects TO anon, authenticated;
GRANT ALL ON public.cms_course_subjects TO service_role;

GRANT SELECT ON public.cms_batch_subjects TO authenticated;
GRANT ALL ON public.cms_batch_subjects TO service_role;

COMMIT;
