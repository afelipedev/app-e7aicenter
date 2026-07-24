-- =============================================================================
-- MODULO DE TUTORIAIS
-- Videoteca interna do AI Center E7: catalogo para todo usuario autenticado e
-- gestao completa (CRUD + upload) restrita a administradores.
--
-- Arquivos ficam no Supabase Storage (buckets "tutorials" e
-- "tutorial-thumbnails"); no Postgres guardamos apenas metadados.
--
-- O schema ja preve HLS (hls_path / video_variants / transcode_status) para que
-- um pipeline de transcodificacao futuro seja plugado sem nova migracao.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNCOES HELPER
-- -----------------------------------------------------------------------------

-- Resolve a linha de public.users do usuario autenticado (mesmo padrao de
-- teams_current_user_id). SECURITY DEFINER para ler users ignorando RLS.
CREATE OR REPLACE FUNCTION public.tutorials_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.users
  WHERE auth_user_id = (SELECT auth.uid()) AND status = 'ativo'
  LIMIT 1;
$$;

-- Admin do modulo = administrador ativo do sistema (funcao ja existente).
CREATE OR REPLACE FUNCTION public.tutorials_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_administrator();
$$;

-- Documento de busca PT-BR. Precisa ser IMMUTABLE para servir a uma coluna
-- gerada: array_to_string e apenas STABLE no catalogo, mas a conversao de
-- text[] para text com separador fixo e deterministica.
CREATE OR REPLACE FUNCTION public.tutorials_search_document(
  p_title TEXT,
  p_short TEXT,
  p_full  TEXT,
  p_module TEXT,
  p_tags  TEXT[]
)
RETURNS TSVECTOR
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT to_tsvector(
    'portuguese',
    coalesce(p_title,'') || ' ' ||
    coalesce(p_short,'') || ' ' ||
    coalesce(p_full,'') || ' ' ||
    coalesce(p_module,'') || ' ' ||
    coalesce(array_to_string(p_tags,' '),'')
  );
$$;

-- -----------------------------------------------------------------------------
-- 2. TABELAS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tutorial_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tutorial_categories IS 'Categorias editoriais dos tutoriais (Primeiros passos, Funcionalidades...).';

CREATE TABLE IF NOT EXISTS public.tutorials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  short_description TEXT,
  full_description  TEXT,
  category_id       UUID REFERENCES public.tutorial_categories(id) ON DELETE SET NULL,
  -- Chave do modulo do sistema (dashboard, leads, equipes...). Sem tabela
  -- propria: a lista canonica vive em src/features/tutorials/constants.ts.
  module_key        TEXT,
  tags              TEXT[] NOT NULL DEFAULT '{}',

  thumbnail_path    TEXT,
  video_path        TEXT,
  -- Preparacao para streaming: preenchidos por um pipeline futuro.
  hls_path          TEXT,
  video_variants    JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcode_status  TEXT NOT NULL DEFAULT 'none'
                    CHECK (transcode_status IN ('none','pending','ready','failed')),

  mime_type         TEXT,
  file_size         BIGINT,
  duration_seconds  INTEGER,

  status            TEXT NOT NULL DEFAULT 'rascunho'
                    CHECK (status IN ('rascunho','publicado','arquivado')),
  published_at      TIMESTAMPTZ,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order        INTEGER NOT NULL DEFAULT 0,

  views_count       INTEGER NOT NULL DEFAULT 0,
  unique_views_count INTEGER NOT NULL DEFAULT 0,

  author_user_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  search_tsv        TSVECTOR GENERATED ALWAYS AS (
    public.tutorials_search_document(title, short_description, full_description, module_key, tags)
  ) STORED
);

COMMENT ON TABLE public.tutorials IS 'Metadados dos videos de tutorial. Arquivos ficam no Storage.';

CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tutorial_id      UUID NOT NULL REFERENCES public.tutorials(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  last_watched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tutorial_id)
);

COMMENT ON TABLE public.tutorial_progress IS 'Ponto de parada por usuario: alimenta "continuar assistindo" e a trilha de modulos.';

CREATE TABLE IF NOT EXISTS public.tutorial_views (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id     UUID NOT NULL REFERENCES public.tutorials(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  views           INTEGER NOT NULL DEFAULT 1,
  first_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_viewed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tutorial_id, user_id)
);

COMMENT ON TABLE public.tutorial_views IS 'Uma linha por usuario/video: base das visualizacoes unicas. Escrita apenas via RPC.';

CREATE TABLE IF NOT EXISTS public.tutorial_favorites (
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tutorial_id UUID NOT NULL REFERENCES public.tutorials(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tutorial_id)
);

