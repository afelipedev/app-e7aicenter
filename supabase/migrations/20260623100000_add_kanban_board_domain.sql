-- Domínio dos quadros kanban: legal vs operational (Gestão Operacional)

ALTER TABLE public.legal_kanban_boards
  ADD COLUMN IF NOT EXISTS domain TEXT NOT NULL DEFAULT 'legal'
  CHECK (domain IN ('legal', 'operational'));

CREATE INDEX IF NOT EXISTS idx_legal_kanban_boards_domain
  ON public.legal_kanban_boards(domain);

-- Helpers de domínio
CREATE OR REPLACE FUNCTION public.legal_kanban_board_domain(target_board_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT b.domain FROM public.legal_kanban_boards b WHERE b.id = target_board_id),
    'legal'
  );
$$;

CREATE OR REPLACE FUNCTION public.legal_kanban_has_operational_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_legal_kanban_board_manager();
$$;

-- Quadros operacionais: somente board managers globais
CREATE OR REPLACE FUNCTION public.legal_kanban_has_board_access(target_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.legal_kanban_board_domain(target_board_id) = 'operational' THEN
    RETURN public.legal_kanban_has_operational_access();
  END IF;

  RETURN public.is_legal_kanban_board_manager()
    OR public.legal_kanban_is_member_of_board(target_board_id, public.current_legal_kanban_user_id());
END;
$$;

CREATE OR REPLACE FUNCTION public.legal_kanban_can_edit_board(target_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.legal_kanban_board_domain(target_board_id) = 'operational' THEN
    RETURN public.legal_kanban_has_operational_access();
  END IF;

  RETURN public.is_legal_kanban_board_manager()
    OR EXISTS (
      SELECT 1
      FROM public.legal_kanban_board_members m
      WHERE m.board_id = target_board_id
        AND m.user_id = public.current_legal_kanban_user_id()
        AND m.access_level IN ('editor', 'admin')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.legal_kanban_can_admin_board(target_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.legal_kanban_board_domain(target_board_id) = 'operational' THEN
    RETURN public.legal_kanban_has_operational_access();
  END IF;

  RETURN public.is_legal_kanban_board_manager()
    OR EXISTS (
      SELECT 1
      FROM public.legal_kanban_board_members m
      WHERE m.board_id = target_board_id
        AND m.user_id = public.current_legal_kanban_user_id()
        AND m.access_level = 'admin'
    );
END;
$$;
