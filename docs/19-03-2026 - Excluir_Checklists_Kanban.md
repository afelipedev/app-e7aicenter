## Implementação

Foi adicionada a ação de exclusão de checklists no card de detalhes do kanban jurídico.

## O que foi ajustado

- Inclusão de operação de exclusão de checklist no service do kanban.
- Criação de mutation dedicada para excluir checklist com invalidação correta do board e do card.
- Inclusão de `icon button` com ícone de lixeira ao lado do botão `Adicionar` dentro de cada checklist criada.
- Manutenção do comportamento de exclusão em cascata dos itens da checklist, já suportado pela modelagem do banco.

## Arquivos alterados

- `src/features/legal-kanban/services/legalKanbanService.ts`
- `src/features/legal-kanban/hooks/useLegalKanbanBoard.ts`
- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`

## Validação

- `ReadLints` sem erros nos arquivos alterados.

## Observação

A exclusão remove a checklist inteira e, por cascade no banco, também remove seus itens associados.
