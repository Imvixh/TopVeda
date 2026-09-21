-- ==============================================================================
-- TopVeda Phase 4.1: CMS Media Storage Architecture & Bucket RLS Policies
-- Architecture Version: 4.0 (Hardened Production Specification)
-- Buckets: cms-banners (public), lecture-thumbnails (private),
--          cms-assets (private), study-materials (private vault)
-- Roles: STUDENT (Published media access only), ADMIN (Own folder namespace),
--        SUPER_ADMIN (Full CMS media governance)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Provision CMS Storage Buckets
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'cms-banners',
        'cms-banners',
        true, -- Public: High-speed edge CDN delivery of Super Admin hero carousels
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif']
    ),
    (
        'lecture-thumbnails',
        'lecture-thumbnails',
        false, -- Private: Prevents unapproved teacher drafts from being publicly accessible
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    ),
    (
        'cms-assets',
        'cms-assets',
        false, -- Private: Prevents unapproved custom graphics/avatars from being publicly accessible
        5242880, -- 5MB limit
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    ),
    (
        'study-materials',
        'study-materials',
        false, -- Private vault: strictly gates PDF downloads behind published records
        52428800, -- 50MB limit
        ARRAY['application/pdf']
    )
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ------------------------------------------------------------------------------
-- 2. Storage RLS Policies: cms-banners (Public Bucket - Super Admin Managed)
-- ------------------------------------------------------------------------------

-- Public read for student discovery & landing page hero carousels
DROP POLICY IF EXISTS "public_read_cms_banners" ON storage.objects;
CREATE POLICY "public_read_cms_banners"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'cms-banners');

-- Super Admin full upload & management
DROP POLICY IF EXISTS "super_admin_manage_cms_banners" ON storage.objects;
CREATE POLICY "super_admin_manage_cms_banners"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'cms-banners' AND
        public.is_super_admin()
    )
    WITH CHECK (
        bucket_id = 'cms-banners' AND
        public.is_super_admin()
    );

-- ------------------------------------------------------------------------------
-- 3. Storage RLS Policies: lecture-thumbnails (Private Bucket)
-- ------------------------------------------------------------------------------

-- Gated read:
-- 1. Super Admin has full view access.
-- 2. Teacher can view thumbnails in their own user folder namespace.
-- 3. Students / Public can view thumbnails ONLY when linked to a PUBLISHED lecture.
DROP POLICY IF EXISTS "public_read_lecture_thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "access_lecture_thumbnails" ON storage.objects;
CREATE POLICY "access_lecture_thumbnails"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'lecture-thumbnails' AND (
            public.is_super_admin() OR
            (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
            EXISTS (
                SELECT 1 FROM public.cms_lectures l
                WHERE (
                    l.id::text = (storage.foldername(name))[2] OR
                    l.thumbnail_url LIKE ('%' || name)
                )
                AND l.status = 'PUBLISHED'
                AND l.is_visible = TRUE
                AND (l.starts_at IS NULL OR l.starts_at <= pg_catalog.now())
                AND (l.ends_at IS NULL OR l.ends_at >= pg_catalog.now())
            )
        )
    );

-- Admin upload: strictly forced into own user-id folder namespace
DROP POLICY IF EXISTS "admin_upload_lecture_thumbnails" ON storage.objects;
CREATE POLICY "admin_upload_lecture_thumbnails"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'lecture-thumbnails' AND
        public.is_admin_or_super_admin() AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Admin update own thumbnail / Super Admin full update
DROP POLICY IF EXISTS "admin_update_own_lecture_thumbnails" ON storage.objects;
CREATE POLICY "admin_update_own_lecture_thumbnails"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'lecture-thumbnails' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    )
    WITH CHECK (
        bucket_id = 'lecture-thumbnails' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    );

-- Admin delete own thumbnail / Super Admin full delete
DROP POLICY IF EXISTS "admin_delete_own_lecture_thumbnails" ON storage.objects;
CREATE POLICY "admin_delete_own_lecture_thumbnails"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'lecture-thumbnails' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    );

-- ------------------------------------------------------------------------------
-- 4. Storage RLS Policies: cms-assets (Private Bucket)
-- ------------------------------------------------------------------------------

-- Gated read:
-- 1. Super Admin has full view access.
-- 2. Teacher can view assets in their own user folder namespace.
-- 3. System assets in 'system/*' are readable.
DROP POLICY IF EXISTS "public_read_cms_assets" ON storage.objects;
DROP POLICY IF EXISTS "access_cms_assets" ON storage.objects;
CREATE POLICY "access_cms_assets"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'cms-assets' AND (
            public.is_super_admin() OR
            (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
            (storage.foldername(name))[1] = 'system'
        )
    );

-- Admin upload: scoped to own user folder
DROP POLICY IF EXISTS "admin_upload_cms_assets" ON storage.objects;
CREATE POLICY "admin_upload_cms_assets"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'cms-assets' AND
        public.is_admin_or_super_admin() AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Admin update own assets / Super Admin full update
DROP POLICY IF EXISTS "admin_update_own_cms_assets" ON storage.objects;
CREATE POLICY "admin_update_own_cms_assets"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'cms-assets' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    )
    WITH CHECK (
        bucket_id = 'cms-assets' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    );

-- Admin delete own assets / Super Admin full delete
DROP POLICY IF EXISTS "admin_delete_own_cms_assets" ON storage.objects;
CREATE POLICY "admin_delete_own_cms_assets"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'cms-assets' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    );

-- ------------------------------------------------------------------------------
-- 5. Storage RLS Policies: study-materials (Private Document Vault)
-- ------------------------------------------------------------------------------

-- Deterministic entity-scoped access:
-- Path schema: {author_id}/{material_id}/{filename}
-- 1. Super Admins can access all study materials.
-- 2. Admins can access documents in their own folder namespace ({author_id}/*).
-- 3. Students / Public can ONLY access documents when folder[2] matches a PUBLISHED & VISIBLE study material.
DROP POLICY IF EXISTS "access_study_materials" ON storage.objects;
CREATE POLICY "access_study_materials"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'study-materials' AND (
            public.is_super_admin() OR
            (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR
            EXISTS (
                SELECT 1 FROM public.cms_study_materials sm
                WHERE sm.id::text = (storage.foldername(name))[2]
                  AND sm.status = 'PUBLISHED'
                  AND sm.is_visible = TRUE
                  AND (sm.starts_at IS NULL OR sm.starts_at <= pg_catalog.now())
                  AND (sm.ends_at IS NULL OR sm.ends_at >= pg_catalog.now())
            )
        )
    );

-- Admin upload: strictly forced into own user-id folder namespace
DROP POLICY IF EXISTS "admin_upload_study_materials" ON storage.objects;
CREATE POLICY "admin_upload_study_materials"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'study-materials' AND
        public.is_admin_or_super_admin() AND
        (storage.foldername(name))[1] = auth.uid()::text
    );

-- Admin update own documents / Super Admin full update
DROP POLICY IF EXISTS "admin_update_own_study_materials" ON storage.objects;
CREATE POLICY "admin_update_own_study_materials"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'study-materials' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    )
    WITH CHECK (
        bucket_id = 'study-materials' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    );

-- Admin delete own documents / Super Admin full delete
DROP POLICY IF EXISTS "admin_delete_own_study_materials" ON storage.objects;
CREATE POLICY "admin_delete_own_study_materials"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'study-materials' AND (
            (public.is_admin_or_super_admin() AND (storage.foldername(name))[1] = auth.uid()::text) OR
            public.is_super_admin()
        )
    );
