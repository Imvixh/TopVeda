-- ==============================================================================
-- TopVeda Forward Migration: M1 Security Reconciliation & Defect Remediation
-- File: supabase/migrations/20261006000001_m1_security_reconciliation.sql
-- Architecture: Version 7.0 Approved Four-Role Model ('STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')
-- Governs: Role Functions, Strict Teacher Scoping, Profile Guard, Decoupled Preview RLS,
--          Exact Safe Storage Object Binding, Live Class Workflow, and Foreign Key / Index Reconciliation
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Precondition Safety Verification (Non-Destructive Gate)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.profiles does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_batch_teachers') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_batch_teachers does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_enrollments does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_lectures') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_lectures does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_study_materials') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_study_materials does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cms_live_classes') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.cms_live_classes does not exist.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_tests') THEN
        RAISE EXCEPTION 'Precondition Failed: Table public.student_tests does not exist.';
    END IF;

    -- Ensure required prerequisite columns exist idempotently across tables
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
    ALTER TABLE public.cms_batch_teachers ADD COLUMN IF NOT EXISTS subject_id UUID NULL;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ NULL;
    ALTER TABLE public.cms_lectures ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_lectures ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_lectures ADD COLUMN IF NOT EXISTS is_curated_preview BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE public.cms_study_materials ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_study_materials ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_study_materials ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES public.cms_lectures(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_study_materials ADD COLUMN IF NOT EXISTS is_curated_preview BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE public.cms_live_classes ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_live_classes ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_live_classes ADD COLUMN IF NOT EXISTS educator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    ALTER TABLE public.cms_live_classes ADD COLUMN IF NOT EXISTS is_curated_preview BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE public.student_tests ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL;
    ALTER TABLE public.student_tests ADD COLUMN IF NOT EXISTS is_curated_preview BOOLEAN NOT NULL DEFAULT FALSE;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Safe Helper: Exception-Free UUID Parsing
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.try_cast_uuid(p_text TEXT)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
    IF p_text IS NULL OR p_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN NULL;
    END IF;
    RETURN p_text::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. Consolidate Profile Role & Status Guard
-- ------------------------------------------------------------------------------
-- Ensure profile role constraint accommodates 4 approved roles
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'));
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DROP TRIGGER IF EXISTS trg_guard_profile_privileged_fields ON public.profiles;
DROP FUNCTION IF EXISTS public.guard_profile_privileged_fields();

CREATE OR REPLACE FUNCTION public.handle_profile_role_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
    -- Super Admin has full account administration authority
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- For client-driven / non-super-admin updates
    IF auth.uid() IS NOT NULL THEN
        -- Prevent role modification
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: You do not have permission to modify user roles.';
        END IF;

        -- Prevent account status modification (e.g. suspended user attempting self-reactivation)
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Administrators can alter account status.';
        END IF;

        -- Prevent self-promotion to SUPER_ADMIN
        IF NEW.id = auth.uid() AND NEW.role = 'SUPER_ADMIN' AND OLD.role <> 'SUPER_ADMIN' THEN
            RAISE EXCEPTION 'Unauthorized: Self-promotion to SUPER_ADMIN is prohibited.';
        END IF;

        -- Prevent direct email alteration in profiles (must be synchronized through Auth)
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Email cannot be modified directly in user profiles.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_role_guard ON public.profiles;
CREATE TRIGGER trg_profile_role_guard
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profile_role_guard();

-- ------------------------------------------------------------------------------
-- 4. Decoupled Security Definer Role & Scoping Functions
-- ------------------------------------------------------------------------------

-- 4.1 Super Admin Authority (Active Super Admin account verified)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'SUPER_ADMIN' 
      AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 4.2 Admin Authority (General Administrator)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'ADMIN' 
      AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 4.3 Teacher Authority (Educator / Faculty)
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'TEACHER' 
      AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 4.4 Student Authority (Active Student account verified)
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'STUDENT' 
      AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 4.5 Batch Lead Assignment Validation (Strictly Batch-Level Assignment where subject_id IS NULL)
CREATE OR REPLACE FUNCTION public.is_batch_teacher(p_batch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cms_batch_teachers bt
    JOIN public.profiles p ON p.id = bt.teacher_id
    WHERE bt.batch_id = p_batch_id
      AND bt.teacher_id = auth.uid()
      AND bt.subject_id IS NULL
      AND p.role IN ('TEACHER', 'ADMIN')
      AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 4.6 Strict Subject-Scoped Teacher Assignment Validation
-- If p_subject_id is NOT NULL: Match exact subject OR batch lead (bt.subject_id IS NULL)
-- If p_subject_id is NULL: Match ONLY batch lead (bt.subject_id IS NULL)
CREATE OR REPLACE FUNCTION public.is_batch_subject_teacher(p_batch_id UUID, p_subject_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cms_batch_teachers bt
    JOIN public.profiles p ON p.id = bt.teacher_id
    WHERE bt.batch_id = p_batch_id
      AND bt.teacher_id = auth.uid()
      AND p.role IN ('TEACHER', 'ADMIN')
      AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
      AND (
        (p_subject_id IS NOT NULL AND (bt.subject_id = p_subject_id OR bt.subject_id IS NULL))
        OR
        (p_subject_id IS NULL AND bt.subject_id IS NULL)
      )
  );
$$;

-- 4.6 Active Student Enrollment Verification (Active Student, Active Batch & Unexpired Enrollment)
CREATE OR REPLACE FUNCTION public.is_actively_enrolled_in_batch(p_batch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_enrollments se
    JOIN public.profiles p ON p.id = se.student_id
    JOIN public.cms_batches b ON b.id = se.batch_id
    WHERE se.student_id = auth.uid()
      AND se.batch_id = p_batch_id
      AND se.status::text = 'ACTIVE'
      AND p.role = 'STUDENT'
      AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
      AND (se.valid_until IS NULL OR se.valid_until > now())
      AND b.status = 'PUBLISHED'
      AND (b.ends_at IS NULL OR b.ends_at > now())
  );
$$;

-- 4.7 Batch Historical / Active Access (Active or Completed Batches with unexpired/historical entitlement)
CREATE OR REPLACE FUNCTION public.has_batch_read_entitlement(p_batch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_enrollments se
    JOIN public.profiles p ON p.id = se.student_id
    JOIN public.cms_batches b ON b.id = se.batch_id
    WHERE se.student_id = auth.uid()
      AND se.batch_id = p_batch_id
      AND p.role = 'STUDENT'
      AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
      AND b.status = 'PUBLISHED'
      AND (
        (se.status::text = 'ACTIVE' AND (se.valid_until IS NULL OR se.valid_until > now()))
        OR
        (se.status::text = 'COMPLETED')
      )
  );
$$;

-- 4.8 Safe Content Access Preview Function
CREATE OR REPLACE FUNCTION public.can_student_access_content(
  p_is_curated_preview BOOLEAN,
  p_batch_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT (
    (p_is_curated_preview = TRUE AND p_status = 'PUBLISHED')
    OR
    (
      p_status = 'PUBLISHED' 
      AND p_batch_id IS NOT NULL 
      AND public.has_batch_read_entitlement(p_batch_id)
    )
    OR
    public.is_super_admin()
  );
$$;

-- ------------------------------------------------------------------------------
-- 5. CMS Status Transition & Review Metadata Guard Triggers
-- ------------------------------------------------------------------------------

-- 5.1 Academic Content Review Guard (Lectures & Study Materials)
CREATE OR REPLACE FUNCTION public.handle_cms_review_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
    -- Super Admin has full publishing & review authority
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- Block non-super-admins from moving academic content to APPROVED, PUBLISHED, or ARCHIVED
    IF NEW.status IN ('APPROVED', 'PUBLISHED', 'ARCHIVED') AND (OLD.status IS NULL OR OLD.status NOT IN ('APPROVED', 'PUBLISHED', 'ARCHIVED')) THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Administrators can approve, publish, or archive content.';
        END IF;
    END IF;

    -- Block non-super-admins from manipulating review audit timestamps or review notes
    IF (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Administrators can record review decisions.';
        END IF;
    END IF;

    -- Prevent modifying immutable scope fields (batch_id, subject_id) on existing records
    IF NEW.batch_id IS DISTINCT FROM OLD.batch_id THEN
        RAISE EXCEPTION 'Unauthorized: Batch assignment cannot be changed after creation.';
    END IF;
    IF NEW.subject_id IS DISTINCT FROM OLD.subject_id THEN
        RAISE EXCEPTION 'Unauthorized: Subject assignment cannot be changed after creation.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_cms_lectures_review ON public.cms_lectures;
CREATE TRIGGER trg_guard_cms_lectures_review
    BEFORE UPDATE ON public.cms_lectures
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_review_guard();

DROP TRIGGER IF EXISTS trg_guard_cms_study_materials_review ON public.cms_study_materials;
CREATE TRIGGER trg_guard_cms_study_materials_review
    BEFORE UPDATE ON public.cms_study_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_review_guard();

-- 5.2 Live Class Operational Guard
-- Allows assigned teachers to operate sessions without approval while protecting review fields
CREATE OR REPLACE FUNCTION public.handle_cms_live_classes_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
    -- Super Admin retains full authority
    IF public.is_super_admin() THEN
        RETURN NEW;
    END IF;

    -- Block non-super-admins from modifying review audit metadata
    IF (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators can record review decisions.';
    END IF;

    -- Block non-super-admins from setting status to ARCHIVED
    IF NEW.status = 'ARCHIVED' AND OLD.status <> 'ARCHIVED' THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators can archive live classes.';
    END IF;

    -- Block non-super-admins from modifying curated preview flags
    IF (NEW.is_curated_preview IS DISTINCT FROM OLD.is_curated_preview) THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators can modify curated preview settings.';
    END IF;

    -- Prevent hijacking ownership or altering assigned scope
    IF NEW.batch_id IS DISTINCT FROM OLD.batch_id THEN
        RAISE EXCEPTION 'Unauthorized: Batch assignment cannot be modified on a live class.';
    END IF;
    IF NEW.subject_id IS DISTINCT FROM OLD.subject_id THEN
        RAISE EXCEPTION 'Unauthorized: Subject assignment cannot be modified on a live class.';
    END IF;
    IF NEW.educator_id IS DISTINCT FROM OLD.educator_id THEN
        RAISE EXCEPTION 'Unauthorized: Assigned educator cannot be modified.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_cms_live_classes ON public.cms_live_classes;
CREATE TRIGGER trg_guard_cms_live_classes
    BEFORE UPDATE ON public.cms_live_classes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_live_classes_guard();

-- ------------------------------------------------------------------------------
-- 6. Constraint & Foreign-Key Reconciliation on cms_batch_teachers
-- ------------------------------------------------------------------------------

-- 6.1 Drop Conflicting Legacy Unique Constraints Safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_cms_batch_teacher' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers DROP CONSTRAINT uq_cms_batch_teacher;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uq_batch_teacher_subject' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers DROP CONSTRAINT uq_batch_teacher_subject;
    END IF;
END $$;

-- 6.2 Reconcile Duplicate Foreign Keys on cms_batch_teachers Safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cms_batch_teachers_batch_id_fkey' AND table_name = 'cms_batch_teachers'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cms_batch_teachers_batch' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers DROP CONSTRAINT cms_batch_teachers_batch_id_fkey;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cms_batch_teachers_teacher_id_fkey' AND table_name = 'cms_batch_teachers'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cms_batch_teachers_teacher' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers DROP CONSTRAINT cms_batch_teachers_teacher_id_fkey;
    END IF;
END $$;

-- 6.3 Enforce Verified Partial Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_teacher_subject_not_null
    ON public.cms_batch_teachers(batch_id, teacher_id, subject_id)
    WHERE subject_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_teacher_subject_null
    ON public.cms_batch_teachers(batch_id, teacher_id)
    WHERE subject_id IS NULL;

-- ------------------------------------------------------------------------------
-- 7. RLS Policy Replacement on cms_batch_teachers
-- ------------------------------------------------------------------------------
ALTER TABLE public.cms_batch_teachers ENABLE ROW LEVEL SECURITY;

-- Explicitly drop all known legacy assignment policies
DROP POLICY IF EXISTS "authenticated_read_batch_teachers" ON public.cms_batch_teachers;
DROP POLICY IF EXISTS "cms_batch_teachers_read_all" ON public.cms_batch_teachers;
DROP POLICY IF EXISTS "cms_batch_teachers_admin_manage" ON public.cms_batch_teachers;
DROP POLICY IF EXISTS "super_admin_manage_batch_teachers" ON public.cms_batch_teachers;
DROP POLICY IF EXISTS "cms_batch_teachers_select" ON public.cms_batch_teachers;
DROP POLICY IF EXISTS "cms_batch_teachers_super_admin_manage" ON public.cms_batch_teachers;
DROP POLICY IF EXISTS "cms_batch_teachers_select_policy" ON public.cms_batch_teachers;

-- Privacy-Scoped SELECT Policy:
CREATE POLICY "cms_batch_teachers_select_policy"
    ON public.cms_batch_teachers FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR teacher_id = auth.uid()
        OR public.is_batch_subject_teacher(batch_id, subject_id)
        OR EXISTS (
            SELECT 1 FROM public.student_enrollments se
            WHERE se.batch_id = cms_batch_teachers.batch_id
              AND se.student_id = auth.uid()
              AND (
                (se.status::text = 'ACTIVE' AND (se.valid_until IS NULL OR se.valid_until > now()))
                OR se.status::text = 'COMPLETED'
              )
        )
    );

-- SUPER_ADMIN Exclusive Assignment Management
CREATE POLICY "cms_batch_teachers_super_admin_manage"
    ON public.cms_batch_teachers FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 8. RLS Policy Replacement on public.profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Educator profiles are viewable by all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_public_read_educators" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_and_admin_read" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_authorized" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_super_admin_update" ON public.profiles;

CREATE POLICY "profiles_read_authorized"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_super_admin());

CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_super_admin_update"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 9. RLS Policy Replacement on student_tests (Super Admin Exclusivity)
-- ------------------------------------------------------------------------------
ALTER TABLE public.student_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "students_view_published_tests" ON public.student_tests;
DROP POLICY IF EXISTS "admin_manage_tests" ON public.student_tests;
DROP POLICY IF EXISTS "student_tests_super_admin_all" ON public.student_tests;
DROP POLICY IF EXISTS "student_tests_teacher_all" ON public.student_tests;
DROP POLICY IF EXISTS "student_tests_read_policy" ON public.student_tests;
DROP POLICY IF EXISTS "student_tests_super_admin_manage" ON public.student_tests;
DROP POLICY IF EXISTS "student_tests_select_policy" ON public.student_tests;
DROP POLICY IF EXISTS "student_tests_anon_select" ON public.student_tests;
DROP POLICY IF EXISTS "student_tests_authenticated_select" ON public.student_tests;

-- 9.1 Anonymous Public Preview SELECT
CREATE POLICY "student_tests_anon_select"
    ON public.student_tests FOR SELECT
    TO anon
    USING (status = 'PUBLISHED' AND is_curated_preview = TRUE);

-- 9.2 Authenticated SELECT (Super Admin OR Enrolled Students on published tests)
CREATE POLICY "student_tests_authenticated_select"
    ON public.student_tests FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (status = 'PUBLISHED' AND is_curated_preview = TRUE)
        OR (
            status = 'PUBLISHED' 
            AND batch_id IS NOT NULL 
            AND public.has_batch_read_entitlement(batch_id)
        )
    );

-- 9.3 Super Admin Full Management (Zero Teacher Access)
CREATE POLICY "student_tests_super_admin_manage"
    ON public.student_tests FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 10. RLS Policy Replacement on cms_lectures
-- ------------------------------------------------------------------------------
ALTER TABLE public.cms_lectures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_published_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "authorized_read_published_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "admin_read_own_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "admin_insert_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "admin_update_own_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "teacher_update_own_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "super_admin_manage_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_super_admin_all" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_teacher_manage" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_super_admin_manage" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_teacher_scoped_manage" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_read_policy" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_select_policy" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_anon_select" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_authenticated_select" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_teacher_insert" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_teacher_update" ON public.cms_lectures;
DROP POLICY IF EXISTS "cms_lectures_teacher_delete" ON public.cms_lectures;

-- 10.1 Anonymous Public Preview SELECT
CREATE POLICY "cms_lectures_anon_select"
    ON public.cms_lectures FOR SELECT
    TO anon
    USING (status = 'PUBLISHED' AND is_curated_preview = TRUE);

-- 10.2 Authenticated SELECT
CREATE POLICY "cms_lectures_authenticated_select"
    ON public.cms_lectures FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (status = 'PUBLISHED' AND is_curated_preview = TRUE)
        OR (
            status = 'PUBLISHED' 
            AND batch_id IS NOT NULL 
            AND public.has_batch_read_entitlement(batch_id)
        )
        OR (
            batch_id IS NOT NULL 
            AND public.is_batch_subject_teacher(batch_id, subject_id)
        )
    );

-- 10.3 Super Admin Full Management
CREATE POLICY "cms_lectures_super_admin_manage"
    ON public.cms_lectures FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 10.4 Teacher Scoped Insert (Initial DRAFT status in assigned batch & subject)
CREATE POLICY "cms_lectures_teacher_insert"
    ON public.cms_lectures FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND status = 'DRAFT'
        AND created_by = auth.uid()
    );

