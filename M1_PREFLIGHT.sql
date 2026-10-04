-- ==============================================================================
-- TopVeda Milestone M1: Read-Only Preflight Verification Script
-- File: M1_PREFLIGHT.sql
-- Status: Strictly Read-Only Inspection Queries (No Mutations)
-- Purpose: Inspect live database state before applying M1 reconciliation migration
-- ==============================================================================

-- 1. Verify Table Existence and Essential Columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'cms_batch_teachers',
    'student_enrollments',
    'cms_lectures',
    'cms_study_materials',
    'cms_live_classes',
    'student_tests',
    'student_test_versions'
  )
  AND column_name IN (
    'role', 'status', 'valid_until', 'subject_id', 'batch_id',
    'is_curated_preview', 'lecture_id', 'live_status', 'is_live'
  )
ORDER BY table_name, column_name;

-- 2. Inspect Exact Constraints and Indexes on cms_batch_teachers
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'cms_batch_teachers';

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'cms_batch_teachers';

-- 3. Check for Duplicate Teacher Allocations Before Index Migration
SELECT batch_id, teacher_id, COALESCE(subject_id::text, 'GLOBAL_LEAD') AS subject_scope, COUNT(*)
FROM public.cms_batch_teachers
GROUP BY batch_id, teacher_id, COALESCE(subject_id::text, 'GLOBAL_LEAD')
HAVING COUNT(*) > 1;

-- 4. Inspect Foreign Key Definitions & Actions (Check for Redundant FKs)
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('cms_batch_teachers', 'student_enrollments')
ORDER BY tc.table_name, kcu.column_name;

-- 5. Inspect Existing RLS Policies Across Critical Tables
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'cms_batch_teachers',
    'cms_lectures',
    'cms_study_materials',
    'cms_live_classes',
    'student_tests'
  )
ORDER BY tablename, policyname;

-- 6. Inspect Existing Triggers on public.profiles and CMS Tables
SELECT event_object_table AS table_name, trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('profiles', 'cms_lectures', 'cms_study_materials', 'cms_live_classes')
ORDER BY event_object_table, trigger_name;

-- 7. Inspect Storage Buckets & Existing Storage Policies
SELECT id, name, public
FROM storage.buckets
WHERE id IN ('study-materials', 'test-attachments', 'lecture-thumbnails');

SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 8. Inspect Security Definer Functions & Public Grants
SELECT p.proname, p.prosecdef, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_super_admin', 'is_admin', 'is_student',
    'is_batch_teacher', 'is_batch_subject_teacher',
    'is_actively_enrolled_in_batch', 'has_batch_read_entitlement',
    'can_student_access_content',
    'record_live_attendance_heartbeat',
    'finalize_live_class_attendance'
  );

-- 9. Verify Account Role Distribution
SELECT role, COALESCE(status, 'NULL') AS status, COUNT(*)
FROM public.profiles
GROUP BY role, COALESCE(status, 'NULL');
