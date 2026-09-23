-- ==============================================================================
-- TopVeda Phase 5E + 5F: Student Study Materials & Boards Discovery
-- Architecture Version: 5.2 (Enrolled-Only Material Security & Board Discovery)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extend cms_study_materials with Direct batch_id Association
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_study_materials 
    ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cms_study_materials_batch 
    ON public.cms_study_materials (batch_id);

CREATE INDEX IF NOT EXISTS idx_cms_study_materials_enrolled_access 
    ON public.cms_study_materials (batch_id, course_id, status, is_visible);

-- ------------------------------------------------------------------------------
-- 2. Hardened RLS Policy for cms_study_materials (Enrolled-Only Student Access)
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_study_materials ENABLE ROW LEVEL SECURITY;

-- Drop legacy broad read policy if present
DROP POLICY IF EXISTS "public_read_published_study_materials" ON public.cms_study_materials;
DROP POLICY IF EXISTS "students_read_enrolled_study_materials" ON public.cms_study_materials;

-- New strict policy: Students can only SELECT materials for batches in which they are actively enrolled
CREATE POLICY "students_read_enrolled_study_materials"
    ON public.cms_study_materials
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin_or_super_admin() OR
        (
            status = 'PUBLISHED' AND
            is_visible = TRUE AND
            (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
            (ends_at IS NULL OR ends_at >= pg_catalog.now()) AND
            cms_study_materials.batch_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.student_enrollments se
                WHERE se.student_id = auth.uid()
                  AND se.status = 'ACTIVE'
                  AND se.batch_id = cms_study_materials.batch_id
            )
        )
    );

-- Preserve Super Admin & Admin CRUD Policies
DROP POLICY IF EXISTS "super_admin_manage_study_materials" ON public.cms_study_materials;
CREATE POLICY "super_admin_manage_study_materials"
    ON public.cms_study_materials
    FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 3. Seed Published Initial Demo Study Materials (Class 10 CBSE & BSEB Batches)
-- ------------------------------------------------------------------------------

DO $$
DECLARE
    v_crs_math10_id UUID := '40000000-0000-0000-0000-000000000001'::uuid;
    v_crs_sci10_id  UUID := '40000000-0000-0000-0000-000000000002'::uuid;

    v_batch_cbse10_id UUID := '50000000-0000-0000-0000-000000000001'::uuid;
    v_batch_bseb10_id UUID := '50000000-0000-0000-0000-000000000006'::uuid;

    v_ch1_id UUID := '60000000-0000-0000-0000-000000000001'::uuid; -- Real Numbers & Trig
    v_ch2_id UUID := '60000000-0000-0000-0000-000000000002'::uuid; -- Chemical Reactions

    -- Dedicated Deterministic Study Material UUIDs (Unique c1000000 Series)
    v_mat1_id UUID := 'c1000000-0000-0000-0000-000000000001'::uuid;
    v_mat2_id UUID := 'c1000000-0000-0000-0000-000000000002'::uuid;
    v_mat3_id UUID := 'c1000000-0000-0000-0000-000000000003'::uuid;
    v_mat4_id UUID := 'c1000000-0000-0000-0000-000000000004'::uuid;
    v_mat5_id UUID := 'c1000000-0000-0000-0000-000000000005'::uuid;
    v_mat6_id UUID := 'c1000000-0000-0000-0000-000000000006'::uuid;
