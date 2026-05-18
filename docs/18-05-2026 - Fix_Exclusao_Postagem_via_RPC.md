# 18-05-2026 - Fix Exclusao Postagem via RPC

## Contexto

Mesmo após ajuste de policy em `posts_update`, a exclusão de postagem ainda retornava `403` no fluxo baseado em `PATCH /rest/v1/posts`.

## Estratégia adotada

Para tornar o fluxo estável e independente de variações de `WITH CHECK` no `UPDATE` direto, a exclusão lógica passou a ser feita por RPC com validação explícita de permissão.

## Implementação

### 1) Nova função RPC no banco

- Migration: `supabase/migrations/20260518152000_create_teams_soft_delete_post_rpc.sql`
- Função: `public.teams_soft_delete_post(p_post_id uuid)`
- Tipo: `SECURITY DEFINER`
- Regra de autorização:
  - autor da postagem (`author_user_id = teams_current_user_id()`), ou
  - admin de canal/time (`channels_can_admin(channel_id)`).
- Comportamento:
  - atualiza `deleted_at = now()` (soft delete);
  - idempotente para post já excluído/inexistente (retorna sem erro);
  - retorna erro `42501` quando sem permissão.

### 2) Ajuste no frontend

- Arquivo: `src/features/teams/services/postService.ts`
- `softDelete(postId)` deixou de usar `supabase.from("posts").update(...)`
- Agora chama `supabase.rpc("teams_soft_delete_post", { p_post_id: postId })`

## Validação

- Migration aplicada via MCP Supabase (`apply_migration`) com sucesso.
- Verificação de função criada e `SECURITY DEFINER` ativa em produção.

## Resultado esperado

A exclusão de postagem não depende mais do `PATCH` direto em `posts`, eliminando o erro de RLS nesse fluxo e mantendo controle de permissão (autor/admin).
