-- Refatoração do módulo de Kanban para Quadros
-- Inclui membership por quadro, favoritos, capa e menções.

ALTER TABLE public.legal_kanban_boards
  ADD COLUMN IF NOT EXISTS cover_image_path TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

CREATE TABLE IF NOT EXISTS public.legal_kanban_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'editor' CHECK (access_level IN ('viewer', 'editor', 'admin')),
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT legal_kanban_board_members_unique UNIQUE (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_board_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT legal_kanban_board_favorites_unique UNIQUE (board_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.legal_kanban_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT legal_kanban_comment_mentions_unique UNIQUE (comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_board_members_board_user
  ON public.legal_kanban_board_members (board_id, user_id);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_board_members_user_board
  ON public.legal_kanban_board_members (user_id, board_id);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_board_favorites_user
  ON public.legal_kanban_board_favorites (user_id, board_id);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_comment_mentions_comment
  ON public.legal_kanban_comment_mentions (comment_id, mentioned_user_id);

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

CREATE OR REPLACE FUNCTION public.legal_kanban_has_board_access(target_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_legal_kanban_board_manager()
    OR EXISTS (
      SELECT 1
      FROM public.legal_kanban_board_members m
      WHERE m.board_id = target_board_id
        AND m.user_id = public.current_legal_kanban_user_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.legal_kanban_can_edit_board(target_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_legal_kanban_board_manager()
    OR EXISTS (
      SELECT 1
      FROM public.legal_kanban_board_members m
      WHERE m.board_id = target_board_id
        AND m.user_id = public.current_legal_kanban_user_id()
        AND m.access_level IN ('editor', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION public.legal_kanban_can_admin_board(target_board_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_legal_kanban_board_manager()
    OR EXISTS (
      SELECT 1
      FROM public.legal_kanban_board_members m
      WHERE m.board_id = target_board_id
        AND m.user_id = public.current_legal_kanban_user_id()
        AND m.access_level = 'admin'
    );
$$;

ALTER TABLE public.legal_kanban_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_board_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_comment_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Legal kanban members view boards" ON public.legal_kanban_boards;
CREATE POLICY "Legal kanban members view boards"
  ON public.legal_kanban_boards
  FOR SELECT
  TO authenticated
  USING (public.legal_kanban_has_board_access(id));

DROP POLICY IF EXISTS "Legal kanban admins manage boards" ON public.legal_kanban_boards;
CREATE POLICY "Legal kanban admins manage boards"
  ON public.legal_kanban_boards
  FOR ALL
  TO authenticated
  USING (public.is_legal_kanban_board_manager() OR public.legal_kanban_can_admin_board(id))
  WITH CHECK (public.is_legal_kanban_board_manager() OR public.legal_kanban_can_admin_board(id));

DROP POLICY IF EXISTS "Legal kanban members view columns" ON public.legal_kanban_columns;
CREATE POLICY "Legal kanban members view columns"
  ON public.legal_kanban_columns
  FOR SELECT
  TO authenticated
  USING (public.legal_kanban_has_board_access(board_id));

DROP POLICY IF EXISTS "Legal kanban admins manage columns" ON public.legal_kanban_columns;
CREATE POLICY "Legal kanban admins manage columns"
  ON public.legal_kanban_columns
  FOR ALL
  TO authenticated
  USING (public.legal_kanban_can_admin_board(board_id))
  WITH CHECK (public.legal_kanban_can_admin_board(board_id));

DROP POLICY IF EXISTS "Legal kanban members view labels" ON public.legal_kanban_labels;
CREATE POLICY "Legal kanban members view labels"
  ON public.legal_kanban_labels
  FOR SELECT
  TO authenticated
  USING (public.legal_kanban_has_board_access(board_id));

DROP POLICY IF EXISTS "Legal kanban admins manage labels" ON public.legal_kanban_labels;
CREATE POLICY "Legal kanban admins manage labels"
  ON public.legal_kanban_labels
  FOR ALL
  TO authenticated
  USING (public.legal_kanban_can_admin_board(board_id))
  WITH CHECK (public.legal_kanban_can_admin_board(board_id));

DROP POLICY IF EXISTS "Legal kanban members view custom fields" ON public.legal_kanban_custom_fields;
CREATE POLICY "Legal kanban members view custom fields"
  ON public.legal_kanban_custom_fields
  FOR SELECT
  TO authenticated
  USING (public.legal_kanban_has_board_access(board_id));

DROP POLICY IF EXISTS "Legal kanban admins manage custom fields" ON public.legal_kanban_custom_fields;
CREATE POLICY "Legal kanban admins manage custom fields"
  ON public.legal_kanban_custom_fields
  FOR ALL
  TO authenticated
  USING (public.legal_kanban_can_admin_board(board_id))
  WITH CHECK (public.legal_kanban_can_admin_board(board_id));

DROP POLICY IF EXISTS "Legal kanban members manage cards" ON public.legal_kanban_cards;
CREATE POLICY "Legal kanban members manage cards"
  ON public.legal_kanban_cards
  FOR ALL
  TO authenticated
  USING (public.legal_kanban_can_edit_board(board_id))
  WITH CHECK (public.legal_kanban_can_edit_board(board_id));

DROP POLICY IF EXISTS "Legal kanban members manage card members" ON public.legal_kanban_card_members;
CREATE POLICY "Legal kanban members manage card members"
  ON public.legal_kanban_card_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_can_edit_board(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_can_edit_board(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban members manage card labels" ON public.legal_kanban_card_labels;
CREATE POLICY "Legal kanban members manage card labels"
  ON public.legal_kanban_card_labels
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_can_edit_board(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_can_edit_board(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban members manage comments" ON public.legal_kanban_comments;
CREATE POLICY "Legal kanban members manage comments"
  ON public.legal_kanban_comments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban members manage activities" ON public.legal_kanban_activities;
CREATE POLICY "Legal kanban members manage activities"
  ON public.legal_kanban_activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban members manage attachments" ON public.legal_kanban_attachments;
CREATE POLICY "Legal kanban members manage attachments"
  ON public.legal_kanban_attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban members manage checklists" ON public.legal_kanban_checklists;
CREATE POLICY "Legal kanban members manage checklists"
  ON public.legal_kanban_checklists
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban members manage checklist items" ON public.legal_kanban_checklist_items;
CREATE POLICY "Legal kanban members manage checklist items"
  ON public.legal_kanban_checklist_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_checklists cl
      JOIN public.legal_kanban_cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_checklists cl
      JOIN public.legal_kanban_cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban members manage custom field values" ON public.legal_kanban_card_custom_field_values;
CREATE POLICY "Legal kanban members manage custom field values"
  ON public.legal_kanban_card_custom_field_values
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_cards c
      WHERE c.id = card_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban users view board members" ON public.legal_kanban_board_members;
CREATE POLICY "Legal kanban users view board members"
  ON public.legal_kanban_board_members
  FOR SELECT
  TO authenticated
  USING (public.legal_kanban_has_board_access(board_id));

DROP POLICY IF EXISTS "Legal kanban managers update board members" ON public.legal_kanban_board_members;
CREATE POLICY "Legal kanban managers update board members"
  ON public.legal_kanban_board_members
  FOR ALL
  TO authenticated
  USING (public.legal_kanban_can_admin_board(board_id))
  WITH CHECK (public.legal_kanban_can_admin_board(board_id));

DROP POLICY IF EXISTS "Legal kanban users manage favorites" ON public.legal_kanban_board_favorites;
CREATE POLICY "Legal kanban users manage favorites"
  ON public.legal_kanban_board_favorites
  FOR ALL
  TO authenticated
  USING (
    user_id = public.current_legal_kanban_user_id()
    AND public.legal_kanban_has_board_access(board_id)
  )
  WITH CHECK (
    user_id = public.current_legal_kanban_user_id()
    AND public.legal_kanban_has_board_access(board_id)
  );

DROP POLICY IF EXISTS "Legal kanban users view mentions" ON public.legal_kanban_comment_mentions;
CREATE POLICY "Legal kanban users view mentions"
  ON public.legal_kanban_comment_mentions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_comments cm
      JOIN public.legal_kanban_cards c ON c.id = cm.card_id
      WHERE cm.id = comment_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban users create mentions" ON public.legal_kanban_comment_mentions;
CREATE POLICY "Legal kanban users create mentions"
  ON public.legal_kanban_comment_mentions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_comments cm
      JOIN public.legal_kanban_cards c ON c.id = cm.card_id
      WHERE cm.id = comment_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP POLICY IF EXISTS "Legal kanban users delete mentions" ON public.legal_kanban_comment_mentions;
CREATE POLICY "Legal kanban users delete mentions"
  ON public.legal_kanban_comment_mentions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.legal_kanban_comments cm
      JOIN public.legal_kanban_cards c ON c.id = cm.card_id
      WHERE cm.id = comment_id
        AND public.legal_kanban_has_board_access(c.board_id)
    )
  );

DROP TRIGGER IF EXISTS update_legal_kanban_board_members_updated_at ON public.legal_kanban_board_members;
CREATE TRIGGER update_legal_kanban_board_members_updated_at
  BEFORE UPDATE ON public.legal_kanban_board_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.legal_kanban_board_members (board_id, user_id, access_level, created_by_user_id)
SELECT
  b.id,
  u.id,
  CASE WHEN u.role IN ('administrator', 'it', 'advogado_adm') THEN 'admin' ELSE 'editor' END,
  NULL
FROM public.legal_kanban_boards b
JOIN public.users u
  ON u.status = 'ativo'
 AND u.role IN ('administrator', 'it', 'advogado_adm', 'advogado')
WHERE b.slug = 'setor-juridico'
ON CONFLICT (board_id, user_id) DO NOTHING;

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
