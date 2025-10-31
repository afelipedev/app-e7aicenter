-- CORREÇÃO FINAL DEFINITIVA: Eliminar completamente a recursão infinita
-- Esta migração resolve de forma definitiva o problema de recursão nas políticas RLS

-- 1. REMOVER ABSOLUTAMENTE TODAS AS POLÍTICAS EXISTENTES
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Buscar e remover todas as políticas da tabela users
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
    END LOOP;
END $$;

-- 2. DESABILITAR RLS completamente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. REABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR APENAS UMA POLÍTICA SIMPLES E SEGURA
-- Esta política permite que usuários acessem apenas seus próprios dados
-- SEM NENHUMA VERIFICAÇÃO DE STATUS OU ROLE (isso será feito na aplicação)
CREATE POLICY "users_basic_access" ON public.users
  FOR ALL
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- 5. COMENTÁRIO IMPORTANTE
COMMENT ON POLICY "users_basic_access" ON public.users IS 
'Política básica que permite acesso apenas aos próprios dados. 
Verificações de status e role são feitas na aplicação (AuthContext.tsx).
Esta política NÃO faz consultas à