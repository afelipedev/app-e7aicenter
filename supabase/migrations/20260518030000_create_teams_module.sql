-- =============================================================================
-- Teams Module (Equipes & Canais) — Slack/Teams-like collaboration
-- Decisoes: equipes globais a instancia, privadas por padrao, replies a 1 nivel,
-- sync bidirecional com Kanban via source_event_id anti-loop.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABELAS PRINCIPAIS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.teams (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  icon                  TEXT,
  icon_url              TEXT,
  visibility            TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  is_archived           BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  invited_by_user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channels (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  topic                 TEXT,
  visibility            TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  is_general            BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived           BOOLEAN NOT NULL DEFAULT FALSE,
  position              INTEGER NOT NULL DEFAULT 100,
  created_by_user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_channels_one_general_per_team
  ON public.channels(team_id) WHERE is_general = TRUE;

CREATE TABLE IF NOT EXISTS public.channel_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id            UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  is_muted              BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id            UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  title                 TEXT NOT NULL,
  description_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  description_text      TEXT NOT NULL DEFAULT '',
  is_pinned             BOOLEAN NOT NULL DEFAULT FALSE,
  is_announcement       BOOLEAN NOT NULL DEFAULT FALSE,
  last_activity_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  search_tsv            tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese', coalesce(title,'') || ' ' || coalesce(description_text,''))
  ) STORED
);

CREATE TABLE IF NOT EXISTS public.post_attachments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id               UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  uploaded_by_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kind                  TEXT NOT NULL CHECK (kind IN ('file','image','link')),
  name                  TEXT NOT NULL,
  mime_type             TEXT,
  size_bytes            BIGINT,
  storage_path          TEXT,
  url                   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id               UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  content_json          JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_text          TEXT NOT NULL DEFAULT '',
  edited_at             TIMESTAMPTZ,
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  search_tsv            tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(content_text,''))) STORED
);

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id            UUID NOT NULL REFERENCES public.post_messages(id) ON DELETE CASCADE,
  uploaded_by_user_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  kind                  TEXT NOT NULL CHECK (kind IN ('file','image','link')),
  name                  TEXT NOT NULL,
  mime_type             TEXT,
  size_bytes            BIGINT,
  storage_path          TEXT,
  url                   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id            UUID NOT NULL REFERENCES public.post_messages(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji                 TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.message_mentions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id            UUID NOT NULL REFERENCES public.post_messages(id) ON DELETE CASCADE,
  mentioned_user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS public.post_mentions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id               UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  mentioned_user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, mentioned_user_id)
);

