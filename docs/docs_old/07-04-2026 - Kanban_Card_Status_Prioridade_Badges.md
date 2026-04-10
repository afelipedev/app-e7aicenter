# 07/04/2026 — Kanban jurídico: status e prioridade no detalhe do card

## Objetivo

No modal de detalhes do card do Kanban jurídico, permitir alterar **status** e **prioridade** de forma explícita, exibindo ambos como **badges** (estilo chip) com as cores já definidas em `LEGAL_KANBAN_STATUS_META` e `LEGAL_KANBAN_PRIORITY_META`.

## Implementação

- **Arquivo:** `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`
- **UI:** Dois gatilhos em formato de badge (bordas arredondadas, classes de chip dos metadados) com ícone `ChevronDown`, abrindo `DropdownMenu` com as opções disponíveis.
- **Persistência:** Ao escolher uma opção, chamada a `updateCard.mutateAsync`:
  - **Status:** envia `status` e `completedAt` (ISO quando `concluido`, caso contrário `null`), alinhado ao fluxo de salvar e ao toggle de conclusão.
  - **Prioridade:** envia apenas `priority`.
- **Feedback:** Toasts de sucesso ou erro; `disabled` durante `updateCard.isPending`.
- **Linha de contexto:** Mantido o texto “Card #número” ao lado dos badges.

## Validação

- `npm run build` executado com sucesso após a alteração.
