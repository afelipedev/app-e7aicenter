# 18/05/2026 — Edge Function `teams-kanban-bridge`

## Objetivo

Sincronizar postagens do módulo Equipes com cards do Kanban jurídico via `post_kanban_links`, com auditoria e eventos em `sync_event_ledger`, usando JWT do usuário + service role para operações seguras.

## Implementação

Arquivo: `supabase/functions/teams-kanban-bridge/index.ts`.

### Autenticação

- Valida `Authorization` com cliente anon + `auth.getUser()`.
- Cliente service role para mutações (bypass RLS com checagens explícitas no código).

### Ações (`POST` JSON: `{ action, payload }`)

| `action` | Comportamento |
|----------|----------------|
| `create_card_from_post` | Cria `legal_kanban_cards` (sem `card_number` — coluna `GENERATED ALWAYS AS IDENTITY`), `post_kanban_links`, `post_activities`, `legal_kanban_activities` (com `message` obrigatório), `audit_logs` (best-effort). |
| `unlink` | Remove vínculo; exige leitura do canal da postagem e edição do quadro (resolve `board_id` pelo link ou pelo card). |
| `mirror_comment` | `post_to_card`: insere em `legal_kanban_comments`; `card_to_post`: insere em `post_messages`. Limite de texto `MAX_MIRROR_TEXT` (20 000). |

### Permissões

- Canal: membro da equipe + canal público ou membro explícito em `channel_members` (alinhado às políticas Teams). Administradores globais (`administrator`, `it`, `advogado_adm`) ignoram essas checagens.
- Quadro: `legal_kanban_board_members` com `access_level` em `editor` ou `admin`, ou papel global acima.

### Correções de schema (vs. versão anterior)

- Removido insert manual de `card_number` (Postgres rejeita em coluna `IDENTITY ALWAYS`).
- Inclusão de `message` em todos os inserts em `legal_kanban_activities` (`NOT NULL`).

## Deploy (MCP Supabase)

Função publicada no projeto linkado ao MCP com `verify_jwt: true`, versão ativa confirmada via `get_edge_function`.

## Contrato com o frontend

`src/features/teams/services/kanbanBridgeService.ts` envia `{ action, payload }`; resposta `{ data, error }`.
