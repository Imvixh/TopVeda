-- ==============================================================================
-- TopVeda Phase 4.1: CMS Row-Level Security (RLS) & Access Control Migration
-- Architecture Version: 4.0 (Approved Specification)
-- Governs: 16 CMS tables, View Security, Defense-in-Depth Status Guard Triggers
-- Roles: STUDENT (Public read active only), ADMIN (Own drafts/submissions),
--        SUPER_ADMIN (Full CRUD & publishing authority)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Enable Row Level Security on All 16 CMS Tables
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_class_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_live_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_hero_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_daily_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_hub_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_chatbot_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_chatbot_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_chatbot_knowledge_sources ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Defense-in-Depth: Status Transition & Review Metadata Guard Trigger
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_cms_review_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Block non-super-admins from moving content to APPROVED, PUBLISHED, or ARCHIVED
    IF NEW.status IN ('APPROVED', 'PUBLISHED', 'ARCHIVED') AND (OLD.status IS NULL OR OLD.status NOT IN ('APPROVED', 'PUBLISHED', 'ARCHIVED')) THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Administrators can approve, publish, or archive content.';
        END IF;
    END IF;

    -- Block non-super-admins from manipulating review audit timestamps or review notes
    IF (NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at) THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Administrators can record review decisions.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_cms_lectures_review ON public.cms_lectures;
CREATE TRIGGER trg_guard_cms_lectures_review
    BEFORE UPDATE ON public.cms_lectures
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_review_guard();

DROP TRIGGER IF EXISTS trg_guard_cms_batches_review ON public.cms_batches;
CREATE TRIGGER trg_guard_cms_batches_review
    BEFORE UPDATE ON public.cms_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_review_guard();

DROP TRIGGER IF EXISTS trg_guard_cms_study_materials_review ON public.cms_study_materials;
CREATE TRIGGER trg_guard_cms_study_materials_review
    BEFORE UPDATE ON public.cms_study_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_review_guard();

DROP TRIGGER IF EXISTS trg_guard_cms_chapters_review ON public.cms_chapters;
CREATE TRIGGER trg_guard_cms_chapters_review
    BEFORE UPDATE ON public.cms_chapters
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_review_guard();

DROP TRIGGER IF EXISTS trg_guard_cms_courses_review ON public.cms_courses;
CREATE TRIGGER trg_guard_cms_courses_review
    BEFORE UPDATE ON public.cms_courses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_cms_review_guard();

-- ------------------------------------------------------------------------------
-- 3. Academic Structure & Taxonomies RLS Policies
-- ------------------------------------------------------------------------------

-- cms_boards
DROP POLICY IF EXISTS "public_read_published_boards" ON public.cms_boards;
CREATE POLICY "public_read_published_boards" ON public.cms_boards
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_boards" ON public.cms_boards;
CREATE POLICY "super_admin_manage_boards" ON public.cms_boards
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_class_levels
DROP POLICY IF EXISTS "public_read_published_class_levels" ON public.cms_class_levels;
CREATE POLICY "public_read_published_class_levels" ON public.cms_class_levels
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_class_levels" ON public.cms_class_levels;
CREATE POLICY "super_admin_manage_class_levels" ON public.cms_class_levels
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_subjects
DROP POLICY IF EXISTS "public_read_published_subjects" ON public.cms_subjects;
CREATE POLICY "public_read_published_subjects" ON public.cms_subjects
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_subjects" ON public.cms_subjects;
CREATE POLICY "super_admin_manage_subjects" ON public.cms_subjects
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_courses
DROP POLICY IF EXISTS "public_read_published_courses" ON public.cms_courses;
CREATE POLICY "public_read_published_courses" ON public.cms_courses
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_courses" ON public.cms_courses;
CREATE POLICY "super_admin_manage_courses" ON public.cms_courses
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 4. Batches, Chapters, Lectures, Live Classes & Study Materials Policies
-- ------------------------------------------------------------------------------

-- cms_batches
DROP POLICY IF EXISTS "public_read_published_batches" ON public.cms_batches;
CREATE POLICY "public_read_published_batches" ON public.cms_batches
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "admin_read_assigned_batches" ON public.cms_batches;
CREATE POLICY "admin_read_assigned_batches" ON public.cms_batches
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (lead_educator_id = auth.uid() OR submitted_by = auth.uid() OR created_by = auth.uid())
    );

