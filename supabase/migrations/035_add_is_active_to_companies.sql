-- Add is_active column to companies table
-- This migration adds the missing is_active column that the PayrollService expects

-- Add the is_active column with default value true
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update all existing companies to be active by default
UPDATE public.companies 
SET is_active = true 
WHERE is_active IS NULL;

-- Add index for better performance on is_active column
CREATE INDEX IF NOT EXISTS idx_companies_is_active 
ON public.companies(is_active);

-- Add a comment to document the column purpose
COMMENT ON COLUMN public.companies.is_active IS 'Indicates whether the company is active and should be displayed in the system';