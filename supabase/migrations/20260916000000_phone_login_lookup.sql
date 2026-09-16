-- ==============================================================================
-- TopVeda Migration: Secure Phone to Auth Email Lookup for Phone + Password Login
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_email_by_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
        RETURN NULL;
    END IF;

    SELECT email INTO v_email
    FROM public.profiles
    WHERE phone = TRIM(p_phone)
    LIMIT 1;

    RETURN v_email;
END;
$$;

-- Grant execution permissions
REVOKE EXECUTE ON FUNCTION public.get_auth_email_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_email_by_phone(TEXT) TO anon, authenticated, service_role;
