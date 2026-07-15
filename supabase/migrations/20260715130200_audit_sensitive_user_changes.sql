-- Registra em audit_logs qualquer mudança de role/status/first_access_completed em
-- users (por qualquer caminho: admin, service_role, RPC), com autor e valores
-- antigo/novo. ip_address/user_agent não estão disponíveis na camada de banco.

CREATE OR REPLACE FUNCTION public.audit_users_privileged_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.first_access_completed IS DISTINCT FROM OLD.first_access_completed THEN

    SELECT id INTO v_actor FROM public.users WHERE auth_user_id = (SELECT auth.uid()) LIMIT 1;

    INSERT INTO public.audit_logs (user_id, event_type, event_data)
    VALUES (
      NEW.id,
      'users_privileged_change',
      jsonb_build_object(
        'actor_user_id', v_actor,
        'actor_db_role', current_user,
        'target_user_id', NEW.id,
        'old', jsonb_build_object('role', OLD.role, 'status', OLD.status, 'first_access_completed', OLD.first_access_completed),
        'new', jsonb_build_object('role', NEW.role, 'status', NEW.status, 'first_access_completed', NEW.first_access_completed)
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_users_privileged_change ON public.users;
CREATE TRIGGER trg_audit_users_privileged_change
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_users_privileged_change();
