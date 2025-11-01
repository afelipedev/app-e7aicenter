-- CORREÇÃO: Remover foreign key constraint problemática
-- A constraint users_auth_user_id_fkey está causando problemas na criação de usuários
-- porque o usuário auth pode não estar imediatamente disponível após signUp

-- 1. REMOVER A CONSTRAINT PROBLEMÁTICA
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_user_id_fkey;

-- 2. TORNAR auth_user_id NULLABLE para permitir flexibilidade
ALTER TABLE public.users ALTER COLUMN auth_user_id DROP NOT NULL;

-- 3. ADICIONAR COMENTÁRIO EXPLICATIVO
COMMENT ON COLUMN public.users.auth_user_id IS 
'ID do usuário na tabela auth.users. Pode ser NULL temporariamente durante a criação.';

-- 4. CRIAR ÍNDICE PARA PERFORMANCE (sem constraint)
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- 5. COMENTÁRIO DA MIGRAÇÃO
COMMENT ON TABLE public.users IS 
'Tabela de usuários - foreign key constraint removida para resolver problemas de criação de usuários';