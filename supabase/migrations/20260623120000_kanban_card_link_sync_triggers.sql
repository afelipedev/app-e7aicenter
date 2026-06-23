-- Sync bidirecional entre cards vinculados (Gestão Operacional <-> Jurídico)
-- Anti-loop: session flag app.kanban_link_sync via kanban_link_sync_begin/end

-- -----------------------------------------------------------------------------
-- Card core fields (sem column_id / position)
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

  v_peer_id := public.kanban_linked_peer_card_id(NEW.id);
  IF v_peer_id IS NULL THEN
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
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_card_core ON public.legal_kanban_cards;
CREATE TRIGGER trg_kanban_sync_linked_card_core
  AFTER UPDATE ON public.legal_kanban_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_card_core();

-- -----------------------------------------------------------------------------
-- Comentários
-- -----------------------------------------------------------------------------

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
  IF public.kanban_link_sync_is_active() THEN
    RETURN NEW;
  END IF;

  IF NEW.mirrored_card_comment_id IS NOT NULL OR NEW.mirrored_post_message_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_peer_card_id := public.kanban_linked_peer_card_id(NEW.card_id);
  IF v_peer_card_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  INSERT INTO public.legal_kanban_comments (
    card_id,
    author_user_id,
    content,
    mirrored_card_comment_id
  ) VALUES (
    v_peer_card_id,
    NEW.author_user_id,
    NEW.content,
    NEW.id
  )
  RETURNING id INTO v_mirrored_id;

  UPDATE public.legal_kanban_comments
  SET mirrored_card_comment_id = v_mirrored_id
  WHERE id = NEW.id;
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
DECLARE
  v_peer_comment_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN OLD;
  END IF;

  v_peer_comment_id := OLD.mirrored_card_comment_id;
  IF v_peer_comment_id IS NULL THEN
    SELECT c.id INTO v_peer_comment_id
    FROM public.legal_kanban_comments c
    WHERE c.mirrored_card_comment_id = OLD.id
    LIMIT 1;
  END IF;

  IF v_peer_comment_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  DELETE FROM public.legal_kanban_comments WHERE id = v_peer_comment_id;
  PERFORM public.kanban_link_sync_end();

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_comment_insert ON public.legal_kanban_comments;
CREATE TRIGGER trg_kanban_sync_linked_comment_insert
  AFTER INSERT ON public.legal_kanban_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_comment_insert();

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_comment_delete ON public.legal_kanban_comments;
CREATE TRIGGER trg_kanban_sync_linked_comment_delete
  AFTER DELETE ON public.legal_kanban_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_comment_delete();

-- -----------------------------------------------------------------------------
-- Anexos
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

  v_peer_card_id := public.kanban_linked_peer_card_id(NEW.card_id);
  IF v_peer_card_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  INSERT INTO public.legal_kanban_attachments (
    card_id,
    attachment_type,
    file_name,
    file_path,
    file_size,
    mime_type,
    url,
    created_by_user_id
  ) VALUES (
    v_peer_card_id,
    NEW.attachment_type,
    NEW.file_name,
    NEW.file_path,
    NEW.file_size,
    NEW.mime_type,
    NEW.url,
    NEW.created_by_user_id
  );
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

  v_peer_card_id := public.kanban_linked_peer_card_id(OLD.card_id);
  IF v_peer_card_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  DELETE FROM public.legal_kanban_attachments
  WHERE card_id = v_peer_card_id
    AND attachment_type = OLD.attachment_type
    AND COALESCE(file_path, '') = COALESCE(OLD.file_path, '')
    AND COALESCE(url, '') = COALESCE(OLD.url, '')
    AND COALESCE(file_name, '') = COALESCE(OLD.file_name, '');
  PERFORM public.kanban_link_sync_end();

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_attachment_insert ON public.legal_kanban_attachments;
CREATE TRIGGER trg_kanban_sync_linked_attachment_insert
  AFTER INSERT ON public.legal_kanban_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_attachment_insert();

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_attachment_delete ON public.legal_kanban_attachments;
CREATE TRIGGER trg_kanban_sync_linked_attachment_delete
  AFTER DELETE ON public.legal_kanban_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_attachment_delete();

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

  v_peer_card_id := public.kanban_linked_peer_card_id(NEW.card_id);
  IF v_peer_card_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  INSERT INTO public.legal_kanban_checklists (card_id, title, position)
  VALUES (v_peer_card_id, NEW.title, NEW.position);
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

  v_peer_card_id := public.kanban_linked_peer_card_id(OLD.card_id);
  IF v_peer_card_id IS NULL THEN
    RETURN OLD;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  DELETE FROM public.legal_kanban_checklists
  WHERE card_id = v_peer_card_id AND title = OLD.title AND position = OLD.position;
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
  v_source_card_id UUID;
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

  v_peer_card_id := public.kanban_linked_peer_card_id(v_source_checklist.card_id);
  IF v_peer_card_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cl.id INTO v_peer_checklist_id
  FROM public.legal_kanban_checklists cl
  WHERE cl.card_id = v_peer_card_id
    AND cl.title = v_source_checklist.title
    AND cl.position = v_source_checklist.position
  LIMIT 1;

  IF v_peer_checklist_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
  INSERT INTO public.legal_kanban_checklist_items (
    checklist_id, content, position, is_completed, completed_at, completed_by_user_id
  ) VALUES (
    v_peer_checklist_id, NEW.content, NEW.position, NEW.is_completed, NEW.completed_at, NEW.completed_by_user_id
  );
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
  v_source_checklist RECORD;
  v_peer_card_id UUID;
  v_peer_checklist_id UUID;
