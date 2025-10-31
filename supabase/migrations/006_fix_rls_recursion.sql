-- Migration: 006_fix_rls_recursion
-- Description: Corrige recursão infinita nas políticas RLS da tabela users
-- Created: 2025-01-25

-- =====================================================
-- REMOÇÃO DAS POLÍTICAS PROBLEMÁTICAS
-- =====================================================

-- Remove todas as políticas da tabela users que causam recursão
DROP POLICY IF EXISTS "Usuários podem ver próprios dados" ON public.users;
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Admins podem inserir usuários" ON public.users;
DROP POLICY IF EXISTS "Admins podem atualizar usuários" ON public.users;
DROP POLICY IF EXISTS "Admins podem deletar usuários" ON public.users;

-- =====================================================
-- NOVAS POLÍTICAS SIMPLES SEM RECURSÃO
-- =====================================================

-- Política 1: Usuários podem ver seus próprios dados
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT 
    USING (auth.uid() = auth_user_id);

-- Política 2: Permite acesso total para service_role (usado pelo backend)
CREATE POLICY "users_service_role_access" ON public.users
    FOR ALL 
    USING (auth.role() = 'service_role');

-- Política 3: Usuários podem atualizar seus próprios dados
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE 
    USING (auth.uid() = auth_user_id);

-- =====================================================
-- ATUALIZAÇÃO DAS POLÍTICAS DE OUTRAS TABELAS
-- =====================================================

-- Remove políticas problemáticas das outras tabelas
DROP POLICY IF EXISTS "Admins e Contábil podem inserir empresas" ON public.companies;
DROP POLICY IF EXISTS "Admins podem atualizar empresas" ON public.companies;
DROP POLICY IF EXISTS "Admins podem deletar empresas" ON public.companies;

-- Políticas simplificadas para companies
CREATE POLICY "companies_service_role_access" ON public.companies
    FOR ALL 
    USING (auth.role() = 'service_role');

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON POLICY "users_select_own" ON public.users IS 
'Permite que usuários vejam apenas seus próprios dados';

COMMENT ON POLICY "users_service_role_access" ON public.users IS 
'Permite acesso total via service_role para operações do backend';

COMMENT ON POLICY "users_update_own" ON public.users IS 
'Permite que usuários atualizem apenas seus próprios dados';