CREATE TABLE IF NOT EXISTS public.post_favorites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id               UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.message_favorites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id            UUID NOT NULL REFERENCES public.post_messages(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.channel_read_state (
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel_id            UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  last_read_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE TABLE IF NOT EXISTS public.post_read_state (
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id               UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  last_read_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS public.team_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id               UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  actor_user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  activity_type         TEXT NOT NULL,
  message               TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_event_id       UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id               UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  actor_user_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  activity_type         TEXT NOT NULL,
  message               TEXT,
  metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_event_id       UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_kanban_links (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id               UUID NOT NULL UNIQUE REFERENCES public.posts(id) ON DELETE CASCADE,
  card_id               UUID REFERENCES public.legal_kanban_cards(id) ON DELETE SET NULL,
  board_id              UUID REFERENCES public.legal_kanban_boards(id) ON DELETE SET NULL,
  column_id             UUID REFERENCES public.legal_kanban_columns(id) ON DELETE SET NULL,
  link_direction        TEXT NOT NULL DEFAULT 'bi' CHECK (link_direction IN ('bi','post_to_card','card_to_post')),
  created_by_user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sync_event_ledger (
  event_id              UUID PRIMARY KEY,
  origin                TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind                  TEXT NOT NULL,
  payload               JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at               TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. INDICES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_team_members_user        ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team        ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user     ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_team_pos        ON public.channels(team_id, position);
CREATE INDEX IF NOT EXISTS idx_posts_channel_activity   ON public.posts(channel_id, last_activity_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_pinned             ON public.posts(channel_id, is_pinned) WHERE is_pinned = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_post_created    ON public.post_messages(post_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_message        ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_post_favorites_user      ON public.post_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_favorites_user   ON public.message_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_mentions_user       ON public.post_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user    ON public.message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_team_activities_team     ON public.team_activities(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_activities_post     ON public.post_activities(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_ledger_created      ON public.sync_event_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_search_tsv         ON public.posts USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_messages_search_tsv      ON public.post_messages USING GIN(search_tsv);

-- -----------------------------------------------------------------------------
-- 3. FUNCOES HELPER (SECURITY DEFINER)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.teams_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.users
  WHERE auth_user_id = (SELECT auth.uid()) AND status = 'ativo'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.teams_is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = (SELECT auth.uid())
      AND status = 'ativo'
      AND role IN ('administrator','it','advogado_adm')
  );
$$;

CREATE OR REPLACE FUNCTION public.teams_is_member(p_team UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team
      AND tm.user_id = public.teams_current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.teams_role(p_team UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.team_members
  WHERE team_id = p_team AND user_id = public.teams_current_user_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.teams_can_admin(p_team UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.teams_is_global_admin()
      OR public.teams_role(p_team) IN ('owner','admin');
$$;

CREATE OR REPLACE FUNCTION public.channels_can_read(p_channel UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.teams_is_global_admin()
      OR EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = p_channel
          AND public.teams_is_member(c.team_id)
          AND (
            c.visibility = 'public'
            OR EXISTS (
              SELECT 1 FROM public.channel_members cm
              WHERE cm.channel_id = c.id
                AND cm.user_id = public.teams_current_user_id()
            )
          )
      );
$$;

CREATE OR REPLACE FUNCTION public.channels_can_admin(p_channel UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.teams_is_global_admin()
      OR EXISTS (
        SELECT 1 FROM public.channels c
        WHERE c.id = p_channel
          AND public.teams_can_admin(c.team_id)
      )
      OR EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = p_channel
          AND cm.user_id = public.teams_current_user_id()
          AND cm.role = 'admin'
      );
$$;

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS
-- -----------------------------------------------------------------------------

-- updated_at trigger (reusa funcao update_updated_at_column do 001_initial_setup.sql)
DROP TRIGGER IF EXISTS trg_teams_updated_at ON public.teams;
CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_channels_updated_at ON public.channels;
CREATE TRIGGER trg_channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- bump posts.last_activity_at quando chega mensagem/reacao
CREATE OR REPLACE FUNCTION public.bump_post_last_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post UUID;
BEGIN
  IF TG_TABLE_NAME = 'post_messages' THEN
    v_post := NEW.post_id;
  ELSIF TG_TABLE_NAME = 'message_reactions' THEN
    SELECT post_id INTO v_post FROM public.post_messages WHERE id = NEW.message_id;
  END IF;
  IF v_post IS NOT NULL THEN
    UPDATE public.posts SET last_activity_at = NOW() WHERE id = v_post;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_post_message ON public.post_messages;
CREATE TRIGGER trg_bump_post_message AFTER INSERT ON public.post_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_last_activity();

DROP TRIGGER IF EXISTS trg_bump_post_reaction ON public.message_reactions;
CREATE TRIGGER trg_bump_post_reaction AFTER INSERT ON public.message_reactions
  FOR EACH ROW EXECUTE FUNCTION public.bump_post_last_activity();

-- auto join no canal Geral ao adicionar membro
CREATE OR REPLACE FUNCTION public.auto_join_general_channel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_channel UUID;
BEGIN
  SELECT id INTO v_channel FROM public.channels
  WHERE team_id = NEW.team_id AND is_general = TRUE LIMIT 1;
  IF v_channel IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    VALUES (v_channel, NEW.user_id, CASE WHEN NEW.role IN ('owner','admin') THEN 'admin' ELSE 'member' END)
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_join_general ON public.team_members;
CREATE TRIGGER trg_auto_join_general AFTER INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.auto_join_general_channel();

-- bloqueia remover ultimo owner
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'owner' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_members
      WHERE team_id = OLD.team_id AND role = 'owner' AND id <> OLD.id
    ) THEN
      RAISE EXCEPTION 'Nao e possivel remover o ultimo owner da equipe';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner ON public.team_members;
CREATE TRIGGER trg_prevent_last_owner BEFORE DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_removal();

-- notifica menthions
CREATE OR REPLACE FUNCTION public.notify_message_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post UUID; v_channel UUID;
BEGIN
  SELECT post_id INTO v_post FROM public.post_messages WHERE id = NEW.message_id;
  SELECT channel_id INTO v_channel FROM public.posts WHERE id = v_post;
  INSERT INTO public.notifications (user_id, kind, payload)
  VALUES (NEW.mentioned_user_id, 'message_mention',
    jsonb_build_object('message_id', NEW.message_id, 'post_id', v_post, 'channel_id', v_channel));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_msg_mention ON public.message_mentions;
CREATE TRIGGER trg_notify_msg_mention AFTER INSERT ON public.message_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_message_mention();

CREATE OR REPLACE FUNCTION public.notify_post_mention()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_channel UUID;
BEGIN
  SELECT channel_id INTO v_channel FROM public.posts WHERE id = NEW.post_id;
  INSERT INTO public.notifications (user_id, kind, payload)
  VALUES (NEW.mentioned_user_id, 'post_mention',
    jsonb_build_object('post_id', NEW.post_id, 'channel_id', v_channel));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_post_mention ON public.post_mentions;
CREATE TRIGGER trg_notify_post_mention AFTER INSERT ON public.post_mentions
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_mention();

-- -----------------------------------------------------------------------------
-- 5. RLS - ENABLE
-- -----------------------------------------------------------------------------

ALTER TABLE public.teams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_mentions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_mentions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_favorites       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_favorites    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_read_state   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_read_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_kanban_links    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6. POLICIES
-- -----------------------------------------------------------------------------

-- teams: leitura para membros + admins; escrita via service-role (Edge Function)
DROP POLICY IF EXISTS teams_select ON public.teams;
CREATE POLICY teams_select ON public.teams FOR SELECT TO authenticated
  USING (public.teams_is_member(id) OR public.teams_is_global_admin());

DROP POLICY IF EXISTS teams_admin_write ON public.teams;
CREATE POLICY teams_admin_write ON public.teams FOR ALL TO authenticated
  USING (public.teams_is_global_admin())
  WITH CHECK (public.teams_is_global_admin());

-- team_members: visivel para membros da equipe
DROP POLICY IF EXISTS team_members_select ON public.team_members;
CREATE POLICY team_members_select ON public.team_members FOR SELECT TO authenticated
  USING (public.teams_is_member(team_id) OR public.teams_is_global_admin());

DROP POLICY IF EXISTS team_members_admin_write ON public.team_members;
CREATE POLICY team_members_admin_write ON public.team_members FOR ALL TO authenticated
  USING (public.teams_can_admin(team_id))
  WITH CHECK (public.teams_can_admin(team_id));

-- channels
DROP POLICY IF EXISTS channels_select ON public.channels;
CREATE POLICY channels_select ON public.channels FOR SELECT TO authenticated
  USING (public.channels_can_read(id));

DROP POLICY IF EXISTS channels_admin_write ON public.channels;
CREATE POLICY channels_admin_write ON public.channels FOR ALL TO authenticated
  USING (public.teams_can_admin(team_id))
  WITH CHECK (public.teams_can_admin(team_id));

-- channel_members
DROP POLICY IF EXISTS channel_members_select ON public.channel_members;
CREATE POLICY channel_members_select ON public.channel_members FOR SELECT TO authenticated
  USING (public.channels_can_read(channel_id));

DROP POLICY IF EXISTS channel_members_admin_write ON public.channel_members;
CREATE POLICY channel_members_admin_write ON public.channel_members FOR ALL TO authenticated
  USING (public.channels_can_admin(channel_id))
  WITH CHECK (public.channels_can_admin(channel_id));

-- posts
DROP POLICY IF EXISTS posts_select ON public.posts;
CREATE POLICY posts_select ON public.posts FOR SELECT TO authenticated
  USING (public.channels_can_read(channel_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS posts_insert ON public.posts;
CREATE POLICY posts_insert ON public.posts FOR INSERT TO authenticated
  WITH CHECK (public.channels_can_read(channel_id) AND author_user_id = public.teams_current_user_id());

DROP POLICY IF EXISTS posts_update ON public.posts;
CREATE POLICY posts_update ON public.posts FOR UPDATE TO authenticated
  USING (author_user_id = public.teams_current_user_id()
         OR public.channels_can_admin(channel_id))
  WITH CHECK (public.channels_can_read(channel_id));

DROP POLICY IF EXISTS posts_delete ON public.posts;
CREATE POLICY posts_delete ON public.posts FOR DELETE TO authenticated
  USING (author_user_id = public.teams_current_user_id()
         OR public.channels_can_admin(channel_id));

-- post_attachments / messages / mentions / favorites: seguem channel acessivel via post
DROP POLICY IF EXISTS post_attachments_all ON public.post_attachments;
CREATE POLICY post_attachments_all ON public.post_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_read(p.channel_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_read(p.channel_id)));

DROP POLICY IF EXISTS post_messages_select ON public.post_messages;
CREATE POLICY post_messages_select ON public.post_messages FOR SELECT TO authenticated
  USING (deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_read(p.channel_id)));

DROP POLICY IF EXISTS post_messages_insert ON public.post_messages;
CREATE POLICY post_messages_insert ON public.post_messages FOR INSERT TO authenticated
  WITH CHECK (author_user_id = public.teams_current_user_id()
              AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_read(p.channel_id)));

DROP POLICY IF EXISTS post_messages_update ON public.post_messages;
CREATE POLICY post_messages_update ON public.post_messages FOR UPDATE TO authenticated
  USING (author_user_id = public.teams_current_user_id()
         OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_admin(p.channel_id)));

DROP POLICY IF EXISTS post_messages_delete ON public.post_messages;
CREATE POLICY post_messages_delete ON public.post_messages FOR DELETE TO authenticated
  USING (author_user_id = public.teams_current_user_id()
         OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_admin(p.channel_id)));

DROP POLICY IF EXISTS message_attachments_all ON public.message_attachments;
CREATE POLICY message_attachments_all ON public.message_attachments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.post_messages m JOIN public.posts p ON p.id = m.post_id
    WHERE m.id = message_id AND public.channels_can_read(p.channel_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.post_messages m JOIN public.posts p ON p.id = m.post_id
    WHERE m.id = message_id AND public.channels_can_read(p.channel_id)
  ));

DROP POLICY IF EXISTS message_reactions_select ON public.message_reactions;
CREATE POLICY message_reactions_select ON public.message_reactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.post_messages m JOIN public.posts p ON p.id = m.post_id
    WHERE m.id = message_id AND public.channels_can_read(p.channel_id)
  ));

DROP POLICY IF EXISTS message_reactions_write ON public.message_reactions;
CREATE POLICY message_reactions_write ON public.message_reactions FOR ALL TO authenticated
  USING (user_id = public.teams_current_user_id())
  WITH CHECK (user_id = public.teams_current_user_id()
              AND EXISTS (
                SELECT 1 FROM public.post_messages m JOIN public.posts p ON p.id = m.post_id
                WHERE m.id = message_id AND public.channels_can_read(p.channel_id)
              ));

DROP POLICY IF EXISTS message_mentions_select ON public.message_mentions;
CREATE POLICY message_mentions_select ON public.message_mentions FOR SELECT TO authenticated
  USING (mentioned_user_id = public.teams_current_user_id()
         OR EXISTS (
           SELECT 1 FROM public.post_messages m JOIN public.posts p ON p.id = m.post_id
           WHERE m.id = message_id AND public.channels_can_read(p.channel_id)
         ));

DROP POLICY IF EXISTS message_mentions_insert ON public.message_mentions;
CREATE POLICY message_mentions_insert ON public.message_mentions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.post_messages m JOIN public.posts p ON p.id = m.post_id
    WHERE m.id = message_id AND m.author_user_id = public.teams_current_user_id()
      AND public.channels_can_read(p.channel_id)
  ));

DROP POLICY IF EXISTS post_mentions_select ON public.post_mentions;
CREATE POLICY post_mentions_select ON public.post_mentions FOR SELECT TO authenticated
  USING (mentioned_user_id = public.teams_current_user_id()
         OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_read(p.channel_id)));

DROP POLICY IF EXISTS post_mentions_insert ON public.post_mentions;
CREATE POLICY post_mentions_insert ON public.post_mentions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_id
      AND p.author_user_id = public.teams_current_user_id()
      AND public.channels_can_read(p.channel_id)
  ));

