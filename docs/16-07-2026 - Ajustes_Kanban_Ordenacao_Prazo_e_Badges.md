# 16/07/2026 - Ajustes no Kanban: Ordenação por Prazo e Badges de Etiquetas no Card

## Contexto

Dois ajustes solicitados nos quadros Kanban (`/documents/cases/quadros/:boardSlug`):

1. **Ordenação automática por prazo** — antes os cards eram exibidos na ordem do campo `position` (ordem manual de arrastar-e-soltar). Agora, dentro de cada coluna/raia, os cards ficam **sempre ordenados pela data de entrega mais próxima primeiro**.
2. **Badges de etiquetas visíveis no card** — as etiquetas passaram a ter mais destaque no card da raia (topo do card), não apenas no modal.

## O que foi implementado

### 1. Ordenação automática por prazo (dueDate)

- Nova função utilitária `sortCardsByDueDate` em [src/features/legal-kanban/utils.ts](../src/features/legal-kanban/utils.ts):
  - Ordena de forma **ascendente** por `dueDate` (data mais próxima/menor primeiro).
  - Cards **sem prazo** (`dueDate` nulo) vão para o **final** da lista (`Number.POSITIVE_INFINITY`).
  - Desempate estável por `position` para evitar "pulos" entre renders quando as datas são iguais.
- Aplicada em dois pontos:
  - `filterBoardColumns` (utils.ts) — ponto de transformação de render das raias; garante a ordem por prazo independentemente de `position` ou estado otimista.
  - `getBoardData` em [src/features/legal-kanban/services/legalKanbanService.ts](../src/features/legal-kanban/services/legalKanbanService.ts) — substitui `sortByPosition` por `sortCardsByDueDate` no `boardData.columns` bruto, mantendo coerência com o cálculo de índice do drag-and-drop.

**Comportamento do drag-and-drop:**
- Entre colunas: continua funcionando; ao mover, o card se reposiciona automaticamente no "slot" correto por prazo na coluna destino.
- Dentro da mesma coluna: o reordenamento manual deixa de persistir (o card retorna à posição ditada pelo prazo) — comportamento esperado da ordenação automática.

### 2. Badges de etiquetas no card — correção de causa raiz (truncamento do PostgREST)

**Sintoma:** as etiquetas apareciam no modal do card, mas não nos cards do board — mesmo com etiquetas atribuídas no banco.

**Causa raiz:** em `hydrateCards` ([src/features/legal-kanban/services/legalKanbanService.ts](../src/features/legal-kanban/services/legalKanbanService.ts)), as etiquetas de todos os cards do board eram buscadas com uma única consulta `.in("card_id", [todos os ids])`. Em quadros grandes o PostgREST **trunca o resultado em ~1000 linhas**. No board `juridico-vaa` (1110 cards, **1244** vínculos card→etiqueta), as etiquetas dos cards além do corte eram descartadas → badge não aparecia. O modal (`getCardDetails`) consulta 1 card por vez (`.eq`), retornando 1-2 linhas, por isso nunca sofria o truncamento. É o mesmo problema já documentado no código para contagem de comentários/anexos (resolvido via RPC agregada).

**Correção:** nova função `fetchCardLabelRows(cardIds)` que busca as etiquetas em **lotes de 300 cards** (em paralelo) e concatena os resultados, garantindo que nenhum lote atinja o limite de linhas. O `labelsMap` passou a ser montado a partir desses lotes.

**Melhoria visual complementar:** em `CardPreview` ([src/features/legal-kanban/pages/LegalKanbanPage.tsx](../src/features/legal-kanban/pages/LegalKanbanPage.tsx)), o bloco de etiquetas foi movido para o **topo do card** (acima do título, padrão Trello/Planner) para maior destaque. A renderização das badges já existia; o que faltava era a **hidratação correta** dos dados (corrigida acima).

## Arquivos alterados

- `src/features/legal-kanban/utils.ts` — nova função `sortCardsByDueDate` + uso em `filterBoardColumns`.
- `src/features/legal-kanban/services/legalKanbanService.ts` — import e uso de `sortCardsByDueDate` em `getBoardData`.
- `src/features/legal-kanban/pages/LegalKanbanPage.tsx` — reposicionamento do bloco de etiquetas em `CardPreview`.

## Verificação

- `npx eslint` nos arquivos editados: sem novos erros.
- `npx tsc --noEmit`: sem erros de tipo.
- Testes manuais recomendados:
  - Criar cards com prazos distintos (ex.: hoje+9, hoje+10, sem prazo) na mesma coluna → ordem: 9 dias → 10 dias → sem prazo.
  - Mover card entre colunas e conferir reposicionamento por prazo.
  - Atribuir etiquetas pelo modal e conferir badges no topo do card; recarregar e conferir persistência.

## Notas

- Nenhuma migração de banco necessária (campos `due_date` e etiquetas já existiam).
- Mudanças concentradas em `utils.ts` (lógica) e `LegalKanbanPage.tsx` (render), preservando a separação de responsabilidades.