-- 10.5 Teacher Scoped Update (Drafts / Submissions in assigned batch & subject)
CREATE POLICY "cms_lectures_teacher_update"
    ON public.cms_lectures FOR UPDATE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND created_by = auth.uid()
        AND status IN ('DRAFT', 'PENDING_REVIEW')
    )
    WITH CHECK (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND created_by = auth.uid()
        AND status IN ('DRAFT', 'PENDING_REVIEW')
    );

-- 10.6 Teacher Scoped Delete (Owned Drafts only)
CREATE POLICY "cms_lectures_teacher_delete"
    ON public.cms_lectures FOR DELETE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND created_by = auth.uid()
        AND status = 'DRAFT'
    );

-- ------------------------------------------------------------------------------
-- 11. RLS Policy Replacement on cms_study_materials
-- ------------------------------------------------------------------------------
ALTER TABLE public.cms_study_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_published_study_materials" ON public.cms_study_materials;
DROP POLICY IF EXISTS "students_read_enrolled_study_materials" ON public.cms_study_materials;
DROP POLICY IF EXISTS "admin_read_own_study_materials" ON public.cms_study_materials;
DROP POLICY IF EXISTS "admin_insert_study_materials" ON public.cms_study_materials;
DROP POLICY IF EXISTS "admin_update_own_study_materials" ON public.cms_study_materials;
DROP POLICY IF EXISTS "super_admin_manage_study_materials" ON public.cms_study_materials;
DROP POLICY IF EXISTS "cms_study_materials_select_policy" ON public.cms_study_materials;
DROP POLICY IF EXISTS "cms_study_materials_super_admin_manage" ON public.cms_study_materials;
DROP POLICY IF EXISTS "cms_study_materials_anon_select" ON public.cms_study_materials;
DROP POLICY IF EXISTS "cms_study_materials_authenticated_select" ON public.cms_study_materials;
DROP POLICY IF EXISTS "cms_study_materials_teacher_insert" ON public.cms_study_materials;
DROP POLICY IF EXISTS "cms_study_materials_teacher_update" ON public.cms_study_materials;
DROP POLICY IF EXISTS "cms_study_materials_teacher_delete" ON public.cms_study_materials;

