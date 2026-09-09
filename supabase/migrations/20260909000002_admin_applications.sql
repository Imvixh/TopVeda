-- ==============================================================================
-- TopVeda Phase 3.1: Admin Applications, Document Storage & Review System
-- Architecture: Admin registration creates profiles.role = 'ADMIN' + application.status = 'PENDING'
-- Access to Admin Portal strictly requires profiles.role = 'ADMIN' AND application.status = 'APPROVED'
-- ==============================================================================

-- 1. Automatic Profile Creation Trigger on Signup
-- Supports role = 'STUDENT' or role = 'ADMIN' from metadata; strictly prohibits SUPER_ADMIN self-assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_role VARCHAR(50);
BEGIN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User');
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT');

    -- Strictly forbid self-assignment of SUPER_ADMIN
    IF v_role NOT IN ('STUDENT', 'ADMIN') THEN
        v_role := 'STUDENT';
    END IF;

    -- Insert application profile with designated initial role
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
        v_role,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = CASE WHEN EXCLUDED.full_name <> 'User' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        phone = CASE WHEN public.profiles.phone = '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
        role = CASE WHEN public.profiles.role = 'STUDENT' AND EXCLUDED.role = 'ADMIN' THEN 'ADMIN' ELSE public.profiles.role END,
        updated_at = pg_catalog.now();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 2. Create admin_applications table
CREATE TABLE IF NOT EXISTS public.admin_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    document_storage_path TEXT NOT NULL,
    document_file_name VARCHAR(255) NOT NULL,
    document_file_size INT NOT NULL,
    document_mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    -- Enforce that document path strictly belongs to the applicant's folder namespace
    CONSTRAINT chk_document_storage_path_owner CHECK (document_storage_path LIKE (user_id::text || '/%'))
);

-- 3. Indexes: Partial Unique Index allowing at most ONE active PENDING application per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_apps_one_pending 
    ON public.admin_applications (user_id) 
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_admin_apps_user_history ON public.admin_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_admin_apps_status ON public.admin_applications (status);

-- 4. Automatic Updated_At Trigger
DROP TRIGGER IF EXISTS set_admin_applications_updated_at ON public.admin_applications;
CREATE TRIGGER set_admin_applications_updated_at
    BEFORE UPDATE ON public.admin_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 5. Database-Level Document Existence & Ownership Validation Trigger
CREATE OR REPLACE FUNCTION public.validate_admin_application_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- 1. Ensure path strictly belongs to the applicant's UUID folder namespace
    IF NOT (NEW.document_storage_path LIKE (NEW.user_id::text || '/%')) THEN
        RAISE EXCEPTION 'Invalid document path: Document must reside within applicant folder namespace.';
    END IF;

    -- 2. Verify that the referenced object actually exists in the private 'admin-documents' bucket
    IF NOT EXISTS (
        SELECT 1 FROM storage.objects
        WHERE bucket_id = 'admin-documents'
          AND name = NEW.document_storage_path
    ) THEN
        RAISE EXCEPTION 'Document not found: The referenced file does not exist in the admin-documents vault.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_admin_application_document ON public.admin_applications;
CREATE TRIGGER trg_validate_admin_application_document
    BEFORE INSERT ON public.admin_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_admin_application_document();

-- 6. Row Level Security (RLS) on public.admin_applications
ALTER TABLE public.admin_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Applicants can view their own application history
DROP POLICY IF EXISTS "Applicants can view own applications" ON public.admin_applications;
CREATE POLICY "Applicants can view own applications"
    ON public.admin_applications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy: Super Admins can view all applications
DROP POLICY IF EXISTS "Super Admins can view all applications" ON public.admin_applications;
CREATE POLICY "Super Admins can view all applications"
    ON public.admin_applications
    FOR SELECT
    TO authenticated
    USING (public.is_super_admin());

-- Policy: Only authenticated users with active role = 'ADMIN' can submit applications
DROP POLICY IF EXISTS "Students can submit own application" ON public.admin_applications;
DROP POLICY IF EXISTS "Admins can submit own application" ON public.admin_applications;
CREATE POLICY "Admins can submit own application"
    ON public.admin_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'ADMIN'
        )
    );

