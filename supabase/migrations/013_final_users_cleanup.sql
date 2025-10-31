-- Migration: 013_final_users_cleanup
-- Description: Manter apenas coluna status com valores 'ativo'/'inativo' e remover colunas redundantes
-- Date: 2025-01-29

-- Start transaction
BEGIN;

-- Backup current data before making changes
CREATE TEMP TABLE users_backup AS 
SELECT id, auth_user_id, name, email, role, active, status, created_at, updated_at, last_access
FROM public.users;

-- Step 1: Drop existing status constraint first
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_status_check;

-- Step 2: Migrate data from 'active' column to 'status' column with Portuguese values
-- Update status based on active column values
UPDATE public.users 
SET status = CASE 
    WHEN active = true THEN 'ativo'
    WHEN active = false THEN 'inativo'
    ELSE 'ativo'  -- Default for NULL values
END;

-- Step 3: Update any remaining NULL values to 'ativo'
UPDATE public.users 
SET status = 'ativo' 
WHERE status IS NULL;

-- Step 4: Set proper default and NOT NULL for status column
ALTER TABLE public.users 
ALTER COLUMN status SET DEFAULT 'ativo',
ALTER COLUMN status SET NOT NULL;

-- Step 5: Add new constraint with Portuguese values
ALTER TABLE public.users 
ADD CONSTRAINT users_status_check 
CHECK (status IN ('ativo', 'inativo'));

-- Step 6: Drop foreign key constraint for company_id
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_company_id_fkey;

-- Step 7: Drop index for company_id if exists
DROP INDEX IF EXISTS idx_users_company_id;

-- Step 8: Remove the company_id column
ALTER TABLE public.users 
DROP COLUMN IF EXISTS company_id;

-- Step 9: Remove the active column (now redundant)
ALTER TABLE public.users 
DROP COLUMN IF EXISTS active;

-- Step 10: Add comments to document the changes
COMMENT ON TABLE public.users IS 'Tabela de usuários - estrutura limpa com apenas coluna status para controle ativo/inativo';
COMMENT ON COLUMN public.users.status IS 'Status do usuário: ativo ou inativo - controla se o usuário pode fazer login no sistema';

-- Step 11: Verify the final structure
DO $$
BEGIN
    -- Check if cleanup was successful
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name IN ('active', 'company_id')
    ) THEN
        RAISE NOTICE 'SUCCESS: Colunas active e company_id foram removidas com sucesso da tabela public.users';
    ELSE
        RAISE EXCEPTION 'ERROR: Algumas colunas não foram removidas corretamente';
    END IF;
    
    -- Verify status column is properly configured
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'status'
        AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE 'SUCCESS: Coluna status está configurada corretamente como NOT NULL';
    ELSE
        RAISE NOTICE 'WARNING: Configuração da coluna status pode precisar de verificação';
    END IF;
    
    -- Verify constraint exists
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_schema = 'public' 
        AND constraint_name = 'users_status_check'
    ) THEN
        RAISE NOTICE 'SUCCESS: Constraint para valores ativo/inativo foi criada com sucesso';
    ELSE
        RAISE NOTICE 'WARNING: Constraint da coluna status pode precisar de verificação';
    END IF;
END $$;

-- Commit the transaction
COMMIT;