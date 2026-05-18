-- Correções: recursão em policy de board members e bucket de capa ausente.

CREATE OR REPLACE FUNCTION public.current_legal_kanban_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE auth_user_id = (SELECT auth.uid())
    AND status = 'ativo'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_legal_kanban_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.users
  WHERE auth_user_id = (SELECT auth.uid())
    AND status = 'ativo'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_legal_kanban_board_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_legal_kanban_user_role() IN ('administrator', 'it', 'advogado_adm');
$$;

CREATE OR REPLACE FUNCTION public.legal_kanban_is_member_of_board(target_board_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.legal_kanban_board_members m
    WHERE m.board_id = target_board_id
      AND m.user_id = target_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.legal_kanban_has_board_access(target_board_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

DROP POLICY IF EXISTS "Legal kanban users view board members" ON public.legal_kanban_board_members;
CREATE POLICY "Legal kanban users view board members"
  ON public.legal_kanban_board_members
  FOR SELECT
  TO authenticated
  USING (
    public.is_legal_kanban_board_manager()
    OR public.legal_kanban_is_member_of_board(board_id, public.current_legal_kanban_user_id())
  );

DROP POLICY IF EXISTS "Legal kanban managers update board members" ON public.legal_kanban_board_members;
CREATE POLICY "Legal kanban managers update board members"
  ON public.legal_kanban_board_members
  FOR ALL
  TO authenticated
  USING (public.legal_kanban_can_admin_board(board_id))
  WITH CHECK (public.legal_kanban_can_admin_board(board_id));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legal-kanban-board-covers',
  'legal-kanban-board-covers',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Legal kanban covers view" ON storage.objects;
CREATE POLICY "Legal kanban covers view"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'legal-kanban-board-covers'
    AND EXISTS (
      SELECT 1
      FROM public.legal_kanban_boards b
      WHERE b.id::text = split_part(name, '/', 1)
        AND public.legal_kanban_has_board_access(b.id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban covers insert" ON storage.objects;
CREATE POLICY "Legal kanban covers insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'legal-kanban-board-covers'
    AND EXISTS (
      SELECT 1
      FROM public.legal_kanban_boards b
      WHERE b.id::text = split_part(name, '/', 1)
        AND public.legal_kanban_can_admin_board(b.id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban covers update" ON storage.objects;
CREATE POLICY "Legal kanban covers update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'legal-kanban-board-covers'
    AND EXISTS (
      SELECT 1
      FROM public.legal_kanban_boards b
      WHERE b.id::text = split_part(name, '/', 1)
        AND public.legal_kanban_can_admin_board(b.id)
    )
  )
  WITH CHECK (
    bucket_id = 'legal-kanban-board-covers'
    AND EXISTS (
      SELECT 1
      FROM public.legal_kanban_boards b
      WHERE b.id::text = split_part(name, '/', 1)
        AND public.legal_kanban_can_admin_board(b.id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban covers delete" ON storage.objects;
CREATE POLICY "Legal kanban covers delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'legal-kanban-board-covers'
    AND EXISTS (
      SELECT 1
      FROM public.legal_kanban_boards b
      WHERE b.id::text = split_part(name, '/', 1)
        AND public.legal_kanban_can_admin_board(b.id)
    )
  );
