-- ==============================================================================
-- TopVeda Phase 5G + 5H: Notifications & Profile Architecture Migration
-- Hardened with explicit SET search_path = '' and schema-qualified references
-- Extends: cms_notifications, profiles, student_learning_preferences, storage.buckets
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Profiles Table Enhancement (Qualification & Bio)
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS qualification VARCHAR(255),
    ADD COLUMN IF NOT EXISTS bio TEXT;

-- ------------------------------------------------------------------------------
-- 2. Unified Notification Architecture Enhancement (cms_notifications)
-- ------------------------------------------------------------------------------

-- Add category column if not exists
ALTER TABLE public.cms_notifications
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'CLASSES';

-- Update category check constraint
ALTER TABLE public.cms_notifications
    DROP CONSTRAINT IF EXISTS cms_notifications_category_check;

ALTER TABLE public.cms_notifications
    ADD CONSTRAINT cms_notifications_category_check
    CHECK (category IN ('CLASSES', 'TESTS', 'ANNOUNCEMENTS', 'STUDY_MATERIAL', 'LEARNING', 'SYSTEM'));

-- Expand entity_type check constraint to support Tests, Announcements, and Courses
ALTER TABLE public.cms_notifications
    DROP CONSTRAINT IF EXISTS cms_notifications_entity_type_check;

ALTER TABLE public.cms_notifications
    ADD CONSTRAINT cms_notifications_entity_type_check
    CHECK (entity_type IN ('LIVE_CLASS', 'LECTURE', 'BATCH', 'STUDY_MATERIAL', 'TEST', 'ANNOUNCEMENT', 'COURSE', 'SYSTEM'));

-- Composite index for rapid category and recipient tab filtering
CREATE INDEX IF NOT EXISTS idx_cms_notifications_category_recipient
    ON public.cms_notifications (recipient_id, category, is_read, created_at DESC);

-- Ensure RLS is active on cms_notifications
ALTER TABLE public.cms_notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 3. Storage Bucket for User Avatars
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Public for avatar CDN delivery
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies for avatars
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "auth_upload_own_avatar" ON storage.objects;
CREATE POLICY "auth_upload_own_avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "auth_update_own_avatar" ON storage.objects;
CREATE POLICY "auth_update_own_avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "auth_delete_own_avatar" ON storage.objects;
CREATE POLICY "auth_delete_own_avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = auth.uid()::text
    );
