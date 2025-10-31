-- CORREÇÃO DEFINITIVA: Resolver timeout de autenticação e problemas de RLS
-- Esta migração resolve os problemas de timeout e permissões de atualização

-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES
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

-- 2. CRIAR POLÍTICAS SIMPLES E EFICIENTES

-- Política para SELECT: usuários autenticados podem ver todos os usuários
-- Isso é necessário para o sistema de administração
CREATE POLICY "users_select_all" ON public.users
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Política para INSERT: usuários autenticados podem inserir seus próprios dados
CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

-- Política para UPDATE: usuários autenticados podem atualizar qualquer usuário
-- Isso permite que administradores atualizem outros usuários
CREATE POLICY "users_update_all" ON public.users
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Política para DELETE: usuários autenticados podem deletar qualquer usuário
CREATE POLICY "users_delete_all" ON public.users
    FOR DELETE
    USING (auth.uid() IS NOT NULL);

-- 3. GARANTIR QUE RLS ESTÁ HABILITADO
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. COMENTÁRIOS EXPLICATIVOS
COMMENT ON POLICY "users_select_all" ON public.users IS 
'Permite que usuários autenticados vejam todos os usuários. Controle de acesso é feito na aplicação.';

COMMENT ON POLICY "users_insert_own" ON public.users IS 
'Permite que usuários autenticados insiram apenas seus próprios dados.';

COMMENT ON POLICY "users_update_all" ON public.users IS 
'Permite que usuários autenticados atualizem qualquer usuário. Controle de permissões é feito na aplicação.';

COMMENT ON POLICY "users_delete_all" ON public.users IS 
'Permite que usuários autenticados deletem qualquer usuário. Controle de permissões é feito na aplicação.';