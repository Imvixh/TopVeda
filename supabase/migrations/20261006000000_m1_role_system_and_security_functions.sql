-- ==============================================================================
-- TopVeda Milestone M1: Three-Role System & Decoupled Security Functions
-- Approved Architecture: Three Distinct Roles ('STUDENT', 'ADMIN', 'SUPER_ADMIN')
-- Consolidation: Admin role encompasses all administrative and teacher capabilities
-- Super Admin: Retains exclusive publishing, approval, and system authority
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles Table Schema Hardening (Role Constraint & Active Status Column)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) THEN
        -- Strictly enforce 3 roles in profiles
        ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
            CHECK (role IN ('STUDENT', 'ADMIN', 'SUPER_ADMIN'));

        -- Ensure status column exists for active account enforcement
        ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
    END IF;
END $$;

-- Table-Level Privilege Lockdown on public.profiles:
-- Revoke all direct table-level privileges from anon and PUBLIC
REVOKE ALL ON TABLE public.profiles FROM PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM anon;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

-- ------------------------------------------------------------------------------
-- 2. Ensure cms_batch_teachers and student_enrollments Compatibility
-- ------------------------------------------------------------------------------

-- Ensure valid_until column exists on student_enrollments (per Architecture v7.0)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ NULL;
    END IF;
END $$;

-- Base Table Definition for cms_batch_teachers
CREATE TABLE IF NOT EXISTS public.cms_batch_teachers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    subject_id UUID NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent Column Additions (in case table existed with a legacy schema)
ALTER TABLE public.cms_batch_teachers ADD COLUMN IF NOT EXISTS batch_id UUID NOT NULL;
ALTER TABLE public.cms_batch_teachers ADD COLUMN IF NOT EXISTS teacher_id UUID NOT NULL;
ALTER TABLE public.cms_batch_teachers ADD COLUMN IF NOT EXISTS subject_id UUID NULL;
ALTER TABLE public.cms_batch_teachers ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.cms_batch_teachers ADD COLUMN IF NOT EXISTS assigned_by UUID NULL;
ALTER TABLE public.cms_batch_teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Foreign Key Constraints
DO $$
BEGIN
    -- FK to cms_batches
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cms_batch_teachers_batch' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers
            ADD CONSTRAINT fk_cms_batch_teachers_batch
            FOREIGN KEY (batch_id) REFERENCES public.cms_batches(id) ON DELETE CASCADE;
    END IF;

    -- FK to profiles (teacher/admin)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cms_batch_teachers_teacher' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers
            ADD CONSTRAINT fk_cms_batch_teachers_teacher
            FOREIGN KEY (teacher_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    -- FK to cms_subjects
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cms_batch_teachers_subject' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers
            ADD CONSTRAINT fk_cms_batch_teachers_subject
            FOREIGN KEY (subject_id) REFERENCES public.cms_subjects(id) ON DELETE SET NULL;
    END IF;

    -- FK to profiles (assigned_by)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cms_batch_teachers_assigned_by' AND table_name = 'cms_batch_teachers'
    ) THEN
        ALTER TABLE public.cms_batch_teachers
            ADD CONSTRAINT fk_cms_batch_teachers_assigned_by
            FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Handle Nullable subject_id Uniqueness:
