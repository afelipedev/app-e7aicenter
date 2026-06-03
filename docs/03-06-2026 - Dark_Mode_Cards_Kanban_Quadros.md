# 03/06/2026 - Dark Mode Cards Kanban Quadros

## Contexto

O dark mode dos componentes de cards do kanban jurídico e da listagem de quadros estava inadequado: raias com gradiente fixo em branco, chips de status/prioridade legíveis apenas no tema claro e pouco contraste entre colunas, cards e fundo.

## Alterações

### `constants.ts`
- Chips de **status** e **prioridade** passaram a incluir variantes `dark:` (fundo, texto e borda) para manter legibilidade no tema escuro.

### `LegalKanbanPage.tsx`
- Container do board e raias: substituição do gradiente hardcoded por tokens semânticos (`from-card`, `to-muted`) com sombras ajustadas para dark mode.
- Cards individuais: fundo `bg-card` / `dark:bg-background`, hover e sombras revisados.
- Área vazia da coluna, badge de contagem, input de novo card e avatares de membros com ajustes de contraste.
- **DragOverlay** do card passou a renderizar wrapper com borda, fundo e sombra (antes exibia só o conteúdo sem superfície).
- Overlay de coluna durante arraste também ajustado.

### `LegalBoardsHomePage.tsx`
- Cards de quadros na listagem: hover, sombras, placeholder de capa e rodapé com ações adaptados ao dark mode.

### `LegalKanbanFiltersBar.tsx`
- Barra de filtros e botões de status/etiquetas com fundos e sombras compatíveis com o tema escuro.

## Arquivos alterados

- `src/features/legal-kanban/constants.ts`
- `src/features/legal-kanban/pages/LegalKanbanPage.tsx`
- `src/features/legal-kanban/pages/LegalBoardsHomePage.tsx`
- `src/features/legal-kanban/components/LegalKanbanFiltersBar.tsx`

## Como validar

1. Ativar dark mode na aplicação.
2. Acessar `/documents/cases/quadros` e verificar cards de quadros (capa, título, rodapé).
3. Abrir um quadro e conferir raias, cards, chips de status/prioridade, filtros e arraste de cards.
