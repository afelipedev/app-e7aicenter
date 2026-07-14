-- Duplicação sincronizada de cards: generaliza kanban_card_links de par 1:1 para grupo 1:N
-- link_type 'share'     -> compartilhamento operacional <-> jurídico (segue 1:1)
-- link_type 'duplicate' -> cópias do card dentro do mesmo quadro (1 raiz : N cópias)

ALTER TABLE public.kanban_card_links
  ADD COLUMN IF NOT EXISTS link_type TEXT NOT NULL DEFAULT 'share'
  CHECK (link_type IN ('share', 'duplicate'));

-- As UNIQUE(source_card_id) / UNIQUE(target_card_id) originais impediam múltiplas cópias.
-- Viram índices parciais: continuam valendo apenas para os vínculos de compartilhamento.
ALTER TABLE public.kanban_card_links
  DROP CONSTRAINT IF EXISTS kanban_card_links_source_card_id_key,
  DROP CONSTRAINT IF EXISTS kanban_card_links_target_card_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kanban_card_links_share_source
  ON public.kanban_card_links (source_card_id)
  WHERE link_type = 'share';

CREATE UNIQUE INDEX IF NOT EXISTS uq_kanban_card_links_share_target
  ON public.kanban_card_links (target_card_id)
  WHERE link_type = 'share';

CREATE UNIQUE INDEX IF NOT EXISTS uq_kanban_card_links_pair
  ON public.kanban_card_links (source_card_id, target_card_id);

CREATE INDEX IF NOT EXISTS idx_kanban_card_links_type
  ON public.kanban_card_links (link_type);

-- -----------------------------------------------------------------------------
-- Resolução de pares: agora um card pode ter N pares (grupo de duplicatas)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.kanban_linked_peer_card_ids(p_card_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH root AS (
    -- Se o card é uma cópia, a raiz do grupo é o source do vínculo; senão ele mesmo.
    SELECT COALESCE(
      (
        SELECT l.source_card_id
        FROM public.kanban_card_links l
        WHERE l.link_type = 'duplicate' AND l.target_card_id = p_card_id
        LIMIT 1
      ),
      p_card_id
    ) AS id
  ),
  duplicate_group AS (
    SELECT r.id AS card_id FROM root r
    UNION ALL
    SELECT l.target_card_id
    FROM public.kanban_card_links l
    JOIN root r ON r.id = l.source_card_id
    WHERE l.link_type = 'duplicate'
  )
  SELECT CASE
    WHEN l.source_card_id = p_card_id THEN l.target_card_id
    ELSE l.source_card_id
  END
  FROM public.kanban_card_links l
  WHERE l.link_type = 'share'
    AND (l.source_card_id = p_card_id OR l.target_card_id = p_card_id)

  UNION

  SELECT g.card_id
  FROM duplicate_group g
  WHERE g.card_id <> p_card_id;
$$;

-- -----------------------------------------------------------------------------
-- Comentários: mirrored_card_comment_id (UUID único) não representa N espelhos.
-- mirror_group_id agrupa o comentário original e todos os seus espelhos.
-- -----------------------------------------------------------------------------

ALTER TABLE public.legal_kanban_comments
  ADD COLUMN IF NOT EXISTS mirror_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_legal_kanban_comments_mirror_group
  ON public.legal_kanban_comments (mirror_group_id)
  WHERE mirror_group_id IS NOT NULL;

UPDATE public.legal_kanban_comments
SET mirror_group_id = LEAST(id, mirrored_card_comment_id)
WHERE mirrored_card_comment_id IS NOT NULL
  AND mirror_group_id IS NULL;