-- 11.1 Anonymous Public Preview SELECT
CREATE POLICY "cms_study_materials_anon_select"
    ON public.cms_study_materials FOR SELECT
    TO anon
    USING (status = 'PUBLISHED' AND is_curated_preview = TRUE);

-- 11.2 Authenticated SELECT
CREATE POLICY "cms_study_materials_authenticated_select"
    ON public.cms_study_materials FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (status = 'PUBLISHED' AND is_curated_preview = TRUE)
        OR (
            status = 'PUBLISHED' 
            AND batch_id IS NOT NULL 
            AND public.has_batch_read_entitlement(batch_id)
        )
        OR (
            batch_id IS NOT NULL 
            AND public.is_batch_subject_teacher(batch_id, subject_id)
        )
    );

-- 11.3 Super Admin Full Management
CREATE POLICY "cms_study_materials_super_admin_manage"
    ON public.cms_study_materials FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 11.4 Teacher Scoped Insert (Strict Lecture Attachment & Subject Equality)
CREATE POLICY "cms_study_materials_teacher_insert"
    ON public.cms_study_materials FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND status = 'DRAFT'
        AND created_by = auth.uid()
        AND lecture_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.cms_lectures l
            WHERE l.id = cms_study_materials.lecture_id
              AND l.batch_id = cms_study_materials.batch_id
              AND (l.subject_id IS NOT DISTINCT FROM cms_study_materials.subject_id)
        )
    );

