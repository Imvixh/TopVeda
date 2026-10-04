---
milestone: M1
version: 7.0
updated: 2026-10-05T02:00:00+05:30
---

# Roadmap

> **Current Milestone:** M1 — Role System, Security Functions & Authorization Foundation  
> **Status:** Implementation Complete / Application Companion Fix Complete / Local Builds & 16 Tests Passed / Awaiting Owner Supabase Execution Gate

## Must-Haves (from SPEC)

- [x] Version 7.0 Architecture document amended in place to 3 approved roles (`STUDENT`, `ADMIN` [Teacher], `SUPER_ADMIN`).
- [x] Complete security reconciliation audit compiled in `M1_FINAL_SECURITY_AUDIT.md`.
- [x] Corrected forward migration `20261006000001_m1_security_reconciliation.sql` drafted, verified locally, and runnable in Supabase SQL Editor.
- [x] Application-side companion fix completed: safe column projections, student join timing lock (now >= scheduled_start), attendance hardening, server-only private credentials, draft recording workflow.
- [x] Read-only preflight inspection queries prepared in `M1_PREFLIGHT.sql`.
- [x] Postflight exception-raising assertion suite prepared in `M1_POSTFLIGHT.sql`.
- [x] 34-test authorization matrix documented in `M1_AUTHORIZATION_TEST_MATRIX.md` (ATM-01 to ATM-34).
- [x] Application companion authorization test suite (`scripts/test-live-companion-authorization.mjs`): 16/16 test cases passing.
- [x] Application TypeScript check (`npx tsc --noEmit` / `npm run typecheck`) and Next.js production build (`npm run build`) completed successfully with 0 errors.
- [ ] Manual remote application of `20261006000001_m1_security_reconciliation.sql` in Supabase SQL Editor.
- [ ] Execution and passage of `M1_POSTFLIGHT.sql` assertions against remote database.

---

## Phases

### Phase 1: Architecture & Security Reconciliation Implementation
**Status:** ✅ Complete
**Objective:** Amend `PROJECT_ARCHITECTURE_V7.0.md` in place, implement application-side companion fixes, and produce runnable, reconciled migration and assertion scripts.

**Deliverables:**
- [x] `PROJECT_ARCHITECTURE_V7.0.md` (Reconciled in place)
- [x] `.gsd/SPEC.md` (`Status: FINALIZED`)
- [x] `M1_FINAL_SECURITY_AUDIT.md` (Includes live-class workflow & full Traceability Matrix)
- [x] `supabase/migrations/20261006000001_m1_security_reconciliation.sql`
- [x] `M1_PREFLIGHT.sql`
- [x] `M1_POSTFLIGHT.sql`
- [x] `M1_AUTHORIZATION_TEST_MATRIX.md` (34 test cases)
- [x] Application-Side Companion Fix (Safe projections, strict student timing, attendance verification, recording draft workflow)
- [x] `scripts/test-live-companion-authorization.mjs` (16 test cases verified)

---

### Phase 2: Remote Database Migration & Postflight Verification Gate
**Status:** 🔄 Ready for Owner Execution
**Objective:** Apply `20261006000001_m1_security_reconciliation.sql` in Supabase and run verification assertions.

**Steps:**
- [ ] Step 1: Owner executes preflight queries (`M1_PREFLIGHT.sql`).
- [ ] Step 2: Owner executes forward migration (`20261006000001_m1_security_reconciliation.sql`).
- [ ] Step 3: Owner executes postflight assertions (`M1_POSTFLIGHT.sql`).

---

### Phase 3: Post-Migration Application Verification
**Status:** 🔄 Local Verification Complete (Remote Gate Pending)
**Objective:** Verify application routes and client services against the reconciled schema.

**Steps:**
- [x] Step 3.1: Execute `npm run typecheck` and `npm run build` (0 errors, 99/99 routes built).
- [ ] Step 3.2: Verify live application post-migration.