DROP POLICY IF EXISTS "admin_insert_batches" ON public.cms_batches;
CREATE POLICY "admin_insert_batches" ON public.cms_batches
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "admin_update_own_batches" ON public.cms_batches;
CREATE POLICY "admin_update_own_batches" ON public.cms_batches
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'REJECTED')
    )
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "super_admin_manage_batches" ON public.cms_batches;
CREATE POLICY "super_admin_manage_batches" ON public.cms_batches
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_chapters
DROP POLICY IF EXISTS "public_read_published_chapters" ON public.cms_chapters;
CREATE POLICY "public_read_published_chapters" ON public.cms_chapters
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "admin_read_own_chapters" ON public.cms_chapters;
CREATE POLICY "admin_read_own_chapters" ON public.cms_chapters
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid())
    );

DROP POLICY IF EXISTS "admin_insert_chapters" ON public.cms_chapters;
CREATE POLICY "admin_insert_chapters" ON public.cms_chapters
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "admin_update_own_chapters" ON public.cms_chapters;
CREATE POLICY "admin_update_own_chapters" ON public.cms_chapters
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'REJECTED')
    )
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "super_admin_manage_chapters" ON public.cms_chapters;
CREATE POLICY "super_admin_manage_chapters" ON public.cms_chapters
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_lectures
DROP POLICY IF EXISTS "public_read_published_lectures" ON public.cms_lectures;
CREATE POLICY "public_read_published_lectures" ON public.cms_lectures
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "admin_read_own_lectures" ON public.cms_lectures;
CREATE POLICY "admin_read_own_lectures" ON public.cms_lectures
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR submitted_by = auth.uid() OR created_by = auth.uid())
    );

DROP POLICY IF EXISTS "admin_insert_lectures" ON public.cms_lectures;
CREATE POLICY "admin_insert_lectures" ON public.cms_lectures
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "admin_update_own_lectures" ON public.cms_lectures;
CREATE POLICY "admin_update_own_lectures" ON public.cms_lectures
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'REJECTED')
    )
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "super_admin_manage_lectures" ON public.cms_lectures;
CREATE POLICY "super_admin_manage_lectures" ON public.cms_lectures
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_live_classes
DROP POLICY IF EXISTS "public_read_published_live_classes" ON public.cms_live_classes;
CREATE POLICY "public_read_published_live_classes" ON public.cms_live_classes
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "admin_read_assigned_live_classes" ON public.cms_live_classes;
CREATE POLICY "admin_read_assigned_live_classes" ON public.cms_live_classes
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR submitted_by = auth.uid() OR created_by = auth.uid())
    );

DROP POLICY IF EXISTS "admin_insert_live_classes" ON public.cms_live_classes;
CREATE POLICY "admin_insert_live_classes" ON public.cms_live_classes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "admin_update_assigned_live_classes" ON public.cms_live_classes;
CREATE POLICY "admin_update_assigned_live_classes" ON public.cms_live_classes
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR submitted_by = auth.uid() OR created_by = auth.uid())
    )
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "super_admin_manage_live_classes" ON public.cms_live_classes;
CREATE POLICY "super_admin_manage_live_classes" ON public.cms_live_classes
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_study_materials
DROP POLICY IF EXISTS "public_read_published_study_materials" ON public.cms_study_materials;
CREATE POLICY "public_read_published_study_materials" ON public.cms_study_materials
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "admin_read_own_study_materials" ON public.cms_study_materials;
CREATE POLICY "admin_read_own_study_materials" ON public.cms_study_materials
    FOR SELECT TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid())
    );

DROP POLICY IF EXISTS "admin_insert_study_materials" ON public.cms_study_materials;
CREATE POLICY "admin_insert_study_materials" ON public.cms_study_materials
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "admin_update_own_study_materials" ON public.cms_study_materials;
CREATE POLICY "admin_update_own_study_materials" ON public.cms_study_materials
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'REJECTED')
    )
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (submitted_by = auth.uid() OR created_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW')
    );

DROP POLICY IF EXISTS "super_admin_manage_study_materials" ON public.cms_study_materials;
CREATE POLICY "super_admin_manage_study_materials" ON public.cms_study_materials
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 5. Discovery & Marketing Widgets Policies (Hero, Quotes, Hub)
-- ------------------------------------------------------------------------------

