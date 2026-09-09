-- ==============================================================================
-- TopVeda Migration: Remove Phone OTP Requirement from Admin Application Review
-- Preserves all authoritative security checks, email verification, document vault verification,
-- one-pending constraint, and Super Admin authorization while removing SMS OTP checks.
-- ==============================================================================

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

    -- 7. Verify application email consistency against auth.users
    IF LOWER(TRIM(v_app.email)) <> LOWER(TRIM(v_user.email)) THEN
        RAISE EXCEPTION 'Application email does not match verified auth user email.';
    END IF;

    -- 8. Check applicant profile exists
    SELECT * INTO v_profile 
    FROM public.profiles 
    WHERE id = v_app.user_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Applicant profile does not exist.';
    END IF;

    -- 9. Check applicant profile role is ADMIN
    IF v_profile.role <> 'ADMIN' THEN
        RAISE EXCEPTION 'Applicant role is not ADMIN (current role: %).', v_profile.role;
    END IF;

    -- 10. Process Decision
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

-- Explicitly Restrict RPC Execution Permissions
REVOKE EXECUTE ON FUNCTION public.review_admin_application(UUID, VARCHAR, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_admin_application(UUID, VARCHAR, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.review_admin_application(UUID, VARCHAR, TEXT) TO authenticated;
