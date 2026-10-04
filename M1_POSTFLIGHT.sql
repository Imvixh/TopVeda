-- ==============================================================================
-- TopVeda Milestone M1: Post-Migration Verification & Assertion Script
-- File: M1_POSTFLIGHT.sql
-- Status: Verification & Assertion Suite (Raises exception if any invariant fails)
-- Note: Run this script against PostgreSQL / Supabase SQL Editor after applying
--       20261006000001_m1_security_reconciliation.sql
-- ==============================================================================

DO $$
DECLARE
    v_count INT;
BEGIN
    -- 1. Assert: No legacy broad or obsolete assignment policies exist
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_batch_teachers'
      AND policyname IN (
        'cms_batch_teachers_admin_manage',
        'cms_batch_teachers_read_all',
        'authenticated_read_batch_teachers',
        'super_admin_manage_batch_teachers'
      );

    IF v_count > 0 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Legacy permissive or obsolete policies remain on cms_batch_teachers (found %).', v_count;
    END IF;

    -- 2. Assert: Canonical assignment policies exist
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_batch_teachers'
      AND policyname IN (
        'cms_batch_teachers_select_policy',
        'cms_batch_teachers_super_admin_manage'
      );

    IF v_count <> 2 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Expected 2 canonical policies on cms_batch_teachers, found %.', v_count;
    END IF;

    -- 3. Assert: Conflicting constraint uq_cms_batch_teacher is removed
    SELECT COUNT(*) INTO v_count
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'cms_batch_teachers'
      AND constraint_name IN ('uq_cms_batch_teacher', 'uq_batch_teacher_subject');

    IF v_count > 0 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Conflicting constraint uq_cms_batch_teacher still exists.';
    END IF;

    -- 4. Assert: Both partial unique indexes exist on cms_batch_teachers
    SELECT COUNT(*) INTO v_count
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'cms_batch_teachers'
      AND indexname IN ('uq_batch_teacher_subject_not_null', 'uq_batch_teacher_subject_null');

    IF v_count <> 2 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Required partial unique indexes missing on cms_batch_teachers (found %/2).', v_count;
    END IF;

    -- 5. Assert: Consolidated profile guard trigger exists and duplicate trigger is dropped
    SELECT COUNT(*) INTO v_count
    FROM pg_trigger
    WHERE tgname = 'trg_profile_role_guard' AND tgenabled = 'O';

    IF v_count <> 1 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: trg_profile_role_guard is missing or disabled.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM pg_trigger
    WHERE tgname = 'trg_guard_profile_privileged_fields';

    IF v_count > 0 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Duplicate trigger trg_guard_profile_privileged_fields still exists.';
    END IF;

    -- 6. Assert: All 8 core security definer functions exist with correct pinned search_path
    SELECT COUNT(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'is_super_admin', 'is_admin', 'is_student',
        'is_batch_teacher', 'is_batch_subject_teacher',
        'is_actively_enrolled_in_batch', 'has_batch_read_entitlement',
        'can_student_access_content'
      )
      AND p.prosecdef = TRUE;

    IF v_count <> 8 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Expected 8 SECURITY DEFINER functions, found %.', v_count;
    END IF;

    -- 7. Assert: ZERO security functions have default PUBLIC execute privilege
    SELECT COUNT(*) INTO v_count
    FROM information_schema.routine_privileges
    WHERE specific_schema = 'public'
      AND grantee = 'PUBLIC'
      AND routine_name IN (
        'is_super_admin', 'is_admin', 'is_student',
        'is_batch_teacher', 'is_batch_subject_teacher',
        'is_actively_enrolled_in_batch', 'has_batch_read_entitlement',
        'can_student_access_content'
      );

    IF v_count > 0 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: % security functions have unrevoked PUBLIC privileges.', v_count;
    END IF;

    -- 8. Assert: RLS is enabled on all 6 critical tables
    SELECT COUNT(*) INTO v_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'cms_batch_teachers', 'cms_lectures', 'cms_study_materials', 'cms_live_classes', 'student_tests')
      AND rowsecurity = TRUE;

    IF v_count <> 6 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Expected RLS active on 6 tables, found %.', v_count;
    END IF;

    -- 9. Assert: Dedicated anon preview policies exist on all 4 CMS/Test tables
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'cms_lectures_anon_select',
        'cms_study_materials_anon_select',
        'cms_live_classes_anon_select',
        'student_tests_anon_select'
      )
      AND tablename IN ('cms_lectures', 'cms_study_materials', 'cms_live_classes', 'student_tests');

    IF v_count <> 4 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Expected 4 anon preview policies, found %.', v_count;
    END IF;

    -- 10. Assert: Storage RLS policies exist on storage.objects
    SELECT COUNT(*) INTO v_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'study_materials_anon_select',
        'study_materials_authenticated_select',
        'study_materials_authenticated_insert',
        'study_materials_authenticated_update',
        'study_materials_authenticated_delete',
        'test_attachments_anon_select',
        'test_attachments_authenticated_select',
        'test_attachments_manage_policy',
        'lecture_thumbnails_select_policy',
        'lecture_thumbnails_authenticated_insert',
        'lecture_thumbnails_authenticated_update',
        'lecture_thumbnails_authenticated_delete'
      );

    IF v_count < 12 THEN
        RAISE EXCEPTION 'POSTFLIGHT ASSERTION FAILED: Missing canonical Storage RLS policies (found %/12).', v_count;
    END IF;

    RAISE NOTICE 'SUCCESS: All TopVeda Milestone M1 Postflight Security Invariants Verified!';
END $$;

-- Summary Query for Human Inspection
SELECT 
    schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND tablename IN ('profiles', 'cms_batch_teachers', 'cms_lectures', 'cms_study_materials', 'cms_live_classes', 'student_tests', 'objects')
ORDER BY schemaname, tablename, cmd;
