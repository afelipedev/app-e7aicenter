-- Fix users table structure to match TypeScript definitions

-- Add missing last_access column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ;

-- Add status column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';
UPDATE public.users SET status = CASE WHEN active = true THEN 'active' ELSE 'inactive' END WHERE status IS NULL;

-- Remove existing role constraint temporarily
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Update existing users to use English roles
UPDATE public.users SET role = 'administrator' WHERE role = 'administrador';
UPDATE public.users SET role = 'it' WHERE role = 'ti';

-- Add the new role constraint
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('administrator', 'it', 'advogado_adm', 'advogado', 'contabil', 'financeiro'));

-- Add status constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_status_check 
CHECK (status IN ('active', 'inactive'));