-- 11.5 Teacher Scoped Update (Strict Lecture Attachment Preservation)
CREATE POLICY "cms_study_materials_teacher_update"
    ON public.cms_study_materials FOR UPDATE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND created_by = auth.uid()
        AND status IN ('DRAFT', 'PENDING_REVIEW')
    )
    WITH CHECK (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND created_by = auth.uid()
        AND status IN ('DRAFT', 'PENDING_REVIEW')
        AND lecture_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.cms_lectures l
            WHERE l.id = cms_study_materials.lecture_id
              AND l.batch_id = cms_study_materials.batch_id
              AND (l.subject_id IS NOT DISTINCT FROM cms_study_materials.subject_id)
        )
    );

-- 11.6 Teacher Scoped Delete
CREATE POLICY "cms_study_materials_teacher_delete"
    ON public.cms_study_materials FOR DELETE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND created_by = auth.uid()
        AND status = 'DRAFT'
    );

-- ------------------------------------------------------------------------------
-- 12. RLS Policy Replacement on cms_live_classes
-- (Direct Teacher Scheduling & Operation without Super Admin Approval)
-- ------------------------------------------------------------------------------
ALTER TABLE public.cms_live_classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_published_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "teacher_insert_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "admin_insert_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "teacher_update_own_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "admin_update_assigned_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "admin_read_assigned_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "super_admin_manage_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_super_admin_manage" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_teacher_scoped_manage" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_read_policy" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_select_policy" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_anon_select" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_authenticated_select" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_teacher_insert" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_teacher_update" ON public.cms_live_classes;
DROP POLICY IF EXISTS "cms_live_classes_teacher_delete" ON public.cms_live_classes;

