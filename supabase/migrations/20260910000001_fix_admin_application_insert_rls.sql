-- ==============================================================================
-- TopVeda Migration: Fix admin_applications INSERT Row-Level Security (RLS) Policy
-- Architecture: Admin registration creates profiles.role = 'ADMIN'.
-- The applicant then submits their application with status = 'PENDING'.
-- This migration ensures the database RLS policy allows authenticated users with
-- profiles.role = 'ADMIN' to insert their own PENDING application.
-- ==============================================================================

-- 1. Ensure RLS is enabled on public.admin_applications
ALTER TABLE public.admin_applications ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy / conflicting INSERT policies on public.admin_applications
DROP POLICY IF EXISTS "Students can submit own application" ON public.admin_applications;
DROP POLICY IF EXISTS "Users can submit own application" ON public.admin_applications;
DROP POLICY IF EXISTS "Admins can submit own application" ON public.admin_applications;
DROP POLICY IF EXISTS "Authenticated users can submit own application" ON public.admin_applications;
DROP POLICY IF EXISTS "Applicants can submit own application" ON public.admin_applications;
DROP POLICY IF EXISTS "Anyone can submit application" ON public.admin_applications;

-- 3. Create the authoritative, hardened INSERT policy for Admin Applicants
CREATE POLICY "Admins can submit own application"
    ON public.admin_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'PENDING'
        AND EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = auth.uid()
              AND role = 'ADMIN'
        )
    );

-- 4. Preserve / Ensure SELECT policies for applicants and Super Admins
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.admin_applications;
CREATE POLICY "Applicants can view own applications"
    ON public.admin_applications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super Admins can view all applications" ON public.admin_applications;
CREATE POLICY "Super Admins can view all applications"
    ON public.admin_applications
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- 5. Explicitly grant required table privileges to authenticated role
GRANT SELECT, INSERT ON public.admin_applications TO authenticated;
