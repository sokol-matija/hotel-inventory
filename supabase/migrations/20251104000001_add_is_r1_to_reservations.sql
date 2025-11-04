-- Add is_r1 column to reservations table for R1 company billing flag
-- This indicates when a reservation should be billed to a company (R1) vs individual guest

ALTER TABLE public.reservations
ADD COLUMN IF NOT EXISTS is_r1 boolean DEFAULT false NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.reservations.is_r1 IS 'Flag indicating if this is an R1 (company billing) reservation. When true, invoice should show company details from company_id instead of guest details.';

-- Create index for faster queries on R1 reservations
CREATE INDEX IF NOT EXISTS idx_reservations_is_r1 ON public.reservations(is_r1) WHERE is_r1 = true;

-- Update existing reservations that have a company_id to set is_r1 = true
UPDATE public.reservations
SET is_r1 = true
WHERE company_id IS NOT NULL;