-- -----------------------------------------------------------------------------
-- 3. INDICES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tutorials_status_published ON public.tutorials(status, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tutorials_module           ON public.tutorials(module_key);
CREATE INDEX IF NOT EXISTS idx_tutorials_category         ON public.tutorials(category_id);
CREATE INDEX IF NOT EXISTS idx_tutorials_views            ON public.tutorials(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_tutorials_tags             ON public.tutorials USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tutorials_search           ON public.tutorials USING GIN(search_tsv);
CREATE INDEX IF NOT EXISTS idx_tutorial_progress_user     ON public.tutorial_progress(user_id, last_watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutorial_favorites_user    ON public.tutorial_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutorial_views_tutorial    ON public.tutorial_views(tutorial_id);

-- -----------------------------------------------------------------------------
-- 4. TRIGGERS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tutorials_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  -- Publicar pela primeira vez carimba a data usada pela tag "Novo".
  IF NEW.status = 'publicado' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tutorials_touch ON public.tutorials;
CREATE TRIGGER trg_tutorials_touch
  BEFORE INSERT OR UPDATE ON public.tutorials
  FOR EACH ROW EXECUTE FUNCTION public.tutorials_touch_updated_at();

DROP TRIGGER IF EXISTS trg_tutorial_categories_touch ON public.tutorial_categories;
CREATE TRIGGER trg_tutorial_categories_touch
  BEFORE UPDATE ON public.tutorial_categories
  FOR EACH ROW EXECUTE FUNCTION public.tutorials_touch_updated_at();

-- -----------------------------------------------------------------------------
-- 5. RPCs
-- -----------------------------------------------------------------------------

-- Registra visualizacao: incrementa o total sempre e as unicas so na primeira
-- vez daquele usuario. SECURITY DEFINER porque o cliente nao escreve direto em
-- tutorial_views nem em tutorials.
CREATE OR REPLACE FUNCTION public.register_tutorial_view(p_tutorial_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID := public.tutorials_current_user_id();
  v_is_new  BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tutorials
    WHERE id = p_tutorial_id
      AND (status = 'publicado' OR public.tutorials_is_admin())
  ) THEN
    RAISE EXCEPTION 'Tutorial indisponivel.';
  END IF;

  INSERT INTO public.tutorial_views (tutorial_id, user_id)
  VALUES (p_tutorial_id, v_user_id)
  ON CONFLICT (tutorial_id, user_id) DO UPDATE
    SET views = public.tutorial_views.views + 1,
        last_viewed_at = NOW()
  RETURNING (xmax = 0) INTO v_is_new;

  UPDATE public.tutorials
  SET views_count = views_count + 1,
      unique_views_count = unique_views_count + CASE WHEN v_is_new THEN 1 ELSE 0 END
  WHERE id = p_tutorial_id;
END;
$$;

-- Grava o ponto de parada. Marca como concluido a partir de 90%.
CREATE OR REPLACE FUNCTION public.upsert_tutorial_progress(
  p_tutorial_id UUID,
  p_position    INTEGER,
  p_duration    INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id   UUID := public.tutorials_current_user_id();
  v_completed BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF p_duration IS NOT NULL AND p_duration > 0 THEN
    v_completed := (p_position::NUMERIC / p_duration::NUMERIC) >= 0.9;
  END IF;

  INSERT INTO public.tutorial_progress (user_id, tutorial_id, position_seconds, duration_seconds, completed, last_watched_at)
  VALUES (v_user_id, p_tutorial_id, GREATEST(p_position, 0), p_duration, v_completed, NOW())
  ON CONFLICT (user_id, tutorial_id) DO UPDATE
    SET position_seconds = GREATEST(EXCLUDED.position_seconds, 0),
        duration_seconds = COALESCE(EXCLUDED.duration_seconds, public.tutorial_progress.duration_seconds),
        -- concluido nunca volta atras ao reassistir do inicio
        completed        = public.tutorial_progress.completed OR EXCLUDED.completed,
        last_watched_at  = NOW();
END;
$$;

-- Nenhuma dessas funcoes faz sentido para visitantes nao autenticados.
REVOKE EXECUTE ON FUNCTION public.register_tutorial_view(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_tutorial_progress(UUID, INTEGER, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.tutorials_current_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tutorials_is_admin() FROM anon;

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.tutorials           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_views      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_favorites  ENABLE ROW LEVEL SECURITY;

-- tutorials: usuario comum le apenas publicados; admin faz tudo.
DROP POLICY IF EXISTS "Tutorials select published" ON public.tutorials;
CREATE POLICY "Tutorials select published"
  ON public.tutorials FOR SELECT TO authenticated
  USING (status = 'publicado' OR public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorials admin insert" ON public.tutorials;
CREATE POLICY "Tutorials admin insert"
  ON public.tutorials FOR INSERT TO authenticated
  WITH CHECK (public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorials admin update" ON public.tutorials;
CREATE POLICY "Tutorials admin update"
  ON public.tutorials FOR UPDATE TO authenticated
  USING (public.tutorials_is_admin())
  WITH CHECK (public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorials admin delete" ON public.tutorials;
CREATE POLICY "Tutorials admin delete"
  ON public.tutorials FOR DELETE TO authenticated
  USING (public.tutorials_is_admin());

-- categorias: leitura para todos autenticados, escrita so admin.
DROP POLICY IF EXISTS "Tutorial categories select" ON public.tutorial_categories;
CREATE POLICY "Tutorial categories select"
  ON public.tutorial_categories FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Tutorial categories admin write" ON public.tutorial_categories;
CREATE POLICY "Tutorial categories admin write"
  ON public.tutorial_categories FOR ALL TO authenticated
  USING (public.tutorials_is_admin())
  WITH CHECK (public.tutorials_is_admin());

-- progresso e favoritos: cada um so enxerga e altera as proprias linhas.
DROP POLICY IF EXISTS "Tutorial progress own rows" ON public.tutorial_progress;
CREATE POLICY "Tutorial progress own rows"
  ON public.tutorial_progress FOR ALL TO authenticated
  USING (user_id = public.tutorials_current_user_id())
  WITH CHECK (user_id = public.tutorials_current_user_id());

DROP POLICY IF EXISTS "Tutorial favorites own rows" ON public.tutorial_favorites;
CREATE POLICY "Tutorial favorites own rows"
  ON public.tutorial_favorites FOR ALL TO authenticated
  USING (user_id = public.tutorials_current_user_id())
  WITH CHECK (user_id = public.tutorials_current_user_id());

-- views: leitura do proprio registro e do admin; escrita apenas via RPC.
DROP POLICY IF EXISTS "Tutorial views select" ON public.tutorial_views;
CREATE POLICY "Tutorial views select"
  ON public.tutorial_views FOR SELECT TO authenticated
  USING (user_id = public.tutorials_current_user_id() OR public.tutorials_is_admin());

-- -----------------------------------------------------------------------------
-- 7. STORAGE
-- -----------------------------------------------------------------------------

-- Videos: bucket privado (URL assinada na hora do play), ate 2 GB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tutorials', 'tutorials', FALSE, 2147483648,
  ARRAY['video/mp4','video/quicktime','video/webm','video/x-m4v','application/x-mpegURL','video/MP2T']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Thumbnails: bucket publico para aproveitar cache de CDN, ate 5 MB.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tutorial-thumbnails', 'tutorial-thumbnails', TRUE, 5242880,
  ARRAY['image/png','image/jpeg','image/webp','image/avif']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Tutorials video select" ON storage.objects;
CREATE POLICY "Tutorials video select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tutorials');

DROP POLICY IF EXISTS "Tutorials video insert" ON storage.objects;
CREATE POLICY "Tutorials video insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tutorials' AND public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorials video update" ON storage.objects;
CREATE POLICY "Tutorials video update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tutorials' AND public.tutorials_is_admin())
  WITH CHECK (bucket_id = 'tutorials' AND public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorials video delete" ON storage.objects;
CREATE POLICY "Tutorials video delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tutorials' AND public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorial thumbnails select" ON storage.objects;
CREATE POLICY "Tutorial thumbnails select"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'tutorial-thumbnails');

DROP POLICY IF EXISTS "Tutorial thumbnails insert" ON storage.objects;
CREATE POLICY "Tutorial thumbnails insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tutorial-thumbnails' AND public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorial thumbnails update" ON storage.objects;
CREATE POLICY "Tutorial thumbnails update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tutorial-thumbnails' AND public.tutorials_is_admin())
  WITH CHECK (bucket_id = 'tutorial-thumbnails' AND public.tutorials_is_admin());

DROP POLICY IF EXISTS "Tutorial thumbnails delete" ON storage.objects;
CREATE POLICY "Tutorial thumbnails delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tutorial-thumbnails' AND public.tutorials_is_admin());

-- -----------------------------------------------------------------------------
-- 8. SEED DE CATEGORIAS
-- -----------------------------------------------------------------------------

INSERT INTO public.tutorial_categories (name, slug, description, sort_order)
VALUES
  ('Primeiros passos', 'primeiros-passos', 'O essencial para comecar a usar a plataforma.', 1),
  ('Funcionalidades',  'funcionalidades',  'Como usar cada recurso, passo a passo.', 2),
  ('Boas praticas',    'boas-praticas',    'Formas de tirar mais proveito do dia a dia.', 3),
  ('Novidades',        'novidades',        'O que mudou nas ultimas versoes.', 4)
ON CONFLICT (slug) DO NOTHING;
