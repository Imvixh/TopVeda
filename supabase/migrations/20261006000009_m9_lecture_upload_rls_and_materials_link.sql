-- ==============================================================================
-- TopVeda Forward Migration: Phase M9 — Lecture & Study Material Upload RLS & Linking
-- File: supabase/migrations/20261006000009_m9_lecture_upload_rls_and_materials_link.sql
-- Architecture: Resolves teacher lecture and companion material upload RLS violations
-- Governs: cms_lectures, cms_study_materials, storage.objects, and is_batch_subject_teacher
-- ==============================================================================

BEGIN;

-- 1. Upgrade is_batch_subject_teacher to include lead_educator_id and cms_batch_subjects
CREATE OR REPLACE FUNCTION public.is_batch_subject_teacher(p_batch_id UUID, p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT (
    -- Batch Lead Educator
    EXISTS (
      SELECT 1 FROM public.cms_batches b
      WHERE b.id = p_batch_id
        AND (b.lead_educator_id = auth.uid() OR b.created_by = auth.uid() OR b.submitted_by = auth.uid())
    )
    OR
    -- Batch Teacher Join Table
    EXISTS (
      SELECT 1 FROM public.cms_batch_teachers bt
      JOIN public.profiles p ON p.id = bt.teacher_id
      WHERE bt.batch_id = p_batch_id
        AND bt.teacher_id = auth.uid()
        AND p.role IN ('TEACHER', 'ADMIN', 'SUPER_ADMIN')
        AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
        AND (
          (p_subject_id IS NOT NULL AND (bt.subject_id = p_subject_id OR bt.subject_id IS NULL))
          OR
          (p_subject_id IS NULL)
        )
    )
    OR
    -- Batch Subject Allocation Table
    EXISTS (
      SELECT 1 FROM public.cms_batch_subjects bs
      JOIN public.profiles p ON p.id = bs.primary_teacher_id
      WHERE bs.batch_id = p_batch_id
        AND bs.primary_teacher_id = auth.uid()
        AND p.role IN ('TEACHER', 'ADMIN', 'SUPER_ADMIN')
        AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
        AND (p_subject_id IS NULL OR bs.subject_id = p_subject_id)
    )
    OR
    -- Super Admin Override
    public.is_super_admin()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_batch_subject_teacher(UUID, UUID) TO authenticated;

-- 2. Upgrade cms_lectures RLS Policies (SELECT, INSERT, UPDATE)
DROP POLICY IF EXISTS "cms_lectures_authenticated_select" ON public.cms_lectures;
CREATE POLICY "cms_lectures_authenticated_select"
    ON public.cms_lectures FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (status = 'PUBLISHED' AND is_curated_preview = TRUE)
        OR (
            status = 'PUBLISHED' 
            AND batch_id IS NOT NULL 
            AND (
                public.has_batch_read_entitlement(batch_id)
                OR EXISTS (
                    SELECT 1 FROM public.cms_batches b
                    WHERE b.id = batch_id
                      AND b.status = 'PUBLISHED'
                      AND b.is_visible = TRUE
                )
            )
        )
        OR (
            batch_id IS NOT NULL 
            AND public.is_batch_subject_teacher(batch_id, subject_id)
        )
        OR created_by = auth.uid()
        OR educator_id = auth.uid()
        OR submitted_by = auth.uid()
    );

DROP POLICY IF EXISTS "cms_lectures_teacher_insert" ON public.cms_lectures;
CREATE POLICY "cms_lectures_teacher_insert"
    ON public.cms_lectures FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_teacher() OR public.is_admin() OR public.is_super_admin())
        AND status IN ('DRAFT', 'PENDING_REVIEW')
        AND (
            created_by = auth.uid()
            OR educator_id = auth.uid()
            OR public.is_super_admin()
        )
        AND (
            batch_id IS NULL
            OR public.is_batch_subject_teacher(batch_id, subject_id)
            OR public.is_super_admin()
        )
    );

DROP POLICY IF EXISTS "cms_lectures_teacher_update" ON public.cms_lectures;
CREATE POLICY "cms_lectures_teacher_update"
    ON public.cms_lectures FOR UPDATE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin() OR public.is_super_admin())
        AND (
            created_by = auth.uid()
            OR educator_id = auth.uid()
            OR submitted_by = auth.uid()
            OR public.is_super_admin()
        )
        AND status IN ('DRAFT', 'PENDING_REVIEW')
    )
    WITH CHECK (
        (public.is_teacher() OR public.is_admin() OR public.is_super_admin())
        AND (
            created_by = auth.uid()
            OR educator_id = auth.uid()
            OR submitted_by = auth.uid()
            OR public.is_super_admin()
        )
        AND status IN ('DRAFT', 'PENDING_REVIEW')
    );

-- 3. Upgrade cms_study_materials RLS Policies (SELECT, INSERT, UPDATE)
DROP POLICY IF EXISTS "cms_study_materials_authenticated_select" ON public.cms_study_materials;
CREATE POLICY "cms_study_materials_authenticated_select"
    ON public.cms_study_materials FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (status = 'PUBLISHED' AND is_curated_preview = TRUE)
        OR (
            status = 'PUBLISHED' 
            AND batch_id IS NOT NULL 
            AND (
                public.has_batch_read_entitlement(batch_id)
                OR EXISTS (
                    SELECT 1 FROM public.cms_batches b
                    WHERE b.id = batch_id
                      AND b.status = 'PUBLISHED'
                      AND b.is_visible = TRUE
                )
            )
        )
        OR (
            batch_id IS NOT NULL 
            AND public.is_batch_subject_teacher(batch_id, subject_id)
        )
        OR created_by = auth.uid()
        OR submitted_by = auth.uid()
    );

DROP POLICY IF EXISTS "cms_study_materials_teacher_insert" ON public.cms_study_materials;
CREATE POLICY "cms_study_materials_teacher_insert"
    ON public.cms_study_materials FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_teacher() OR public.is_admin() OR public.is_super_admin())
        AND status IN ('DRAFT', 'PENDING_REVIEW')
        AND (
            created_by = auth.uid()
            OR public.is_super_admin()
        )
        AND (
            batch_id IS NULL
            OR public.is_batch_subject_teacher(batch_id, subject_id)
            OR public.is_super_admin()
        )
    );

DROP POLICY IF EXISTS "cms_study_materials_teacher_update" ON public.cms_study_materials;
CREATE POLICY "cms_study_materials_teacher_update"
    ON public.cms_study_materials FOR UPDATE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin() OR public.is_super_admin())
        AND (
            created_by = auth.uid()
            OR submitted_by = auth.uid()
            OR public.is_super_admin()
        )
        AND status IN ('DRAFT', 'PENDING_REVIEW')
    )
    WITH CHECK (
        (public.is_teacher() OR public.is_admin() OR public.is_super_admin())
        AND (
            created_by = auth.uid()
            OR submitted_by = auth.uid()
            OR public.is_super_admin()
        )
        AND status IN ('DRAFT', 'PENDING_REVIEW')
    );

-- 4. Upgrade Storage Objects Policies for study-materials bucket
DROP POLICY IF EXISTS "study_materials_authenticated_insert" ON storage.objects;
CREATE POLICY "study_materials_authenticated_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR public.is_teacher()
            OR public.is_admin()
        )
    );

DROP POLICY IF EXISTS "study_materials_authenticated_update" ON storage.objects;
CREATE POLICY "study_materials_authenticated_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR public.is_teacher()
            OR public.is_admin()
        )
    )
    WITH CHECK (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR public.is_teacher()
            OR public.is_admin()
        )
    );

COMMIT;
