-- ==============================================================================
-- TopVeda Phase 5E: Idempotent Backfill for Existing Student Enrollments
-- Binds unlinked (batch_id IS NULL) active enrollments to the primary batch of their course
-- ==============================================================================

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
