-- Corrigir recursão infinita nas políticas RLS
-- Remove as políticas que causam recursão e implementa políticas mais simples

-- Remover todas as políticas problemáticas da migração 015
DROP POLICY IF EXISTS "users_select_own_active" ON public.users;
DROP POLICY IF EXISTS "users_update_own_active" ON public.users;
DROP POLICY IF EXISTS "admin_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admin_update_all_users" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

-- Criar políticas simples sem recursão
-- Usuários podem ver e atualizar apenas seus próprios dados
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth_user_id = auth.uid());

-- Política para inserção de novos usuários
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

-- Política especial para administradores (sem verificação de status para evitar recursão)
-- A verificação de status será feita no nível da aplicação
CREATE POLICY "admin_full_access" ON public.users
  FOR ALL
  USING (
    auth_user_id IN (
      SELECT auth_user_id FROM public.users 
      WHERE role = 'administrator'
    )
  );

-- Comentário: A verificação de status 'ativo' será mantida apenas no nível da aplicação
-- (AuthContext.tsx e ProtectedRoute.tsx) para evitar recursão no banco de dados