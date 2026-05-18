-- Permite soft-delete de mensagens no Teams sem violar RLS no UPDATE.
-- Mantém a regra de que apenas autor da mensagem ou admin do canal pode atualizar.

DROP POLICY IF EXISTS post_messages_update ON public.post_messages;
CREATE POLICY post_messages_update ON public.post_messages
FOR UPDATE TO authenticated
USING (
  author_user_id = public.teams_current_user_id()
  OR EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_messages.post_id
      AND public.channels_can_admin(p.channel_id)
  )
)
WITH CHECK (
  (
    author_user_id = public.teams_current_user_id()
    OR EXISTS (
      SELECT 1
      FROM public.posts p
      WHERE p.id = post_messages.post_id
        AND public.channels_can_admin(p.channel_id)
    )
  )
  AND EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_messages.post_id
      AND public.channels_can_read(p.channel_id)
  )
);
