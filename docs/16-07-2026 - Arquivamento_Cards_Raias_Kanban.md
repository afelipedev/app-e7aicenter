# 16/07/2026 - Arquivamento de Cards e Raias no Kanban Jurídico

## Objetivo

Implementar arquivamento/desarquivamento coeso de **cards** e de **raias inteiras (com todos os seus cards)** nos quadros Kanban, com uma central de **Itens Arquivados**. Cards/raias arquivados saem do quadro e passam a ser exibidos apenas na central, de onde podem ser restaurados (retornando à posição original) ou excluídos.

## Decisões de modelo

- **Card arquivado** = `status='arquivado'` mantendo `column_id` intacto (o card **não é mais movido** para a raia "Arquivados"). Desarquivar → `status='ativo'`, reaparecendo na coluna original.
- **Raia arquivada** = `legal_kanban_columns.is_archived = true` (coluna booleana já existente). Os cards da raia ficam intocados — somem do quadro porque a coluna está arquivada — e reaparecem com seus status originais ao desarquivar a raia.
- **Permissão**: apenas `administrator` / `advogado_adm` (`canForceConcludedStatus`) podem arquivar/desarquivar/excluir.
- **Sem migration**: `is_archived` já existia em `legal_kanban_columns` e `arquivado` já constava no CHECK de `status`.
- A raia custom "Arquivados" (`kind='archived'`) permanece intacta e disponível para movimentação manual.

## Alterações

### Backend/service — `services/legalKanbanService.ts`
- `unarchiveCard(cardId)` — seta `status='ativo'`, `completed_at=null` (com guarda de permissão e log de atividade).
- `archiveColumn(columnId)` / `unarchiveColumn(columnId)` — alternam `is_archived` (com guarda de permissão). `archiveColumn` não bloqueia quando há cards (diferente de `deleteColumn`).

### Hooks — `hooks/useLegalKanbanBoard.ts`
- `useUnarchiveLegalKanbanCard`, `useArchiveLegalKanbanColumn`, `useUnarchiveLegalKanbanColumn` (invalidam a query do board).

### Filtragem do quadro — `utils.ts` (`filterBoardColumns`)
- Exclui colunas com `isArchived` e cards com `status==='arquivado'` da renderização. Propaga automaticamente para `filteredColumns`, `columnIds` e contadores.
- `LegalKanbanFiltersBar.tsx`: removida a opção "Arquivado" do filtro de status.

### UI
- **`components/LegalKanbanCardPreview.tsx`** (novo): `CardPreview` extraído de `LegalKanbanPage.tsx` para reuso no board e no modal.
- **`components/LegalKanbanArchivedItemsDialog.tsx`** (novo): `Dialog` com busca, abas **Cards**/**Raias** com contadores. Cards mostram a raia de origem + botões **Desarquivar** e **Excluir** (com confirmação). Raias mostram nome + nº de cards + **Desarquivar**. Deriva as listas do `boardData` (sem query extra).
- **`pages/LegalKanbanPage.tsx`**:
  - Botão **"Itens Arquivados"** na toolbar (ao lado de "Configurar Board").
  - Menu de 3 pontinhos na raia (ao lado do contador) → **Arquivar raia** com `AlertDialog` de confirmação.
- **`components/LegalKanbanCardDetailsSheet.tsx`**: `confirmArchiveCard` não move mais o card (apenas altera o status); textos e `archiveActionDisabled` ajustados.

## Regras cobertas

- **Card**: arquivar via menu 3-pontos do card **ou** via troca do badge de status para "Arquivado"; desarquivar/excluir via central de Itens Arquivados.
- **Raia**: arquivar via menu 3-pontos da raia (arquiva raia + todos os cards); desarquivar via central (restaura raia + cards).

## Verificação

- `npm run build`: OK.
- Lint: apenas erros `no-explicit-any` pré-existentes no `legalKanbanService.ts` (padrão `as any` do arquivo); nenhum novo introduzido.
- Testes manuais recomendados: arquivar/desarquivar card (volta à coluna), arquivar/desarquivar raia (cards preservam status), exclusão pela central, permissões por papel, e a raia "Arquivados" continua funcional.
