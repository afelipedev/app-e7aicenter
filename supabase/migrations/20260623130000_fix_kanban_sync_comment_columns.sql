-- Corrige sync de comentários para usar coluna content (schema real)

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_comment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
  v_mirrored_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN RETURN NEW; END IF;
  IF NEW.mirrored_card_comment_id IS NOT NULL OR NEW.mirrored_post_message_id IS NOT NULL THEN RETURN NEW; END IF;
  v_peer_card_id := public.kanban_linked_peer_card_id(NEW.card_id);
  IF v_peer_card_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.kanban_link_sync_begin();
  INSERT INTO public.legal_kanban_comments (card_id, author_user_id, content, mirrored_card_comment_id)
  VALUES (v_peer_card_id, NEW.author_user_id, NEW.content, NEW.id)
  RETURNING id INTO v_mirrored_id;
  UPDATE public.legal_kanban_comments SET mirrored_card_comment_id = v_mirrored_id WHERE id = NEW.id;
  PERFORM public.kanban_link_sync_end();
  RETURN NEW;
END;
$$;
