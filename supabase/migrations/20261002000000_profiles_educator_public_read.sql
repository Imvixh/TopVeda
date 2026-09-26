-- ==============================================================================
-- TopVeda: Educator Public Profiles Read Policy
-- Allows all users (authenticated students and public guests) to view
-- public faculty/educator profiles (role IN ('ADMIN', 'SUPER_ADMIN'))
-- for live classes, courses, and teacher identity resolution.
-- ==============================================================================

-- Policy: Educator profiles are readable by anyone for public display
DROP POLICY IF EXISTS "Educator profiles are viewable by all" ON public.profiles;
CREATE POLICY "Educator profiles are viewable by all"
    ON public.profiles
    FOR SELECT
    TO anon, authenticated
    USING (role IN ('ADMIN', 'SUPER_ADMIN'));
