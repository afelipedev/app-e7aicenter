# 07/04/2026 — Responsividade e scroll horizontal do Kanban jurídico

## Problema

A página do Kanban gerava scroll horizontal no `main` (layout inteiro), quebrando a responsividade. O esperado é que apenas a faixa das raias/colunas tivesse scroll horizontal.

## Causa

Em layouts flex, filhos usam `min-width: auto` por padrão, então a linha de colunas (largura fixa + `flex`) empurrava a largura do conteúdo além da área útil, e o overflow aparecia no ancestral com `overflow-auto` (`AppLayout`).

## O que foi feito

1. **`AppLayout.tsx`**
   - `SidebarInset` com `min-w-0` para permitir que a coluna principal encolha em relação à sidebar.
   - `main` com `min-w-0` para a mesma regra na cadeia flex.

2. **`LegalKanbanPage.tsx`**
   - Container da página com `w-full min-w-0 max-w-full`.
   - Cabeçalho e botões com `min-w-0` onde faz sentido.
   - Substituição do `ScrollArea` (Radix) por um `div` com `overflow-x-auto overflow-y-hidden`, `overscroll-x-contain`, `w-full min-w-0 max-w-full` e scroll suave em WebKit.
   - Linha de raias com `flex w-max` para a largura seguir o conteúdo; o scroll fica só no contêiner do board.

3. **`LegalKanbanFiltersBar.tsx`**
   - Raiz com `min-w-0` para o bloco de filtros não forçar largura mínima indevida no flex.

## Resultado

O scroll horizontal ocorre apenas dentro do card do board; o restante da página permanece dentro da largura visível (vertical continua no `main` quando necessário).