-- cms_hero_banners
DROP POLICY IF EXISTS "public_read_published_hero_banners" ON public.cms_hero_banners;
CREATE POLICY "public_read_published_hero_banners" ON public.cms_hero_banners
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_hero_banners" ON public.cms_hero_banners;
CREATE POLICY "super_admin_manage_hero_banners" ON public.cms_hero_banners
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_daily_quotes
DROP POLICY IF EXISTS "public_read_active_daily_quotes" ON public.cms_daily_quotes;
CREATE POLICY "public_read_active_daily_quotes" ON public.cms_daily_quotes
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        is_active = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_daily_quotes" ON public.cms_daily_quotes;
CREATE POLICY "super_admin_manage_daily_quotes" ON public.cms_daily_quotes
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_hub_items
DROP POLICY IF EXISTS "public_read_published_hub_items" ON public.cms_hub_items;
CREATE POLICY "public_read_published_hub_items" ON public.cms_hub_items
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_hub_items" ON public.cms_hub_items;
CREATE POLICY "super_admin_manage_hub_items" ON public.cms_hub_items
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 6. AI Chatbot CMS Management & Knowledge Governance Policies
-- ------------------------------------------------------------------------------

-- Column-Level Privilege Hardening on cms_chatbot_settings
-- Strictly shields system_instructions, model_provider, model_name, rate limits from public client queries
REVOKE ALL ON public.cms_chatbot_settings FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id,
    is_enabled,
    name,
    greeting,
    welcome_message,
    placeholder_text,
    external_url,
    portal_visibility,
    maintenance_mode,
    maintenance_message,
    status,
    starts_at,
    ends_at,
    created_at,
    updated_at
) ON public.cms_chatbot_settings TO anon, authenticated;
GRANT ALL ON public.cms_chatbot_settings TO service_role;

-- cms_chatbot_settings
DROP POLICY IF EXISTS "public_read_published_chatbot_settings" ON public.cms_chatbot_settings;
CREATE POLICY "public_read_published_chatbot_settings" ON public.cms_chatbot_settings
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_enabled = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_chatbot_settings" ON public.cms_chatbot_settings;
CREATE POLICY "super_admin_manage_chatbot_settings" ON public.cms_chatbot_settings
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_chatbot_prompts
DROP POLICY IF EXISTS "public_read_published_chatbot_prompts" ON public.cms_chatbot_prompts;
CREATE POLICY "public_read_published_chatbot_prompts" ON public.cms_chatbot_prompts
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_chatbot_prompts" ON public.cms_chatbot_prompts;
CREATE POLICY "super_admin_manage_chatbot_prompts" ON public.cms_chatbot_prompts
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_chatbot_faqs
DROP POLICY IF EXISTS "public_read_published_chatbot_faqs" ON public.cms_chatbot_faqs;
CREATE POLICY "public_read_published_chatbot_faqs" ON public.cms_chatbot_faqs
    FOR SELECT USING (
        status = 'PUBLISHED' AND
        is_visible = TRUE AND
        (starts_at IS NULL OR starts_at <= pg_catalog.now()) AND
        (ends_at IS NULL OR ends_at >= pg_catalog.now())
    );

DROP POLICY IF EXISTS "super_admin_manage_chatbot_faqs" ON public.cms_chatbot_faqs;
CREATE POLICY "super_admin_manage_chatbot_faqs" ON public.cms_chatbot_faqs
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- cms_chatbot_knowledge_sources (Strict Super Admin / Server-Only access)
-- Anonymous and student queries are completely blocked
DROP POLICY IF EXISTS "super_admin_manage_chatbot_knowledge" ON public.cms_chatbot_knowledge_sources;
CREATE POLICY "super_admin_manage_chatbot_knowledge" ON public.cms_chatbot_knowledge_sources
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- 7. Review Queue SQL View Security Hardening
-- ------------------------------------------------------------------------------

-- Ensure view enforces invoking user's RLS permissions
ALTER VIEW public.cms_pending_reviews_view SET (security_invoker = true);

-- Limit view permissions: public/anon revoked; authenticated/service_role granted
REVOKE ALL ON public.cms_pending_reviews_view FROM PUBLIC, anon;
GRANT SELECT ON public.cms_pending_reviews_view TO authenticated, service_role;
