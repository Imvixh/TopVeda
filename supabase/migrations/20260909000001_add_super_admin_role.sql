-- ==============================================================================
-- TopVeda Migration: Add SUPER_ADMIN Role & Role Guard Security Trigger
-- Hardened with explicit SET search_path = ''
-- ==============================================================================

-- 1. Update check constraint on public.profiles to accept 'SUPER_ADMIN'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('STUDENT', 'ADMIN', 'SUPER_ADMIN'));

-- 2. Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$;

-- 3. Role Modification & Self-Promotion Guard Trigger
CREATE OR REPLACE FUNCTION public.handle_profile_role_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- If role is being changed
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Allow direct database operations (SQL Editor, Table Editor, Service Role where auth.uid() is NULL)
        IF auth.uid() IS NOT NULL THEN
            -- Only SUPER_ADMIN can alter user roles via client API
            IF NOT public.is_super_admin() THEN
                RAISE EXCEPTION 'Unauthorized: You do not have permission to modify user roles.';
            END IF;

            -- Prevent self-promotion to SUPER_ADMIN
            IF NEW.id = auth.uid() AND OLD.role <> 'SUPER_ADMIN' THEN
                RAISE EXCEPTION 'Unauthorized: Self-promotion to SUPER_ADMIN is prohibited.';
            END IF;
        END IF;
    END IF;

    -- Prevent direct email alteration in public.profiles (must be changed via Supabase Auth)
    IF NEW.email IS DISTINCT FROM OLD.email THEN
        IF auth.uid() IS NOT NULL THEN
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

-- 4. Update RLS policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_super_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Super Admins can update all profiles" ON public.profiles;
CREATE POLICY "Super Admins can update all profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());
