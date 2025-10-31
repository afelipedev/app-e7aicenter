-- Adicionar política RLS para verificar status ativo dos usuários
-- Esta política garante que apenas usuários com status 'ativo' possam acessar seus dados

-- Remover política existente se houver
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

-- Criar nova política para SELECT que verifica status ativo
CREATE POLICY "users_select_own_active" ON public.users
  FOR SELECT
  USING (
    auth_user_id = auth.uid() 
    AND status = 'ativo'
  );

-- Criar nova política para UPDATE que verifica status ativo
CREATE POLICY "users_update_own_active" ON public.users
  FOR UPDATE
  USING (
    auth_user_id = auth.uid() 
    AND status = 'ativo'
  );

-- Política para permitir que administradores vejam todos os usuários (incluindo inativos)
CREATE POLICY "admin_view_all_users" ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.auth_user_id = auth.uid() 
      AND u.role = 'administrator'
      AND u.status = 'ativo'
    )
  );

-- Política para permitir que administradores atualizem todos os usuários
CREATE POLICY "admin_update_all_users" ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.auth_user_id = auth.uid() 
      AND u.role = 'administrator'
      AND u.status = 'ativo'
    )
  );

-- Política para permitir inserção de novos usuários (para registro)
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());