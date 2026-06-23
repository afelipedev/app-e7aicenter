-- Vínculos entre cards de quadros operacionais e jurídicos

CREATE TABLE IF NOT EXISTS public.kanban_card_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
  target_card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
  source_board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
  target_board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
  target_column_id UUID NOT NULL REFERENCES public.legal_kanban_columns(id) ON DELETE RESTRICT,
  link_direction TEXT NOT NULL DEFAULT 'bi'
    CHECK (link_direction IN ('bi', 'operational_to_legal', 'legal_to_operational')),
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_card_id),
  UNIQUE(target_card_id),
  CHECK (source_card_id <> target_card_id)
);

CREATE INDEX IF NOT EXISTS idx_kanban_card_links_source ON public.kanban_card_links(source_card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_links_target ON public.kanban_card_links(target_card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_links_source_board ON public.kanban_card_links(source_board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_links_target_board ON public.kanban_card_links(target_board_id);

ALTER TABLE public.kanban_card_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kanban card links select"
  ON public.kanban_card_links
  FOR SELECT
  TO authenticated
  USING (
    public.legal_kanban_has_board_access(source_board_id)
    AND public.legal_kanban_has_board_access(target_board_id)
  );

-- Cross-ref para comentários espelhados entre cards vinculados
ALTER TABLE public.legal_kanban_comments
  ADD COLUMN IF NOT EXISTS mirrored_card_comment_id UUID
  REFERENCES public.legal_kanban_comments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_legal_kanban_comments_mirrored_card_comment
  ON public.legal_kanban_comments (mirrored_card_comment_id)
  WHERE mirrored_card_comment_id IS NOT NULL;

-- Helper: obtém o card par vinculado
CREATE OR REPLACE FUNCTION public.kanban_linked_peer_card_id(p_card_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN l.source_card_id = p_card_id THEN l.target_card_id
    WHEN l.target_card_id = p_card_id THEN l.source_card_id
    ELSE NULL
  END
  FROM public.kanban_card_links l
  WHERE l.source_card_id = p_card_id OR l.target_card_id = p_card_id
  LIMIT 1;
$$;

-- Flag anti-loop via session (usada pelos triggers de sync)
CREATE OR REPLACE FUNCTION public.kanban_link_sync_is_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.kanban_link_sync', true), 'false') = 'true';
$$;

CREATE OR REPLACE FUNCTION public.kanban_link_sync_begin()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.kanban_link_sync', 'true', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.kanban_link_sync_end()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.kanban_link_sync', 'false', true);
END;
$$;
