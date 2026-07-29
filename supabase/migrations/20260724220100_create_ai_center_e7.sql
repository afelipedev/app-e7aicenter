-- =============================================================================
-- AI CENTER E7 -- FUNDACAO (Fase 0)
-- Novo modulo de "centro de inteligencia": usuarios criam, versionam, publicam
-- e executam agentes de IA proprios (prompt + contexto + RAG + ferramentas +
-- memoria + modelo). Toda a execucao roda em Supabase + Edge Functions (sem n8n).
--
-- Convencoes: nomes de tabelas/campos em pt-br. RLS por dono via helper
-- SECURITY DEFINER (evita recursao). RAG usa pgvector (embeddings 1536).
-- Arquivos de conhecimento no Storage (bucket privado "agentes-conhecimento").
--
-- Esta migracao NAO altera o modulo antigo (/assistants/*): tabelas novas e
-- isoladas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSOES
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- 1. FUNCOES HELPER
-- -----------------------------------------------------------------------------

-- Resolve a linha de public.users do usuario autenticado e ativo.
-- SECURITY DEFINER para ler users ignorando RLS (mesmo padrao de tutorials).
CREATE OR REPLACE FUNCTION public.agentes_usuario_atual()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.users
  WHERE auth_user_id = (SELECT auth.uid()) AND status = 'ativo'
  LIMIT 1;
$$;

-- Admin do modulo = administrador ativo do sistema (funcao ja existente).
CREATE OR REPLACE FUNCTION public.agentes_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_active_administrator();
$$;

-- (agentes_pode_ler_base e definida apos as tabelas -- secao 4.1 -- porque
--  referencia bases_conhecimento/agente_bases, validadas na criacao da funcao.)

-- -----------------------------------------------------------------------------
-- 2. TABELAS -- AGENTES E VERSOES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agentes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_por    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  categoria     TEXT,
  objetivo      TEXT,
  persona       TEXT,
  icone         TEXT,
  modelo_llm    TEXT NOT NULL DEFAULT 'gpt-4o',
  temperatura   NUMERIC(3,2) NOT NULL DEFAULT 0.7,
  max_tokens    INTEGER NOT NULL DEFAULT 2000,
  escopo        TEXT NOT NULL DEFAULT 'privado'
                CHECK (escopo IN ('privado','escritorio')),
  status        TEXT NOT NULL DEFAULT 'rascunho'
                CHECK (status IN ('rascunho','publicado','arquivado')),
  -- Fonte de verdade declarativa (nos + arestas do React Flow).
  grafo         JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
  -- Spec compilada (prompt final + parametros derivados do grafo).
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  versao_atual  INTEGER NOT NULL DEFAULT 1,
  publicado_em  TIMESTAMPTZ,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agentes IS 'Agentes de IA criados pelos usuarios do AI Center E7. grafo = spec declarativa (React Flow); config = spec compilada.';

CREATE TABLE IF NOT EXISTS public.agente_versoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id      UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  versao         INTEGER NOT NULL,
  grafo          JSONB NOT NULL,
  config         JSONB NOT NULL DEFAULT '{}'::jsonb,
  prompt_sistema TEXT,
  notas          TEXT,
  publicado_por  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  publicado_em   TIMESTAMPTZ,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agente_id, versao)
);

COMMENT ON TABLE public.agente_versoes IS 'Historico de versoes de um agente (snapshot do grafo/config a cada publicacao).';

-- -----------------------------------------------------------------------------
-- 3. TABELAS -- CONHECIMENTO (RAG)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.bases_conhecimento (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_por    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  tipo          TEXT NOT NULL DEFAULT 'geral'
                CHECK (tipo IN ('geral','juridica','tributaria','financeira','contabil')),
  escopo        TEXT NOT NULL DEFAULT 'privado'
                CHECK (escopo IN ('privado','escritorio')),
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.bases_conhecimento IS 'Bases de conhecimento (RAG) que agrupam documentos vetorizados.';

CREATE TABLE IF NOT EXISTS public.documentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_id        UUID NOT NULL REFERENCES public.bases_conhecimento(id) ON DELETE CASCADE,
  criado_por     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nome_arquivo   TEXT NOT NULL,
  caminho_storage TEXT,
  mime           TEXT,
  tamanho        BIGINT,
  paginas        INTEGER,
  ocr_aplicado   BOOLEAN NOT NULL DEFAULT FALSE,
  status         TEXT NOT NULL DEFAULT 'pendente'
                 CHECK (status IN ('pendente','processando','concluido','erro')),
  erro           TEXT,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.documentos IS 'Arquivos enviados para uma base de conhecimento; texto extraido e fragmentado em documento_fragmentos.';

CREATE TABLE IF NOT EXISTS public.documento_fragmentos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id  UUID NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  base_id       UUID NOT NULL REFERENCES public.bases_conhecimento(id) ON DELETE CASCADE,
  indice        INTEGER NOT NULL,
  conteudo      TEXT NOT NULL,
  tokens        INTEGER,
  embedding     VECTOR(1536),
  metadados     JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.documento_fragmentos IS 'Chunks vetorizados (embedding 1536) usados na recuperacao semantica do RAG.';

-- Vinculo agente <-> bases de conhecimento usadas por ele.
CREATE TABLE IF NOT EXISTS public.agente_bases (
  agente_id UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  base_id   UUID NOT NULL REFERENCES public.bases_conhecimento(id) ON DELETE CASCADE,
  PRIMARY KEY (agente_id, base_id)
);

-- 4.1 Helper de leitura de base (depende das tabelas acima).
-- Um usuario pode LER uma base quando: e o dono, OU a base esta vinculada a
-- algum agente publicado para o escritorio. SECURITY DEFINER evita recair na RLS.
CREATE OR REPLACE FUNCTION public.agentes_pode_ler_base(p_base_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bases_conhecimento b
    WHERE b.id = p_base_id AND b.criado_por = public.agentes_usuario_atual()
  ) OR EXISTS (
    SELECT 1
    FROM public.agente_bases ab
    JOIN public.agentes a ON a.id = ab.agente_id
    WHERE ab.base_id = p_base_id
      AND a.status = 'publicado'
      AND a.escopo = 'escritorio'
  );
$$;

-- -----------------------------------------------------------------------------
-- 4. TABELAS -- CONVERSA / EXECUCAO / CUSTOS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.agente_conversas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id     UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  titulo        TEXT NOT NULL DEFAULT 'Nova conversa',
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agente_conversas IS 'Conversas (threads) de um usuario com um agente.';

CREATE TABLE IF NOT EXISTS public.agente_mensagens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id  UUID NOT NULL REFERENCES public.agente_conversas(id) ON DELETE CASCADE,
  papel        TEXT NOT NULL CHECK (papel IN ('usuario','assistente','sistema')),
  conteudo     TEXT NOT NULL,
  metadados    JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.agente_mensagens IS 'Mensagens de uma conversa (memoria persistente do agente).';

CREATE TABLE IF NOT EXISTS public.agente_execucoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agente_id      UUID NOT NULL REFERENCES public.agentes(id) ON DELETE CASCADE,
  conversa_id    UUID REFERENCES public.agente_conversas(id) ON DELETE SET NULL,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'sucesso'
                 CHECK (status IN ('sucesso','erro')),
  modelo         TEXT,
  tokens_entrada INTEGER NOT NULL DEFAULT 0,
  tokens_saida   INTEGER NOT NULL DEFAULT 0,
  custo_reais    NUMERIC(12,6) NOT NULL DEFAULT 0,
  -- Passos do pipeline (para as abas Simulacao/Execucoes).
  trilha         JSONB NOT NULL DEFAULT '[]'::jsonb,
  erro           TEXT,
  iniciado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizado_em  TIMESTAMPTZ
);

COMMENT ON TABLE public.agente_execucoes IS 'Registro de cada execucao do agente: tokens, custo (~R$) e trilha do pipeline.';

CREATE TABLE IF NOT EXISTS public.precos_modelos (
  provedor          TEXT NOT NULL,
  modelo            TEXT NOT NULL,
  preco_entrada_1k  NUMERIC(12,6) NOT NULL DEFAULT 0,
  preco_saida_1k    NUMERIC(12,6) NOT NULL DEFAULT 0,
  moeda             TEXT NOT NULL DEFAULT 'USD',
  cambio_usd_brl    NUMERIC(8,4) NOT NULL DEFAULT 5.40,
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (modelo)
);

COMMENT ON TABLE public.precos_modelos IS 'Tabela de precos por 1k tokens para estimar custo em R$ das execucoes.';

-- -----------------------------------------------------------------------------
-- 5. INDICES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_agentes_criado_por      ON public.agentes(criado_por);
CREATE INDEX IF NOT EXISTS idx_agentes_status_escopo   ON public.agentes(status, escopo);
CREATE INDEX IF NOT EXISTS idx_agente_versoes_agente   ON public.agente_versoes(agente_id, versao DESC);
CREATE INDEX IF NOT EXISTS idx_bases_criado_por        ON public.bases_conhecimento(criado_por);
CREATE INDEX IF NOT EXISTS idx_documentos_base         ON public.documentos(base_id, status);
CREATE INDEX IF NOT EXISTS idx_fragmentos_documento    ON public.documento_fragmentos(documento_id);
CREATE INDEX IF NOT EXISTS idx_fragmentos_base         ON public.documento_fragmentos(base_id);
-- Indice vetorial HNSW (cosseno) para recuperacao semantica.
CREATE INDEX IF NOT EXISTS idx_fragmentos_embedding    ON public.documento_fragmentos
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_agente_conversas_agente ON public.agente_conversas(agente_id, user_id);
CREATE INDEX IF NOT EXISTS idx_agente_mensagens_conv   ON public.agente_mensagens(conversa_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_agente_execucoes_agente ON public.agente_execucoes(agente_id, iniciado_em DESC);
CREATE INDEX IF NOT EXISTS idx_agente_execucoes_user   ON public.agente_execucoes(user_id, iniciado_em DESC);

-- -----------------------------------------------------------------------------
-- 6. TRIGGERS (reusa public.update_updated_at_column, mas coluna e atualizado_em)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.agentes_touch_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agentes_touch ON public.agentes;
CREATE TRIGGER trg_agentes_touch BEFORE UPDATE ON public.agentes
  FOR EACH ROW EXECUTE FUNCTION public.agentes_touch_atualizado_em();

DROP TRIGGER IF EXISTS trg_bases_touch ON public.bases_conhecimento;
CREATE TRIGGER trg_bases_touch BEFORE UPDATE ON public.bases_conhecimento
  FOR EACH ROW EXECUTE FUNCTION public.agentes_touch_atualizado_em();

DROP TRIGGER IF EXISTS trg_documentos_touch ON public.documentos;
CREATE TRIGGER trg_documentos_touch BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.agentes_touch_atualizado_em();

DROP TRIGGER IF EXISTS trg_conversas_touch ON public.agente_conversas;
CREATE TRIGGER trg_conversas_touch BEFORE UPDATE ON public.agente_conversas
  FOR EACH ROW EXECUTE FUNCTION public.agentes_touch_atualizado_em();

-- Nova mensagem carimba a conversa (ordena "recentes").
CREATE OR REPLACE FUNCTION public.agentes_bump_conversa()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  UPDATE public.agente_conversas SET atualizado_em = NOW() WHERE id = NEW.conversa_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mensagens_bump ON public.agente_mensagens;
CREATE TRIGGER trg_mensagens_bump AFTER INSERT ON public.agente_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.agentes_bump_conversa();

-- -----------------------------------------------------------------------------
-- 7. RPC -- BUSCA SEMANTICA (RAG)
-- -----------------------------------------------------------------------------

-- Retorna os fragmentos mais similares ao embedding informado, restritos as
-- bases que o usuario pode ler. SECURITY DEFINER + checagem explicita por base.
CREATE OR REPLACE FUNCTION public.buscar_fragmentos(
  p_embedding VECTOR(1536),
  p_bases     UUID[],
  p_limite    INTEGER DEFAULT 6
)
RETURNS TABLE (
  id           UUID,
  documento_id UUID,
  base_id      UUID,
  conteudo     TEXT,
  similaridade REAL,
  metadados    JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_bases UUID[];
BEGIN
  -- Mantem apenas as bases que o usuario tem permissao de ler.
  SELECT array_agg(b) INTO v_bases
  FROM unnest(p_bases) AS b
  WHERE public.agentes_pode_ler_base(b);

  IF v_bases IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT f.id, f.documento_id, f.base_id, f.conteudo,
         (1 - (f.embedding <=> p_embedding))::REAL AS similaridade,
         f.metadados
  FROM public.documento_fragmentos f
  WHERE f.base_id = ANY (v_bases)
    AND f.embedding IS NOT NULL
  ORDER BY f.embedding <=> p_embedding
  LIMIT GREATEST(p_limite, 1);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.buscar_fragmentos(VECTOR, UUID[], INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.agentes_usuario_atual() FROM anon;
REVOKE EXECUTE ON FUNCTION public.agentes_is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.agentes_pode_ler_base(UUID) FROM anon;

-- -----------------------------------------------------------------------------
-- 8. RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.agentes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_versoes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bases_conhecimento  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_fragmentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_bases        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_conversas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_mensagens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_execucoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precos_modelos      ENABLE ROW LEVEL SECURITY;

-- agentes: dono ve tudo; demais so publicados p/ escritorio. Escrita = dono.
DROP POLICY IF EXISTS "Agentes select" ON public.agentes;
CREATE POLICY "Agentes select" ON public.agentes FOR SELECT TO authenticated
  USING (criado_por = public.agentes_usuario_atual()
         OR (status = 'publicado' AND escopo = 'escritorio'));

DROP POLICY IF EXISTS "Agentes insert" ON public.agentes;
CREATE POLICY "Agentes insert" ON public.agentes FOR INSERT TO authenticated
  WITH CHECK (criado_por = public.agentes_usuario_atual());

DROP POLICY IF EXISTS "Agentes update" ON public.agentes;
CREATE POLICY "Agentes update" ON public.agentes FOR UPDATE TO authenticated
  USING (criado_por = public.agentes_usuario_atual())
  WITH CHECK (criado_por = public.agentes_usuario_atual());

DROP POLICY IF EXISTS "Agentes delete" ON public.agentes;
CREATE POLICY "Agentes delete" ON public.agentes FOR DELETE TO authenticated
  USING (criado_por = public.agentes_usuario_atual());

-- versoes: legiveis por quem enxerga o agente; escrita apenas do dono.
DROP POLICY IF EXISTS "Agente versoes select" ON public.agente_versoes;
CREATE POLICY "Agente versoes select" ON public.agente_versoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agentes a WHERE a.id = agente_id
                 AND (a.criado_por = public.agentes_usuario_atual()
                      OR (a.status = 'publicado' AND a.escopo = 'escritorio'))));

DROP POLICY IF EXISTS "Agente versoes write" ON public.agente_versoes;
CREATE POLICY "Agente versoes write" ON public.agente_versoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agentes a WHERE a.id = agente_id
                 AND a.criado_por = public.agentes_usuario_atual()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agentes a WHERE a.id = agente_id
                 AND a.criado_por = public.agentes_usuario_atual()));

-- bases: dono faz tudo; leitura estendida via helper para bases publicadas.
DROP POLICY IF EXISTS "Bases select" ON public.bases_conhecimento;
CREATE POLICY "Bases select" ON public.bases_conhecimento FOR SELECT TO authenticated
  USING (public.agentes_pode_ler_base(id));

DROP POLICY IF EXISTS "Bases write" ON public.bases_conhecimento;
CREATE POLICY "Bases write" ON public.bases_conhecimento FOR ALL TO authenticated
  USING (criado_por = public.agentes_usuario_atual())
  WITH CHECK (criado_por = public.agentes_usuario_atual());

-- documentos: leitura acompanha a base; escrita e do dono da base.
DROP POLICY IF EXISTS "Documentos select" ON public.documentos;
CREATE POLICY "Documentos select" ON public.documentos FOR SELECT TO authenticated
  USING (public.agentes_pode_ler_base(base_id));

DROP POLICY IF EXISTS "Documentos write" ON public.documentos;
CREATE POLICY "Documentos write" ON public.documentos FOR ALL TO authenticated
  USING (criado_por = public.agentes_usuario_atual())
  WITH CHECK (criado_por = public.agentes_usuario_atual());

-- fragmentos: leitura acompanha a base; escrita apenas via Edge Function
-- (service role ignora RLS), por isso sem policy de INSERT para usuarios.
DROP POLICY IF EXISTS "Fragmentos select" ON public.documento_fragmentos;
CREATE POLICY "Fragmentos select" ON public.documento_fragmentos FOR SELECT TO authenticated
  USING (public.agentes_pode_ler_base(base_id));

-- agente_bases: gerenciavel pelo dono do agente.
DROP POLICY IF EXISTS "Agente bases select" ON public.agente_bases;
CREATE POLICY "Agente bases select" ON public.agente_bases FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agentes a WHERE a.id = agente_id
                 AND (a.criado_por = public.agentes_usuario_atual()
                      OR (a.status = 'publicado' AND a.escopo = 'escritorio'))));

DROP POLICY IF EXISTS "Agente bases write" ON public.agente_bases;
CREATE POLICY "Agente bases write" ON public.agente_bases FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agentes a WHERE a.id = agente_id
                 AND a.criado_por = public.agentes_usuario_atual()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agentes a WHERE a.id = agente_id
                 AND a.criado_por = public.agentes_usuario_atual()));

-- conversas/mensagens/execucoes: cada usuario so acessa as proprias.
DROP POLICY IF EXISTS "Conversas own" ON public.agente_conversas;
CREATE POLICY "Conversas own" ON public.agente_conversas FOR ALL TO authenticated
  USING (user_id = public.agentes_usuario_atual())
  WITH CHECK (user_id = public.agentes_usuario_atual());

DROP POLICY IF EXISTS "Mensagens own" ON public.agente_mensagens;
CREATE POLICY "Mensagens own" ON public.agente_mensagens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agente_conversas c WHERE c.id = conversa_id
                 AND c.user_id = public.agentes_usuario_atual()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agente_conversas c WHERE c.id = conversa_id
                 AND c.user_id = public.agentes_usuario_atual()));

DROP POLICY IF EXISTS "Execucoes own" ON public.agente_execucoes;
CREATE POLICY "Execucoes own" ON public.agente_execucoes FOR SELECT TO authenticated
  USING (user_id = public.agentes_usuario_atual()
         OR EXISTS (SELECT 1 FROM public.agentes a WHERE a.id = agente_id
                    AND a.criado_por = public.agentes_usuario_atual()));

-- precos_modelos: leitura para todos autenticados; escrita so admin.
DROP POLICY IF EXISTS "Precos select" ON public.precos_modelos;
CREATE POLICY "Precos select" ON public.precos_modelos FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "Precos admin write" ON public.precos_modelos;
CREATE POLICY "Precos admin write" ON public.precos_modelos FOR ALL TO authenticated
  USING (public.agentes_is_admin())
  WITH CHECK (public.agentes_is_admin());

-- -----------------------------------------------------------------------------
-- 9. STORAGE -- bucket privado de conhecimento
-- -----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'agentes-conhecimento', 'agentes-conhecimento', FALSE, 52428800,
  ARRAY['application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword','text/plain',
        'image/png','image/jpeg','image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Conhecimento select" ON storage.objects;
CREATE POLICY "Conhecimento select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'agentes-conhecimento');

DROP POLICY IF EXISTS "Conhecimento insert" ON storage.objects;
CREATE POLICY "Conhecimento insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agentes-conhecimento');

DROP POLICY IF EXISTS "Conhecimento update" ON storage.objects;
CREATE POLICY "Conhecimento update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'agentes-conhecimento')
  WITH CHECK (bucket_id = 'agentes-conhecimento');

DROP POLICY IF EXISTS "Conhecimento delete" ON storage.objects;
CREATE POLICY "Conhecimento delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agentes-conhecimento');

-- -----------------------------------------------------------------------------
-- 10. SEED -- precos de modelos (USD por 1k tokens; cambio aproximado)
-- -----------------------------------------------------------------------------

INSERT INTO public.precos_modelos (provedor, modelo, preco_entrada_1k, preco_saida_1k, moeda, cambio_usd_brl)
VALUES
  ('openai',    'gpt-4o',            0.0025, 0.0100, 'USD', 5.40),
  ('openai',    'gpt-4o-mini',       0.00015,0.0006, 'USD', 5.40),
  ('openai',    'gpt-5.2',           0.0050, 0.0150, 'USD', 5.40),
  ('google',    'gemini-2.5-flash',  0.00030,0.0025, 'USD', 5.40),
  ('google',    'gemini-3-pro',      0.0020, 0.0120, 'USD', 5.40),
  ('anthropic', 'claude-sonnet-4.6', 0.0030, 0.0150, 'USD', 5.40),
  ('anthropic', 'claude-haiku-4.5',  0.0010, 0.0050, 'USD', 5.40),
  ('anthropic', 'claude-opus-4.8',   0.0150, 0.0750, 'USD', 5.40)
ON CONFLICT (modelo) DO UPDATE
SET preco_entrada_1k = EXCLUDED.preco_entrada_1k,
    preco_saida_1k   = EXCLUDED.preco_saida_1k,
    provedor         = EXCLUDED.provedor,
    atualizado_em    = NOW();
