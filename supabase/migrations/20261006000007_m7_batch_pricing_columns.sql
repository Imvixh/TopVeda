-- ============================================================================
-- MIGRATION: Phase M7 - Batch Pricing Columns & PostgREST Schema Reload
-- Description: Adds pricing_type, price_inr, and discount_percent to cms_batches
-- ============================================================================

DO $$
BEGIN
  -- 1. Add pricing_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cms_batches' AND column_name = 'pricing_type'
  ) THEN
    ALTER TABLE cms_batches 
      ADD COLUMN pricing_type TEXT DEFAULT 'FREE' CHECK (pricing_type IN ('FREE', 'PAID'));
    RAISE NOTICE 'Added pricing_type to cms_batches';
  END IF;

  -- 2. Add price_inr column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cms_batches' AND column_name = 'price_inr'
  ) THEN
    ALTER TABLE cms_batches 
      ADD COLUMN price_inr NUMERIC(10, 2) DEFAULT 0;
    RAISE NOTICE 'Added price_inr to cms_batches';
  END IF;

  -- 3. Add discount_percent column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cms_batches' AND column_name = 'discount_percent'
  ) THEN
    ALTER TABLE cms_batches 
      ADD COLUMN discount_percent NUMERIC(5, 2) DEFAULT 0;
    RAISE NOTICE 'Added discount_percent to cms_batches';
  END IF;
END $$;

-- Reload Supabase PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
