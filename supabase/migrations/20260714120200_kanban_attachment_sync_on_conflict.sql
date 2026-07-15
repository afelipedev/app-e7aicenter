-- Torna o espelhamento de anexos entre cards vinculados idempotente: se a cópia
-- já existir no card do par (índices únicos criados em 20260714120100), ignora
-- em vez de duplicar/errar.

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_attachment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(NEW.card_id) LOOP
    INSERT INTO public.legal_kanban_attachments (
      card_id,
      attachment_type,
      name,
      file_path,
      file_size,
      mime_type,
      url,
      created_by_user_id
    ) VALUES (
      v_peer_card_id,
      NEW.attachment_type,
      NEW.name,
      NEW.file_path,
      NEW.file_size,
      NEW.mime_type,
      NEW.url,
      NEW.created_by_user_id
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;
