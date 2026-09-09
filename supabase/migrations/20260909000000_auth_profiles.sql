-- ==============================================================================
-- TopVeda Phase 3: Supabase Authentication & User Profiles Migration
-- Hardened with explicit SET search_path = '' and schema-qualified references
-- Supported Roles: 'STUDENT', 'ADMIN', 'SUPER_ADMIN'
-- ==============================================================================

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role VARCHAR(50) DEFAULT 'STUDENT' NOT NULL CHECK (role IN ('STUDENT', 'ADMIN', 'SUPER_ADMIN')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 2. Enforce Unique Constraints and Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 3. Security Helper Functions (SECURITY DEFINER + search_path protection)
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

-- 4. Automatic Updated_At Trigger Function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = pg_catalog.now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Role Modification & Self-Promotion Guard Trigger
-- Strictly prohibits non-super-admins from changing roles or self-promoting
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

-- 6. Automatic Profile Creation Trigger on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
BEGIN
    -- Extract full name and phone from user metadata supplied during signup
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Student');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

    -- Insert application profile with default role 'STUDENT'
    -- Note: Client cannot self-assign 'ADMIN' or 'SUPER_ADMIN' role; role always defaults to 'STUDENT'
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        phone,
        role,
        avatar_url
    ) VALUES (
        NEW.id,
        v_full_name,
        NEW.email,
        v_phone,
        'STUDENT',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = CASE WHEN EXCLUDED.full_name <> 'Student' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        phone = CASE WHEN public.profiles.phone = '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
        updated_at = pg_catalog.now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 7. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Admins and Super Admins can view all user profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_super_admin());

-- Policy: Users can update permitted fields on their own profile
-- (Role and email modifications are blocked by trg_profile_role_guard trigger)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Super Admins can update any user profile
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON public.profiles;
CREATE POLICY "Super Admins can update all profiles"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 8. Safe Backfill for Any Pre-Existing Auth Users
-- (Preserves existing Auth users and creates their profile row as STUDENT)
INSERT INTO public.profiles (
    id,
    full_name,
    email,
    phone,
    role,
    avatar_url
)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', 'Student'),
    COALESCE(u.email, ''),
    COALESCE(u.raw_user_meta_data->>'phone', ''),
    'STUDENT',
    u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
