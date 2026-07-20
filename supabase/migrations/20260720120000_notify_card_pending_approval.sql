-- Notifica os usuários de perfil "advogado_adm" quando um card entra em "Aguardando Aprovação".
-- Padrão: trigger AFTER UPDATE em legal_kanban_cards, SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.notify_card_pending_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_board_id UUID;
  v_board_title TEXT;
  v_board_slug TEXT;
BEGIN
  IF NEW.status <> 'aguardando_aprovacao' OR OLD.status = 'aguardando_aprovacao' THEN
    RETURN NEW;
  END IF;

  SELECT b.id, b.title, b.slug INTO v_board_id, v_board_title, v_board_slug
  FROM public.legal_kanban_columns c
  JOIN public.legal_kanban_boards b ON b.id = c.board_id
  WHERE c.id = NEW.column_id;

  INSERT INTO public.notifications (user_id, kind, payload)
  SELECT u.id, 'card_pending_approval', jsonb_build_object(
    'card_id', NEW.id,
    'card_title', NEW.title,
    'board_id', v_board_id,
    'board_title', v_board_title,
    'board_slug', v_board_slug
  )
  FROM public.users u
  WHERE u.role = 'advogado_adm'
    AND u.status = 'ativo'
    AND u.id IS DISTINCT FROM NEW.updated_by_user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_card_pending_approval ON public.legal_kanban_cards;
CREATE TRIGGER trg_notify_card_pending_approval
  AFTER UPDATE OF status ON public.legal_kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.notify_card_pending_approval();