DROP POLICY IF EXISTS post_favorites_all ON public.post_favorites;
CREATE POLICY post_favorites_all ON public.post_favorites FOR ALL TO authenticated
  USING (user_id = public.teams_current_user_id())
  WITH CHECK (user_id = public.teams_current_user_id());

DROP POLICY IF EXISTS message_favorites_all ON public.message_favorites;
CREATE POLICY message_favorites_all ON public.message_favorites FOR ALL TO authenticated
  USING (user_id = public.teams_current_user_id())
  WITH CHECK (user_id = public.teams_current_user_id());

DROP POLICY IF EXISTS channel_read_state_all ON public.channel_read_state;
CREATE POLICY channel_read_state_all ON public.channel_read_state FOR ALL TO authenticated
  USING (user_id = public.teams_current_user_id())
  WITH CHECK (user_id = public.teams_current_user_id());

DROP POLICY IF EXISTS post_read_state_all ON public.post_read_state;
CREATE POLICY post_read_state_all ON public.post_read_state FOR ALL TO authenticated
  USING (user_id = public.teams_current_user_id())
  WITH CHECK (user_id = public.teams_current_user_id());

DROP POLICY IF EXISTS team_activities_select ON public.team_activities;
CREATE POLICY team_activities_select ON public.team_activities FOR SELECT TO authenticated
  USING (public.teams_is_member(team_id) OR public.teams_is_global_admin());