BEGIN

    -- Material 1: Trigonometry Formula Cheat Sheet (CBSE Batch)
    INSERT INTO public.cms_study_materials (
        id, batch_id, course_id, chapter_id, title, material_type, file_url, file_size_bytes, page_count, download_count, display_order, is_visible, access_tier, status
    ) VALUES (
        v_mat1_id,
        v_batch_cbse10_id,
        v_crs_math10_id,
        v_ch1_id,
        'Class 10 Trigonometry Formula Cheat Sheet & Identities',
        'formula_sheet',
        '/assets/docs/Trigonometry_Formula_Sheet_Class10.pdf',
        2450000,
        6,
        1420,
        1,
        TRUE,
        'FREE',
        'PUBLISHED'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        batch_id = EXCLUDED.batch_id,
        material_type = EXCLUDED.material_type,
        page_count = EXCLUDED.page_count,
        file_size_bytes = EXCLUDED.file_size_bytes,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- Material 2: Chemical Reactions Handwritten Quick Revision Notes (CBSE Batch)
    INSERT INTO public.cms_study_materials (
        id, batch_id, course_id, chapter_id, title, material_type, file_url, file_size_bytes, page_count, download_count, display_order, is_visible, access_tier, status
    ) VALUES (
        v_mat2_id,
        v_batch_cbse10_id,
        v_crs_sci10_id,
        v_ch2_id,
        'Chemical Reactions & Equations — Handwritten Revision Notes',
        'notes',
        '/assets/docs/Chemical_Reactions_Revision_Notes.pdf',
        3800000,
        10,
        980,
        2,
        TRUE,
        'FREE',
        'PUBLISHED'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        batch_id = EXCLUDED.batch_id,
        material_type = EXCLUDED.material_type,
        page_count = EXCLUDED.page_count,
        file_size_bytes = EXCLUDED.file_size_bytes,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- Material 3: CBSE Class 10 Mathematics 2025 Board Solved PYQ Paper (CBSE Batch)
    INSERT INTO public.cms_study_materials (
        id, batch_id, course_id, chapter_id, title, material_type, file_url, file_size_bytes, page_count, download_count, display_order, is_visible, access_tier, status
    ) VALUES (
        v_mat3_id,
        v_batch_cbse10_id,
        v_crs_math10_id,
        v_ch1_id,
        'CBSE Class 10 Mathematics 5-Year Solved Board PYQs',
        'pyq_paper',
        '/assets/docs/CBSE_Class10_Math_Solved_PYQ.pdf',
        5200000,
        18,
        2150,
        3,
        TRUE,
        'FREE',
        'PUBLISHED'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        batch_id = EXCLUDED.batch_id,
        material_type = EXCLUDED.material_type,
        page_count = EXCLUDED.page_count,
        file_size_bytes = EXCLUDED.file_size_bytes,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- Material 4: Real Numbers & Polynomials Practice Drill Worksheet (CBSE Batch)
    INSERT INTO public.cms_study_materials (
        id, batch_id, course_id, chapter_id, title, material_type, file_url, file_size_bytes, page_count, download_count, display_order, is_visible, access_tier, status
    ) VALUES (
        v_mat4_id,
        v_batch_cbse10_id,
        v_crs_math10_id,
        v_ch1_id,
        'Real Numbers & Polynomials — High-Yield Practice Worksheet',
        'ncert_solution',
        '/assets/docs/Real_Numbers_Practice_Worksheet.pdf',
        1850000,
        8,
        830,
        4,
        TRUE,
        'FREE',
        'PUBLISHED'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        batch_id = EXCLUDED.batch_id,
        material_type = EXCLUDED.material_type,
        page_count = EXCLUDED.page_count,
        file_size_bytes = EXCLUDED.file_size_bytes,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- Material 5: Bihar Board (BSEB) Class 10 Science Model Paper & Solutions (BSEB Batch)
    INSERT INTO public.cms_study_materials (
        id, batch_id, course_id, chapter_id, title, material_type, file_url, file_size_bytes, page_count, download_count, display_order, is_visible, access_tier, status
    ) VALUES (
        v_mat5_id,
        v_batch_bseb10_id,
        v_crs_sci10_id,
        v_ch2_id,
        'BSEB Class 10 Science Official Model Paper with Full Solutions',
        'pyq_paper',
        '/assets/docs/BSEB_Class10_Science_Model_Paper.pdf',
        4600000,
        14,
        1670,
        1,
        TRUE,
        'FREE',
        'PUBLISHED'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        batch_id = EXCLUDED.batch_id,
        material_type = EXCLUDED.material_type,
        page_count = EXCLUDED.page_count,
        file_size_bytes = EXCLUDED.file_size_bytes,
        is_visible = EXCLUDED.is_visible,
        status = EXCLUDED.status;

    -- Material 6: BSEB Class 10 Chemistry Formulas & Equation Balancing Guide (BSEB Batch)
    INSERT INTO public.cms_study_materials (
        id, batch_id, course_id, chapter_id, title, material_type, file_url, file_size_bytes, page_count, download_count, display_order, is_visible, access_tier, status
    ) VALUES (
        v_mat6_id,
        v_batch_bseb10_id,
        v_crs_sci10_id,
        v_ch2_id,
        'BSEB Class 10 Chemistry All Reaction Formulas & Balancing Guide',
        'formula_sheet',
        '/assets/docs/BSEB_Class10_Chemistry_Formulas.pdf',
        2100000,
        7,
        1120,
        2,
        TRUE,
        'FREE',
        'PUBLISHED'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        batch_id = EXCLUDED.batch_id,
        material_type = EXCLUDED.material_type,
        page_count = EXCLUDED.page_count,
        file_size_bytes = EXCLUDED.file_size_bytes,
        is_visible = EXCLUDED.is_visible,
END $$;

-- ------------------------------------------------------------------------------
-- 4. Idempotent Backfill: Bind Existing Unlinked Enrollments to Course Batches
-- ------------------------------------------------------------------------------

UPDATE public.student_enrollments se
SET batch_id = b.id
FROM public.cms_batches b
WHERE se.batch_id IS NULL
  AND b.course_id = se.course_id
  AND b.status = 'PUBLISHED'
  AND b.is_visible = TRUE
  AND b.id = (
      SELECT b2.id FROM public.cms_batches b2
      WHERE b2.course_id = se.course_id
        AND b2.status = 'PUBLISHED'
        AND b2.is_visible = TRUE
      ORDER BY b2.display_order ASC, b2.created_at ASC
      LIMIT 1
  );
