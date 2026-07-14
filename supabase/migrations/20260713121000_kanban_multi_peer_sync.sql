-- Sync entre cards vinculados: passa de 1 par para N pares (grupo de duplicatas).
-- Substitui o uso de kanban_linked_peer_card_id() por kanban_linked_peer_card_ids().
-- Corrige também: coluna de anexo (name, não file_name) e exclusão de card apagando
-- conteúdo dos cards vinculados.

-- -----------------------------------------------------------------------------
-- Card core (sem column_id / position)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_card_core()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN NEW;
  END IF;

  IF OLD.title IS NOT DISTINCT FROM NEW.title
    AND OLD.description_json IS NOT DISTINCT FROM NEW.description_json
    AND OLD.description_text IS NOT DISTINCT FROM NEW.description_text
    AND OLD.status IS NOT DISTINCT FROM NEW.status
    AND OLD.priority IS NOT DISTINCT FROM NEW.priority
    AND OLD.cover_color IS NOT DISTINCT FROM NEW.cover_color
    AND OLD.start_date IS NOT DISTINCT FROM NEW.start_date
    AND OLD.due_date IS NOT DISTINCT FROM NEW.due_date
    AND OLD.reminder_at IS NOT DISTINCT FROM NEW.reminder_at
    AND OLD.recurrence_rule IS NOT DISTINCT FROM NEW.recurrence_rule
    AND OLD.completed_at IS NOT DISTINCT FROM NEW.completed_at
  THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_id IN SELECT public.kanban_linked_peer_card_ids(NEW.id) LOOP
    UPDATE public.legal_kanban_cards
    SET
      title = NEW.title,
      description_json = NEW.description_json,
      description_text = NEW.description_text,
      status = NEW.status,
      priority = NEW.priority,
      cover_color = NEW.cover_color,
      start_date = NEW.start_date,
      due_date = NEW.due_date,
      reminder_at = NEW.reminder_at,
      recurrence_rule = NEW.recurrence_rule,
      completed_at = NEW.completed_at,
      updated_by_user_id = NEW.updated_by_user_id,
      updated_at = now()
    WHERE id = v_peer_id;
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Comentários (agrupados por mirror_group_id)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_comment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
  v_group_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN NEW;
  END IF;

  IF NEW.mirrored_card_comment_id IS NOT NULL OR NEW.mirrored_post_message_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_group_id := COALESCE(NEW.mirror_group_id, NEW.id);

  PERFORM public.kanban_link_sync_begin();

  UPDATE public.legal_kanban_comments
  SET mirror_group_id = v_group_id
  WHERE id = NEW.id AND mirror_group_id IS NULL;

  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(NEW.card_id) LOOP
    INSERT INTO public.legal_kanban_comments (
      card_id,
      author_user_id,
      content,
      mirrored_card_comment_id,
      mirror_group_id
    ) VALUES (
      v_peer_card_id,
      NEW.author_user_id,
      NEW.content,
      NEW.id,
      v_group_id
    );
  END LOOP;

  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_comment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN OLD;
  END IF;

  PERFORM public.kanban_link_sync_begin();

  IF OLD.mirror_group_id IS NOT NULL THEN
    DELETE FROM public.legal_kanban_comments
    WHERE mirror_group_id = OLD.mirror_group_id AND id <> OLD.id;
  ELSE
    DELETE FROM public.legal_kanban_comments
    WHERE id = OLD.mirrored_card_comment_id
       OR mirrored_card_comment_id = OLD.id;
  END IF;

  PERFORM public.kanban_link_sync_end();

  RETURN OLD;
END;
$$;

-- -----------------------------------------------------------------------------
-- Anexos (coluna correta: name)
-- -----------------------------------------------------------------------------

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
    );
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_attachment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN OLD;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(OLD.card_id) LOOP
    DELETE FROM public.legal_kanban_attachments
    WHERE card_id = v_peer_card_id
      AND attachment_type = OLD.attachment_type
      AND COALESCE(file_path, '') = COALESCE(OLD.file_path, '')
      AND COALESCE(url, '') = COALESCE(OLD.url, '')
      AND COALESCE(name, '') = COALESCE(OLD.name, '');
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN OLD;
END;
$$;

