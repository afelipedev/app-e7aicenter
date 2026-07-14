-- Novo status "Aguardando Aprovação" nos cards e nova raia dedicada (kind = 'approval')

ALTER TABLE public.legal_kanban_cards
    DROP CONSTRAINT IF EXISTS legal_kanban_cards_status_check;

ALTER TABLE public.legal_kanban_cards
    ADD CONSTRAINT legal_kanban_cards_status_check
    CHECK (status IN ('ativo', 'bloqueado', 'aguardando_aprovacao', 'concluido', 'arquivado'));

ALTER TABLE public.legal_kanban_columns
    DROP CONSTRAINT IF EXISTS legal_kanban_columns_kind_check;

ALTER TABLE public.legal_kanban_columns
    ADD CONSTRAINT legal_kanban_columns_kind_check
    CHECK (kind IN ('inbox', 'event', 'team', 'approval', 'done', 'archived', 'custom'));

-- Cria a raia "Aguardando Aprovação" em todos os quadros que ainda não a possuem
INSERT INTO public.legal_kanban_columns (board_id, title, color, position, kind, is_default)
SELECT b.id, 'Aguardando Aprovação', '#f59e0b', 350, 'approval', true
FROM public.legal_kanban_boards b
WHERE NOT EXISTS (
    SELECT 1
    FROM public.legal_kanban_columns c
    WHERE c.board_id = b.id AND c.kind = 'approval'
);
