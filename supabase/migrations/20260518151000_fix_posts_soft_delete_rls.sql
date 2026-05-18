-- Corrige UPDATE (soft delete) em posts para admins de canal/equipe em canais privados.
-- Antes: WITH CHECK exigia apenas channels_can_read(channel_id), bloqueando admin sem
-- membership explicita no canal privado, mesmo com permissao de administracao.

DROP POLICY IF EXISTS posts_update ON public.posts;
CREATE POLICY posts_update ON public.posts
FOR UPDATE TO authenticated
USING (
  author_user_id = public.teams_current_user_id()
  OR public.channels_can_admin(channel_id)
)
WITH CHECK (
  (
    author_user_id = public.teams_current_user_id()
    AND public.channels_can_read(channel_id)
  )
  OR public.channels_can_admin(channel_id)
);
