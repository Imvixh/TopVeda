-- ==============================================================================
-- TopVeda: Profiles Location & Address Schema Enhancement
-- Adds location and address fields to public.profiles table
-- ==============================================================================

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address TEXT;
