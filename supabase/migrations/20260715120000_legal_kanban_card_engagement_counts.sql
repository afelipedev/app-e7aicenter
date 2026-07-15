-- Contagem agregada de comentários e anexos por card, para o resumo dos cards no
-- quadro. Substitui a busca de todas as linhas no cliente (hydrateCards), que era
-- truncada pelo limite de linhas do PostgREST em quadros com muitos comentários/
-- anexos, subcontando (ou zerando) os cards. Respeita RLS (SECURITY INVOKER).

CREATE OR REPLACE FUNCTION public.legal_kanban_card_engagement_counts(p_card_ids uuid[])
RETURNS TABLE (
  card_id uuid,
  comments_count bigint,
  attachments_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    c.id AS card_id,
    (SELECT count(*) FROM public.legal_kanban_comments cm WHERE cm.card_id = c.id) AS comments_count,
    (SELECT count(*) FROM public.legal_kanban_attachments a WHERE a.card_id = c.id) AS attachments_count
  FROM public.legal_kanban_cards c
  WHERE c.id = ANY(p_card_ids);
$$;

GRANT EXECUTE ON FUNCTION public.legal_kanban_card_engagement_counts(uuid[]) TO authenticated;
