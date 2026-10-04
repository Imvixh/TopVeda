-- ==============================================================================
-- TopVeda Milestone M1: Post-Migration Structural Verification
-- File: M1_POSTFLIGHT.sql
--
-- SAFETY:
--   * Verification only. No DDL, DML, GRANT, REVOKE or schema changes.
--   * Raises an exception when a required structural invariant fails.
--
-- IMPORTANT:
--   Passing these catalog assertions does NOT prove runtime authorization.
--   Run the separate M1 authorization test matrix using real STUDENT, ADMIN
--   and SUPER_ADMIN test accounts after this script passes.
-- ==============================================================================

DO $postflight$
DECLARE
    v_count bigint;
    v_oid oid;
    v_missing text;
    v_cmd text;
    v_qual text;
    v_with_check text;
    v_has_authenticated boolean;
    v_expected text[];
    v_actual text;
BEGIN
    -- 0. UUID helper correctness and exception safety.
    IF to_regprocedure('public.try_cast_uuid(text)') IS NULL THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: public.try_cast_uuid(text) does not exist.';
    END IF;

    IF public.try_cast_uuid('123e4567-e89b-12d3-a456-426614174000') IS DISTINCT FROM
       '123e4567-e89b-12d3-a456-426614174000'::uuid THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: try_cast_uuid valid UUID assertion failed.';
    END IF;
    IF public.try_cast_uuid('not-a-uuid') IS NOT NULL THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: try_cast_uuid must return NULL for invalid UUID text.';
    END IF;
    IF public.try_cast_uuid(NULL::text) IS NOT NULL THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: try_cast_uuid must return NULL for NULL input.';
    END IF;
    IF public.try_cast_uuid('malformed/path/with/slashes') IS NOT NULL THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: try_cast_uuid malformed path assertion failed.';
    END IF;

    -- 1. Required assignment policies exist, and known obsolete policies are absent.
    SELECT count(*) INTO v_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_batch_teachers'
      AND policyname IN (
        'cms_batch_teachers_select_policy',
        'cms_batch_teachers_super_admin_manage'
      );
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: expected both canonical cms_batch_teachers policies; found %/2.', v_count;
    END IF;

    SELECT count(*) INTO v_count
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_batch_teachers'
      AND policyname IN (
        'cms_batch_teachers_admin_manage',
        'cms_batch_teachers_read_all',
        'authenticated_read_batch_teachers',
        'super_admin_manage_batch_teachers'
      );
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: obsolete cms_batch_teachers policies remain (%).', v_count;
    END IF;

    -- The canonical management policy must be authenticated-only and use
    -- is_super_admin() in both USING and WITH CHECK.
    SELECT cmd, qual, with_check, ('authenticated' = ANY(roles))
      INTO v_cmd, v_qual, v_with_check, v_has_authenticated
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cms_batch_teachers'
      AND policyname = 'cms_batch_teachers_super_admin_manage';
    IF v_cmd <> 'ALL'
       OR NOT v_has_authenticated
       OR v_qual NOT ILIKE '%is_super_admin%'
       OR v_with_check NOT ILIKE '%is_super_admin%' THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: canonical assignment management policy is not restricted to SUPER_ADMIN in USING and WITH CHECK.';
    END IF;

    -- 2. Legacy unique constraints that conflict with NULL-aware partial indexes
    -- must be absent. Both expected partial indexes must be structurally valid.
    SELECT count(*) INTO v_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'cms_batch_teachers'
      AND constraint_name IN ('uq_cms_batch_teacher', 'uq_batch_teacher_subject');
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: conflicting legacy assignment uniqueness constraint remains (%).', v_count;
    END IF;

    SELECT count(*) INTO v_count
    FROM pg_catalog.pg_index i
    JOIN pg_catalog.pg_class idx ON idx.oid = i.indexrelid
    JOIN pg_catalog.pg_namespace ns ON ns.oid = idx.relnamespace
    JOIN pg_catalog.pg_class tbl ON tbl.oid = i.indrelid
    WHERE ns.nspname = 'public'
      AND tbl.relname = 'cms_batch_teachers'
      AND idx.relname IN (
        'uq_batch_teacher_subject_not_null',
        'uq_batch_teacher_subject_null'
      )
      AND i.indisunique
      AND i.indisvalid
      AND i.indisready
      AND i.indpred IS NOT NULL;
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: both expected valid, ready, unique partial assignment indexes are required; found %/2.', v_count;
    END IF;

    -- Exact key order and predicates.
    SELECT pg_catalog.pg_get_indexdef(idx.oid)
      INTO v_actual
    FROM pg_catalog.pg_class idx
    JOIN pg_catalog.pg_namespace ns ON ns.oid = idx.relnamespace
    WHERE ns.nspname = 'public'
      AND idx.relname = 'uq_batch_teacher_subject_not_null';
    IF v_actual IS NULL
       OR v_actual NOT ILIKE '%(batch_id, teacher_id, subject_id)%'
       OR v_actual NOT ILIKE '%subject_id IS NOT NULL%' THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: uq_batch_teacher_subject_not_null has an unexpected definition: %', v_actual;
    END IF;

    SELECT pg_catalog.pg_get_indexdef(idx.oid)
      INTO v_actual
    FROM pg_catalog.pg_class idx
    JOIN pg_catalog.pg_namespace ns ON ns.oid = idx.relnamespace
    WHERE ns.nspname = 'public'
      AND idx.relname = 'uq_batch_teacher_subject_null';
    IF v_actual IS NULL
       OR v_actual NOT ILIKE '%(batch_id, teacher_id)%'
       OR v_actual NOT ILIKE '%subject_id IS NULL%' THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: uq_batch_teacher_subject_null has an unexpected definition: %', v_actual;
    END IF;

    -- 3. Profile guard trigger exists, is enabled, and is attached to profiles.
    SELECT count(*) INTO v_count
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND t.tgname = 'trg_profile_role_guard'
      AND NOT t.tgisinternal
      AND t.tgenabled <> 'D';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: enabled trg_profile_role_guard on public.profiles is required; found %.', v_count;
    END IF;

    SELECT count(*) INTO v_count
    FROM pg_catalog.pg_trigger t
    JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'profiles'
      AND t.tgname = 'trg_guard_profile_privileged_fields';
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: duplicate profile guard trigger remains on public.profiles.';
    END IF;

    -- 4. Each CMS review guard must be attached to its named table and enabled.
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'cms_lectures'
        AND t.tgname = 'trg_guard_cms_lectures_review'
        AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    ) THEN
      RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: enabled lecture review guard trigger missing.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'cms_study_materials'
        AND t.tgname = 'trg_guard_cms_study_materials_review'
        AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    ) THEN
      RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: enabled study-material review guard trigger missing.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'cms_live_classes'
        AND t.tgname = 'trg_guard_cms_live_classes'
        AND NOT t.tgisinternal AND t.tgenabled <> 'D'
    ) THEN
      RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: enabled live-class guard trigger missing.';
    END IF;

    -- 5. Expected security-definer helpers must exist and have a pinned
    -- search_path. Search path is checked per function, not merely by count.
    v_expected := ARRAY[
      'try_cast_uuid',
      'is_super_admin',
      'is_admin',
      'is_student',
      'is_batch_teacher',
      'is_batch_subject_teacher',
      'is_actively_enrolled_in_batch',
      'has_batch_read_entitlement',
      'can_student_access_content'
    ];

    FOREACH v_actual IN ARRAY v_expected LOOP
      SELECT p.oid INTO v_oid
      FROM pg_catalog.pg_proc p
      JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = v_actual
        AND p.prosecdef;

      IF v_oid IS NULL THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: SECURITY DEFINER function public.% is missing.', v_actual;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_proc p
        WHERE p.oid = v_oid
          AND EXISTS (
            SELECT 1
            FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) setting
            WHERE setting LIKE 'search_path=%'
          )
      ) THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: public.% has no function-level pinned search_path.', v_actual;
      END IF;
      v_oid := NULL;
    END LOOP;

    -- 6. PUBLIC must not have effective EXECUTE on the restricted helpers.
    -- Check effective ACL privilege, including default ACL behavior.
    SELECT count(DISTINCT p.oid) INTO v_count
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(
      COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
    ) acl
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'try_cast_uuid',
        'is_super_admin', 'is_admin', 'is_student',
        'is_batch_teacher', 'is_batch_subject_teacher',
        'is_actively_enrolled_in_batch', 'has_batch_read_entitlement'
      )
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE';
    IF v_count > 0 THEN
      RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: PUBLIC has effective EXECUTE on % restricted security helper function(s).', v_count;
    END IF;

    -- 7. RLS must be enabled on every critical table.
    SELECT count(*) INTO v_count
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname IN (
        'profiles', 'cms_batch_teachers', 'cms_lectures',
        'cms_study_materials', 'cms_live_classes', 'student_tests'
      )
      AND c.relrowsecurity;
    IF v_count <> 6 THEN
      RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: RLS must be enabled on all six critical tables; found %/6.', v_count;
    END IF;

    -- 8. Anonymous preview policies: verify table, SELECT, anon role, and
    -- policy expression. A name-only match is not sufficient.
    v_expected := ARRAY[
      'cms_lectures_anon_select',
      'cms_study_materials_anon_select',
      'cms_live_classes_anon_select',
      'student_tests_anon_select'
    ];

    FOREACH v_actual IN ARRAY v_expected LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies p
        WHERE p.schemaname = 'public'
          AND p.policyname = v_actual
          AND p.cmd = 'SELECT'
          AND 'anon' = ANY(p.roles)
          AND p.qual IS NOT NULL
          AND p.qual ILIKE '%is_curated_preview%'
          AND p.qual ILIKE '%PUBLISHED%'
      ) THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: anon preview policy % is missing or does not visibly enforce curated + PUBLISHED content.', v_actual;
      END IF;
    END LOOP;

    -- 9. Storage policies: require all expected named policies and verify that
    -- each is on storage.objects with a bucket-aware predicate.
    v_expected := ARRAY[
      'study_materials_anon_select',
      'study_materials_authenticated_select',
      'study_materials_authenticated_insert',
      'study_materials_authenticated_update',
      'study_materials_authenticated_delete',
      'test_attachments_anon_select',
      'test_attachments_authenticated_select',
      'test_attachments_manage_policy',
      'lecture_thumbnails_anon_select',
      'lecture_thumbnails_authenticated_select',
      'lecture_thumbnails_authenticated_insert',
      'lecture_thumbnails_authenticated_update',
      'lecture_thumbnails_authenticated_delete'
    ];

    FOREACH v_actual IN ARRAY v_expected LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policies p
        WHERE p.schemaname = 'storage'
          AND p.tablename = 'objects'
          AND p.policyname = v_actual
          AND (
            COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')
          ) ILIKE '%bucket_id%'
      ) THEN
        RAISE EXCEPTION 'M1 POSTFLIGHT FAILED: storage.objects policy % is missing or lacks a bucket_id condition.', v_actual;
      END IF;
    END LOOP;

    RAISE NOTICE 'SUCCESS: M1 structural postflight assertions passed. Runtime authorization tests are still required.';
END
$postflight$;

-- Human-readable policy inventory for review.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname IN ('public', 'storage')
  AND tablename IN (
    'profiles', 'cms_batch_teachers', 'cms_lectures',
    'cms_study_materials', 'cms_live_classes', 'student_tests', 'objects'
  )
ORDER BY schemaname, tablename, policyname;
