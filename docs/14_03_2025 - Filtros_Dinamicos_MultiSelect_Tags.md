# 14/03/2025 - Filtros dinâmicos com multi-select por tags

## O que foi implementado

### 1. Filtros alimentados pelos dados dos processos consultados

Os filtros passam a ser populados com as informações existentes na base de processos consultados. As opções disponíveis em cada filtro são extraídas dinamicamente dos processos carregados no sistema.

### 2. Seleção múltipla por tags

- **Tribunais**: permite selecionar mais de um tribunal por meio de tags. Ao clicar em "Adicionar", abre-se um popover com busca e lista de tribunais existentes nos dados.
- **Nome da parte**: mesma lógica – múltiplos nomes podem ser adicionados como tags.
- **Classe processual**: multi-select por tags.
- **Assuntos**: multi-select por tags.
- **Documento da parte**: multi-select por tags.
- **Lado da parte** (Ativo, Passivo, Interessado): seleção múltipla por botões toggle.

### 3. Alterações técnicas

- **`types.ts`**: `ProcessFilters` atualizado para usar arrays (`tribunals[]`, `partyNames[]`, `partySides[]`, `partyDocuments[]`, `classesProcessuais[]`, `assuntos[]`). Criada interface `ProcessFilterOptions`.
- **`processesService.ts`**: função `getFilterOptions()` extrai valores únicos dos processos visíveis. `matchesFilters` ajustado para lógica OR em arrays (processo deve atender a pelo menos um valor selecionado em cada filtro).
- **`useProcesses.ts`**: novo hook `useFilterOptions()` para buscar opções de filtro.
- **`ProcessFiltersSheet.tsx`**: componente `FilterTagMultiSelect` reutilizável com Popover + Command para busca e seleção. Filtros passam a receber `filterOptions` como prop.
- **`ProcessQueriesPage` e `ProcessHistoryPage`**: integram `useFilterOptions` e repassam `filterOptions` ao `ProcessFiltersSheet`.

### 4. Responsividade dos componentes de seleção (atualização)

- **FilterTagMultiSelect**: badges com truncamento em telas pequenas (`max-w-[120px]` mobile, `max-w-[180px]` desktop), `title` para tooltip; popover com largura adaptativa (`min(100vw-2rem, 320px)`); lista com `max-h-[min(300px,50vh)]` em mobile; `CommandItem` com `break-words` para textos longos.
- **Tags e Lado da parte**: grid em mobile (tags em coluna única, lado da parte em 3 colunas), flex-wrap em telas maiores; botões full-width em mobile.
- **Sheet**: `max-w-[100vw]` para evitar overflow horizontal; datas em grid responsivo (`sm:grid-cols-2`).
