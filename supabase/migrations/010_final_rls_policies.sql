-- Migration: 010_final_rls_policies
-- Description: Políticas RLS finais simplificadas
-- Created: 2025-01-30

-- Remove políticas existentes que podem causar problemas
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_service_role_access" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Usuários autenticados podem ver empresas" ON public.companies;
DROP POLICY IF EXISTS "companies_service_role_access" ON public.companies;

-- Política simples para usuários verem seus próprios dados
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT 
    USING (auth.uid() = auth_user_id);

-- Política para usuários atualizarem seus próprios dados
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE 
    USING (auth.uid() = auth_user_id);

-- Política para empresas - usuários autenticados podem ver
CREATE POLICY "authenticated_select_companies" ON public.companies
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Política para holerites - usuários autenticados podem ver
CREATE POLICY "authenticated_select_payslips" ON public.payslips
    FOR SELECT 
    USING (auth.role() = 'authenticated')