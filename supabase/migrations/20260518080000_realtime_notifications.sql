-- Notificações em tempo real:
-- - Menção em comentário de card kanban
-- - Adicionado como membro de card
-- - Postagem criada (broadcast aos membros do canal/equipe)
-- Também enriquece os triggers de mention existentes com títulos no payload
-- para que o sino renderize sem queries extras.

-- =====================================================================
-- A) Re-escrita dos triggers de mention existentes com payload enriquecido
-- =====================================================================
CREATE OR REPLACE FUNCTION public.notify_message_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post UUID;
  v_channel UUID;
  v_post_title TEXT;
  v_channel_name TEXT;
  v_team_slug TEXT;
  v_channel_slug TEXT;
  v_actor UUID;
BEGIN
  SELECT pm.post_id, pm.author_user_id INTO v_post, v_actor
  FROM public.post_messages pm WHERE pm.id = NEW.message_id;

  SELECT p.channel_id, p.title INTO v_channel, v_post_title
  FROM public.posts p WHERE p.id = v_post;

  SELECT c.name, c.slug, t.slug INTO v_channel_name, v_channel_slug, v_team_slug
  FROM public.channels c
  JOIN public.teams t ON t.id = c.team_id
  WHERE c.id = v_channel;

  IF NEW.mentioned_user_id IS NOT NULL AND NEW.mentioned_user_id <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, kind, payload)
    VALUES (NEW.mentioned_user_id, 'message_mention', jsonb_build_object(
      'message_id', NEW.message_id,
      'post_id', v_post,
      'channel_id', v_channel,
      'post_title', v_post_title,
      'channel_name', v_channel_name,
      'channel_slug', v_channel_slug,
      'team_slug', v_team_slug
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_channel UUID;
  v_post_title TEXT;
  v_channel_name TEXT;
  v_team_slug TEXT;
  v_channel_slug TEXT;
  v_actor UUID;
BEGIN
  SELECT p.channel_id, p.title, p.author_user_id INTO v_channel, v_post_title, v_actor
  FROM public.posts p WHERE p.id = NEW.post_id;

  SELECT c.name, c.slug, t.slug INTO v_channel_name, v_channel_slug, v_team_slug
  FROM public.channels c
  JOIN public.teams t ON t.id = c.team_id
  WHERE c.id = v_channel;

  IF NEW.mentioned_user_id IS NOT NULL AND NEW.mentioned_user_id <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, kind, payload)
    VALUES (NEW.mentioned_user_id, 'post_mention', jsonb_build_object(
      'post_id', NEW.post_id,
      'channel_id', v_channel,
      'post_title', v_post_title,
      'channel_name', v_channel_name,
      'channel_slug', v_channel_slug,
      'team_slug', v_team_slug
    ));
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================================
-- B) Menção em comentário de card do kanban
-- =====================================================================
CREATE OR REPLACE FUNCTION public.notify_legal_kanban_comment_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card UUID;
  v_card_title TEXT;
  v_board UUID;
  v_board_slug TEXT;
  v_board_title TEXT;
  v_actor UUID;
BEGIN
  SELECT cm.card_id, cm.author_user_id INTO v_card, v_actor
  FROM public.legal_kanban_comments cm WHERE cm.id = NEW.comment_id;

  SELECT k.title, k.board_id INTO v_card_title, v_board
  FROM public.legal_kanban_cards k WHERE k.id = v_card;

  SELECT b.slug, b.title INTO v_board_slug, v_board_title
  FROM public.legal_kanban_boards b WHERE b.id = v_board;

  IF NEW.mentioned_user_id IS NOT NULL AND NEW.mentioned_user_id <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, kind, payload)
    VALUES (NEW.mentioned_user_id, 'kanban_comment_mention', jsonb_build_object(
      'comment_id', NEW.comment_id,
      'card_id', v_card,
      'card_title', v_card_title,
      'board_id', v_board,
      'board_slug', v_board_slug,
      'board_title', v_board_title
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_legal_kanban_comment_mention ON public.legal_kanban_comment_mentions;
CREATE TRIGGER trg_notify_legal_kanban_comment_mention
  AFTER INSERT ON public.legal_kanban_comment_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_legal_kanban_comment_mention();

-- =====================================================================
-- C) Adicionado como membro de card
-- =====================================================================
CREATE OR REPLACE FUNCTION public.notify_card_member_added()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card_title TEXT;
  v_board UUID;
  v_board_slug TEXT;
  v_board_title TEXT;
  v_actor UUID;
BEGIN
  v_actor := public.teams_current_user_id();

  -- Não notificar quando o usuário se auto-adiciona ao card
  IF NEW.user_id = v_actor THEN
    RETURN NEW;
  END IF;

  SELECT k.title, k.board_id INTO v_card_title, v_board
  FROM public.legal_kanban_cards k WHERE k.id = NEW.card_id;

  SELECT b.slug, b.title INTO v_board_slug, v_board_title
  FROM public.legal_kanban_boards b WHERE b.id = v_board;

  INSERT INTO public.notifications (user_id, kind, payload)
  VALUES (NEW.user_id, 'card_member_added', jsonb_build_object(
    'card_id', NEW.card_id,
    'card_title', v_card_title,
    'board_id', v_board,
    'board_slug', v_board_slug,
    'board_title', v_board_title
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_card_member_added ON public.legal_kanban_card_members;
CREATE TRIGGER trg_notify_card_member_added
  AFTER INSERT ON public.legal_kanban_card_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_card_member_added();

-- =====================================================================
-- D) Postagem criada — broadcast aos membros do canal/equipe
-- =====================================================================
CREATE OR REPLACE FUNCTION public.notify_post_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team UUID;
  v_visibility TEXT;
  v_channel_name TEXT;
  v_channel_slug TEXT;
  v_team_slug TEXT;
BEGIN
  -- Só notifica posts ativos
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.team_id, c.visibility, c.name, c.slug, t.slug
  INTO v_team, v_visibility, v_channel_name, v_channel_slug, v_team_slug
  FROM public.channels c
  JOIN public.teams t ON t.id = c.team_id
  WHERE c.id = NEW.channel_id;

  IF v_visibility = 'private' THEN
    INSERT INTO public.notifications (user_id, kind, payload)
    SELECT cm.user_id, 'post_created', jsonb_build_object(
      'post_id', NEW.id,
      'post_title', NEW.title,
      'channel_id', NEW.channel_id,
      'channel_name', v_channel_name,
      'channel_slug', v_channel_slug,
      'team_id', v_team,
      'team_slug', v_team_slug
    )
    FROM public.channel_members cm
    WHERE cm.channel_id = NEW.channel_id
      AND cm.user_id <> NEW.author_user_id;
  ELSE
    INSERT INTO public.notifications (user_id, kind, payload)
    SELECT tm.user_id, 'post_created', jsonb_build_object(
      'post_id', NEW.id,
      'post_title', NEW.title,
      'channel_id', NEW.channel_id,
      'channel_name', v_channel_name,
      'channel_slug', v_channel_slug,
      'team_id', v_team,
      'team_slug', v_team_slug
    )
    FROM public.team_members tm
    WHERE tm.team_id = v_team
      AND tm.user_id <> NEW.author_user_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_created ON public.posts;
CREATE TRIGGER trg_notify_post_created
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_created();
