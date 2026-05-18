-- Notifica usuário quando ele é adicionado como membro de um quadro do legal_kanban.
-- Padrão: trigger AFTER INSERT em legal_kanban_board_members, SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.notify_board_member_added()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_board_title TEXT;
  v_board_slug TEXT;
BEGIN
  -- Não notifica auto-adição (ex.: dono criando o board com initial membership)
  IF NEW.user_id = NEW.created_by_user_id THEN
    RETURN NEW;
  END IF;

  SELECT b.title, b.slug INTO v_board_title, v_board_slug
  FROM public.legal_kanban_boards b WHERE b.id = NEW.board_id;

  INSERT INTO public.notifications (user_id, kind, payload)
  VALUES (NEW.user_id, 'board_member_added', jsonb_build_object(
    'board_id', NEW.board_id,
    'board_title', v_board_title,
    'board_slug', v_board_slug,
    'access_level', NEW.access_level
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_board_member_added ON public.legal_kanban_board_members;
CREATE TRIGGER trg_notify_board_member_added
  AFTER INSERT ON public.legal_kanban_board_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_board_member_added();
