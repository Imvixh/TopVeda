-- ==============================================================================
-- TopVeda Milestone M1: Read-Only Preflight Verification
-- File: M1_PREFLIGHT.sql
-- PostgreSQL / Supabase compatible
--
-- SAFETY:
--   * Read-only inspection only.
--   * No DDL, DML, GRANT, REVOKE, or schema changes.
--   * Missing optional objects/columns are reported instead of causing the
--     later inspection sections to fail.
--
-- Review the result sets and notices before applying any migration.
-- ==============================================================================

-- 1. Table and column inventory (includes required columns used below).
WITH expected(table_name, column_name, purpose) AS (
    VALUES
      ('profiles', 'id', 'profile primary key'),
      ('profiles', 'role', 'role authorization'),
      ('profiles', 'status', 'account status; optional only if legacy schema'),
      ('cms_batch_teachers', 'batch_id', 'teacher assignment scope'),
      ('cms_batch_teachers', 'teacher_id', 'teacher assignment identity'),
      ('cms_batch_teachers', 'subject_id', 'optional subject scope'),
      ('student_enrollments', 'student_id', 'student identity'),
      ('student_enrollments', 'batch_id', 'enrollment batch'),
      ('student_enrollments', 'status', 'enrollment lifecycle'),
      ('student_enrollments', 'valid_until', 'optional enrollment expiry'),
      ('cms_lectures', 'status', 'content publication status'),
      ('cms_lectures', 'is_curated_preview', 'curated preview flag'),
      ('cms_study_materials', 'status', 'content publication status'),
      ('cms_study_materials', 'is_curated_preview', 'curated preview flag'),
      ('cms_live_classes', 'status', 'live class/content status'),
      ('cms_live_classes', 'live_status', 'operational live state if present'),
      ('cms_live_classes', 'is_live', 'legacy live flag if present'),
      ('student_tests', 'status', 'test publication status'),
      ('student_test_versions', 'status', 'test version status')
)
SELECT e.table_name,
       e.column_name,
       e.purpose,
       c.data_type,
       c.is_nullable,
       CASE WHEN c.column_name IS NULL THEN 'MISSING' ELSE 'PRESENT' END AS result
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = e.column_name
ORDER BY e.table_name, e.column_name;

-- 2. Constraints and indexes on teacher assignments.
SELECT tc.constraint_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.constraint_schema = 'public'
  AND tc.table_name = 'cms_batch_teachers'
ORDER BY tc.constraint_type, tc.constraint_name;

SELECT indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'cms_batch_teachers'
ORDER BY indexname;

-- 3. Duplicate teacher allocations.
-- This section checks all required columns first and will not fail merely
-- because a legacy table is missing one of them.
DO $preflight$
DECLARE
    missing_columns text[];
    duplicate_count bigint;
BEGIN
    SELECT array_agg(required.column_name ORDER BY required.column_name)
      INTO missing_columns
    FROM (VALUES ('batch_id'), ('teacher_id'), ('subject_id')) AS required(column_name)
    WHERE NOT EXISTS (
        SELECT 1
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = 'cms_batch_teachers'
          AND c.column_name = required.column_name
    );

    IF missing_columns IS NOT NULL THEN
        RAISE NOTICE
          'SKIPPED duplicate-allocation inspection: public.cms_batch_teachers is missing column(s): %',
          array_to_string(missing_columns, ', ');
    ELSE
        EXECUTE $sql$
          SELECT count(*)
          FROM (
            SELECT batch_id, teacher_id, subject_id
            FROM public.cms_batch_teachers
            GROUP BY batch_id, teacher_id, subject_id
            HAVING count(*) > 1
          ) duplicates
        $sql$ INTO duplicate_count;

        RAISE NOTICE 'Duplicate teacher allocation groups found: %', duplicate_count;
        IF duplicate_count > 0 THEN
            RAISE NOTICE 'Run the duplicate detail query in section 3A to inspect affected rows.';
        END IF;
    END IF;
END
$preflight$;

-- Duplicate row details are emitted as a notice by this guarded query.
DO $duplicate_details$
DECLARE
    v_details text;
BEGIN
    IF (
        SELECT count(*) = 3
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'cms_batch_teachers'
          AND column_name IN ('batch_id', 'teacher_id', 'subject_id')
    ) THEN
        EXECUTE $sql$
          SELECT string_agg(
            format('batch=%s teacher=%s subject=%s count=%s',
                   batch_id, teacher_id, COALESCE(subject_id::text, 'GLOBAL_LEAD'), allocation_count),
            E'\\n'
          )
          FROM (
            SELECT batch_id, teacher_id, subject_id, count(*) AS allocation_count
            FROM public.cms_batch_teachers
            GROUP BY batch_id, teacher_id, subject_id
            HAVING count(*) > 1
            ORDER BY count(*) DESC
          ) d
        $sql$ INTO v_details;
        RAISE NOTICE 'Duplicate allocation details:%', COALESCE(E'\\n' || v_details, ' none');
    END IF;
END
$duplicate_details$;

