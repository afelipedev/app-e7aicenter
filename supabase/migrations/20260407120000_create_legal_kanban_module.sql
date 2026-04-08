-- Módulo Kanban Jurídico compartilhado
-- Estrutura separada do domínio Judit para gestão operacional interna do escritório.

CREATE OR REPLACE FUNCTION public.is_legal_kanban_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = (SELECT auth.uid())
          AND status = 'ativo'
          AND role IN ('administrator', 'advogado_adm', 'advogado')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_legal_kanban_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_user_id = (SELECT auth.uid())
          AND status = 'ativo'
          AND role IN ('administrator', 'advogado_adm')
    );
$$;

CREATE TABLE IF NOT EXISTS public.legal_kanban_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL DEFAULT 'briefcase',
    is_locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_columns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#1d4ed8',
    position INTEGER NOT NULL DEFAULT 0,
    kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('inbox', 'event', 'team', 'done', 'archived', 'custom')),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT legal_kanban_labels_unique_name UNIQUE (board_id, name)
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'checkbox')),
    position INTEGER NOT NULL DEFAULT 0,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_required BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT legal_kanban_custom_fields_unique_name UNIQUE (board_id, name)
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.legal_kanban_boards(id) ON DELETE CASCADE,
    column_id UUID NOT NULL REFERENCES public.legal_kanban_columns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    card_number BIGINT GENERATED ALWAYS AS IDENTITY,
    description_json JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
    description_text TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'bloqueado', 'concluido', 'arquivado')),
    priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta', 'urgente')),
    cover_color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    start_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    recurrence_rule TEXT,
    completed_at TIMESTAMPTZ,
    process_snapshot_id UUID REFERENCES public.process_snapshots(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_card_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT legal_kanban_card_members_unique UNIQUE (card_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_card_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.legal_kanban_labels(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT legal_kanban_card_labels_unique UNIQUE (card_id, label_id)
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    attachment_type TEXT NOT NULL CHECK (attachment_type IN ('file', 'link')),
    name TEXT NOT NULL,
    url TEXT,
    file_path TEXT,
    mime_type TEXT,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.legal_kanban_checklists(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    completed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.legal_kanban_card_custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.legal_kanban_cards(id) ON DELETE CASCADE,
    custom_field_id UUID NOT NULL REFERENCES public.legal_kanban_custom_fields(id) ON DELETE CASCADE,
    value_text TEXT,
    value_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT legal_kanban_card_custom_field_values_unique UNIQUE (card_id, custom_field_id)
);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_columns_board_position
    ON public.legal_kanban_columns (board_id, position);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_cards_board_column_position
    ON public.legal_kanban_cards (board_id, column_id, position);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_cards_due_date
    ON public.legal_kanban_cards (due_date);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_cards_status_priority
    ON public.legal_kanban_cards (status, priority);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_card_members_card
    ON public.legal_kanban_card_members (card_id, user_id);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_card_members_user
    ON public.legal_kanban_card_members (user_id, card_id);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_card_labels_card
    ON public.legal_kanban_card_labels (card_id, label_id);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_comments_card
    ON public.legal_kanban_comments (card_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_activities_card
    ON public.legal_kanban_activities (card_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_attachments_card
    ON public.legal_kanban_attachments (card_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_checklists_card
    ON public.legal_kanban_checklists (card_id, position);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_checklist_items_checklist
    ON public.legal_kanban_checklist_items (checklist_id, position);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_custom_fields_board
    ON public.legal_kanban_custom_fields (board_id, position);

CREATE INDEX IF NOT EXISTS idx_legal_kanban_card_custom_values_card
    ON public.legal_kanban_card_custom_field_values (card_id, custom_field_id);

ALTER TABLE public.legal_kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_kanban_card_custom_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Legal kanban members view boards" ON public.legal_kanban_boards;
CREATE POLICY "Legal kanban members view boards"
    ON public.legal_kanban_boards
    FOR SELECT
    TO authenticated
    USING (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban admins manage boards" ON public.legal_kanban_boards;
CREATE POLICY "Legal kanban admins manage boards"
    ON public.legal_kanban_boards
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_admin())
    WITH CHECK (public.is_legal_kanban_admin());

DROP POLICY IF EXISTS "Legal kanban members view columns" ON public.legal_kanban_columns;
CREATE POLICY "Legal kanban members view columns"
    ON public.legal_kanban_columns
    FOR SELECT
    TO authenticated
    USING (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban admins manage columns" ON public.legal_kanban_columns;
CREATE POLICY "Legal kanban admins manage columns"
    ON public.legal_kanban_columns
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_admin())
    WITH CHECK (public.is_legal_kanban_admin());

DROP POLICY IF EXISTS "Legal kanban members view labels" ON public.legal_kanban_labels;
CREATE POLICY "Legal kanban members view labels"
    ON public.legal_kanban_labels
    FOR SELECT
    TO authenticated
    USING (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban admins manage labels" ON public.legal_kanban_labels;
CREATE POLICY "Legal kanban admins manage labels"
    ON public.legal_kanban_labels
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_admin())
    WITH CHECK (public.is_legal_kanban_admin());

DROP POLICY IF EXISTS "Legal kanban members view custom fields" ON public.legal_kanban_custom_fields;
CREATE POLICY "Legal kanban members view custom fields"
    ON public.legal_kanban_custom_fields
    FOR SELECT
    TO authenticated
    USING (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban admins manage custom fields" ON public.legal_kanban_custom_fields;
CREATE POLICY "Legal kanban admins manage custom fields"
    ON public.legal_kanban_custom_fields
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_admin())
    WITH CHECK (public.is_legal_kanban_admin());

DROP POLICY IF EXISTS "Legal kanban members manage cards" ON public.legal_kanban_cards;
CREATE POLICY "Legal kanban members manage cards"
    ON public.legal_kanban_cards
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage card members" ON public.legal_kanban_card_members;
CREATE POLICY "Legal kanban members manage card members"
    ON public.legal_kanban_card_members
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage card labels" ON public.legal_kanban_card_labels;
CREATE POLICY "Legal kanban members manage card labels"
    ON public.legal_kanban_card_labels
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage comments" ON public.legal_kanban_comments;
CREATE POLICY "Legal kanban members manage comments"
    ON public.legal_kanban_comments
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage activities" ON public.legal_kanban_activities;
CREATE POLICY "Legal kanban members manage activities"
    ON public.legal_kanban_activities
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage attachments" ON public.legal_kanban_attachments;
CREATE POLICY "Legal kanban members manage attachments"
    ON public.legal_kanban_attachments
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage checklists" ON public.legal_kanban_checklists;
CREATE POLICY "Legal kanban members manage checklists"
    ON public.legal_kanban_checklists
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage checklist items" ON public.legal_kanban_checklist_items;
CREATE POLICY "Legal kanban members manage checklist items"
    ON public.legal_kanban_checklist_items
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

DROP POLICY IF EXISTS "Legal kanban members manage custom field values" ON public.legal_kanban_card_custom_field_values;
CREATE POLICY "Legal kanban members manage custom field values"
    ON public.legal_kanban_card_custom_field_values
    FOR ALL
    TO authenticated
    USING (public.is_legal_kanban_member())
    WITH CHECK (public.is_legal_kanban_member());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'legal-kanban-attachments',
    'legal-kanban-attachments',
    false,
    10485760,
    ARRAY[
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/webp',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Legal kanban members view storage objects" ON storage.objects;
CREATE POLICY "Legal kanban members view storage objects"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'legal-kanban-attachments'
        AND public.is_legal_kanban_member()
    );

DROP POLICY IF EXISTS "Legal kanban members insert storage objects" ON storage.objects;
CREATE POLICY "Legal kanban members insert storage objects"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'legal-kanban-attachments'
        AND public.is_legal_kanban_member()
    );

DROP POLICY IF EXISTS "Legal kanban members update storage objects" ON storage.objects;
CREATE POLICY "Legal kanban members update storage objects"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'legal-kanban-attachments'
        AND public.is_legal_kanban_member()
    )
    WITH CHECK (
        bucket_id = 'legal-kanban-attachments'
        AND public.is_legal_kanban_member()
    );

DROP POLICY IF EXISTS "Legal kanban members delete storage objects" ON storage.objects;
CREATE POLICY "Legal kanban members delete storage objects"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'legal-kanban-attachments'
        AND public.is_legal_kanban_member()
    );

DROP TRIGGER IF EXISTS update_legal_kanban_boards_updated_at ON public.legal_kanban_boards;
CREATE TRIGGER update_legal_kanban_boards_updated_at
    BEFORE UPDATE ON public.legal_kanban_boards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_columns_updated_at ON public.legal_kanban_columns;
CREATE TRIGGER update_legal_kanban_columns_updated_at
    BEFORE UPDATE ON public.legal_kanban_columns
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_labels_updated_at ON public.legal_kanban_labels;
CREATE TRIGGER update_legal_kanban_labels_updated_at
    BEFORE UPDATE ON public.legal_kanban_labels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_custom_fields_updated_at ON public.legal_kanban_custom_fields;
CREATE TRIGGER update_legal_kanban_custom_fields_updated_at
    BEFORE UPDATE ON public.legal_kanban_custom_fields
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_cards_updated_at ON public.legal_kanban_cards;
CREATE TRIGGER update_legal_kanban_cards_updated_at
    BEFORE UPDATE ON public.legal_kanban_cards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_comments_updated_at ON public.legal_kanban_comments;
CREATE TRIGGER update_legal_kanban_comments_updated_at
    BEFORE UPDATE ON public.legal_kanban_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_checklists_updated_at ON public.legal_kanban_checklists;
CREATE TRIGGER update_legal_kanban_checklists_updated_at
    BEFORE UPDATE ON public.legal_kanban_checklists
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_checklist_items_updated_at ON public.legal_kanban_checklist_items;
CREATE TRIGGER update_legal_kanban_checklist_items_updated_at
    BEFORE UPDATE ON public.legal_kanban_checklist_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_legal_kanban_card_custom_field_values_updated_at ON public.legal_kanban_card_custom_field_values;
CREATE TRIGGER update_legal_kanban_card_custom_field_values_updated_at
    BEFORE UPDATE ON public.legal_kanban_card_custom_field_values
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

WITH inserted_board AS (
    INSERT INTO public.legal_kanban_boards (slug, title, description, icon)
    SELECT
        'setor-juridico',
        'Kanban Jurídico',
        'Board compartilhado para acompanhamento operacional do setor jurídico.',
        'briefcase'
    WHERE NOT EXISTS (
        SELECT 1
        FROM public.legal_kanban_boards
        WHERE slug = 'setor-juridico'
    )
    RETURNING id
),
board_ref AS (
    SELECT id
    FROM inserted_board
    UNION ALL
    SELECT id
    FROM public.legal_kanban_boards
    WHERE slug = 'setor-juridico'
    LIMIT 1
)
INSERT INTO public.legal_kanban_columns (board_id, title, color, position, kind, is_default)
SELECT
    board_ref.id,
    column_seed.title,
    column_seed.color,
    column_seed.position,
    column_seed.kind,
    true
FROM board_ref
CROSS JOIN (
    VALUES
        ('Caixa de Entrada', '#2563eb', 100, 'inbox'),
        ('Audiencias', '#7c3aed', 200, 'event'),
        ('Holding', '#ea580c', 300, 'team'),
        ('Concluídos', '#16a34a', 400, 'done'),
        ('Arquivados', '#64748b', 500, 'archived')
) AS column_seed(title, color, position, kind)
WHERE NOT EXISTS (
    SELECT 1
    FROM public.legal_kanban_columns existing_columns
    WHERE existing_columns.board_id = board_ref.id
      AND existing_columns.title = column_seed.title
);