-- 12.1 Anonymous Public Preview SELECT
CREATE POLICY "cms_live_classes_anon_select"
    ON public.cms_live_classes FOR SELECT
    TO anon
    USING (status = 'PUBLISHED' AND is_curated_preview = TRUE);

-- 12.2 Authenticated SELECT
-- Enrolled students see published/scheduled sessions in their batch; Teachers see assigned sessions
CREATE POLICY "cms_live_classes_authenticated_select"
    ON public.cms_live_classes FOR SELECT
    TO authenticated
    USING (
        public.is_super_admin()
        OR (status = 'PUBLISHED' AND is_curated_preview = TRUE)
        OR (
            batch_id IS NOT NULL 
            AND public.has_batch_read_entitlement(batch_id)
            AND (status = 'PUBLISHED' OR (is_visible = TRUE AND live_status IN ('SCHEDULED', 'LIVE', 'COMPLETED')))
        )
        OR (
            batch_id IS NOT NULL 
            AND public.is_batch_subject_teacher(batch_id, subject_id)
        )
    );

-- 12.3 Super Admin Full Management
CREATE POLICY "cms_live_classes_super_admin_manage"
    ON public.cms_live_classes FOR ALL
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 12.4 Teacher Scheduling (Direct scheduling in assigned batch & subject without Super Admin approval)
CREATE POLICY "cms_live_classes_teacher_insert"
    ON public.cms_live_classes FOR INSERT
    TO authenticated
    WITH CHECK (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND educator_id = auth.uid()
        AND status = 'DRAFT'
        AND COALESCE(is_curated_preview, FALSE) = FALSE
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
    );

