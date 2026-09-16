# TOPVEDA — DEVELOPMENT SAFETY & PERMISSION POLICY

This is a permanent project-level safety policy for TopVeda.
Treat this policy as a HIGH-PRIORITY DEVELOPMENT RULE.

--------------------------------------------------
1. USER PERMISSION IS REQUIRED FOR DESTRUCTIVE ACTIONS
--------------------------------------------------

NEVER delete, drop, truncate, reset, overwrite, purge, destroy, or permanently modify any important data, database object, storage object, production resource, repository history, or project configuration without EXPLICIT permission from the user.

This includes, but is not limited to:
- Supabase databases, tables, rows, migrations, Storage buckets/files, users, auth config, RLS policies, functions, triggers, indexes, constraints
- Production environment variables/secrets
- Cloudflare Workers, domains, routes, DNS records, bindings, secrets
- Resend email configuration
- GitHub repositories, branches, commits, Git history
- Project files and configurations

DO NOT DELETE OR DESTROY WITHOUT EXPLICIT USER APPROVAL.

--------------------------------------------------
2. NO AUTOMATIC DATABASE DELETIONS
--------------------------------------------------

Database safety is CRITICAL. NEVER automatically:
- DROP a table / column / database
- TRUNCATE a table
- DELETE user or production records
- RESET a database or recreate a production database
- Remove existing migrations or rewrite migration history
- Remove RLS policies

If a database change could potentially cause data loss, STOP:
1. Explain what you want to change
2. Explain why it is necessary
3. Explain what could be affected
4. Explain whether it is reversible
5. Propose safer alternatives
6. WAIT for explicit user approval.

--------------------------------------------------
3. NO AUTOMATIC GIT COMMITS OR PUSHES
--------------------------------------------------

NEVER run:
`git commit`, `git push`, `git reset`, `git rebase`, `git revert`, `git cherry-pick`
WITHOUT EXPLICIT USER PERMISSION.

The standard workflow:
BUILD → LOCAL TEST → USER REVIEW → USER APPROVAL → COMMIT → PUSH

Until explicit approval is given: DO NOT COMMIT. DO NOT PUSH.

--------------------------------------------------
4. NO AUTOMATIC DELETIONS FROM THE CODEBASE
--------------------------------------------------

Do not delete files, folders, components, routes, APIs, migrations, configuration files, or features.
Before deleting anything: STOP, explain why, and ask the user.

--------------------------------------------------
5. NO UNAUTHORIZED PRODUCTION CHANGES
--------------------------------------------------

Treat production infrastructure as HIGH RISK. Do not independently change Cloudflare Workers, DNS, secrets, Supabase settings, Resend configs without explicit authorization.

--------------------------------------------------
6. NO SECRET OR CREDENTIAL DELETION OR EXPOSURE
--------------------------------------------------

NEVER delete, rotate, replace, expose, or invalidate credentials/secrets automatically.
NEVER print secret values into chat, logs, commits, source code, or documentation.

--------------------------------------------------
7. MIGRATIONS MUST BE SAFE AND ADDITIVE
--------------------------------------------------

Prefer additive and reversible migrations (add column, add table, add index, add policy, add function).
For high-risk operations: STOP → EXPLAIN → ASK USER → WAIT.

--------------------------------------------------
8. NEVER "FIX" SOMETHING BY DESTROYING EXISTING DATA
--------------------------------------------------

Investigate root cause. Prefer diagnosis, minimal change, backward-compatible fix, reversible migration, and local testing.

--------------------------------------------------
9. MINIMAL-CHANGE PRINCIPLE
--------------------------------------------------

CHANGE ONLY WHAT IS NECESSARY.
Do not refactor unrelated code.
Do not redesign unrelated UI.
Do not modify unrelated database structures.
Do not remove unrelated functionality.
Do not "clean up" unrelated files.

--------------------------------------------------
10. ALWAYS PROTECT EXISTING FUNCTIONALITY
--------------------------------------------------

Understand dependencies before modifying existing features. Preserve existing working functionality across all phases.

--------------------------------------------------
11. IF YOU ARE UNSURE — ASK
--------------------------------------------------

Default rule: UNCERTAINTY = STOP AND ASK.
Never interpret silence as permission. Permission is specific to the requested action and non-transferable.

--------------------------------------------------
12. HIGH-RISK ACTION DISCLOSURE FORMAT
--------------------------------------------------

Before performing any potentially destructive operation, tell the user:
- ACTION: What you intend to do.
- REASON: Why it is necessary.
- IMPACT: What could be affected.
- REVERSIBILITY: Whether it can be undone.
- ASK: "Do you explicitly approve this action?"
- WAIT for the user's response.

--------------------------------------------------
13. CORE PRINCIPLE
--------------------------------------------------

PRESERVE → ANALYZE → MODIFY MINIMALLY → TEST → SHOW USER → GET APPROVAL → COMMIT/PUSH.
Data safety and user control always take priority over speed or convenience.
