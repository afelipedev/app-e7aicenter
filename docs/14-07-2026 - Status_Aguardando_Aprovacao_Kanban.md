# 14/07/2026 — Status "Aguardando Aprovação" nos cards do Kanban

## Objetivo

Criar o passo intermediário entre "trabalho concluído pelo advogado" e "card concluído": o perfil **Advogado** não conclui cards (regra que já existia), mas agora consegue enviá-los para aprovação de um **Administrador** ou **Advogado Administrativo**, com raia e sinalizador próprios.

Vale para os dois domínios de quadro (jurídico e gestão operacional), pois compartilham o mesmo código.

## O que foi implementado

### Banco — `supabase/migrations/20260714120000_kanban_aguardando_aprovacao.sql`

- `legal_kanban_cards.status`: CHECK passa a aceitar `aguardando_aprovacao`.
- `legal_kanban_columns.kind`: CHECK passa a aceitar `approval`.
- Raia **Aguardando Aprovação** (`kind = 'approval'`, cor `#f59e0b`, `position = 350` — entre "Holding/Aguardando" e "Concluídos") criada em todos os quadros existentes que ainda não a possuíam.

RLS não mudou: as políticas de card usam `legal_kanban_can_edit_board(board_id)` e não olham status. A trigger `kanban_sync_linked_card_core` já propaga `status` para cards vinculados/duplicados, então o novo status é espelhado automaticamente nos peers.

### Front-end

| Arquivo | Mudança |
|---|---|
| `src/features/legal-kanban/types.ts` | `KanbanStatus` ganha `"aguardando_aprovacao"` |
| `src/features/legal-kanban/constants.ts` | Entrada em `LEGAL_KANBAN_STATUS_META` (chip laranja, antes de "Concluído"); nova constante `LEGAL_KANBAN_APPROVAL_COLUMN`, incluída nas colunas padrão dos quadros jurídico e operacional |
| `src/features/legal-kanban/services/legalKanbanService.ts` | Helpers `findColumnIdByKind`, `ensureApprovalColumnId` e `moveCardToColumn` (extraídos da lógica que já movia o card para a raia `done`); `updateCard` move o card para a raia `approval` quando o status vira `aguardando_aprovacao`; `moveCard` bloqueia arraste para a raia `done` para quem não é Administrador/Advogado Adm |
| `src/features/legal-kanban/components/LegalKanbanCardDetailsSheet.tsx` | Botão redondo vira "Enviar para aprovação" (ícone de relógio) para o Advogado, alternando `ativo` ⇄ `aguardando_aprovacao`; barra de destaque âmbar quando o card está aguardando aprovação; dropdown de status exibe a nova opção mantendo "Concluído"/"Arquivado" bloqueados para o Advogado |
| `src/features/legal-kanban/pages/LegalKanbanPage.tsx` | Badge âmbar "APROVAÇÃO" (`ShieldAlert`) no card; `handleDragEnd` avisa via toast e não move quando o Advogado tenta arrastar o card para a raia "Concluídos" |

O filtro de status (`LegalKanbanFiltersBar`) e o dropdown do modal iteram `LEGAL_KANBAN_STATUS_META`, então a nova opção apareceu nos dois sem alteração de código.

## Regras resultantes

- **Advogado**: pode mover o card para `Aguardando Aprovação` (pelo dropdown ou pelo botão redondo). Não pode concluir/arquivar/excluir cards, nem arrastá-los para "Concluídos" — a tentativa exibe toast e o card fica na raia de origem.
- **Administrador / Advogado Adm**: concluem, arquivam e excluem normalmente; o card concluído continua indo para a raia "Concluídos".
- Card com status `aguardando_aprovacao` vai automaticamente para a raia "Aguardando Aprovação" (criada sob demanda caso o quadro não a tenha) e exibe o sinalizador no card e no modal.

## Verificação executada

- `npm run build` OK; `npx tsc` e `eslint` sem erros novos no módulo (baseline mantido).
- Via MCP do Supabase: CHECKs atualizados e os 5 quadros existentes com a raia `approval`; `UPDATE` de teste do novo status validado dentro de transação com `ROLLBACK`.
