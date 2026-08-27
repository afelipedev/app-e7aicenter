-- Evita "invalid input syntax for type integer" no trigger de INSERT de anexos
-- (e cards/comentários). current_setting() pode devolver '' (string vazia) em
-- conexões pooled; COALESCE não trata string vazia, e ''::int quebra o upload.

CREATE OR REPLACE FUNCTION public.kanban_enforce_created_by_and_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_count int;
  v_raw text;
  v_limit constant int := 100;
BEGIN
  IF current_user IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  v_uid := public.current_legal_kanban_user_id();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário ativo não encontrado para criar o registro.' USING ERRCODE = '42501';
  END IF;

  NEW.created_by_user_id := v_uid;

  v_raw := COALESCE(NULLIF(btrim(current_setting('app.kanban_insert_count', true)), ''), '0');
  IF v_raw !~ '^[0-9]+$' THEN
    v_raw := '0';
  END IF;
  v_count := v_raw::int + 1;
  PERFORM set_config('app.kanban_insert_count', v_count::text, true);
  IF v_count > v_limit THEN
    RAISE EXCEPTION 'Limite de % inserções por operação excedido (proteção anti-carga em massa).', v_limit
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_enforce_author_and_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_count int;
  v_raw text;
  v_limit constant int := 100;
BEGIN
  IF current_user IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  v_uid := public.current_legal_kanban_user_id();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário ativo não encontrado para criar o registro.' USING ERRCODE = '42501';
  END IF;

  NEW.author_user_id := v_uid;

  v_raw := COALESCE(NULLIF(btrim(current_setting('app.kanban_insert_count', true)), ''), '0');
  IF v_raw !~ '^[0-9]+$' THEN
    v_raw := '0';
  END IF;
  v_count := v_raw::int + 1;
  PERFORM set_config('app.kanban_insert_count', v_count::text, true);
  IF v_count > v_limit THEN
    RAISE EXCEPTION 'Limite de % inserções por operação excedido (proteção anti-carga em massa).', v_limit
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;
