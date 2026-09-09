-- ==============================================================================
-- TopVeda Phase 3: Supabase Authentication & User Profiles Migration
-- ==============================================================================

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    role VARCHAR(50) DEFAULT 'STUDENT' NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Enforce Unique Constraints and Indexes
-- Normalized email index for fast and case-insensitive unique lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (LOWER(email));

-- Normalized Indian phone (+91XXXXXXXXXX) unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);

-- Role index for authorization filtering
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 3. Automatic Updated_At Trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Automatic Profile Creation Trigger on Signup
-- Fires database-side when a user is created in Supabase Auth (auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
BEGIN
    -- Extract full name and phone from user metadata supplied during signup
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

    -- Insert application profile with default role 'STUDENT'
    -- Note: Client cannot self-assign 'ADMIN' role; role is strictly controlled
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
        full_name = EXCLUDED.full_name,
        phone = CASE WHEN public.profiles.phone = '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Users can update permitted fields on their own profile
-- (Role changes are prevented by checking that NEW.role matches existing role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Admins can view all user profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );
