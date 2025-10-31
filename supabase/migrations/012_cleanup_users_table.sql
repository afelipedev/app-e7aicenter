-- Migration: 012_cleanup_users_table
-- Description: Remove duplicate status columns and unnecessary company_id from public.users
-- Date: 2025-01-29

-- Start transaction
BEGIN;

-- Backup current data before making changes
-- This creates a temporary backup table with current data
CREATE TEMP TABLE users_backup AS 
SELECT id, auth_user_id, name, email, role, active, created_at, updated_at, last_access
FROM public.users;

-- Drop foreign key constraint for company_id
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_company_id_fkey;

-- Drop index for company_id
DROP INDEX IF EXISTS idx_users_company_id;

-- Remove the redundant status column (keeping active)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS status;

-- Remove the unnecessary company_id column
ALTER TABLE public.users 
DROP COLUMN IF EXISTS company_id;

-- Ensure active column has proper default and constraint
ALTER TABLE public.users 
ALTER COLUMN active SET DEFAULT true,
ALTER COLUMN active SET NOT NULL;

-- Update any NULL values in active column to true (default active state)
UPDATE public.users 
SET active = true 
WHERE active IS NULL;

-- Add comment to document the cleanup
COMMENT ON TABLE public.users IS 'Users table - cleaned up to remove duplicate status columns and unnecessary company_id';
COMMENT ON COLUMN public.users.active IS 'Boolean flag to control user activation/deactivation - replaces previous status column';

-- Verify the final structure
DO $$
BEGIN
    -- Check if the cleanup was successful
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name IN ('status', 'company_id')
    ) THEN
        RAISE NOTICE 'SUCCESS: Columns status and company_id have been successfully removed from public.users';
    ELSE
        RAISE EXCEPTION 'ERROR: Some columns were not properly removed';
    END IF;
    
    -- Verify active column is properly configured
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'active'
        AND is_nullable = 'NO'
        AND column_default = 'true'
    ) THEN
        RAISE NOTICE 'SUCCESS: Active column is properly configured as NOT NULL with default true';
    ELSE
        RAISE NOTICE 'WARNING: Active column configuration may need verification';
    END IF;
END $$;

-- Commit the transaction
COMMIT;