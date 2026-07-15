-- Bloqueia escalação de privilégio (relatório de pentest V003): impede que um
-- usuário autenticado comum altere colunas protegidas da própria linha
-- (role, status, first_access_completed, auth_user_id). Libera caminhos legítimos
-- de backend (service_role das edge functions admin; RPCs SECURITY DEFINER como
-- complete_first_access, que rodam como 'postgres') e administradores reais.
--
-- IMPORTANTE: a função do trigger é SECURITY INVOKER (padrão). Se fosse
-- SECURITY DEFINER, current_user seria sempre o dono ('postgres') e o guard
-- liberaria tudo. is_active_administrator() permanece SECURITY DEFINER porque
-- precisa ler public.users ignorando RLS.

CREATE OR REPLACE FUNCTION public.is_active_administrator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = (SELECT auth.uid())
      AND status = 'ativo'
      AND role IN ('administrator', 'it', 'advogado_adm')
  );
$$;

CREATE OR REPLACE FUNCTION public.users_guard_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Backend/definers: service_role (edge functions admin) e funções SECURITY
  -- DEFINER (ex.: complete_first_access) executam como o dono/‘postgres’.
  IF current_user IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- Administradores reais (lê o role COMMITADO via auth.uid()).
  IF public.is_active_administrator() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.first_access_completed IS DISTINCT FROM OLD.first_access_completed
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
    RAISE EXCEPTION 'Alteração não autorizada de campo protegido do usuário (role/status/first_access_completed/auth_user_id).'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_guard_privileged_columns ON public.users;
CREATE TRIGGER trg_users_guard_privileged_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_guard_privileged_columns();