-- 4. Foreign-key definitions and actions.
-- Join all catalog objects by schema as well as constraint name.
SELECT
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_catalog = tc.constraint_catalog
 AND kcu.constraint_schema = tc.constraint_schema
 AND kcu.constraint_name = tc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_catalog = tc.constraint_catalog
 AND ccu.constraint_schema = tc.constraint_schema
 AND ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_catalog = tc.constraint_catalog
 AND rc.constraint_schema = tc.constraint_schema
 AND rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('cms_batch_teachers', 'student_enrollments')
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 5. Existing RLS policies on critical public tables.
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'cms_batch_teachers', 'cms_lectures',
    'cms_study_materials', 'cms_live_classes', 'student_tests'
  )
ORDER BY tablename, policyname;

-- 6. Triggers on profiles and CMS content tables, scoped by relation.
SELECT
    n.nspname AS table_schema,
    c.relname AS table_name,
    t.tgname AS trigger_name,
    pg_catalog.pg_get_triggerdef(t.oid, true) AS trigger_definition,
    t.tgenabled AS enabled_state,
    p.proname AS trigger_function
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND n.nspname = 'public'
  AND c.relname IN (
    'profiles', 'cms_lectures', 'cms_study_materials', 'cms_live_classes'
  )
ORDER BY c.relname, t.tgname;

-- 7. Storage bucket inventory and storage.objects policies.
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('study-materials', 'test-attachments', 'lecture-thumbnails')
ORDER BY id;

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 8. Security-definer function definitions, signatures, search_path and grants.
-- Effective privilege checks are shown for the standard Supabase roles.
WITH target_functions AS (
    SELECT p.oid,
           n.nspname,
           p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
           p.prosecdef,
           p.proconfig,
           p.proowner,
           p.proacl
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'try_cast_uuid',
        'is_super_admin', 'is_admin', 'is_student',
        'is_batch_teacher', 'is_batch_subject_teacher',
        'is_actively_enrolled_in_batch', 'has_batch_read_entitlement',
        'can_student_access_content',
        'record_live_attendance_heartbeat',
        'finalize_live_class_attendance'
      )
)
SELECT
    f.proname,
    f.identity_arguments,
    f.prosecdef AS security_definer,
    f.proconfig AS function_settings,
    pg_catalog.pg_get_userbyid(f.proowner) AS owner_name,
    f.proacl AS raw_acl,
    has_function_privilege('anon', f.oid, 'EXECUTE') AS anon_execute,
    has_function_privilege('authenticated', f.oid, 'EXECUTE') AS authenticated_execute,
    has_function_privilege('service_role', f.oid, 'EXECUTE') AS service_role_execute,
    pg_catalog.pg_get_functiondef(f.oid) AS function_definition
FROM target_functions f
ORDER BY f.proname, f.identity_arguments;

-- 8A. Expanded explicit function ACL entries (PUBLIC is grantee OID 0).
SELECT
    p.proname,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS identity_arguments,
    CASE WHEN acl.grantee = 0 THEN 'PUBLIC'
         ELSE pg_catalog.pg_get_userbyid(acl.grantee)
    END AS grantee,
    CASE WHEN acl.grantor = 0 THEN 'PUBLIC'
         ELSE pg_catalog.pg_get_userbyid(acl.grantor)
    END AS grantor,
    acl.privilege_type,
    acl.is_grantable
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
    'is_actively_enrolled_in_batch', 'has_batch_read_entitlement',
    'can_student_access_content',
    'record_live_attendance_heartbeat',
    'finalize_live_class_attendance'
  )
ORDER BY p.proname, identity_arguments, grantee;

-- 9. Profile role/status distribution, safe when optional columns are absent.
DO $profile_distribution$
DECLARE
    has_role boolean;
    has_status boolean;
    v_distribution text;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'role'
    ) INTO has_role;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'status'
    ) INTO has_status;

    IF NOT has_role THEN
        RAISE NOTICE 'SKIPPED profile distribution: public.profiles.role is missing.';
    ELSIF has_status THEN
        EXECUTE $sql$
          SELECT string_agg(
            format('role=%s status=%s count=%s', role::text,
                   COALESCE(status::text, 'NULL'), account_count),
            E'\\\\n'
          )
          FROM (
            SELECT role, status, count(*) AS account_count
            FROM public.profiles
            GROUP BY role, status
            ORDER BY role::text, status::text
          ) d
        $sql$ INTO v_distribution;
        RAISE NOTICE 'Profile role/status distribution:%', COALESCE(E'\\\\n' || v_distribution, ' no rows');
    ELSE
        EXECUTE $sql$
          SELECT string_agg(
            format('role=%s count=%s', role::text, account_count),
            E'\\\\n'
          )
          FROM (
            SELECT role, count(*) AS account_count
            FROM public.profiles
            GROUP BY role
            ORDER BY role::text
          ) d
        $sql$ INTO v_distribution;
        RAISE NOTICE 'profiles.status is absent. Role distribution:%',
          COALESCE(E'\\\\n' || v_distribution, ' no rows');
    END IF;
END
$profile_distribution$;
