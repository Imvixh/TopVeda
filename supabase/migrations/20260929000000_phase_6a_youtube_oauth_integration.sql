-- ==============================================================================
-- TopVeda Phase 6A: Platform Integrations & YouTube OAuth Storage Migration
-- Provisions secure, server-authoritative storage for platform integrations (YouTube)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cms_platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL UNIQUE,
  connection_status VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
  channel_id VARCHAR(255),
  channel_title VARCHAR(255),
  channel_thumbnail_url TEXT,
  encrypted_refresh_token TEXT NOT NULL,
  token_metadata JSONB DEFAULT '{}'::jsonb,
  connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_connection_status CHECK (connection_status IN ('CONNECTED', 'DISCONNECTED', 'REVOKED', 'ERROR'))
);

-- Index on provider for fast singleton lookups
CREATE INDEX IF NOT EXISTS idx_cms_platform_integrations_provider
  ON public.cms_platform_integrations(provider);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cms_platform_integrations ENABLE ROW LEVEL SECURITY;

-- Deny all access to anonymous and student users
CREATE POLICY "Super Admins can view platform integrations"
  ON public.cms_platform_integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super Admins can insert/update platform integrations"
  ON public.cms_platform_integrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'SUPER_ADMIN'
    )
  );
