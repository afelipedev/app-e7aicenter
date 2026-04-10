# 09/04/2026 — Kanban: um único registro por comentário na timeline

## Problema

Ao adicionar um comentário no modal do card, o serviço gravava o comentário em `legal_kanban_comments` e também uma atividade `comment_added` com a mensagem genérica "Adicionou um comentário.". O modal monta a lista unindo comentários e atividades, gerando duas linhas para o mesmo evento (uma com o texto e outra genérica).

## Solução

1. **`legalKanbanService.addComment`**: removida a chamada a `logActivity` para comentários. O histórico do texto fica apenas na entidade de comentário.

2. **`LegalKanbanCardDetailsSheet`**: atividades com `activityType === "comment_added"` (e a mensagem legada "Adicionou um comentário.") são filtradas do merge da timeline, para não duplicar cards já existentes no banco.

## Arquivos

- `src/features/legal-kanban/services/legalKanbanService.ts`
- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx`
