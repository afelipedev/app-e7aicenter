# Atividades recentes — sync bidirecional Teams ↔ Kanban

**Data:** 18/05/2026

## Objetivo

Registrar e exibir em tempo real as atividades relevantes da postagem e do card vinculado, sem incluir mensagens do chat da postagem.

## O que foi implementado

### Banco (migration `20260518100000_teams_linked_activities_sync`)

- **Sync bidirecional** entre `post_activities` e `legal_kanban_activities` quando existe `post_kanban_links`.
- **Anti-loop:** registros espelhados usam `metadata.teams_sync = true` e não são exibidos na UI.
- **Exclusões:** `comment_mirrored_from_post`, `comment_mirrored_from_card`, `comment_added` (legado / espelhamento de chat).
- **Trigger em anexos da postagem:** `post_attachments` INSERT/DELETE → `post_activities` (`attachment_added` / `attachment_removed`).
- **Trigger em comentários do card:** comentários sem `mirrored_post_message_id` → `card_comment_added` no Kanban (e espelho na postagem via sync).
- **Realtime:** publicação em `post_activities`, `legal_kanban_activities`, `post_attachments`.

### Edge Function `teams-kanban-bridge`

- Removido registro de atividades ao espelhar comentários (`comment_mirrored_*`).
- Mensagens legíveis em `card_linked` / `card_unlinked`.

### Frontend

- **`linkedActivityService`:** mescla atividades da postagem e do card, deduplica por `source_event_id`, limita a **5** mais recentes (mais nova no topo).
- **`PostRightSidebar`:** query dedicada + realtime em `post_activities`, `legal_kanban_activities`, `post_attachments`.
- Atividades visíveis mesmo sem card (ex.: anexos só na postagem).

### Kanban (`legalKanbanService.updateCard`)

- Mensagens específicas para `status_changed` e `priority_changed`.

## Eventos cobertos na timeline

| Origem | Tipos |
|--------|--------|
| Postagem | Anexos adicionados/removidos, vínculo/desvínculo de card |
| Card | Comentários reais, anexos, checklist, status, prioridade, membros, movimentação, etc. |

**Não entram:** mensagens do chat da postagem (`post_messages`).

## Deploy

- Migration aplicada via Supabase MCP.
- Republicar `teams-kanban-bridge` no projeto Supabase após pull desta alteração.

## Arquivos principais

- `supabase/migrations/20260518100000_teams_linked_activities_sync.sql`
- `src/features/teams/services/linkedActivityService.ts`
- `src/features/teams/components/post/PostRightSidebar.tsx`
- `supabase/functions/teams-kanban-bridge/index.ts`
