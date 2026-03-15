# Ajustes de Responsividade em Processos

## Objetivo

Melhorar a responsividade do modulo de `Processos` para mobile, tablet e desktop, reduzindo quebras de layout em cards, listagens, filtros, monitoramentos e detalhe do processo.

## Ajustes aplicados

- `ProcessMetricCard`
  - CTA `Ver todos` adaptado para ocupar largura total no mobile e voltar ao tamanho natural em telas maiores.
  - Estrutura interna reorganizada para empilhar melhor em telas menores.

- `FavoriteProcessCard`
  - Rodape do card ajustado para empilhar `status` e botao no mobile.
  - Botao `Abrir processo` com largura total em telas pequenas.

- `ProcessFiltersSheet`
  - Adicionado `SheetDescription` para acessibilidade.
  - Melhorado padding interno do drawer.
  - Tags com quebra de linha segura.
  - Acoes finais (`Limpar filtros` e `Filtrar`) empilhadas no mobile.

- `ProcessResultsTable`
  - Criada visualizacao mobile em cards, evitando tabela comprimida em telas pequenas.
  - Mantida tabela tradicional a partir de `sm`.
  - CNJ e badges com quebra segura.
  - Paginacao ajustada para wrap e tamanhos menores no mobile.

- `ProcessInfoHighlights`
  - Reestruturado de bloco flex horizontal para grid responsivo.
  - Melhor comportamento para textos longos e blocos com mais informacao.

- `ProcessQueriesPage`
  - Formulario principal ajustado para botoes full width no mobile.

- `ProcessHistoryPage`
  - Busca historica reorganizada para empilhar antes de `xl`.
  - Botoes principais full width em telas menores.

- `ProcessMonitoringPage`
  - Cards de monitoramento com links e CNJ quebrando corretamente.
  - Botoes de acao ajustados para largura total no mobile.
  - Monitoramentos por documento reorganizados para empilhamento seguro.

- `ProcessDetailsPage`
  - Cabecalho com titulo longo e CNJ responsivos.
  - Botoes de acao full width no mobile.
  - Blocos `Resumo` e `Partes envolvidas` com melhor comportamento em telas menores.
  - Tabs em faixa horizontal com scroll, evitando quebra irregular.
  - Lista de anexos adaptada para empilhamento em telas pequenas.

## Validacao realizada

- Revisao visual via navegador em viewport reduzido
- `npm run build`

## Observacoes

- O build passou com sucesso apos os ajustes.
- A validacao visual mostrou melhora principalmente na listagem historica, acoes dos cards e cabecalho/detalhe do processo.