-- 7. Storage RLS Policies for private bucket 'admin-documents'
DROP POLICY IF EXISTS "Applicants can upload own admin documents" ON storage.objects;
CREATE POLICY "Applicants can upload own admin documents"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'admin-documents' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "Applicants and Super Admins can view admin documents" ON storage.objects;
CREATE POLICY "Applicants and Super Admins can view admin documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'admin-documents' AND (
            (storage.foldername(name))[1] = auth.uid()::text OR
            public.is_super_admin()
        )
    );

DROP POLICY IF EXISTS "Super Admins can delete admin documents" ON storage.objects;
CREATE POLICY "Super Admins can delete admin documents"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'admin-documents' AND
        public.is_super_admin()
    );

-- 8. Hardened Application Review RPC Function
CREATE OR REPLACE FUNCTION public.review_admin_application(
    p_application_id UUID,
    p_decision VARCHAR(50),
    p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_app RECORD;
    v_user RECORD;
    v_profile RECORD;
BEGIN
    -- 1. Validate decision parameter
    IF p_decision IS NULL OR p_decision NOT IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Invalid decision. Must be APPROVED or REJECTED.';
    END IF;

    -- 2. Check reviewer is a SUPER_ADMIN
    IF NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Administrators can review applications.';
    END IF;

    -- 3. Check application exists (lock row for update)
    SELECT * INTO v_app 
    FROM public.admin_applications 
    WHERE id = p_application_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found.';
    END IF;

    -- 4. Check application status is PENDING
    IF v_app.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Application has already been processed.';
    END IF;

    -- 5. Check reviewer is NOT the applicant
    IF v_app.user_id = auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You cannot review your own application.';
    END IF;

    -- Fetch applicant auth user
    SELECT * INTO v_user 
    FROM auth.users 
    WHERE id = v_app.user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Applicant user account does not exist.';
    END IF;

    -- 6. Check applicant email is verified
    IF v_user.email_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Applicant email is not verified.';
    END IF;

    -- 7. Check applicant phone is verified
    IF v_user.phone_confirmed_at IS NULL THEN
        RAISE EXCEPTION 'Applicant phone is not verified.';
    END IF;

    -- 8. Verify application data consistency against auth.users
    IF LOWER(TRIM(v_app.email)) <> LOWER(TRIM(v_user.email)) THEN
        RAISE EXCEPTION 'Application email does not match verified auth user email.';
    END IF;

    IF v_user.phone IS NOT NULL AND v_user.phone <> '' THEN
        IF v_app.phone <> v_user.phone THEN
            RAISE EXCEPTION 'Application phone does not match verified auth user phone.';
        END IF;
    END IF;

    -- 9. Check applicant profile exists
    SELECT * INTO v_profile 
    FROM public.profiles 
    WHERE id = v_app.user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Applicant profile does not exist.';
    END IF;

    -- 10. Check applicant profile role is ADMIN
    IF v_profile.role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Applicant role is not ADMIN (current role: %).', v_profile.role;
    END IF;

    -- 11. Process Decision
    IF p_decision = 'APPROVED' THEN
        -- Atomically update application status
        UPDATE public.admin_applications
        SET status = 'APPROVED',
            reviewed_by = auth.uid(),
            reviewed_at = pg_catalog.now(),
            updated_at = pg_catalog.now()
        WHERE id = p_application_id;

        -- Ensure profile role is ADMIN
        UPDATE public.profiles
        SET role = 'ADMIN',
            updated_at = pg_catalog.now()
        WHERE id = v_app.user_id;

    ELSIF p_decision = 'REJECTED' THEN
        -- Atomically update application with rejection reason
        UPDATE public.admin_applications
        SET status = 'REJECTED',
            rejection_reason = p_rejection_reason,
            reviewed_by = auth.uid(),
            reviewed_at = pg_catalog.now(),
            updated_at = pg_catalog.now()
        WHERE id = p_application_id;

        -- Profile role remains ADMIN
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'status', p_decision,
        'application_id', p_application_id,
        'user_id', v_app.user_id,
        'email', v_app.email,
        'full_name', v_app.full_name
    );
END;
$$;

-- 9. Explicitly Restrict RPC Execution Permissions
REVOKE EXECUTE ON FUNCTION public.review_admin_application(UUID, VARCHAR, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_admin_application(UUID, VARCHAR, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_admin_application(UUID, VARCHAR, TEXT) TO authenticated;