-- 12.5 Teacher Operational Update (Reschedule, operate, attend, complete assigned sessions)
CREATE POLICY "cms_live_classes_teacher_update"
    ON public.cms_live_classes FOR UPDATE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND educator_id = auth.uid()
    )
    WITH CHECK (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND educator_id = auth.uid()
    );

-- 12.6 Teacher Scoped Delete (Owned Drafts / Cancelled sessions only)
CREATE POLICY "cms_live_classes_teacher_delete"
    ON public.cms_live_classes FOR DELETE
    TO authenticated
    USING (
        (public.is_teacher() OR public.is_admin())
        AND batch_id IS NOT NULL
        AND public.is_batch_subject_teacher(batch_id, subject_id)
        AND educator_id = auth.uid()
        AND (status = 'DRAFT' OR live_status = 'CANCELLED')
    );

-- ------------------------------------------------------------------------------
-- 13. Storage CRUD Security Policies — Exact Safe Record Binding
-- Canonical Path Formats:
--   study-materials:    <batch_id>/<material_id>/<filename>
--   test-attachments:   <batch_id>/<test_id>/<filename>
--   lecture-thumbnails: <batch_id>/<lecture_id>/<filename>
-- ------------------------------------------------------------------------------

-- 13.1 STUDY-MATERIALS BUCKET
DROP POLICY IF EXISTS "access_study_materials" ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_study_materials" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_own_study_materials" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_own_study_materials" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "study_materials_authenticated_delete" ON storage.objects;

-- SELECT (Anon): Curated Preview Published Materials
CREATE POLICY "study_materials_anon_select"
    ON storage.objects FOR SELECT
    TO anon
    USING (
        bucket_id = 'study-materials'
        AND EXISTS (
            SELECT 1 FROM public.cms_study_materials sm
            WHERE sm.id = public.try_cast_uuid((storage.foldername(name))[2])
              AND sm.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
              AND sm.status = 'PUBLISHED'
              AND sm.is_curated_preview = TRUE
        )
    );

