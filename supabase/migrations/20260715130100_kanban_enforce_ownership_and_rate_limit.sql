-- Impede criador forjado/nulo e carga em massa no conteúdo do kanban por usuários
-- comuns. Foi por essa brecha (política ALL só com is_legal_kanban_member(), sem
-- checar posse) que 1.099 cards com created_by NULL foram inseridos via API REST
-- direta. Caminhos de backend (service_role: kanban-card-bridge, imports sancionados)
-- são preservados.
--
-- Funções do trigger são SECURITY INVOKER (padrão) para que current_user reflita
-- o papel real do chamador. current_legal_kanban_user_id() é SECURITY DEFINER.

-- Tabelas com created_by_user_id (cards, anexos)
CREATE OR REPLACE FUNCTION public.kanban_enforce_created_by_and_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_count int;
  v_limit constant int := 100;
BEGIN
  IF current_user IN ('service_role', 'supabase_admin', 'postgres', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  v_uid := public.current_legal_kanban_user_id();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Usuário ativo não encontrado para criar o registro.' USING ERRCODE = '42501';
  END IF;

  -- Posse = quem está criando (bloqueia criador nulo/forjado)
  NEW.created_by_user_id := v_uid;

  -- Anti-carga em massa: limite de inserções por transação (contador local)
  v_count := COALESCE(current_setting('app.kanban_insert_count', true), '0')::int + 1;
  PERFORM set_config('app.kanban_insert_count', v_count::text, true);
  IF v_count > v_limit THEN
    RAISE EXCEPTION 'Limite de % inserções por operação excedido (proteção anti-carga em massa).', v_limit
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

-- Tabela com author_user_id (comentários)
CREATE OR REPLACE FUNCTION public.kanban_enforce_author_and_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_count int;
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

  v_count := COALESCE(current_setting('app.kanban_insert_count', true), '0')::int + 1;
  PERFORM set_config('app.kanban_insert_count', v_count::text, true);
  IF v_count > v_limit THEN
    RAISE EXCEPTION 'Limite de % inserções por operação excedido (proteção anti-carga em massa).', v_limit
      USING ERRCODE = '54000';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_cards_enforce_owner ON public.legal_kanban_cards;
CREATE TRIGGER trg_kanban_cards_enforce_owner
  BEFORE INSERT ON public.legal_kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.kanban_enforce_created_by_and_limit();

DROP TRIGGER IF EXISTS trg_kanban_attachments_enforce_owner ON public.legal_kanban_attachments;
CREATE TRIGGER trg_kanban_attachments_enforce_owner
  BEFORE INSERT ON public.legal_kanban_attachments
  FOR EACH ROW EXECUTE FUNCTION public.kanban_enforce_created_by_and_limit();

DROP TRIGGER IF EXISTS trg_kanban_comments_enforce_author ON public.legal_kanban_comments;
CREATE TRIGGER trg_kanban_comments_enforce_author
  BEFORE INSERT ON public.legal_kanban_comments
  FOR EACH ROW EXECUTE FUNCTION public.kanban_enforce_author_and_limit();
