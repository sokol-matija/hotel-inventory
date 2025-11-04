-- Migration: Add labels table for reservation grouping
-- Date: 2025-11-04
-- Description: Creates labels table for grouping reservations (e.g., "german-bikers")
--              and adds label_id to reservations table

-- Enable pg_trgm extension for fast text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create labels table
CREATE TABLE IF NOT EXISTS public.labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#000000', -- Default black text color
  bg_color TEXT DEFAULT '#FFFFFF', -- Default white background
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,

  -- Ensure unique label names per hotel (case-insensitive)
  CONSTRAINT labels_hotel_name_unique UNIQUE (hotel_id, LOWER(name)),

  -- Lowercase validation - names must be lowercase with hyphens
  CONSTRAINT labels_name_lowercase CHECK (name = LOWER(name)),

  -- Name cannot be empty
  CONSTRAINT labels_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

-- Add comment for documentation
COMMENT ON TABLE public.labels IS 'Labels/groups for organizing related reservations (e.g., "german-bikers" for a tour group)';
COMMENT ON COLUMN public.labels.name IS 'Label name in lowercase with hyphens (e.g., "german-bikers")';
COMMENT ON COLUMN public.labels.color IS 'Text color for label display (default: black #000000)';
COMMENT ON COLUMN public.labels.bg_color IS 'Background color for label display (default: white #FFFFFF)';

-- Indexes for fast search and lookups
CREATE INDEX idx_labels_hotel_id ON public.labels(hotel_id);
CREATE INDEX idx_labels_hotel_name ON public.labels(hotel_id, name);
CREATE INDEX idx_labels_name_search ON public.labels USING gin(name gin_trgm_ops);

-- Add label_id to reservations table
ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS label_id UUID REFERENCES public.labels(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.reservations.label_id IS 'Optional label/group for this reservation (e.g., tour group identifier)';

-- Index for fast label lookups on reservations
CREATE INDEX IF NOT EXISTS idx_reservations_label_id ON public.reservations(label_id) WHERE label_id IS NOT NULL;

-- Enable Row Level Security on labels table
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view labels for their hotel
CREATE POLICY "Users can view labels for their hotel"
  ON public.labels
  FOR SELECT
  TO authenticated
  USING (
    hotel_id IN (
      SELECT hotel_id
      FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create labels for their hotel
CREATE POLICY "Users can create labels for their hotel"
  ON public.labels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    hotel_id IN (
      SELECT hotel_id
      FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update labels for their hotel
CREATE POLICY "Users can update labels for their hotel"
  ON public.labels
  FOR UPDATE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT hotel_id
      FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    hotel_id IN (
      SELECT hotel_id
      FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can delete labels for their hotel
CREATE POLICY "Users can delete labels for their hotel"
  ON public.labels
  FOR DELETE
  TO authenticated
  USING (
    hotel_id IN (
      SELECT hotel_id
      FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to auto-update updated_at on labels
CREATE TRIGGER update_labels_updated_at
  BEFORE UPDATE ON public.labels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample labels for testing (optional - can be removed for production)
-- INSERT INTO public.labels (hotel_id, name, color, bg_color)
-- SELECT
--   h.id,
--   'german-bikers',
--   '#000000',
--   '#FFFFFF'
-- FROM public.hotels h
-- LIMIT 1;

-- Verify the migration
DO $$
DECLARE
  label_count INTEGER;
  reservation_column_exists BOOLEAN;
BEGIN
  -- Check labels table exists
  SELECT COUNT(*) INTO label_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'labels';

  IF label_count = 0 THEN
    RAISE EXCEPTION 'Labels table was not created successfully';
  END IF;

  -- Check label_id column exists on reservations
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reservations'
      AND column_name = 'label_id'
  ) INTO reservation_column_exists;

  IF NOT reservation_column_exists THEN
    RAISE EXCEPTION 'label_id column was not added to reservations table';
  END IF;

  RAISE NOTICE '✅ Labels migration completed successfully';
  RAISE NOTICE '   - Labels table created with RLS policies';
  RAISE NOTICE '   - label_id column added to reservations';
  RAISE NOTICE '   - Indexes created for performance';
END $$;
