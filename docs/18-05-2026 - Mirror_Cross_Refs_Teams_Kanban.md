# 18/05/2026 - Mirror_Cross_Refs_Teams_Kanban

## Objetivo

Aplicar as migrations de cross-reference para espelhamento bidirecional entre comentários do Kanban e mensagens de postagem (Teams), e publicar a atualização da Edge Function `teams-kanban-bridge`.

## O que foi executado no Supabase (via MCP)

1. Migration `20260518060000_fix_comment_mentions_rls`
   - Reaplicada com sucesso.
   - Ajusta políticas de `legal_kanban_comment_mentions` para usar helper `SECURITY DEFINER` e garantir acesso por board.

2. Migration `20260518070000_add_mirror_cross_refs`
   - Aplicada com sucesso.
   - Adiciona:
     - `public.legal_kanban_comments.mirrored_post_message_id`
     - `public.post_messages.mirrored_card_comment_id`
   - Cria índices parciais para ambos os campos.

3. Deploy da Edge Function `teams-kanban-bridge`
   - Publicada versão `2` da função.
   - `verify_jwt` mantido como `true`.

## Alterações funcionais publicadas na Edge Function

- Action `mirror_comment` agora:
  - grava cross-ref de origem na contraparte criada;
  - completa o pareamento bidirecional atualizando o registro oposto.

- Nova action `mirror_delete_comment`:
  - exclui contraparte por cross-ref (sem heurística por conteúdo);
  - fluxo `card -> post_message` faz soft-delete em `post_messages.deleted_at` com `assertCanReadChannel`;
  - fluxo `post_message -> card_comment` remove comentário do Kanban com `assertCanEditBoard`.

## Verificações realizadas

- `list_migrations` confirma entrada das migrations recém aplicadas.
- Consulta em `information_schema.columns` confirma existência de:
  - `mirrored_post_message_id` em `legal_kanban_comments`;
  - `mirrored_card_comment_id` em `post_messages`.
- `get_edge_function` confirma:
  - versão `2`;
  - presença de `mirror_delete_comment` e cross-ref bilateral em `mirror_comment`.
