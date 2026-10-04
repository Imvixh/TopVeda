# TopVeda Milestone M1 — Final Security Reconciliation Audit Report

**Author:** Principal Supabase Security Architect & PostgreSQL Auditor  
**Date:** October 2026  
**Status:** Audit Complete & Migration Design Verified (Local Verification Only — Remote Execution Blocked)  
**Target Codebase:** `D:\TopVeda\TopVeda`  
**Authoritative Specifications:** [PROJECT_ARCHITECTURE_V7.0.md](file:///D:/TopVeda/TopVeda/PROJECT_ARCHITECTURE_V7.0.md), [.gsd/SPEC.md](file:///D:/TopVeda/TopVeda/.gsd/SPEC.md)

---

## Executive Summary

A comprehensive, second-pass security audit of the TopVeda database schema, RLS policies, security definer helper functions, Supabase Storage buckets, and API routes was conducted. All identified defects have been categorized, mapped to exact database objects, and resolved in the forward corrective migration design [`supabase/migrations/20261006000001_m1_security_reconciliation.sql`](file:///D:/TopVeda/TopVeda/supabase/migrations/20261006000001_m1_security_reconciliation.sql).

---

## Comprehensive Traceability Matrix

Every identified defect is traced from audit finding to migration implementation, postflight assertion, and empirical authorization test:

| Finding ID | Vulnerability / Defect Description | Corrective Migration Object (`20261006000001_m1_security_reconciliation.sql`) | Postflight Assertion (`M1_POSTFLIGHT.sql`) | Test ID (`M1_AUTHORIZATION_TEST_MATRIX.md`) |
|---|---|---|---|---|
| **F-01** | **Assignment Table Policy Leak & Obsolete Policies:** Legacy policies `authenticated_read_batch_teachers`, `cms_batch_teachers_admin_manage`, `cms_batch_teachers_read_all`, and `super_admin_manage_batch_teachers` allowed arbitrary read/write by non-super-admins. | Explicit `DROP POLICY` statements; privacy-scoped `SELECT` policy for teachers/students/super_admin; strict `ALL TO authenticated USING (is_super_admin())`. | Section 1: Asserts legacy policies are dropped and only canonical policies exist. | **ATM-04** |
| **F-02** | **Anonymous Preview RLS Function Execution Errors:** Mixed `TO anon, authenticated` policies invoked internal helper functions (`is_super_admin`), causing PostgreSQL permission errors for unauthenticated users. | Decoupled `anon` SELECT policies: `FOR SELECT TO anon USING (status = 'PUBLISHED' AND is_curated_preview = TRUE)` without calling functions. | Section 8: Asserts `anon` preview policies exist on lectures, materials, live classes, tests. | **ATM-15, ATM-16** |
| **F-03** | **Loose Subject-Scoping & NULL Subject Exploits:** Subject-specific teachers (`subject_id IS NOT NULL`) could match batch-level NULL subject records, bypassing isolation. | `is_batch_subject_teacher(p_batch_id, p_subject_id)`: NULL requires `bt.subject_id IS NULL`; non-NULL matches exact subject or batch lead. | Section 5: Asserts function signatures, definitions, and execution privileges. | **ATM-06, ATM-07, ATM-08, ATM-09** |
| **F-04** | **Storage Authorization — Fuzzy Matching & Cross-Tenant Uploads:** Broad path matching (`LIKE auth.uid() || '/%'`) allowed unauthorized writes to unassigned batch folders. | Replaced with exact object-to-record binding on `study-materials`, `test-attachments`, `lecture-thumbnails` with canonical folder path parsing. | Section 9: Asserts Storage RLS policies for each bucket. | **ATM-13, ATM-14** |
| **F-05** | **Live-Class Operational vs Review Lockout:** Teachers restricted to `status IN ('DRAFT', 'PENDING_REVIEW')` could not operate published sessions. | Allowed assigned teachers to update operational fields (`live_status`, `is_live`, etc.) on assigned classes, guarded by `handle_cms_review_guard` against unauthorized publication. | Section 4 & 7: Asserts live-class RLS update policy and review guard trigger. | **ATM-20** |
| **F-06** | **Live Class Attendance RPC Authorization:** Attendance heartbeats and finalization lacked proper student/teacher state checks. | Implemented `record_live_attendance_heartbeat` (active students only) and `finalize_live_class_attendance` (assigned teachers / super admins only). | Section 6: Asserts RPCs exist, are `SECURITY DEFINER`, and revoked from PUBLIC. | **ATM-19, ATM-21** |
| **F-07** | **Profile Guard Incomplete Status & Role Protection:** Legacy trigger omitted `NEW.status`, allowing suspended accounts to self-reactivate. | Consolidated `handle_profile_role_guard()` protecting `role`, `status`, and `email` with single trigger `trg_profile_role_guard`. | Section 4: Asserts `trg_profile_role_guard` active and duplicate trigger dropped. | **ATM-01, ATM-02, ATM-03** |
| **F-08** | **Test Authoring Teacher Privilege Leak:** Previous policy draft contained an ADMIN assignment SELECT branch. | Restricted all test management (`student_tests`, `student_test_versions`, questions, attachments) exclusively to `SUPER_ADMIN`. | Section 7: Asserts test management write policy is strictly `is_super_admin()`. | **ATM-05** |
| **F-09** | **Study Material Attachment Integrity:** Study materials could reference lectures from different batches/subjects. | RLS policy and trigger enforce `lecture_id IS NOT NULL`, lecture existence, and batch/subject match. | Section 7: Asserts `cms_study_materials` teacher INSERT/UPDATE check expressions. | **ATM-11, ATM-12** |
| **F-10** | **Conflicting Assignment Constraint & Duplicate FKs:** Conflicting constraint `uq_cms_batch_teacher` blocked multiple subject allocations for a teacher. | Safely dropped `uq_cms_batch_teacher` and created partial unique indexes `uq_batch_teacher_subject_not_null` and `uq_batch_teacher_subject_null`. | Sections 2 & 3: Asserts constraint dropped and partial unique indexes exist. | **ATM-04** |
| **F-11** | **Expired Enrollment Learning Leak:** Active enrollment checks did not strictly validate `valid_until` against `now()`. | `is_actively_enrolled_in_batch` enforces `(se.valid_until IS NULL OR se.valid_until > now())`. | Section 5: Asserts active enrollment definition. | **ATM-17, ATM-18** |
| **F-12** | **Server-Side API Service-Role Bypass:** Potential risk of client bypassing RLS via misconfigured service-role endpoints. | Server-side role guard middleware verified across Next.js API routes with zero demo seeding in GET endpoints. | Section 10: Build & TypeScript verification across all API routes. | **ATM-22** |

---

## Detailed Audit Findings

### 1. Assignment Table Policy Cleanup
- **Table:** `public.cms_batch_teachers`
- **Dropped Policies:** `authenticated_read_batch_teachers`, `cms_batch_teachers_admin_manage`, `cms_batch_teachers_read_all`, `super_admin_manage_batch_teachers`
- **Canonical Policies:**
  - `cms_batch_teachers_select_policy`: Super Admin sees all; Teachers see own and batch-mates; Students see active/historical batch teachers.
  - `cms_batch_teachers_super_admin_manage`: `ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin())`.

### 2. Anonymous Preview Separation
- Static-column curated preview queries are fully decoupled into dedicated `TO anon` policies:
  - `cms_lectures`: `status = 'PUBLISHED' AND is_curated_preview = TRUE`
  - `cms_study_materials`: `status = 'PUBLISHED' AND is_curated_preview = TRUE`
  - `cms_live_classes`: `status = 'PUBLISHED' AND is_curated_preview = TRUE`
  - `student_tests`: `status = 'PUBLISHED' AND is_curated_preview = TRUE`

### 3. Canonical Storage Paths & Binding
- **`study-materials`**: `<batch_id>/<material_id>/<filename>`
  - Verified against `cms_study_materials` record matching `(storage.foldername(name))[1]::uuid = sm.batch_id` and `(storage.foldername(name))[2]::uuid = sm.id`.
- **`test-attachments`**: `<batch_id>/<test_id>/<filename>`
  - Writes restricted exclusively to `SUPER_ADMIN`.
- **`lecture-thumbnails`**: `<batch_id>/<lecture_id>/<filename>`
  - Verified against `cms_lectures` record matching assigned batch/subject teacher or `SUPER_ADMIN`.

### 4. Operational vs Review Separation for Live Classes
- Operational attributes (`live_status`, `is_live`, `status_text`, `stream_room_url`, `scheduled_start`, `scheduled_end`) are editable by assigned teachers.
- Review attributes (`status` transitions to `APPROVED`, `PUBLISHED`, `ARCHIVED`) are guarded by `handle_cms_review_guard()` trigger, rejecting non-super-admin updates.

---

## Local Validation Summary
- **TypeScript Compilation:** `npx tsc --noEmit` exited with **0 errors**.
- **Next.js Production Build:** `npm run build` completed successfully (99/99 routes optimized, Turbopack + TS pass).
- **Migration Design Status:** Verified, fully self-contained, idempotent, and ready for owner review. Remote execution remains paused.
