-- ==============================================================================
-- TopVeda Forward Migration: Phase M8 — Batch Teacher Access & Subject Visibility
-- File: supabase/migrations/20261006000008_m8_batch_teacher_access_and_subject_visibility.sql
-- Governs: Assigned teacher batch discovery, public subject visibility for batches,
-- and automated board_label backfill.
-- ==============================================================================

BEGIN;

-- 1. Ensure cms_batches allows public & student read for upcoming published batches
DROP POLICY IF EXISTS "public_read_published_batches" ON public.cms_batches;
CREATE POLICY "public_read_published_batches" ON public.cms_batches
    FOR SELECT TO anon, authenticated
    USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

-- 2. Allow assigned teachers (via cms_batch_teachers or cms_batch_subjects) to read their batches
DROP POLICY IF EXISTS "admin_read_assigned_batches" ON public.cms_batches;
CREATE POLICY "admin_read_assigned_batches" ON public.cms_batches
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_super_admin() AND (
            lead_educator_id = auth.uid()
            OR submitted_by = auth.uid()
            OR created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.cms_batch_teachers bt
                WHERE bt.batch_id = cms_batches.id AND bt.teacher_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.cms_batch_subjects bs
                WHERE bs.batch_id = cms_batches.id AND bs.primary_teacher_id = auth.uid()
            )
        )
    );

-- 3. Allow public & enrolled students to read subjects of published visible batches
DROP POLICY IF EXISTS "cms_batch_subjects_select_policy" ON public.cms_batch_subjects;
CREATE POLICY "cms_batch_subjects_select_policy"
    ON public.cms_batch_subjects FOR SELECT
    TO anon, authenticated
    USING (
        public.is_super_admin()
        OR public.is_batch_subject_teacher(batch_id, subject_id)
        OR public.has_batch_read_entitlement(batch_id)
        OR EXISTS (
            SELECT 1 FROM public.cms_batches b
            WHERE b.id = cms_batch_subjects.batch_id
              AND b.status = 'PUBLISHED'
              AND b.is_visible = TRUE
        )
    );

-- 4. Allow public & students to read teachers of published visible batches
DROP POLICY IF EXISTS "cms_batch_teachers_select_policy" ON public.cms_batch_teachers;
CREATE POLICY "cms_batch_teachers_select_policy"
    ON public.cms_batch_teachers FOR SELECT
    TO anon, authenticated
    USING (
        public.is_super_admin()
        OR teacher_id = auth.uid()
        OR public.is_batch_subject_teacher(batch_id, subject_id)
        OR EXISTS (
            SELECT 1 FROM public.student_enrollments se
            WHERE se.batch_id = cms_batch_teachers.batch_id
              AND se.student_id = auth.uid()
              AND (
                (se.status::text = 'ACTIVE' AND (se.valid_until IS NULL OR se.valid_until > now()))
                OR se.status::text = 'COMPLETED'
              )
        )
        OR EXISTS (
            SELECT 1 FROM public.cms_batches b
            WHERE b.id = cms_batch_teachers.batch_id
              AND b.status = 'PUBLISHED'
              AND b.is_visible = TRUE
        )
    );

-- 5. Backfill board_label for any batches where board_id doesn't match default 'Class 10 CBSE'
UPDATE public.cms_batches b
SET board_label = CONCAT_WS(' ', cl.name, COALESCE(bo.name, bo.code)),
    updated_at = now()
FROM public.cms_class_levels cl, public.cms_boards bo
WHERE b.class_id = cl.id
  AND b.board_id = bo.id
  AND (b.board_label = 'Class 10 CBSE' AND bo.code != 'CBSE');

-- 6. Backfill lead_educator_id from cms_batch_teachers
UPDATE public.cms_batches b
SET lead_educator_id = bt.teacher_id,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (batch_id) batch_id, teacher_id
  FROM public.cms_batch_teachers
  ORDER BY batch_id, display_order ASC
) bt
WHERE b.id = bt.batch_id
  AND b.lead_educator_id IS NULL;

COMMIT;
