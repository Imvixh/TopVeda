-- ==============================================================================
-- TopVeda Phase 4.1 Step 5J: Teacher Live & Recorded Lecture Workspace Redesign
-- Architecture Version: 4.1.5J (Hardened Production Specification)
-- Tables Altered: cms_live_classes, cms_lectures
-- Tables Created: cms_notifications
-- Triggers: Overlap Prevention, Super Admin Termination Guard, Lecture Edit Guard
-- RLS: Teacher autonomous live scheduling & pre-approval lecture editing
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Extend Live Class Status Enum
-- ------------------------------------------------------------------------------

ALTER TYPE public.live_class_status ADD VALUE IF NOT EXISTS 'TERMINATED';

-- ------------------------------------------------------------------------------
-- 2. Schema Extensions: cms_live_classes
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_live_classes
    ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.cms_boards(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.cms_class_levels(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.cms_courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.cms_chapters(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
    ADD COLUMN IF NOT EXISTS stream_provider VARCHAR(50) DEFAULT 'cloudflare' NOT NULL,
    ADD COLUMN IF NOT EXISTS provider_session_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS stream_key TEXT,
    ADD COLUMN IF NOT EXISTS recording_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS recording_url TEXT,
    ADD COLUMN IF NOT EXISTS recording_status VARCHAR(50) DEFAULT 'NONE' CHECK (recording_status IN ('NONE', 'PROCESSING', 'READY', 'FAILED')),
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terminated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS terminated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS termination_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_cms_live_classes_teacher_schedule 
    ON public.cms_live_classes (educator_id, scheduled_start, scheduled_end) 
    WHERE live_status IN ('SCHEDULED', 'LIVE');

CREATE INDEX IF NOT EXISTS idx_cms_live_classes_taxonomy 
    ON public.cms_live_classes (board_id, class_id, subject_id, course_id);

-- ------------------------------------------------------------------------------
-- 3. Schema Extensions: cms_lectures
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_lectures
    ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES public.cms_boards(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.cms_class_levels(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.cms_subjects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.cms_courses(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS original_live_class_id UUID REFERENCES public.cms_live_classes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lecture_number INT DEFAULT 1 NOT NULL,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS recording_provider_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS material_ids UUID[] DEFAULT '{}'::uuid[] NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cms_lectures_original_live 
    ON public.cms_lectures (original_live_class_id);

CREATE INDEX IF NOT EXISTS idx_cms_lectures_taxonomy 
    ON public.cms_lectures (board_id, class_id, subject_id, course_id);

-- ------------------------------------------------------------------------------
-- 4. Notification Architecture: cms_notifications
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_role VARCHAR(50) CHECK (recipient_role IN ('SUPER_ADMIN', 'ADMIN', 'STUDENT')),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50) CHECK (entity_type IN ('LIVE_CLASS', 'LECTURE', 'BATCH', 'STUDY_MATERIAL', 'SYSTEM')),
    entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_notifications_recipient 
    ON public.cms_notifications (recipient_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cms_notifications_role 
    ON public.cms_notifications (recipient_role, is_read, created_at DESC);

DROP TRIGGER IF EXISTS set_cms_notifications_updated_at ON public.cms_notifications;
CREATE TRIGGER set_cms_notifications_updated_at 
    BEFORE UPDATE ON public.cms_notifications 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. Database-Level Overlap Prevention Trigger for Live Classes
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_teacher_live_class_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_teacher_id UUID;
    v_conflict_id UUID;
    v_conflict_topic TEXT;
    v_conflict_start TIMESTAMPTZ;
    v_conflict_end TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
BEGIN
    -- Determine effective teacher id
    v_teacher_id := COALESCE(NEW.educator_id, NEW.created_by, auth.uid());
    
    -- If no scheduled end is specified, default to start + 60 minutes for collision checking
    v_end_time := COALESCE(NEW.scheduled_end, NEW.scheduled_start + INTERVAL '60 minutes');

    -- Only check for active scheduled / live classes
    IF NEW.live_status IN ('SCHEDULED', 'LIVE') AND NEW.status <> 'ARCHIVED' AND v_teacher_id IS NOT NULL THEN
        SELECT id, topic, scheduled_start, COALESCE(scheduled_end, scheduled_start + INTERVAL '60 minutes')
        INTO v_conflict_id, v_conflict_topic, v_conflict_start, v_conflict_end
        FROM public.cms_live_classes
        WHERE (educator_id = v_teacher_id OR created_by = v_teacher_id)
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
          AND live_status IN ('SCHEDULED', 'LIVE')
          AND status <> 'ARCHIVED'
          AND (
              (NEW.scheduled_start < COALESCE(scheduled_end, scheduled_start + INTERVAL '60 minutes')) AND
              (v_end_time > scheduled_start)
          )
        LIMIT 1;

        IF v_conflict_id IS NOT NULL THEN
            RAISE EXCEPTION 'Schedule Collision: Teacher already has an active Live Class ("%") scheduled from % to %.',
                v_conflict_topic, v_conflict_start, v_conflict_end;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_teacher_live_overlap ON public.cms_live_classes;
CREATE TRIGGER trg_prevent_teacher_live_overlap
    BEFORE INSERT OR UPDATE OF scheduled_start, scheduled_end, educator_id, live_status ON public.cms_live_classes
    FOR EACH ROW
    EXECUTE FUNCTION public.check_teacher_live_class_overlap();

-- ------------------------------------------------------------------------------
-- 6. Super Admin Live Class Termination Guard Trigger
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_live_class_termination()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- If status is transitioning to TERMINATED or termination fields are altered
    IF (NEW.live_status = 'TERMINATED' AND (OLD.live_status IS NULL OR OLD.live_status <> 'TERMINATED'))
       OR (NEW.terminated_by IS DISTINCT FROM OLD.terminated_by OR NEW.terminated_at IS DISTINCT FROM OLD.terminated_at) THEN
        
        IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
            RAISE EXCEPTION 'Unauthorized: Only Super Administrators have authority to terminate a Live Class.';
        END IF;

        IF NEW.terminated_by IS NULL THEN
            NEW.terminated_by := auth.uid();
        END IF;
        IF NEW.terminated_at IS NULL THEN
            NEW.terminated_at := pg_catalog.now();
        END IF;
    END IF;

    -- Ensure normal Teacher END sets COMPLETED with ended_at
    IF NEW.live_status = 'COMPLETED' AND (OLD.live_status IS NULL OR OLD.live_status <> 'COMPLETED') THEN
        IF NEW.ended_at IS NULL THEN
            NEW.ended_at := pg_catalog.now();
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_live_class_termination ON public.cms_live_classes;
CREATE TRIGGER trg_guard_live_class_termination
    BEFORE UPDATE ON public.cms_live_classes
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_live_class_termination();

-- ------------------------------------------------------------------------------
-- 7. Defense-in-Depth Lecture Edit Lock Guard
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_approved_lecture_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- If content is already APPROVED or PUBLISHED, non-super-admins cannot alter core content
    IF OLD.status IN ('APPROVED', 'PUBLISHED') THEN
        IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
            -- Allow read/view counter increment or harmless metadata if applicable, but block content edits
            IF (NEW.title IS DISTINCT FROM OLD.title OR
                NEW.subject IS DISTINCT FROM OLD.subject OR
                NEW.chapter_id IS DISTINCT FROM OLD.chapter_id OR
                NEW.batch_id IS DISTINCT FROM OLD.batch_id OR
                NEW.video_playback_url IS DISTINCT FROM OLD.video_playback_url OR
                NEW.video_stream_id IS DISTINCT FROM OLD.video_stream_id OR
                NEW.thumbnail_url IS DISTINCT FROM OLD.thumbnail_url OR
                NEW.material_ids IS DISTINCT FROM OLD.material_ids) THEN
                RAISE EXCEPTION 'Unauthorized: Approved and Published lectures are locked and can only be modified by Super Administrators.';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_approved_lecture_lock ON public.cms_lectures;
CREATE TRIGGER trg_guard_approved_lecture_lock
    BEFORE UPDATE ON public.cms_lectures
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_approved_lecture_lock();

-- ------------------------------------------------------------------------------
-- 8. Row-Level Security Policies Updates
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_notifications ENABLE ROW LEVEL SECURITY;

-- Notifications Policies
DROP POLICY IF EXISTS "access_own_notifications" ON public.cms_notifications;
CREATE POLICY "access_own_notifications" ON public.cms_notifications
    FOR SELECT TO authenticated
    USING (
        recipient_id = auth.uid() OR
        (recipient_role = 'SUPER_ADMIN' AND public.is_super_admin()) OR
        (recipient_role = 'ADMIN' AND public.is_admin_or_super_admin())
    );

DROP POLICY IF EXISTS "update_own_notifications" ON public.cms_notifications;
CREATE POLICY "update_own_notifications" ON public.cms_notifications
    FOR UPDATE TO authenticated
    USING (
        recipient_id = auth.uid() OR
        (recipient_role = 'SUPER_ADMIN' AND public.is_super_admin())
    )
    WITH CHECK (
        recipient_id = auth.uid() OR
        (recipient_role = 'SUPER_ADMIN' AND public.is_super_admin())
    );

DROP POLICY IF EXISTS "service_insert_notifications" ON public.cms_notifications;
CREATE POLICY "service_insert_notifications" ON public.cms_notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Enhanced cms_live_classes Policies
DROP POLICY IF EXISTS "public_read_published_live_classes" ON public.cms_live_classes;
CREATE POLICY "public_read_published_live_classes" ON public.cms_live_classes
    FOR SELECT USING (
        is_visible = TRUE AND
        live_status IN ('SCHEDULED', 'LIVE', 'COMPLETED') AND
        status IN ('PUBLISHED', 'DRAFT')
    );

DROP POLICY IF EXISTS "teacher_insert_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "admin_insert_live_classes" ON public.cms_live_classes;
CREATE POLICY "teacher_insert_live_classes" ON public.cms_live_classes
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR created_by = auth.uid() OR submitted_by = auth.uid())
    );

DROP POLICY IF EXISTS "teacher_update_own_live_classes" ON public.cms_live_classes;
DROP POLICY IF EXISTS "admin_update_assigned_live_classes" ON public.cms_live_classes;
CREATE POLICY "teacher_update_own_live_classes" ON public.cms_live_classes
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR created_by = auth.uid() OR submitted_by = auth.uid())
    )
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR created_by = auth.uid() OR submitted_by = auth.uid())
    );

-- Enhanced cms_lectures Policies: Teacher can edit in DRAFT, PENDING_REVIEW, REJECTED
DROP POLICY IF EXISTS "teacher_update_own_lectures" ON public.cms_lectures;
DROP POLICY IF EXISTS "admin_update_own_lectures" ON public.cms_lectures;
CREATE POLICY "teacher_update_own_lectures" ON public.cms_lectures
    FOR UPDATE TO authenticated
    USING (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR created_by = auth.uid() OR submitted_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW', 'REJECTED')
    )
    WITH CHECK (
        public.is_admin_or_super_admin() AND
        (educator_id = auth.uid() OR created_by = auth.uid() OR submitted_by = auth.uid()) AND
        status IN ('DRAFT', 'PENDING_REVIEW', 'REJECTED')
    );

-- Super Admin management policies remain active
