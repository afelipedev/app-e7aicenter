## Implementação

Foram aplicadas melhorias visuais no dashboard de processos com referência direta na linguagem da tela de detalhes do processo.

## O que foi ajustado

- Reestruturação do topo do dashboard com hero institucional, melhor hierarquia tipográfica e CTAs de navegação.
- Inclusão de bloco de acessos prioritários para consultas processuais, consultas históricas e monitoramentos.
- Redesign dos cards de métricas com cantos maiores, gradiente sutil, labels em uppercase e melhor espaçamento interno.
- Redesign dos cards de favoritos com capa mais refinada, status mais visível e ações alinhadas ao padrão da tela de detalhes.
- Ajustes finos de spacing, sombras, bordas, cores de apoio e tracking tipográfico para maior consistência visual.

## Arquivos alterados

- `src/features/processes/pages/ProcessesDashboardPage.tsx`
- `src/features/processes/components/ProcessMetricCard.tsx`
- `src/features/processes/components/FavoriteProcessCard.tsx`

## Validação

- `ReadLints` sem erros nos arquivos alterados.
- `npm run build` executado com sucesso.

## Observação

O build continua emitindo aviso de chunk grande já existente no projeto, sem relação direta com esta implementação.
