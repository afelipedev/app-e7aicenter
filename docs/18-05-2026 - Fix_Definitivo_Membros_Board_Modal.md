# Fix definitivo - membros no modal de configuração do board

## Problema

O modal de configuração do board sempre exibia "Nenhum usuário selecionado", mesmo após salvar permissões.

Também era necessário garantir que o usuário logado, ao configurar/criar o board, permanecesse automaticamente selecionado.

## Causa raiz

A query de membros do board no Supabase usava embedding ambíguo:

- `legal_kanban_board_members` possui duas FKs para `users`:
  - `created_by_user_id`
  - `user_id`

Sem especificar a FK, o PostgREST retornava `PGRST201` (300 Multiple Choices), impedindo carregar os membros corretamente.

## Correções aplicadas

- Service (`legalKanbanService`):
  - Ajustado select com FK explícita para o relacionamento correto de membro:
    - `users!legal_kanban_board_members_user_id_fkey(...)`

- Modal (`LegalKanbanBoardSettingsSheet`):
  - Usuário logado incluído automaticamente na seleção inicial ao abrir.
  - Usuário logado não pode ser removido manualmente no modal.
  - No salvar, o payload garante novamente que o usuário logado esteja incluído em `memberIds`.

## Resultado esperado

- O modal passa a exibir os usuários já concedidos corretamente.
- O usuário logado sempre permanece selecionado ao criar/configurar o board.

## Arquivos alterados

- `src/features/legal-kanban/services/legalKanbanService.ts`
- `src/features/legal-kanban/components/LegalKanbanBoardSettingsSheet.tsx`
