-- ==============================================================================
-- TopVeda Migration: Dynamic YouTube Live Instance Architecture
-- Migration Version: 20261003000000
-- Purpose: Stable TopVeda Session ID with Dynamic YouTube Live Broadcast Instances,
--          Single Authoritative Current Instance Pointer, and Diagnostic Audit Log.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Live Class Instances Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cms_live_class_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    youtube_broadcast_id VARCHAR(255) NOT NULL,
    youtube_video_id VARCHAR(255) NOT NULL,
    youtube_stream_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'CREATED' NOT NULL, -- 'CREATED', 'READY', 'TESTING', 'LIVE', 'COMPLETED', 'INACTIVE', 'TERMINATED'
    lifecycle_status VARCHAR(50),                  -- YouTube API lifeCycleStatus: 'created', 'ready', 'testing', 'liveStarting', 'live', 'complete', 'revoked'
    stream_status VARCHAR(50),                     -- YouTube API streamStatus: 'active', 'ready', 'inactive', 'error'
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

-- Partial Unique Index: Database-enforced guarantee that at most ONE instance is marked current per live class
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_live_instances_single_current 
    ON public.cms_live_class_instances (live_class_id) 
    WHERE is_current = TRUE;

-- Unique Index: Prevent the same youtube_broadcast_id from being associated with multiple instances
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_live_instances_broadcast_unique 
    ON public.cms_live_class_instances (youtube_broadcast_id);

CREATE INDEX IF NOT EXISTS idx_cms_live_instances_class 
    ON public.cms_live_class_instances (live_class_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 2. Add Authoritative Current Instance Reference on cms_live_classes
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_live_classes
    ADD COLUMN IF NOT EXISTS current_live_instance_id UUID REFERENCES public.cms_live_class_instances(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cms_live_classes_current_instance 
    ON public.cms_live_classes (current_live_instance_id);

-- ------------------------------------------------------------------------------
-- 3. Create Diagnostic Transition Audit Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cms_live_instance_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    live_class_id UUID NOT NULL REFERENCES public.cms_live_classes(id) ON DELETE CASCADE,
    previous_instance_id UUID REFERENCES public.cms_live_class_instances(id) ON DELETE SET NULL,
    new_instance_id UUID REFERENCES public.cms_live_class_instances(id) ON DELETE SET NULL,
    previous_broadcast_id VARCHAR(255),
    new_broadcast_id VARCHAR(255),
    previous_video_id VARCHAR(255),
    new_video_id VARCHAR(255),
    lifecycle_status VARCHAR(50),
    stream_status VARCHAR(50),
    teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    transition_reason VARCHAR(100) NOT NULL, -- 'INITIAL_CREATE', 'TEACHER_RECONNECT', 'YOUTUBE_RESTART', 'BROADCAST_COMPLETED', 'MANUAL_RESTART'
    created_at TIMESTAMPTZ DEFAULT pg_catalog.now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_live_transitions_class 
    ON public.cms_live_instance_transitions (live_class_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS) & Policies
-- ------------------------------------------------------------------------------

ALTER TABLE public.cms_live_class_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_live_instance_transitions ENABLE ROW LEVEL SECURITY;

-- Instances: Admin / Educator / Super Admin read access ONLY.
-- Students obtain authoritative playback IDs strictly via the server-gated /api/teacher/live/session endpoint.
CREATE POLICY "Allow admin read live class instances"
    ON public.cms_live_class_instances FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Instances: Admin / Educator write access
CREATE POLICY "Allow admin write access to live class instances"
    ON public.cms_live_class_instances FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Transitions Audit: Admin / Super Admin read access
CREATE POLICY "Allow admin read live instance transitions"
    ON public.cms_live_instance_transitions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );

-- Transitions Audit: Admin / Super Admin write access
CREATE POLICY "Allow admin write live instance transitions"
    ON public.cms_live_instance_transitions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('ADMIN', 'SUPER_ADMIN')
        )
    );