-- SELECT (Authenticated): Super Admin, Enrolled Student, or Assigned Subject Teacher
CREATE POLICY "study_materials_authenticated_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR EXISTS (
                SELECT 1 FROM public.cms_study_materials sm
                WHERE sm.id = public.try_cast_uuid((storage.foldername(name))[2])
                  AND sm.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                  AND (
                      (sm.status = 'PUBLISHED' AND sm.is_curated_preview = TRUE)
                      OR (sm.status = 'PUBLISHED' AND public.has_batch_read_entitlement(sm.batch_id))
                      OR (public.is_batch_subject_teacher(sm.batch_id, sm.subject_id))
                  )
            )
        )
    );

-- INSERT: Super Admin OR Admin/Teacher assigned to the study material's batch & subject
CREATE POLICY "study_materials_authenticated_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_study_materials sm
                    WHERE sm.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND sm.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND sm.created_by = auth.uid()
                      AND sm.status IN ('DRAFT', 'PENDING_REVIEW')
                      AND public.is_batch_subject_teacher(sm.batch_id, sm.subject_id)
                )
            )
        )
    );

-- UPDATE: Super Admin OR Admin/Teacher assigned to draft study material
CREATE POLICY "study_materials_authenticated_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_study_materials sm
                    WHERE sm.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND sm.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND sm.created_by = auth.uid()
                      AND sm.status = 'DRAFT'
                      AND public.is_batch_subject_teacher(sm.batch_id, sm.subject_id)
                )
            )
        )
    )
    WITH CHECK (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_study_materials sm
                    WHERE sm.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND sm.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND sm.created_by = auth.uid()
                      AND sm.status = 'DRAFT'
                      AND public.is_batch_subject_teacher(sm.batch_id, sm.subject_id)
                )
            )
        )
    );

-- DELETE: Super Admin OR Admin/Teacher assigned to draft study material
CREATE POLICY "study_materials_authenticated_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'study-materials'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_study_materials sm
                    WHERE sm.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND sm.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND sm.created_by = auth.uid()
                      AND sm.status = 'DRAFT'
                      AND public.is_batch_subject_teacher(sm.batch_id, sm.subject_id)
                )
            )
        )
    );

-- 13.2 TEST-ATTACHMENTS BUCKET (Super Admin exclusive write)
DROP POLICY IF EXISTS "test_attachments_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "test_attachments_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "test_attachments_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "test_attachments_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "test_attachments_manage_policy" ON storage.objects;
DROP POLICY IF EXISTS "test_attachments_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "test_attachments_authenticated_select" ON storage.objects;

-- SELECT (Anon)
CREATE POLICY "test_attachments_anon_select"
    ON storage.objects FOR SELECT
    TO anon
    USING (
        bucket_id = 'test-attachments'
        AND EXISTS (
            SELECT 1 FROM public.student_tests st
            WHERE st.id = public.try_cast_uuid((storage.foldername(name))[2])
              AND st.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
              AND st.status = 'PUBLISHED'
              AND st.is_curated_preview = TRUE
        )
    );

-- SELECT (Authenticated)
CREATE POLICY "test_attachments_authenticated_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'test-attachments'
        AND (
            public.is_super_admin()
            OR EXISTS (
                SELECT 1 FROM public.student_tests st
                WHERE st.id = public.try_cast_uuid((storage.foldername(name))[2])
                  AND st.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                  AND (
                      (st.status = 'PUBLISHED' AND st.is_curated_preview = TRUE)
                      OR (st.status = 'PUBLISHED' AND public.has_batch_read_entitlement(st.batch_id))
                  )
            )
        )
    );

-- MANAGE (Super Admin Exclusive)
CREATE POLICY "test_attachments_manage_policy"
    ON storage.objects FOR ALL
    TO authenticated
    USING (bucket_id = 'test-attachments' AND public.is_super_admin())
    WITH CHECK (bucket_id = 'test-attachments' AND public.is_super_admin());

-- 13.3 LECTURE-THUMBNAILS BUCKET (Exact Record Binding)
DROP POLICY IF EXISTS "public_read_lecture_thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "access_lecture_thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "admin_upload_lecture_thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "admin_update_own_lecture_thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_own_lecture_thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "lecture_thumbnails_authenticated_delete" ON storage.objects;

-- SELECT (Anon): Published Curated Preview Lecture Thumbnails
CREATE POLICY "lecture_thumbnails_anon_select"
    ON storage.objects FOR SELECT
    TO anon
    USING (
        bucket_id = 'lecture-thumbnails'
        AND EXISTS (
            SELECT 1 FROM public.cms_lectures l
            WHERE l.id = public.try_cast_uuid((storage.foldername(name))[2])
              AND l.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
              AND l.status = 'PUBLISHED'
              AND l.is_curated_preview = TRUE
        )
    );

