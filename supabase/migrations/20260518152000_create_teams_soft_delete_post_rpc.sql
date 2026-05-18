-- Soft delete seguro para posts do Teams, evitando bloqueios de RLS no PATCH direto.
-- Regra: apenas autor da postagem ou admin do canal/time pode excluir.

CREATE OR REPLACE FUNCTION public.teams_soft_delete_post(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id UUID;
  v_author_user_id UUID;
  v_actor_user_id UUID;
BEGIN
  v_actor_user_id := public.teams_current_user_id();

  IF v_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.channel_id, p.author_user_id
    INTO v_channel_id, v_author_user_id
  FROM public.posts p
  WHERE p.id = p_post_id
    AND p.deleted_at IS NULL
  LIMIT 1;

  -- idempotente: se já foi excluído (ou não existe), não falha.
  IF v_channel_id IS NULL THEN
    RETURN;
  END IF;

  IF v_author_user_id = v_actor_user_id
     OR public.channels_can_admin(v_channel_id) THEN
    UPDATE public.posts
    SET deleted_at = NOW()
    WHERE id = p_post_id
      AND deleted_at IS NULL;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Permissão negada para excluir postagem'
    USING ERRCODE = '42501';
END;
$$;

GRANT EXECUTE ON FUNCTION public.teams_soft_delete_post(UUID) TO authenticated;
