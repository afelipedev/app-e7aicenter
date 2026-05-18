-- Adiciona colunas para rastrear o pareamento bidirecional entre
-- comentários do legal_kanban e mensagens de postagens (Teams).
-- Permite que delete em uma ponta encontre e remova a contraparte
-- sem heurística por conteúdo.

ALTER TABLE public.legal_kanban_comments
  ADD COLUMN IF NOT EXISTS mirrored_post_message_id UUID;

ALTER TABLE public.post_messages
  ADD COLUMN IF NOT EXISTS mirrored_card_comment_id UUID;

CREATE INDEX IF NOT EXISTS idx_legal_kanban_comments_mirrored_message
  ON public.legal_kanban_comments (mirrored_post_message_id)
  WHERE mirrored_post_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_post_messages_mirrored_comment
  ON public.post_messages (mirrored_card_comment_id)
  WHERE mirrored_card_comment_id IS NOT NULL;