-- SELECT (Authenticated): Super Admin, Enrolled Student, or Assigned Subject Teacher
CREATE POLICY "lecture_thumbnails_authenticated_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'lecture-thumbnails'
        AND (
            public.is_super_admin()
            OR EXISTS (
                SELECT 1 FROM public.cms_lectures l
                WHERE l.id = public.try_cast_uuid((storage.foldername(name))[2])
                  AND l.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                  AND (
                      (l.status = 'PUBLISHED' AND l.is_curated_preview = TRUE)
                      OR (l.status = 'PUBLISHED' AND public.has_batch_read_entitlement(l.batch_id))
                      OR (public.is_batch_subject_teacher(l.batch_id, l.subject_id))
                  )
            )
        )
    );

-- INSERT: Super Admin OR Assigned Teacher/Admin for Draft/Pending Lecture
CREATE POLICY "lecture_thumbnails_authenticated_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'lecture-thumbnails'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_lectures l
                    WHERE l.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND l.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND l.created_by = auth.uid()
                      AND l.status IN ('DRAFT', 'PENDING_REVIEW')
                      AND public.is_batch_subject_teacher(l.batch_id, l.subject_id)
                )
            )
        )
    );

-- UPDATE: Super Admin OR Assigned Teacher/Admin on Draft Lecture
CREATE POLICY "lecture_thumbnails_authenticated_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'lecture-thumbnails'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_lectures l
                    WHERE l.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND l.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND l.created_by = auth.uid()
                      AND l.status = 'DRAFT'
                      AND public.is_batch_subject_teacher(l.batch_id, l.subject_id)
                )
            )
        )
    )
    WITH CHECK (
        bucket_id = 'lecture-thumbnails'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_lectures l
                    WHERE l.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND l.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND l.created_by = auth.uid()
                      AND l.status = 'DRAFT'
                      AND public.is_batch_subject_teacher(l.batch_id, l.subject_id)
                )
            )
        )
    );

-- DELETE: Super Admin OR Assigned Teacher/Admin on Draft Lecture
CREATE POLICY "lecture_thumbnails_authenticated_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'lecture-thumbnails'
        AND (
            public.is_super_admin()
            OR (
                (public.is_teacher() OR public.is_admin())
                AND EXISTS (
                    SELECT 1 FROM public.cms_lectures l
                    WHERE l.id = public.try_cast_uuid((storage.foldername(name))[2])
                      AND l.batch_id = public.try_cast_uuid((storage.foldername(name))[1])
                      AND l.created_by = auth.uid()
                      AND l.status = 'DRAFT'
                      AND public.is_batch_subject_teacher(l.batch_id, l.subject_id)
                )
            )
        )
    );

-- ------------------------------------------------------------------------------
-- 14. Function Privilege Hardening (Exact Revocations & Grants)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.try_cast_uuid(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.try_cast_uuid(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.try_cast_uuid(TEXT) FROM authenticated;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM authenticated;

REVOKE ALL ON FUNCTION public.is_teacher() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_teacher() FROM anon;
REVOKE ALL ON FUNCTION public.is_teacher() FROM authenticated;

REVOKE ALL ON FUNCTION public.is_student() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_student() FROM anon;
REVOKE ALL ON FUNCTION public.is_student() FROM authenticated;

REVOKE ALL ON FUNCTION public.is_batch_teacher(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_batch_teacher(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.is_batch_teacher(UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.is_batch_subject_teacher(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_batch_subject_teacher(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.is_batch_subject_teacher(UUID, UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.is_actively_enrolled_in_batch(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_actively_enrolled_in_batch(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.is_actively_enrolled_in_batch(UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.has_batch_read_entitlement(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_batch_read_entitlement(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.has_batch_read_entitlement(UUID) FROM authenticated;

REVOKE ALL ON FUNCTION public.can_student_access_content(BOOLEAN, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_student_access_content(BOOLEAN, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.can_student_access_content(BOOLEAN, UUID, TEXT) FROM authenticated;

-- Minimum Required Grants:
GRANT EXECUTE ON FUNCTION public.try_cast_uuid(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_student() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_batch_teacher(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_batch_subject_teacher(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_actively_enrolled_in_batch(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_batch_read_entitlement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_student_access_content(BOOLEAN, UUID, TEXT) TO anon, authenticated;

COMMIT;
