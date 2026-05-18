-- Sync bidirecional de atividades entre postagem (Teams) e card (Kanban) vinculados.
-- Anti-loop: linhas espelhadas carregam metadata.teams_sync = true.

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teams_activity_type_is_excluded(p_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_type IN (
    'comment_mirrored_from_post',
    'comment_mirrored_from_card',
    'comment_added'
  );
$$;

CREATE OR REPLACE FUNCTION public.teams_activity_is_mirror(p_metadata JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE((p_metadata->>'teams_sync')::boolean, false);
$$;

-- -----------------------------------------------------------------------------
-- Kanban activity -> post activity
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teams_sync_kanban_activity_to_post()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_id UUID;
BEGIN
  IF public.teams_activity_is_mirror(NEW.metadata) THEN
    RETURN NEW;
  END IF;

  IF public.teams_activity_type_is_excluded(NEW.activity_type) THEN
    RETURN NEW;
  END IF;

  SELECT link.post_id INTO v_post_id
  FROM public.post_kanban_links link
  WHERE link.card_id = NEW.card_id
  LIMIT 1;

  IF v_post_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.post_activities (
    post_id,
    actor_user_id,
    activity_type,
    message,
    metadata,
    source_event_id
  ) VALUES (
    v_post_id,
    NEW.actor_user_id,
    NEW.activity_type,
    NEW.message,
    NEW.metadata || jsonb_build_object(
      'teams_sync', true,
      'origin_activity_id', NEW.id::text,
      'kanban_activity_id', NEW.id::text
    ),
    NULLIF(NEW.metadata->>'source_event_id', '')::uuid
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_sync_kanban_activity_to_post ON public.legal_kanban_activities;
CREATE TRIGGER trg_teams_sync_kanban_activity_to_post
  AFTER INSERT ON public.legal_kanban_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.teams_sync_kanban_activity_to_post();

-- -----------------------------------------------------------------------------
-- Post activity -> kanban activity
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teams_sync_post_activity_to_kanban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
  v_message TEXT;
BEGIN
  IF public.teams_activity_is_mirror(NEW.metadata) THEN
    RETURN NEW;
  END IF;

  IF public.teams_activity_type_is_excluded(NEW.activity_type) THEN
    RETURN NEW;
  END IF;

  SELECT link.card_id INTO v_card_id
  FROM public.post_kanban_links link
  WHERE link.post_id = NEW.post_id
  LIMIT 1;

  IF v_card_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_message := COALESCE(
    NULLIF(trim(NEW.message), ''),
    CASE NEW.activity_type
      WHEN 'attachment_added' THEN 'Anexo adicionado na postagem.'
      WHEN 'attachment_removed' THEN 'Anexo removido da postagem.'
      WHEN 'card_linked' THEN 'Card vinculado à postagem.'
      WHEN 'card_unlinked' THEN 'Card desvinculado da postagem.'
      ELSE 'Atividade na postagem.'
    END
  );

  INSERT INTO public.legal_kanban_activities (
    card_id,
    actor_user_id,
    activity_type,
    message,
    metadata
  ) VALUES (
    v_card_id,
    NEW.actor_user_id,
    NEW.activity_type,
    v_message,
    NEW.metadata || jsonb_build_object(
      'teams_sync', true,
      'origin_activity_id', NEW.id::text,
      'post_activity_id', NEW.id::text
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_sync_post_activity_to_kanban ON public.post_activities;
CREATE TRIGGER trg_teams_sync_post_activity_to_kanban
  AFTER INSERT ON public.post_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.teams_sync_post_activity_to_kanban();

-- -----------------------------------------------------------------------------
-- Anexos da postagem -> post_activities
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teams_log_post_attachment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.post_activities (
      post_id,
      actor_user_id,
      activity_type,
      message,
      metadata
    ) VALUES (
      NEW.post_id,
      NEW.uploaded_by_user_id,
      'attachment_added',
      format('Anexou o arquivo "%s" na postagem.', NEW.name),
      jsonb_build_object(
        'attachment_id', NEW.id,
        'attachment_name', NEW.name,
        'attachment_kind', NEW.kind
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.post_activities (
      post_id,
      actor_user_id,
      activity_type,
      message,
      metadata
    ) VALUES (
      OLD.post_id,
      OLD.uploaded_by_user_id,
      'attachment_removed',
      format('Removeu o anexo "%s" da postagem.', OLD.name),
      jsonb_build_object(
        'attachment_id', OLD.id,
        'attachment_name', OLD.name,
        'attachment_kind', OLD.kind
      )
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_log_post_attachment_activity ON public.post_attachments;
CREATE TRIGGER trg_teams_log_post_attachment_activity
  AFTER INSERT OR DELETE ON public.post_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.teams_log_post_attachment_activity();

-- -----------------------------------------------------------------------------
-- Comentário real do card (não espelhado do chat) -> legal_kanban_activities
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teams_log_kanban_comment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_preview TEXT;
BEGIN
  IF NEW.mirrored_post_message_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.name INTO v_name
  FROM public.users u
  WHERE u.id = NEW.author_user_id;

  v_preview := left(trim(NEW.content), 120);
  IF length(trim(NEW.content)) > 120 THEN
    v_preview := v_preview || '…';
  END IF;

  INSERT INTO public.legal_kanban_activities (
    card_id,
    actor_user_id,
    activity_type,
    message,
    metadata
  ) VALUES (
    NEW.card_id,
    NEW.author_user_id,
    'card_comment_added',
    COALESCE(v_name, 'Usuário') || ' comentou: ' || v_preview,
    jsonb_build_object('comment_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teams_log_kanban_comment_activity ON public.legal_kanban_comments;
CREATE TRIGGER trg_teams_log_kanban_comment_activity
  AFTER INSERT ON public.legal_kanban_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.teams_log_kanban_comment_activity();

-- -----------------------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_activities; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.legal_kanban_activities; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_attachments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;
