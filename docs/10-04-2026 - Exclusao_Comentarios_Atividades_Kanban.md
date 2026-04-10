# 10/04/2026 — Exclusão de comentários e atividades no histórico do Kanban

## Objetivo

Permitir excluir itens do histórico unificado (comentários e atividades) no modal do card, com botão de ícone (lixeira) por linha.

## Comportamento

- Botão **ghost** com ícone `Trash2`, alinhado à direita da linha do item; `aria-label` distingue comentário e atividade.
- Estilo do botão: ícone sempre na cor **destructive** (vermelho do tema); no **hover**, fundo `destructive/15` (vermelho claro, mais claro que o ícone) e texto/ícone mantidos em destructive.
- Confirmação em **AlertDialog** (título conforme tipo, descrição de irreversibilidade, Cancelar e Excluir). O overlay/conteúdo do alert usam `z-[120]` para ficar acima do sheet do card e de popovers internos.
- Ao fechar o sheet do card ou trocar de card, o estado do diálogo de exclusão é limpo.
- Durante a mutação, os botões de excluir e o diálogo ficam **desabilitados** (`isPending`).
- Toast de sucesso ou erro conforme o resultado.
- Após excluir, **invalidação** das queries do board e do card (mesmo padrão de outras mutações do Kanban).

## Backend

- `legalKanbanService.deleteComment(commentId)` — `DELETE` em `legal_kanban_comments`.
- `legalKanbanService.deleteActivity(activityId)` — `DELETE` em `legal_kanban_activities`.
- As políticas RLS existentes (**Legal kanban members manage comments / activities**) já permitem exclusão para membros do Kanban jurídico; sem nova migração.

## Arquivos

- `src/features/legal-kanban/services/legalKanbanService.ts` — métodos de exclusão.
- `src/features/legal-kanban/hooks/useLegalKanbanBoard.ts` — `useDeleteLegalKanbanTimelineItem(cardId)`.
- `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` — `sourceId` nos itens do `timeline`, estado do AlertDialog, `confirmDeleteTimelineItem` e UI.
- `src/components/ui/alert-dialog.tsx` — `z-[120]` no overlay e no conteúdo para empilhamento correto.
