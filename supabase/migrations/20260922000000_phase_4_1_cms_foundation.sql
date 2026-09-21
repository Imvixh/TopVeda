-- ==============================================================================
-- TopVeda Phase 4.1: CMS Database Foundation & AI Chatbot Governance
-- Architecture Version: 4.0 (Approved Specification)
-- Tables: cms_boards, cms_class_levels, cms_subjects, cms_courses,
--         cms_batches, cms_chapters, cms_lectures, cms_live_classes,
--         cms_hero_banners, cms_daily_quotes, cms_hub_items, cms_study_materials,
--         cms_chatbot_settings, cms_chatbot_prompts, cms_chatbot_faqs,
--         cms_chatbot_knowledge_sources
-- View:   cms_pending_reviews_view
-- Constraints: Strict Ownership, Review Metadata, Section Ordering, Scheduling
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CMS Custom Enum Types
-- ------------------------------------------------------------------------------

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_status') THEN
        CREATE TYPE public.content_status AS ENUM (
            'DRAFT',
            'PENDING_REVIEW',
            'REJECTED',
            'APPROVED',
            'PUBLISHED',
            'ARCHIVED'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'batch_badge_variant') THEN
        CREATE TYPE public.batch_badge_variant AS ENUM (
            'orange',
            'pink',
            'green',
            'purple'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'live_class_status') THEN
        CREATE TYPE public.live_class_status AS ENUM (
            'SCHEDULED',
            'LIVE',
            'COMPLETED',
            'CANCELLED'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hub_category') THEN
        CREATE TYPE public.hub_category AS ENUM (
            'announcement',
            'material',
            'live',
            'tip'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chatbot_model_provider') THEN
        CREATE TYPE public.chatbot_model_provider AS ENUM (
            'openai',
            'anthropic',
            'gemini',
            'cloudflare_workers_ai',
            'custom'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chatbot_source_type') THEN
        CREATE TYPE public.chatbot_source_type AS ENUM (
            'COURSE',
            'CHAPTER',
            'STUDY_MATERIAL',
            'FAQ',
            'CURRICULUM_SPEC'
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chatbot_sync_status') THEN
        CREATE TYPE public.chatbot_sync_status AS ENUM (
            'PENDING',
            'SYNCED',
            'FAILED',
            'EXCLUDED'
        );
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Academic Structure & Discovery Tables
-- ------------------------------------------------------------------------------

-- 1. Educational Boards (CBSE, BSEB, ICSE, etc.)
CREATE TABLE IF NOT EXISTS public.cms_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_name VARCHAR(100),
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 2. Class Levels (Class 10, Class 11, Class 12, Foundation, Dropper)
CREATE TABLE IF NOT EXISTS public.cms_class_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 3. Academic Subjects (Mathematics, Science, Physics, Chemistry, Biology)
CREATE TABLE IF NOT EXISTS public.cms_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    code VARCHAR(50),
    icon_name VARCHAR(100),
    icon_color VARCHAR(50) DEFAULT 'text-brand-orange',
    icon_bg VARCHAR(50) DEFAULT 'bg-brand-bg-peach',
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 4. Explore Courses Catalog (Section 5 on Student Home)
CREATE TABLE IF NOT EXISTS public.cms_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES public.cms_boards(id) ON DELETE RESTRICT,
    class_id UUID REFERENCES public.cms_class_levels(id) ON DELETE RESTRICT,
    subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    short_description TEXT,
    thumbnail_url TEXT,
    icon_type VARCHAR(50) DEFAULT 'school',
    icon_color VARCHAR(50) DEFAULT 'text-brand-orange',
    icon_bg VARCHAR(50) DEFAULT 'bg-rose-50 border-rose-100',
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    status public.content_status DEFAULT 'DRAFT' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 5. Batches (Section 1: Featured Batches & Section 2: Ongoing Batches)
CREATE TABLE IF NOT EXISTS public.cms_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.cms_courses(id) ON DELETE SET NULL,
    board_id UUID REFERENCES public.cms_boards(id) ON DELETE RESTRICT,
    class_id UUID REFERENCES public.cms_class_levels(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    board_label VARCHAR(100) NOT NULL,
    subtitle VARCHAR(255) NOT NULL,
    description TEXT,
    badge_text VARCHAR(50),
    badge_variant public.batch_badge_variant DEFAULT 'orange' NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    is_ongoing BOOLEAN DEFAULT TRUE NOT NULL,
    status_type VARCHAR(50) DEFAULT 'ongoing' CHECK (status_type IN ('live', 'ongoing')),
    educator_name VARCHAR(255) NOT NULL,
    educator_avatar_url TEXT NOT NULL,
    lead_educator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    bg_gradient VARCHAR(255) DEFAULT 'from-sky-50/70 via-blue-50/40 to-indigo-50/30',
    border_color VARCHAR(100) DEFAULT 'border-sky-100',
    icon_type VARCHAR(50) DEFAULT 'math',
    icon_bg VARCHAR(100) DEFAULT 'bg-emerald-50 border-emerald-100 text-emerald-600',
    icon_color VARCHAR(50) DEFAULT 'text-emerald-600',
    cta_text VARCHAR(50) DEFAULT 'Explore →',
    cta_link VARCHAR(255) DEFAULT '/student/batches',
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'DRAFT' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. Lectures, Chapters & Cloudflare Video Integrations
-- ------------------------------------------------------------------------------

-- 6. Chapters / Modules
CREATE TABLE IF NOT EXISTS public.cms_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES public.cms_courses(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    chapter_number INT NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_chapter_slug_per_course UNIQUE (course_id, slug)
);

-- 7. Latest Lectures (Section 4 on Student Home)
CREATE TABLE IF NOT EXISTS public.cms_lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chapter_id UUID REFERENCES public.cms_chapters(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    educator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    duration_seconds INT DEFAULT 0 NOT NULL,
    duration_formatted VARCHAR(20) DEFAULT '45:00' NOT NULL,
    duration_human VARCHAR(50) DEFAULT '45 min' NOT NULL,
    thumbnail_url TEXT NOT NULL,
    thumbnail_bg VARCHAR(255) DEFAULT 'from-[#0F2042] via-[#162D59] to-[#0A162B]',
    category_tag VARCHAR(100) NOT NULL,
    video_stream_id VARCHAR(255),
    video_playback_url TEXT,
    video_upload_status VARCHAR(50) DEFAULT 'ready',
    is_home_featured BOOLEAN DEFAULT FALSE NOT NULL,
    is_free_preview BOOLEAN DEFAULT TRUE NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'DRAFT' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 4. Live Classes, Hero Banners, Quotes & Portal Hub
-- ------------------------------------------------------------------------------

-- 8. Live Classes (Section 3 on Student Home)
CREATE TABLE IF NOT EXISTS public.cms_live_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES public.cms_batches(id) ON DELETE SET NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    educator_name VARCHAR(255) NOT NULL,
    educator_avatar_url TEXT NOT NULL,
    educator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ,
    time_display VARCHAR(50) NOT NULL,
    is_live BOOLEAN DEFAULT FALSE NOT NULL,
    status_text VARCHAR(20) DEFAULT 'UPCOMING' NOT NULL,
    live_status public.live_class_status DEFAULT 'SCHEDULED' NOT NULL,
    cta_text VARCHAR(50) DEFAULT 'Reminder' NOT NULL,
    stream_room_url TEXT,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 9. Hero Carousel Banners (Hero Banner on Student Home)
CREATE TABLE IF NOT EXISTS public.cms_hero_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tagline VARCHAR(150) DEFAULT 'TOPVEDA ACADEMIC DISCOVERY' NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT NOT NULL,
    cta_text VARCHAR(100) DEFAULT 'Keep Learning →' NOT NULL,
    cta_link VARCHAR(255) DEFAULT '#featured-batches' NOT NULL,
    quote_text TEXT DEFAULT 'Better Students\nBrighter Futures',
    character_image_url TEXT NOT NULL,
    bg_gradient VARCHAR(255) DEFAULT 'from-[#081326] via-[#0E2044] to-[#1B3A72]',
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 10. Daily Motivational Quotes (Sidebar widget)
CREATE TABLE IF NOT EXISTS public.cms_daily_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote TEXT NOT NULL,
    author VARCHAR(150) DEFAULT 'TopVeda' NOT NULL,
    is_active BOOLEAN DEFAULT FALSE NOT NULL,
    scheduled_for_date DATE,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 11. Student Portal Hub ("What's Happening on TopVeda?" Section 6)
CREATE TABLE IF NOT EXISTS public.cms_hub_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category public.hub_category DEFAULT 'announcement' NOT NULL,
    badge_text VARCHAR(50) NOT NULL,
    badge_variant VARCHAR(50) DEFAULT 'orange' NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cta_text VARCHAR(100) DEFAULT 'Explore Batch' NOT NULL,
    cta_link VARCHAR(255) DEFAULT '/student/batches' NOT NULL,
    icon_type VARCHAR(50) DEFAULT 'megaphone' NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 12. Study Materials (Notes, NCERT Solutions, Formula Sheets)
CREATE TABLE IF NOT EXISTS public.cms_study_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.cms_courses(id) ON DELETE SET NULL,
    chapter_id UUID REFERENCES public.cms_chapters(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    material_type VARCHAR(50) DEFAULT 'formula_sheet' CHECK (material_type IN ('formula_sheet', 'notes', 'ncert_solution', 'pyq_paper')),
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    page_count INT,
    download_count INT DEFAULT 0 NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'DRAFT' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- ------------------------------------------------------------------------------
-- 5. AI Chatbot CMS Management & Knowledge Governance Tables
-- ------------------------------------------------------------------------------

-- 13. AI Chatbot Singleton Global Settings & Behavior Configuration
CREATE TABLE IF NOT EXISTS public.cms_chatbot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    name VARCHAR(100) DEFAULT 'TopVeda AI' NOT NULL,
    greeting VARCHAR(255) DEFAULT 'TopVeda AI Assistant' NOT NULL,
    welcome_message TEXT DEFAULT 'TopVeda AI Assistant is coming soon!' NOT NULL,
    placeholder_text TEXT DEFAULT 'Your 24/7 personal academic tutor is currently undergoing training to assist you with doubt-solving, instant concept explanations, and personalized revision.' NOT NULL,
    external_url TEXT,
    system_instructions TEXT DEFAULT 'You are TopVeda AI, an encouraging and academically rigorous tutor for Indian school students (CBSE/BSEB/ICSE) preparing for board and competitive exams. Answer strictly using approved TopVeda knowledge.' NOT NULL,
    academic_scope JSONB DEFAULT '{"boards": ["CBSE", "BSEB", "ICSE"], "classes": ["10", "11", "12"], "subjects": ["Mathematics", "Science", "Physics", "Chemistry", "Biology"]}'::jsonb NOT NULL,
    portal_visibility JSONB DEFAULT '{"student_home": true, "batch_room": false, "doubt_section": false}'::jsonb NOT NULL,
    maintenance_mode BOOLEAN DEFAULT FALSE NOT NULL,
    maintenance_message TEXT DEFAULT 'TopVeda AI is undergoing scheduled academic knowledge updates. It will be back shortly.' NOT NULL,
    rate_limit_per_minute INT DEFAULT 10 NOT NULL,
    max_daily_queries_per_student INT DEFAULT 50 NOT NULL,
    model_provider public.chatbot_model_provider DEFAULT 'cloudflare_workers_ai' NOT NULL,
    model_name VARCHAR(100) DEFAULT '@cf/meta/llama-3.1-8b-instruct' NOT NULL,
    temperature NUMERIC(3,2) DEFAULT 0.20 NOT NULL,
    max_tokens INT DEFAULT 1024 NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 14. AI Chatbot Suggested / Promotional Starter Questions & Pills
CREATE TABLE IF NOT EXISTS public.cms_chatbot_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_text VARCHAR(255) NOT NULL,
    category_tag VARCHAR(100) DEFAULT 'General' NOT NULL,
    icon_name VARCHAR(50) DEFAULT 'Sparkles' NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 15. AI Chatbot FAQs & Platform Knowledge (Authoritative Q&A pairs)
CREATE TABLE IF NOT EXISTS public.cms_chatbot_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'Academics' NOT NULL,
    search_tags TEXT[] DEFAULT '{}' NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE NOT NULL,
    status public.content_status DEFAULT 'PUBLISHED' NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- 16. AI Chatbot Approved Knowledge Sources Index
CREATE TABLE IF NOT EXISTS public.cms_chatbot_knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type public.chatbot_source_type NOT NULL,
    source_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sync_status public.chatbot_sync_status DEFAULT 'PENDING' NOT NULL,
    last_synced_at TIMESTAMPTZ,
    sync_error_message TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_note TEXT,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    CONSTRAINT uq_chatbot_knowledge_source UNIQUE (source_type, source_id)
);

-- ------------------------------------------------------------------------------
-- 6. Unified Super Admin Review Queue SQL View
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.cms_pending_reviews_view AS
SELECT 
    'LECTURE' AS entity_type,
    id AS entity_id,
    title,
    subject,
    teacher_name AS author_name,
    thumbnail_url AS media_preview_url,
    video_playback_url AS video_stream_url,
    status,
    submitted_by,
    created_at AS submitted_at,
    review_note
FROM public.cms_lectures
WHERE status = 'PENDING_REVIEW'

UNION ALL

SELECT 
    'STUDY_MATERIAL' AS entity_type,
    id AS entity_id,
    title,
    material_type AS subject,
    (SELECT full_name FROM public.profiles WHERE id = cms_study_materials.submitted_by) AS author_name,
    file_url AS media_preview_url,
    NULL AS video_stream_url,
    status,
    submitted_by,
    created_at AS submitted_at,
    review_note
FROM public.cms_study_materials
WHERE status = 'PENDING_REVIEW'

UNION ALL

SELECT 
    'BATCH' AS entity_type,
    id AS entity_id,
    title,
    board_label AS subject,
    educator_name AS author_name,
    educator_avatar_url AS media_preview_url,
    NULL AS video_stream_url,
    status,
    submitted_by,
    created_at AS submitted_at,
    review_note
FROM public.cms_batches
WHERE status = 'PENDING_REVIEW';

-- ------------------------------------------------------------------------------
-- 7. High-Performance Indexing
-- ------------------------------------------------------------------------------

-- Academic Discovery Indexes
CREATE INDEX IF NOT EXISTS idx_cms_boards_lookup ON public.cms_boards (is_visible, status, display_order);
CREATE INDEX IF NOT EXISTS idx_cms_class_levels_lookup ON public.cms_class_levels (is_visible, status, display_order);
CREATE INDEX IF NOT EXISTS idx_cms_subjects_lookup ON public.cms_subjects (is_visible, status, display_order);

CREATE INDEX IF NOT EXISTS idx_cms_courses_hierarchy ON public.cms_courses (board_id, class_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_cms_courses_discovery ON public.cms_courses (status, is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_cms_courses_featured ON public.cms_courses (is_featured) WHERE is_featured = TRUE;

CREATE INDEX IF NOT EXISTS idx_cms_batches_course ON public.cms_batches (course_id);
CREATE INDEX IF NOT EXISTS idx_cms_batches_board_class ON public.cms_batches (board_id, class_id);
CREATE INDEX IF NOT EXISTS idx_cms_batches_discovery ON public.cms_batches (status, is_visible, is_featured, is_ongoing, display_order);

CREATE INDEX IF NOT EXISTS idx_cms_chapters_course ON public.cms_chapters (course_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_cms_chapters_batch ON public.cms_chapters (batch_id);

CREATE INDEX IF NOT EXISTS idx_cms_lectures_chapter ON public.cms_lectures (chapter_id);
CREATE INDEX IF NOT EXISTS idx_cms_lectures_batch ON public.cms_lectures (batch_id);
CREATE INDEX IF NOT EXISTS idx_cms_lectures_discovery ON public.cms_lectures (status, is_visible, is_home_featured, display_order);
CREATE INDEX IF NOT EXISTS idx_cms_lectures_educator ON public.cms_lectures (educator_id);
CREATE INDEX IF NOT EXISTS idx_cms_lectures_submission ON public.cms_lectures (submitted_by, status);

CREATE INDEX IF NOT EXISTS idx_cms_live_classes_batch ON public.cms_live_classes (batch_id);
CREATE INDEX IF NOT EXISTS idx_cms_live_classes_schedule ON public.cms_live_classes (status, is_visible, scheduled_start);

CREATE INDEX IF NOT EXISTS idx_cms_hero_banners_display ON public.cms_hero_banners (status, is_visible, display_order);

CREATE INDEX IF NOT EXISTS idx_cms_daily_quotes_active ON public.cms_daily_quotes (is_active, scheduled_for_date) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_cms_hub_items_discovery ON public.cms_hub_items (status, is_visible, category, display_order);

CREATE INDEX IF NOT EXISTS idx_cms_study_materials_course ON public.cms_study_materials (course_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_cms_study_materials_discovery ON public.cms_study_materials (status, is_visible, material_type, display_order);
CREATE INDEX IF NOT EXISTS idx_cms_study_materials_submission ON public.cms_study_materials (submitted_by, status);

CREATE INDEX IF NOT EXISTS idx_cms_chatbot_prompts_discovery ON public.cms_chatbot_prompts (status, is_visible, display_order);
CREATE INDEX IF NOT EXISTS idx_cms_chatbot_faqs_discovery ON public.cms_chatbot_faqs (status, is_visible, category, display_order);
CREATE INDEX IF NOT EXISTS idx_cms_chatbot_knowledge_lookup ON public.cms_chatbot_knowledge_sources (source_type, source_id, is_active, sync_status);

-- ------------------------------------------------------------------------------
-- 8. Automatic Updated_At Triggers
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_cms_boards_updated_at ON public.cms_boards;
CREATE TRIGGER set_cms_boards_updated_at BEFORE UPDATE ON public.cms_boards FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_class_levels_updated_at ON public.cms_class_levels;
CREATE TRIGGER set_cms_class_levels_updated_at BEFORE UPDATE ON public.cms_class_levels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_subjects_updated_at ON public.cms_subjects;
CREATE TRIGGER set_cms_subjects_updated_at BEFORE UPDATE ON public.cms_subjects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_courses_updated_at ON public.cms_courses;
CREATE TRIGGER set_cms_courses_updated_at BEFORE UPDATE ON public.cms_courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_batches_updated_at ON public.cms_batches;
CREATE TRIGGER set_cms_batches_updated_at BEFORE UPDATE ON public.cms_batches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_chapters_updated_at ON public.cms_chapters;
CREATE TRIGGER set_cms_chapters_updated_at BEFORE UPDATE ON public.cms_chapters FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_lectures_updated_at ON public.cms_lectures;
CREATE TRIGGER set_cms_lectures_updated_at BEFORE UPDATE ON public.cms_lectures FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_live_classes_updated_at ON public.cms_live_classes;
CREATE TRIGGER set_cms_live_classes_updated_at BEFORE UPDATE ON public.cms_live_classes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_hero_banners_updated_at ON public.cms_hero_banners;
CREATE TRIGGER set_cms_hero_banners_updated_at BEFORE UPDATE ON public.cms_hero_banners FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_daily_quotes_updated_at ON public.cms_daily_quotes;
CREATE TRIGGER set_cms_daily_quotes_updated_at BEFORE UPDATE ON public.cms_daily_quotes FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_hub_items_updated_at ON public.cms_hub_items;
CREATE TRIGGER set_cms_hub_items_updated_at BEFORE UPDATE ON public.cms_hub_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_study_materials_updated_at ON public.cms_study_materials;
CREATE TRIGGER set_cms_study_materials_updated_at BEFORE UPDATE ON public.cms_study_materials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_chatbot_settings_updated_at ON public.cms_chatbot_settings;
CREATE TRIGGER set_cms_chatbot_settings_updated_at BEFORE UPDATE ON public.cms_chatbot_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_chatbot_prompts_updated_at ON public.cms_chatbot_prompts;
CREATE TRIGGER set_cms_chatbot_prompts_updated_at BEFORE UPDATE ON public.cms_chatbot_prompts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_chatbot_faqs_updated_at ON public.cms_chatbot_faqs;
CREATE TRIGGER set_cms_chatbot_faqs_updated_at BEFORE UPDATE ON public.cms_chatbot_faqs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_cms_chatbot_knowledge_sources_updated_at ON public.cms_chatbot_knowledge_sources;
CREATE TRIGGER set_cms_chatbot_knowledge_sources_updated_at BEFORE UPDATE ON public.cms_chatbot_knowledge_sources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
