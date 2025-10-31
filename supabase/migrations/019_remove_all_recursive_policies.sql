-- CORREÇÃO DEFINITIVA: Remover TODAS as políticas recursivas
-- Esta migração remove completamente todas as políticas que causam recursão
-- e implementa apenas políticas básicas e seguras

-- 1. REMOVER TODAS AS POLÍTICAS EXISTENTES (incluindo as recursivas)
DROP POLICY IF EXISTS "users_select_own_active" ON public.users;
DROP POLICY IF EXISTS "users_update_own_active" ON public.users;
DROP POLICY IF EXISTS "admin_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_update_all_users" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admin_full_access" ON public.users;

-- 2. DESABILITAR RLS temporariamente para limpeza completa
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. REABILITAR RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS SIMPLES E SEGURAS (SEM RECURSÃO)
-- Política básica: usuários podem acessar apenas seus próprios dados
CREATE POLICY "users_own_data_access" ON public.users
  FOR ALL
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());