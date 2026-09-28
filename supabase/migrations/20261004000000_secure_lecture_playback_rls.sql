-- ==============================================================================
-- TopVeda Migration: Database-Centric Recorded Lecture Authorization & RLS Hardening
-- Migration Version: 20261004000000
-- Purpose: Ensure only genuine enrolled students, direct entitlement holders,
--          free-preview content, or admins can SELECT published lecture records.
-- ==============================================================================

-- 1. Drop permissive published lecture policy
DROP POLICY IF EXISTS "public_read_published_lectures" ON public.cms_lectures;

-- 2. Create authoritative database-centric lecture read policy
CREATE POLICY "authorized_read_published_lectures" ON public.cms_lectures
    FOR SELECT
    USING (
        -- Super Admins and Admins / Educators always have access for CMS management & review
        public.is_admin_or_super_admin()
        OR
        (
            status = 'PUBLISHED'
            AND is_visible = TRUE
            AND (starts_at IS NULL OR starts_at <= pg_catalog.now())
            AND (ends_at IS NULL OR ends_at >= pg_catalog.now())
            AND (
                -- Free content / Free preview available to all
                is_free_preview = TRUE
                OR access_tier = 'FREE'
                -- OR student is actively enrolled in the batch or course
                OR (
                    auth.uid() IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.student_enrollments e
                        WHERE e.student_id = auth.uid()
                          AND e.status = 'ACTIVE'
                          AND (
                              (cms_lectures.batch_id IS NOT NULL AND e.batch_id = cms_lectures.batch_id)
                              OR (cms_lectures.course_id IS NOT NULL AND e.course_id = cms_lectures.course_id)
                          )
                    )
                )
                -- OR student has an active direct commercial entitlement
                OR (
                    auth.uid() IS NOT NULL
                    AND EXISTS (
                        SELECT 1 FROM public.student_content_entitlements ce
                        WHERE ce.student_id = auth.uid()
                          AND ce.status = 'ACTIVE'
                          AND (ce.expires_at IS NULL OR ce.expires_at >= pg_catalog.now())
                          AND (ce.content_id = cms_lectures.id OR ce.content_type = 'ALL_ACCESS')
                    )
                )
            )
        )
    );
