# 20/07/2026 — Ajustes no Kanban: arquivamento e aprovação

Três ajustes no módulo `legal-kanban`.

## 1. Desarquivar card liberado para o perfil Advogado

Antes, desarquivar exigia `administrator` ou `advogado_adm` (mesma regra de concluir/excluir).

- `services/legalKanbanService.ts`: novo helper `canUnarchiveCards(role)` — `administrator`, `advogado_adm`, `advogado`. Usado apenas em `unarchiveCard`.
- `pages/LegalKanbanPage.tsx`: nova flag `canUnarchiveCards`, passada ao diálogo.
- `components/LegalKanbanArchivedItemsDialog.tsx`: nova prop `canUnarchiveCards` gateia só o botão "Desarquivar" do card.

Permanecem restritos a `administrator`/`advogado_adm` (via `canManageArchive`): excluir card arquivado e desarquivar raia.

## 2. Status congelado enquanto o card está arquivado

O status de um card arquivado só muda pelo desarquivamento, que já o devolve para `ativo`.

- `legalKanbanService.updateCard`: rejeita qualquer `input.status` diferente de `arquivado` quando o card atual está arquivado — "Desarquive o card para alterar o status."
- `components/LegalKanbanCardDetailsSheet.tsx`: com `isCardArchived`,
  - o chip/dropdown de status fica desabilitado (com `title` explicativo);
  - o botão de concluir / enviar para aprovação fica desabilitado;
  - `handleStatusChange` e `handleToggleCompleted` abortam com toast;
  - banner no topo do card informando que é preciso desarquivar.

## 3. Notificação de "Aguardando Aprovação" para Advogado Adm

Migração `20260720120000_notify_card_pending_approval.sql` (aplicada via MCP Supabase).

- Função `notify_card_pending_approval()` (SECURITY DEFINER) + trigger `AFTER UPDATE OF status ON legal_kanban_cards`.
- Dispara só na transição para `aguardando_aprovacao` (ignora quando o status anterior já era esse).
- Insere em `notifications` (kind `card_pending_approval`) para todo usuário com `role = 'advogado_adm'` e `status = 'ativo'`, exceto o próprio autor da mudança.
- Payload: `card_id`, `card_title`, `board_id`, `board_title`, `board_slug`.

UI em `src/features/teams/components/NotificationsBell.tsx`: texto, ícone `ShieldAlert` e link para
`/documents/cases/quadros/:board_slug?card=:card_id`. O realtime já existente na tabela `notifications` entrega a notificação sem reload.

## Verificação

`npx tsc --noEmit` e `npm run build` sem erros.