DROP POLICY IF EXISTS post_activities_select ON public.post_activities;
CREATE POLICY post_activities_select ON public.post_activities FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_read(p.channel_id)));

DROP POLICY IF EXISTS post_kanban_links_select ON public.post_kanban_links;
CREATE POLICY post_kanban_links_select ON public.post_kanban_links FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND public.channels_can_read(p.channel_id)));

DROP POLICY IF EXISTS notifications_select ON public.notifications;
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
  USING (user_id = public.teams_current_user_id());

DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = public.teams_current_user_id())
  WITH CHECK (user_id = public.teams_current_user_id());

-- -----------------------------------------------------------------------------
-- 7. STORAGE BUCKETS
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('teams-attachments', 'teams-attachments', false, 26214400, NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('teams-inline-images', 'teams-inline-images', true, 5242880,
    ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('teams-team-icons', 'teams-team-icons', true, 2097152,
    ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Politicas storage: somente usuarios autenticados (validacao fina ocorre na tabela)
DROP POLICY IF EXISTS "teams attachments select" ON storage.objects;
CREATE POLICY "teams attachments select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teams-attachments');

DROP POLICY IF EXISTS "teams attachments write" ON storage.objects;
CREATE POLICY "teams attachments write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'teams-attachments')
  WITH CHECK (bucket_id = 'teams-attachments');

DROP POLICY IF EXISTS "teams inline images select" ON storage.objects;
CREATE POLICY "teams inline images select" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'teams-inline-images');

DROP POLICY IF EXISTS "teams inline images write" ON storage.objects;
CREATE POLICY "teams inline images write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'teams-inline-images')
  WITH CHECK (bucket_id = 'teams-inline-images');

DROP POLICY IF EXISTS "teams icons select" ON storage.objects;
CREATE POLICY "teams icons select" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'teams-team-icons');

DROP POLICY IF EXISTS "teams icons write" ON storage.objects;
CREATE POLICY "teams icons write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'teams-team-icons')
  WITH CHECK (bucket_id = 'teams-team-icons');

-- -----------------------------------------------------------------------------
-- 8. REALTIME PUBLICATION
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  PERFORM 1 FROM pg_publication WHERE pubname = 'supabase_realtime';
  IF FOUND THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.channels; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9. AUDIT EVENT TYPES (extende audit_logs existente)
-- -----------------------------------------------------------------------------
-- Eventos esperados (informativo, audit_logs.event_type e VARCHAR livre):
--   teams.team.created / updated / archived / deleted
--   teams.team.member_added / member_removed / member_role_changed
--   teams.channel.created / updated / archived / deleted
--   teams.channel.member_added / member_removed
--   teams.post.created / updated / pinned / deleted
--   teams.post.linked_to_card / unlinked_from_card
--   teams.kanban.sync
