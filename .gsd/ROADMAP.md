---
milestone: M1
version: 7.0
updated: 2026-10-05T00:31:00+05:30
---

# Roadmap

> **Current Milestone:** M1 — Role System, Security Functions & Authorization Foundation  
> **Status:** Preflight Audit Complete / Migration Draft Verified / Local Build Passed / Awaiting Owner SQL Approval Gate

## Must-Haves (from SPEC)

- [x] Version 7.0 Architecture document amended in place to 3 approved roles (`STUDENT`, `ADMIN` [Teacher], `SUPER_ADMIN`).
- [x] Complete security reconciliation audit compiled in `M1_FINAL_SECURITY_AUDIT.md`.
- [x] Corrected forward migration `20261006000001_m1_security_reconciliation.sql` drafted and verified locally.
- [x] Read-only preflight inspection queries prepared in `M1_PREFLIGHT.sql`.
- [x] Postflight exception-raising assertion suite prepared in `M1_POSTFLIGHT.sql`.
- [x] 22-test authorization matrix documented in `M1_AUTHORIZATION_TEST_MATRIX.md`.
- [x] Application TypeScript check (`npx tsc --noEmit`) and Next.js production build (`npm run build`) completed successfully with 0 errors.
- [ ] Manual remote application of `20261006000001_m1_security_reconciliation.sql` in Supabase SQL Editor.
- [ ] Execution and passage of `M1_POSTFLIGHT.sql` assertions against remote database.

---

## Phases

### Phase 1: Architecture & Preflight Security Audit
**Status:** ✅ Complete
**Objective:** Amend `PROJECT_ARCHITECTURE_V7.0.md` in place and produce complete second-pass audit report and corrected migration.

**Deliverables:**
- [x] `PROJECT_ARCHITECTURE_V7.0.md` (Reconciled in place)
- [x] `.gsd/SPEC.md` (`Status: FINALIZED`)
- [x] `M1_FINAL_SECURITY_AUDIT.md` (Includes full Traceability Matrix)
- [x] `supabase/migrations/20261006000001_m1_security_reconciliation.sql`
- [x] `M1_PREFLIGHT.sql`
- [x] `M1_POSTFLIGHT.sql`
- [x] `M1_AUTHORIZATION_TEST_MATRIX.md` (22 test cases)

---

### Phase 2: Remote Database Migration & Postflight Verification Gate
**Status:** 🔄 Awaiting Owner Review & SQL Execution
**Objective:** Apply `20261006000001_m1_security_reconciliation.sql` in Supabase and run verification assertions.

**Plans:**
- [ ] Plan 2.1: Owner executes preflight queries (`M1_PREFLIGHT.sql`).
- [ ] Plan 2.2: Owner executes forward migration (`20261006000001_m1_security_reconciliation.sql`).
- [ ] Plan 2.3: Execute postflight assertions (`M1_POSTFLIGHT.sql`).

---

### Phase 3: Application & API Layer Verification
**Status:** 🔄 In Progress (Local Build & Type Checks Completed)
**Objective:** Verify application routes and client services against the reconciled schema.

**Plans:**
- [x] Plan 3.1: Execute `npx tsc --noEmit` and `npm run build` (Executed: 0 errors, 99/99 routes built).
- [ ] Plan 3.2: Verify API routes and client services operate against remote database post-migration.
- [ ] Plan 3.3: Record empirical evidence in `.gsd/STATE.md` and declare M1 complete.
