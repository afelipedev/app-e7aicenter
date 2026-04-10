## Implementação

Foram aplicados ajustes finos de layout e design na tela de consultas históricas para alinhar a experiência visual com as demais telas refinadas do módulo de processos.

## O que foi ajustado

- Reestruturação do topo da página com hero visual, melhor hierarquia tipográfica e espaçamento mais consistente.
- Refinamento do card principal de busca com labels em uppercase, inputs mais suaves, bordas mais leves e melhor organização dos controles.
- Ajustes visuais nos cards de apoio da consulta para reforçar leitura numérica e contexto operacional.
- Inclusão de destaque visual para a consulta ativa quando existe documento aplicado ao contexto da página.
- Ajustes finos de cores, sombras, cantos e ritmo vertical para maior coerência com dashboard, monitoramentos e detalhes do processo.

## Arquivo alterado

- `src/features/processes/pages/ProcessHistoryPage.tsx`

## Validação

- `ReadLints` sem erros no arquivo alterado.

## Observação

A tabela de resultados reutiliza o componente compartilhado da feature e não foi alterada nesta implementação, mantendo o escopo restrito à tela de consultas históricas.