-- Two partial unique indexes prevent duplicates whether subject_id is NULL or specified
CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_teacher_subject_not_null
    ON public.cms_batch_teachers(batch_id, teacher_id, subject_id)
    WHERE subject_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_teacher_subject_null
    ON public.cms_batch_teachers(batch_id, teacher_id)
    WHERE subject_id IS NULL;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_batch_teachers_batch_id ON public.cms_batch_teachers(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_teachers_teacher_id ON public.cms_batch_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_batch_teachers_subject_id ON public.cms_batch_teachers(subject_id);

-- ------------------------------------------------------------------------------
-- 3. Implement Database Security & Authorization Functions (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- 1. Super Admin Authority (Active account verified)
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

-- 2. Admin Authority (Consolidated Admin & Faculty Role, Active account verified)
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
      AND role IN ('ADMIN', 'SUPER_ADMIN')
      AND COALESCE(status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- Backward-Compatibility Alias for Existing RLS Policies
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT public.is_admin();
$$;

-- 3. Educator Authority (Resolves to Admin or Super Admin)
CREATE OR REPLACE FUNCTION public.is_educator()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT public.is_admin();
$$;

-- 4. Batch Teacher Assignment Validation (Active Educator & Assigned in cms_batch_teachers)
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
      AND p.role IN ('ADMIN', 'SUPER_ADMIN')
      AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 5. Batch-Subject Teacher Assignment Validation (Subject-Level Scoping, Active Educator)
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
      AND (bt.subject_id = p_subject_id OR bt.subject_id IS NULL)
      AND bt.teacher_id = auth.uid()
      AND p.role IN ('ADMIN', 'SUPER_ADMIN')
      AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
  );
$$;

-- 6. Active Student Enrollment Verification (Active Student Profile, Active Batch Lifecycle, Valid Period)
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

-- 7. Batch Historical / Active Access (Active Student Profile, Published Batch, Active or Completed Status)
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
      AND se.status::text IN ('ACTIVE', 'COMPLETED')
      AND p.role = 'STUDENT'
      AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE'
      AND b.status = 'PUBLISHED'
  );
$$;

-- Backward-Compatibility Alias
CREATE OR REPLACE FUNCTION public.has_historical_batch_access(p_batch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
STABLE
AS $$
  SELECT public.has_batch_read_entitlement(p_batch_id);
$$;

-- 8. Content Access Authorization Function
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
    -- 1. Curated preview on published content is viewable by all
    (p_is_curated_preview = TRUE AND p_status = 'PUBLISHED')
    OR
    -- 2. Enrolled students in active or completed batch can view published content
    (
      p_status = 'PUBLISHED' 
      AND p_batch_id IS NOT NULL 
      AND public.has_batch_read_entitlement(p_batch_id)
    )
    OR
    -- 3. Active staff/educators (ADMIN or SUPER_ADMIN) have global staff access
    public.is_educator()
  );
$$;

-- ------------------------------------------------------------------------------
-- 4. Function Privilege Hardening (Revoke default PUBLIC, Grant intended roles)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_or_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_educator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_batch_teacher(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_batch_subject_teacher(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_actively_enrolled_in_batch(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_batch_read_entitlement(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_historical_batch_access(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_student_access_content(BOOLEAN, UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_educator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_batch_teacher(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_batch_subject_teacher(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_actively_enrolled_in_batch(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_batch_read_entitlement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_historical_batch_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_student_access_content(BOOLEAN, UUID, TEXT) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. Non-Recursive Row Level Security Policies & Safe Public Views
-- ------------------------------------------------------------------------------

-- Drop legacy/insecure policies on public.profiles
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

-- Ensure RLS is active on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Non-Recursive Authenticated Read Policy:
-- Self-read OR Active Admin/Super Admin read (uses SECURITY DEFINER is_admin() to prevent RLS recursion)
CREATE POLICY "profiles_read_authorized"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- 2. User Self-Update (Permitted personal fields, guarded against role elevation by trigger)
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. Super Admin Full-Update (Role assignment and administrative updates)
CREATE POLICY "profiles_super_admin_update"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 4. Expose ONLY safe, non-sensitive public educator profile fields to public/anon via secure view
CREATE OR REPLACE VIEW public.public_educator_profiles_view AS
SELECT 
    p.id,
    p.full_name,
    p.role,
    p.avatar_url,
    p.qualification,
    p.bio
FROM public.profiles p
WHERE p.role IN ('ADMIN', 'SUPER_ADMIN')
  AND COALESCE(p.status, 'ACTIVE') = 'ACTIVE';

GRANT SELECT ON public.public_educator_profiles_view TO anon, authenticated;

-- 5. Enable RLS and Policies on cms_batch_teachers
ALTER TABLE public.cms_batch_teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cms_batch_teachers_read_all" ON public.cms_batch_teachers;
CREATE POLICY "cms_batch_teachers_read_all"
    ON public.cms_batch_teachers
    FOR SELECT
    TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "cms_batch_teachers_admin_manage" ON public.cms_batch_teachers;
CREATE POLICY "cms_batch_teachers_admin_manage"
    ON public.cms_batch_teachers
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

