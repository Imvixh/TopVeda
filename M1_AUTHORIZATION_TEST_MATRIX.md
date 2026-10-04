# TopVeda Milestone M1 — Authorization Test Matrix

**Objective:** Exhaustive empirical validation of TopVeda's Three-Role Security Model (`STUDENT`, `ADMIN`, `SUPER_ADMIN`), assigned teacher scoping, Storage isolation, and historical enrollment entitlement.

---

## Authorization Test Cases

| Test ID | Security Invariant | Actor / Context | Operation / Action | Target Resource | Expected Outcome | Execution Status |
|---|---|---|---|---|---|---|
| **ATM-01** | Profile Self-Role Mutation Protection | `STUDENT` | `UPDATE profiles SET role = 'SUPER_ADMIN' WHERE id = auth.uid()` | `public.profiles` | **REJECTED**: Trigger `handle_profile_role_guard` raises exception. Role remains unchanged. | `PLANNED` |
| **ATM-02** | Profile Self-Status Mutation Protection | `ADMIN` (Suspended) | `UPDATE profiles SET status = 'ACTIVE' WHERE id = auth.uid()` | `public.profiles` | **REJECTED**: Trigger exception: Only Super Administrators can alter account status. | `PLANNED` |
| **ATM-03** | Super Admin Account Administration | `SUPER_ADMIN` | `UPDATE profiles SET role = 'ADMIN', status = 'ACTIVE' WHERE id = target_id` | `public.profiles` | **ALLOWED**: Role and status updated successfully. | `PLANNED` |
| **ATM-04** | Assignment Management Lockdown | `ADMIN` | `INSERT INTO cms_batch_teachers (batch_id, teacher_id) VALUES (...)` | `public.cms_batch_teachers` | **REJECTED**: RLS check fails (`is_super_admin()` false). | `PLANNED` |
| **ATM-05** | Test Management Super Admin Exclusivity | `ADMIN` | `INSERT INTO student_tests (title, batch_id, ...) VALUES (...)` | `public.student_tests` | **REJECTED**: RLS check fails (Super Admin exclusive). | `PLANNED` |
| **ATM-06** | Assigned Subject Lecture Creation | `ADMIN` (Assigned Physics) | `INSERT INTO cms_lectures (batch_id, subject_id, status) VALUES (batch_A, physics_id, 'DRAFT')` | `public.cms_lectures` | **ALLOWED**: Lecture draft created with `created_by = auth.uid()`. | `PLANNED` |
| **ATM-07** | Cross-Subject Lecture Access Prevention | `ADMIN` (Assigned Physics) | `INSERT INTO cms_lectures (batch_id, subject_id, status) VALUES (batch_A, chemistry_id, 'DRAFT')` | `public.cms_lectures` | **REJECTED**: `is_batch_subject_teacher` returns false. | `PLANNED` |
| **ATM-08** | Batch-Level Record Access Prevention for Subject Teacher | `ADMIN` (Assigned Physics) | `INSERT INTO cms_lectures (batch_id, subject_id, status) VALUES (batch_A, NULL, 'DRAFT')` | `public.cms_lectures` | **REJECTED**: Subject teacher cannot author batch-level NULL subject records. | `PLANNED` |
| **ATM-09** | Batch Lead Subject Authority | `ADMIN` (Batch Lead `subject_id = NULL`) | `INSERT INTO cms_lectures (batch_id, subject_id, status) VALUES (batch_A, physics_id, 'DRAFT')` | `public.cms_lectures` | **ALLOWED**: Batch lead has access across all subjects in that batch. | `PLANNED` |
| **ATM-10** | Content Publishing Privilege Gate | `ADMIN` | `UPDATE cms_lectures SET status = 'PUBLISHED' WHERE id = lecture_id` | `public.cms_lectures` | **REJECTED**: Trigger `handle_cms_review_guard` blocks non-super-admin publishing. | `PLANNED` |
| **ATM-11** | Study Material Lecture Attachment Integrity | `ADMIN` (Assigned) | `INSERT INTO cms_study_materials (batch_id, subject_id, lecture_id, status) VALUES (batch_A, physics_id, lecture_X, 'DRAFT')` | `public.cms_study_materials` | **ALLOWED**: Verified matching lecture ID, batch, and subject. | `PLANNED` |
| **ATM-12** | Study Material Cross-Lecture Mismatch Prevention | `ADMIN` (Assigned) | `INSERT INTO cms_study_materials (batch_id, subject_id, lecture_id) VALUES (batch_A, chemistry_id, physics_lecture)` | `public.cms_study_materials` | **REJECTED**: Lecture subject mismatch rejected by RLS. | `PLANNED` |
| **ATM-13** | Storage Material Upload Record Association | `ADMIN` (Assigned) | Upload to `study-materials` bucket for owned draft record | `storage.objects` | **ALLOWED**: File uploaded to assigned batch/record path. | `PLANNED` |
| **ATM-14** | Unrelated Storage Object Manipulation | `ADMIN` (Unassigned) | Upload/Delete object in unassigned batch directory | `storage.objects` | **REJECTED**: Storage RLS policy denies operation. | `PLANNED` |
| **ATM-15** | Anonymous Curated Preview Access | `anon` | `SELECT * FROM cms_lectures WHERE is_curated_preview = TRUE AND status = 'PUBLISHED'` | `public.cms_lectures` | **ALLOWED**: Published sample lecture metadata returned. | `PLANNED` |
| **ATM-16** | Anonymous Private Content Protection | `anon` | `SELECT * FROM cms_lectures WHERE is_curated_preview = FALSE` | `public.cms_lectures` | **REJECTED**: 0 rows returned. | `PLANNED` |
| **ATM-17** | Expired Student Enrollment Lockout | `STUDENT` (Expired) | `SELECT * FROM cms_lectures WHERE batch_id = expired_batch` | `public.cms_lectures` | **REJECTED**: `is_actively_enrolled_in_batch` returns false. | `PLANNED` |
| **ATM-18** | Completed Student Historical Learning Read | `STUDENT` (Completed) | `SELECT * FROM cms_study_materials WHERE batch_id = completed_batch` | `public.cms_study_materials` | **ALLOWED**: Historical study materials returned. | `PLANNED` |
| **ATM-19** | Completed Student Mutation Lockout | `STUDENT` (Completed) | `record_live_attendance_heartbeat(live_class_id)` | Database RPC | **REJECTED**: Exception: Active enrollment required. | `PLANNED` |
| **ATM-20** | Live Class Operation & Rescheduling | `ADMIN` (Assigned) | `UPDATE cms_live_classes SET live_status = 'LIVE', is_live = TRUE` | `public.cms_live_classes` | **ALLOWED**: Live status and stream URL updated. | `PLANNED` |
| **ATM-21** | Live Class Attendance Finalization | `ADMIN` (Assigned) | `finalize_live_class_attendance(live_class_id)` | Database RPC | **ALLOWED**: Absent records inserted; session finalized. | `PLANNED` |
| **ATM-22** | Service-Role API Caller Role Enforcement | Anonymous / Invalid | POST to `/api/admin/tests/create` with service-role header without user session | Next.js API Route | **REJECTED**: 401/403 Server-Side Gate Rejection. | `PLANNED` |
