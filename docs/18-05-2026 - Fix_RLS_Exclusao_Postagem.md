# 18-05-2026 - Fix RLS Exclusao Postagem

## Contexto

Ao tentar excluir uma postagem (soft delete via `PATCH` em `posts`), a API retornava:

- `403 Forbidden`
- `new row violates row-level security policy for table "posts"`

## Causa raiz

A policy `posts_update` permitia o `USING` para:

- autor da postagem; ou
- admin do canal/equipe (`channels_can_admin`)

Mas o `WITH CHECK` exigia somente `channels_can_read(channel_id)`.

Em canais privados, um admin pode ter permissao de administracao sem membership explicita no canal, o que fazia o `WITH CHECK` falhar no `PATCH` de soft delete.

## Implementacao

- Criada migration: `supabase/migrations/20260518151000_fix_posts_soft_delete_rls.sql`
- Recriada policy `posts_update` com:
  - `USING`: autor ou admin (mantido)
  - `WITH CHECK`: `(autor E leitura)` **ou** `admin`

## Validacao

- Migration aplicada via MCP Supabase (`apply_migration`) com sucesso.
- Conferencia da policy ativa via `execute_sql` confirmou o novo `with_check`:
  - `(((author_user_id = teams_current_user_id()) AND channels_can_read(channel_id)) OR channels_can_admin(channel_id))`

## Resultado esperado

Usuários autores continuam podendo atualizar suas postagens quando possuem leitura do canal.
Admins de canal/equipe voltam a conseguir executar o soft delete de postagens em canais privados sem erro de RLS.