BEGIN
  IF public.kanban_link_sync_is_active() THEN
    RETURN NEW;
  END IF;

  SELECT cl.card_id, cl.title, cl.position INTO v_source_checklist
  FROM public.legal_kanban_checklists cl
  WHERE cl.id = NEW.checklist_id;

  v_peer_card_id := public.kanban_linked_peer_card_id(v_source_checklist.card_id);
  IF v_peer_card_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cl.id INTO v_peer_checklist_id
  FROM public.legal_kanban_checklists cl
  WHERE cl.card_id = v_peer_card_id
    AND cl.title = v_source_checklist.title
    AND cl.position = v_source_checklist.position
  LIMIT 1;

  IF v_peer_checklist_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.kanban_link_sync_begin();
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
  PERFORM public.kanban_link_sync_end();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_checklist_insert ON public.legal_kanban_checklists;
CREATE TRIGGER trg_kanban_sync_linked_checklist_insert
  AFTER INSERT ON public.legal_kanban_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_checklist_insert();

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_checklist_delete ON public.legal_kanban_checklists;
CREATE TRIGGER trg_kanban_sync_linked_checklist_delete
  AFTER DELETE ON public.legal_kanban_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_checklist_delete();

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_checklist_item_insert ON public.legal_kanban_checklist_items;
CREATE TRIGGER trg_kanban_sync_linked_checklist_item_insert
  AFTER INSERT ON public.legal_kanban_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_checklist_item_insert();

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_checklist_item_update ON public.legal_kanban_checklist_items;
CREATE TRIGGER trg_kanban_sync_linked_checklist_item_update
  AFTER UPDATE ON public.legal_kanban_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_checklist_item_update();

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
  v_peer_card_id := public.kanban_linked_peer_card_id(v_card_id);
  IF v_peer_card_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  PERFORM public.kanban_link_sync_begin();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.legal_kanban_card_members (card_id, user_id)
    VALUES (v_peer_card_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.legal_kanban_card_members
    WHERE card_id = v_peer_card_id AND user_id = OLD.user_id;
  END IF;

  PERFORM public.kanban_link_sync_end();

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_card_member_insert ON public.legal_kanban_card_members;
CREATE TRIGGER trg_kanban_sync_linked_card_member_insert
  AFTER INSERT ON public.legal_kanban_card_members
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_card_member_change();

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_card_member_delete ON public.legal_kanban_card_members;
CREATE TRIGGER trg_kanban_sync_linked_card_member_delete
  AFTER DELETE ON public.legal_kanban_card_members
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_card_member_change();

-- -----------------------------------------------------------------------------
-- Etiquetas do card (match por name+color no board destino)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_ensure_peer_label(
  p_source_label_id UUID,
  p_peer_board_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source RECORD;
  v_peer_label_id UUID;
BEGIN
  SELECT id, name, color, position INTO v_source
  FROM public.legal_kanban_labels
  WHERE id = p_source_label_id;

  IF v_source.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_peer_label_id
  FROM public.legal_kanban_labels
  WHERE board_id = p_peer_board_id
    AND name = v_source.name
    AND color = v_source.color
  LIMIT 1;

  IF v_peer_label_id IS NULL THEN
    INSERT INTO public.legal_kanban_labels (board_id, name, color, position)
    VALUES (p_peer_board_id, v_source.name, v_source.color, v_source.position)
    RETURNING id INTO v_peer_label_id;
  END IF;

  RETURN v_peer_label_id;
END;
$$;

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
  v_peer_card_id := public.kanban_linked_peer_card_id(v_card_id);

  IF v_peer_card_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT board_id INTO v_peer_board_id FROM public.legal_kanban_cards WHERE id = v_peer_card_id;
  v_peer_label_id := public.kanban_ensure_peer_label(v_label_id, v_peer_board_id);

  IF v_peer_label_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  PERFORM public.kanban_link_sync_begin();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.legal_kanban_card_labels (card_id, label_id)
    VALUES (v_peer_card_id, v_peer_label_id)
    ON CONFLICT DO NOTHING;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.legal_kanban_card_labels
    WHERE card_id = v_peer_card_id AND label_id = v_peer_label_id;
  END IF;

  PERFORM public.kanban_link_sync_end();

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_card_label_insert ON public.legal_kanban_card_labels;
CREATE TRIGGER trg_kanban_sync_linked_card_label_insert
  AFTER INSERT ON public.legal_kanban_card_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_card_label_change();

DROP TRIGGER IF EXISTS trg_kanban_sync_linked_card_label_delete ON public.legal_kanban_card_labels;
CREATE TRIGGER trg_kanban_sync_linked_card_label_delete
  AFTER DELETE ON public.legal_kanban_card_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.kanban_sync_linked_card_label_change();
