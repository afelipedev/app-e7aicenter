-- Migration: 002_rls_policies
-- Description: Configuração de Row Level Security e políticas de permissão
-- Created: 2024-12-26

-- =====================================================
-- HABILITAÇÃO DO ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS PARA TABELA USERS
-- =====================================================

-- Usuários podem ver seus próprios dados
CREATE POLICY "Usuários podem ver próprios dados" ON public.users
    FOR SELECT USING (auth.uid() = auth_user_id);

-- Admins podem ver todos os usuários
CREATE POLICY "Admins podem ver todos os usuários" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem inserir usuários
CREATE POLICY "Admins podem inserir usuários" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem atualizar usuários
CREATE POLICY "Admins podem atualizar usuários" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem deletar usuários
CREATE POLICY "Admins podem deletar usuários" ON public.users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- =====================================================
-- POLÍTICAS PARA TABELA COMPANIES
-- =====================================================

-- Usuários autenticados podem ver empresas
CREATE POLICY "Usuários autenticados podem ver empresas" ON public.companies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins e Contábil podem inserir empresas
CREATE POLICY "Admins e Contábil podem inserir empresas" ON public.companies
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm', 'contabil')
        )
    );

-- Admins podem atualizar empresas
CREATE POLICY "Admins podem atualizar empresas" ON public.companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- Admins podem deletar empresas
CREATE POLICY "Admins podem deletar empresas" ON public.companies
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('administrador', 'ti', 'advogado_adm')
        )
    );

-- =====================================================
-- POLÍTICAS PARA TABELA PAYSLIPS
-- =====================================================

-- Usuários autenticados podem ver holerites
CREATE POLICY "Usuários autenticados podem ver holerites" ON public.payslips
    FOR SELECT USING (auth.role() = 'authenticated');

-- Usuários autenticados podem inserir holerites
CREATE POLICY "Usuários autenticados podem inserir holerites" ON public.payslips
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Usuários autenticados podem atualizar holerites
CREATE POLICY "Usuários autenticados podem atualizar holerites" ON public.payslips
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Usuários autenticados podem deletar holerites
CREATE POLICY "Usuários autenticados podem deletar holerites" ON public.payslips
    FOR DELETE USING (auth.role() = 'authenticated');