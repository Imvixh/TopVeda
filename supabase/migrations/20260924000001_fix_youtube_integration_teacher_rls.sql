-- ==============================================================================
-- TopVeda Migration: Fix YouTube Integration SELECT Policy for Educators (Teachers)
-- Target Table: public.cms_platform_integrations
-- 
-- Objectives:
-- 1. Drop existing SUPER_ADMIN-only SELECT policy.
-- 2. Create new SELECT policy permitting both SUPER_ADMIN and ADMIN (Educator) roles.
-- 3. Strictly preserve SUPER_ADMIN-only restrictions for INSERT, UPDATE, and DELETE.
-- 4. Retain strict blocking of anonymous and STUDENT users.
-- ==============================================================================

-- 1. Safely drop prior SELECT policy if present
DROP POLICY IF EXISTS "Super Admins can view platform integrations" ON public.cms_platform_integrations;
DROP POLICY IF EXISTS "Super Admins and Educators can view platform integrations" ON public.cms_platform_integrations;

-- 2. Create updated SELECT policy permitting Super Admins and Educators (ADMIN)
CREATE POLICY "Super Admins and Educators can view platform integrations"
  ON public.cms_platform_integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );
