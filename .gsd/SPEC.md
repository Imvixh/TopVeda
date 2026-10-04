# SPEC.md — TopVeda Architecture v7.0 & M1 Completion Specification

> **Status**: `FINALIZED`
>
> ⚠️ **Planning Lock**: Requirements and boundaries are finalized for Milestone M1 completion.

## Vision
Establish `PROJECT_ARCHITECTURE_V7.0.md` as the authoritative source of truth for TopVeda, implementing an uncompromising security foundation for Milestone M1 with a strict Three-Role Model (`STUDENT`, `ADMIN`, `SUPER_ADMIN`), where `ADMIN` serves as the restricted teacher role and `SUPER_ADMIN` possesses complete platform authority.

## Approved Application Roles & Authority Matrix

### 1. `STUDENT`
- Enrolls in cohort batches (`cms_batches`).
- Consumes published lectures, notes, and live sessions for enrolled batches.
- Submits interactive test attempts and reviews scorecards.
- Retains permanent read-only access to historical academic content upon batch completion.

### 2. `ADMIN` (Restricted Teacher / Faculty Role)
- **Dedicated Route**: `/admin`
- **Scoped Boundary**: Restricted strictly to assigned batches and subjects via `cms_batch_teachers`.
- **Allowed Operations**:
  - Upload recorded lectures and create lecture objects within assigned batches/subjects.
  - Attach study materials to existing lectures within assigned batches/subjects.
  - Schedule, reschedule, operate, and attend assigned live class sessions.
  - Finalize attendance for assigned live sessions.
  - Inspect scorecards for assigned batches/subjects.
  - Save content as `DRAFT` and submit eligible content for Super Admin review (`PENDING_REVIEW`).
- **Forbidden Operations**:
  - Cannot create, edit, or manage tests and quizzes (tests are strictly Super Admin exclusive).
  - Cannot approve, publish, reject, or archive academic content.
  - Cannot manage global courses, batches, subjects, users, or platform settings.
  - Cannot manage teacher assignments or grant themselves additional assignments.
  - Cannot access unrelated batches or private content outside assigned scope.

### 3. `SUPER_ADMIN` (Master Administrator)
- **Dedicated Route**: `/super-admin`
- **Scope**: Complete platform authority across all boards, classes, courses, batches, subjects, and users.
- **Allowed Operations**:
  - Manage master academic curriculum, courses, batches, subjects, and chapters.
  - Manage teacher assignments (`cms_batch_teachers`) and student enrollments.
  - Author, edit, freeze, and publish master tests and quizzes (`student_tests`, `student_test_versions`).
  - Review, approve (`APPROVED`), publish (`PUBLISHED`), reject, and archive academic content.
  - Configure dashboard, system settings, and audit logs.

## Goals (Milestone M1 Completion)
1. **Reconcile Architecture v7.0**: Update `PROJECT_ARCHITECTURE_V7.0.md` in place to reflect the 3-role model, assigned teacher scoping, and Super Admin publishing/test authority.
2. **Resolve All M1 Authorization & Schema Defects (Defects A–L)**:
   - **Defect A**: Decouple `is_admin()` and `is_super_admin()` so ADMIN does not inherit global Super Admin permissions.
   - **Defect B**: Restrict `cms_batch_teachers` management strictly to `is_super_admin()`.
   - **Defect C**: Enforce assignment-scoped authorization on all teacher operations (lectures, live classes, study notes attached to existing lectures, storage).
   - **Defect D**: Ensure partial unique indexes `uq_batch_teacher_subject_not_null` and `uq_batch_teacher_subject_null` govern `cms_batch_teachers` without legacy constraint conflicts.
   - **Defect E**: Protect profile privileged fields (`role`, `status`) from self-modification using trigger guards.
   - **Defect F**: Reconcile academic RLS policies to prevent permissive staff bypasses.
   - **Defect G**: Enforce explicit curated preview checks (`is_curated_preview = true` on published content).
   - **Defect H**: Enforce live class public visibility rules (hide drafts, enforce enrollment on private sessions).
   - **Defect I**: Reconcile active vs completed enrollment access rules across helpers and RPCs.
   - **Defect J**: Restrict test-management APIs strictly to `SUPER_ADMIN`, eliminating mutations from GET requests and securing service-role gates.
   - **Defect K**: Audit student learning services to eliminate unnecessary ADMIN bypasses.
   - **Defect L**: Verify and remove duplicate foreign key constraints safely.
3. **Comprehensive Empirical Validation**: Implement real database and API authorization tests verifying all invariants.

## Non-Goals (Out of Scope for M1)
- Do not create Architecture v7.1 or v8.0.
- Do not introduce a separate `TEACHER` role enum in the database.
- Do not redesign the student learning experience.
- Do not implement Milestone M2 (Live Class WebRTC / Stream integration) until M1 verification gate passes.

## Technical Requirements
| Requirement | Priority | Notes |
|---|---|---|
| Role Enum & Check Constraint: `('STUDENT', 'ADMIN', 'SUPER_ADMIN')` | Must-have | Hardened on `public.profiles` |
| Security Definer Helpers (`is_super_admin`, `is_admin`, `is_student`, `is_batch_teacher`, `is_batch_subject_teacher`, `is_actively_enrolled_in_batch`, `has_batch_read_entitlement`) | Must-have | `search_path = public, pg_catalog, pg_temp`, `REVOKE ALL FROM PUBLIC` |
| Teacher Scoped Authorization on CMS & Live Classes | Must-have | Enforced via `is_batch_teacher` and `is_batch_subject_teacher` |
| Super Admin Exclusive Test Management | Must-have | Tests managed exclusively by `SUPER_ADMIN` |
| Profile Self-Update Guard Trigger | Must-have | Prevents users mutating `role` or `status` |
| Curated Preview Gate | Must-have | `is_curated_preview = TRUE AND status = 'PUBLISHED'` |
| Storage Bucket Scoped RLS | Must-have | `study-materials`, `test-attachments`, `lecture-thumbnails` |

---
*Last updated: October 2026*
