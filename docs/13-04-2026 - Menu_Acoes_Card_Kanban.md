# Menu de ações no modal do card (Kanban jurídico)

**Data:** 13/04/2026

## O que foi implementado

- No cabeçalho do modal do card (`LegalKanbanCardDetailsSheet`), entre **Salvar** e **Fechar**, foi adicionado um **botão de menu** (ícone de três pontos verticais) que abre um `DropdownMenu` com:
  - **Ingressar** (`UserPlus`): adiciona o usuário logado como membro do card (via `setCardMembers`, mantendo os membros já existentes). Desabilitado se o usuário já for membro.
  - **Arquivar** (`Archive`): abre `AlertDialog` de confirmação; ao confirmar, move o card para a coluna com `kind === "archived"` (raia padrão “Arquivados”) com `moveCard` e define `status` como `arquivado` com `updateCard`. Em seguida fecha o modal.
  - **Excluir** (`Trash2`, estilo destrutivo): abre `AlertDialog` de confirmação; ao confirmar, exclui o registro do card no Supabase e invalida o cache do board.

- **Serviço** `legalKanbanService.deleteCard`: `DELETE` em `legal_kanban_cards` (filhos removidos por CASCADE conforme migração existente).

- **Hook** `useDeleteLegalKanbanCard`: mutation que chama `deleteCard`, remove a query do card e invalida o board.

## Observações

- O modelo atual não possui campo separado de “responsável”; membros são representados pela tabela `legal_kanban_card_members`. “Ingressar” adiciona o usuário à lista de membros (comportamento alinhado ao painel de membros já existente).
- Se não existir coluna com `kind: "archived"` no board, a opção Arquivar fica desabilitada.

## Validação

- `ReadLints` nos arquivos alterados sem novos problemas introduzidos pelo diff.
- `npm run build` executado com sucesso após a implementação.
