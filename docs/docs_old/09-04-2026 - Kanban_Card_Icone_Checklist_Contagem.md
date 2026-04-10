# 09/04/2026 — Card Kanban: ícone e contagem de checklist

## Alterações

- No preview do card (`LegalKanbanPage`), o indicador de checklist passou a usar o ícone **ListChecks** (lucide-react), alinhado a uma lista com itens marcáveis, em vez de **CheckCheck**.
- Em vez da porcentagem, o card exibe **concluídos/total** com base em `card.checklistStats` (já agregado no serviço a partir dos itens das checklists).
- O bloco só é exibido quando `total > 0`, evitando linha vazia quando não há itens de checklist.

## Arquivos

- `src/features/legal-kanban/pages/LegalKanbanPage.tsx`
- `src/features/legal-kanban/utils.ts` — removido `getChecklistProgress` (não utilizado após a mudança).
