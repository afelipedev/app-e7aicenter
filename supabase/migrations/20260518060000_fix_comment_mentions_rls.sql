-- Fix: legal_kanban_comment_mentions RLS rejeitava INSERT/SELECT/DELETE quando
-- o usuário tinha apenas acesso de leitura ao board, porque a policy fazia
-- JOIN visível em legal_kanban_cards (cujo SELECT exige can_edit_board).
-- Substituímos por uma helper SECURITY DEFINER que resolve o board_id sem RLS.

CREATE OR REPLACE FUNCTION public.legal_kanban_comment_board_id(target_comment_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.board_id
  FROM public.legal_kanban_comments cm
  JOIN public.legal_kanban_cards c ON c.id = cm.card_id
  WHERE cm.id = target_comment_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.legal_kanban_comment_board_id(UUID) TO authenticated;

DROP POLICY IF EXISTS "Legal kanban users view mentions" ON public.legal_kanban_comment_mentions;
CREATE POLICY "Legal kanban users view mentions"
  ON public.legal_kanban_comment_mentions
  FOR SELECT
  TO authenticated
  USING (
    public.legal_kanban_has_board_access(
      public.legal_kanban_comment_board_id(comment_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban users create mentions" ON public.legal_kanban_comment_mentions;
CREATE POLICY "Legal kanban users create mentions"
  ON public.legal_kanban_comment_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.legal_kanban_has_board_access(
      public.legal_kanban_comment_board_id(comment_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban users delete mentions" ON public.legal_kanban_comment_mentions;
CREATE POLICY "Legal kanban users delete mentions"
  ON public.legal_kanban_comment_mentions
  FOR DELETE
  TO authenticated
  USING (
    public.legal_kanban_has_board_access(
      public.legal_kanban_comment_board_id(comment_id)
    )
  );