-- -----------------------------------------------------------------------------
-- Checklists e itens
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_checklist_insert()
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
    INSERT INTO public.legal_kanban_checklists (card_id, title, position)
    VALUES (v_peer_card_id, NEW.title, NEW.position);
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_checklist_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN OLD;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(OLD.card_id) LOOP
    DELETE FROM public.legal_kanban_checklists
    WHERE card_id = v_peer_card_id AND title = OLD.title AND position = OLD.position;
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_checklist_item_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
  v_source_checklist RECORD;
  v_peer_checklist_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN NEW;
  END IF;

  SELECT cl.card_id, cl.title, cl.position INTO v_source_checklist
  FROM public.legal_kanban_checklists cl
  WHERE cl.id = NEW.checklist_id;

  IF v_source_checklist.card_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(v_source_checklist.card_id) LOOP
    SELECT cl.id INTO v_peer_checklist_id
    FROM public.legal_kanban_checklists cl
    WHERE cl.card_id = v_peer_card_id
      AND cl.title = v_source_checklist.title
      AND cl.position = v_source_checklist.position
    LIMIT 1;

    IF v_peer_checklist_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.legal_kanban_checklist_items (
      checklist_id, content, position, is_completed, completed_at, completed_by_user_id
    ) VALUES (
      v_peer_checklist_id, NEW.content, NEW.position, NEW.is_completed, NEW.completed_at, NEW.completed_by_user_id
    );
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_checklist_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
  v_source_checklist RECORD;
  v_peer_checklist_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN NEW;
  END IF;

  SELECT cl.card_id, cl.title, cl.position INTO v_source_checklist
  FROM public.legal_kanban_checklists cl
  WHERE cl.id = NEW.checklist_id;

  IF v_source_checklist.card_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(v_source_checklist.card_id) LOOP
    SELECT cl.id INTO v_peer_checklist_id
    FROM public.legal_kanban_checklists cl
    WHERE cl.card_id = v_peer_card_id
      AND cl.title = v_source_checklist.title
      AND cl.position = v_source_checklist.position
    LIMIT 1;

    IF v_peer_checklist_id IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.legal_kanban_checklist_items
    SET
      content = NEW.content,
      position = NEW.position,
      is_completed = NEW.is_completed,
      completed_at = NEW.completed_at,
      completed_by_user_id = NEW.completed_by_user_id
    WHERE checklist_id = v_peer_checklist_id
      AND content = OLD.content
      AND position = OLD.position;
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_checklist_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_peer_card_id UUID;
  v_source_checklist RECORD;
  v_peer_checklist_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN OLD;
  END IF;

  SELECT cl.card_id, cl.title, cl.position INTO v_source_checklist
  FROM public.legal_kanban_checklists cl
  WHERE cl.id = OLD.checklist_id;

  IF v_source_checklist.card_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(v_source_checklist.card_id) LOOP
    SELECT cl.id INTO v_peer_checklist_id
    FROM public.legal_kanban_checklists cl
    WHERE cl.card_id = v_peer_card_id
      AND cl.title = v_source_checklist.title
      AND cl.position = v_source_checklist.position
    LIMIT 1;

    IF v_peer_checklist_id IS NULL THEN
      CONTINUE;
    END IF;

    DELETE FROM public.legal_kanban_checklist_items
    WHERE checklist_id = v_peer_checklist_id
      AND content = OLD.content
      AND position = OLD.position;
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_checklist_item_delete ON public.legal_kanban_checklist_items;
CREATE TRIGGER trg_kanban_sync_linked_checklist_item_delete
  AFTER DELETE ON public.legal_kanban_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_checklist_item_delete();

-- -----------------------------------------------------------------------------
-- Membros do card
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_card_member_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
  v_peer_card_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_card_id := COALESCE(NEW.card_id, OLD.card_id);

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(v_card_id) LOOP
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.legal_kanban_card_members (card_id, user_id)
      VALUES (v_peer_card_id, NEW.user_id)
      ON CONFLICT DO NOTHING;
    ELSIF TG_OP = 'DELETE' THEN
      DELETE FROM public.legal_kanban_card_members
      WHERE card_id = v_peer_card_id AND user_id = OLD.user_id;
    END IF;
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Etiquetas do card (match por name+color no board do par)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_sync_linked_card_label_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
  v_peer_card_id UUID;
  v_peer_board_id UUID;
  v_peer_label_id UUID;
  v_label_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_card_id := COALESCE(NEW.card_id, OLD.card_id);
  v_label_id := COALESCE(NEW.label_id, OLD.label_id);

  PERFORM public.kanban_link_sync_begin();
  FOR v_peer_card_id IN SELECT public.kanban_linked_peer_card_ids(v_card_id) LOOP
    SELECT board_id INTO v_peer_board_id FROM public.legal_kanban_cards WHERE id = v_peer_card_id;
    v_peer_label_id := public.kanban_ensure_peer_label(v_label_id, v_peer_board_id);

    IF v_peer_label_id IS NULL THEN
      CONTINUE;
    END IF;

    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.legal_kanban_card_labels (card_id, label_id)
      VALUES (v_peer_card_id, v_peer_label_id)
      ON CONFLICT DO NOTHING;
    ELSIF TG_OP = 'DELETE' THEN
      DELETE FROM public.legal_kanban_card_labels
      WHERE card_id = v_peer_card_id AND label_id = v_peer_label_id;
    END IF;
  END LOOP;
  PERFORM public.kanban_link_sync_end();

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- Excluir um card do grupo não pode apagar o conteúdo dos demais.
-- O cascade da exclusão dispara os triggers de DELETE em comentários, anexos,
-- checklists e membros; a flag anti-sync (local à transação) os neutraliza.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_suppress_sync_on_card_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.kanban_link_sync_begin();
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_suppress_sync_on_card_delete ON public.legal_kanban_cards;
CREATE TRIGGER trg_kanban_suppress_sync_on_card_delete
  BEFORE DELETE ON public.legal_kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_suppress_sync_on_card_delete();
