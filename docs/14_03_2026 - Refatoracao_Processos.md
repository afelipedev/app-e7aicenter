# Refatoracao de Processos

## Objetivo

Refatorar a area de `Processos` para um novo layout orientado por feature, com dashboard inicial, submenus dedicados, listagens com filtros, pagina de detalhe e base pronta para futura integracao com a API Judit.

## O que foi implementado

- Nova feature `src/features/processes` organizada por responsabilidade:
  - `pages`
  - `components`
  - `hooks`
  - `services`
  - `types`
  - `mocks`
  - `adapters`
- Dashboard inicial de `Processos` em `/documents/cases` com:
  - card `Processos consultados`
  - card `Consultas historicas`
  - card `Monitoramentos`
  - secao `Processos favoritos`
- Novas rotas:
  - `/documents/cases`
  - `/documents/cases/queries`
  - `/documents/cases/history`
  - `/documents/cases/monitoring`
  - `/documents/cases/api-consumption`
  - `/documents/cases/:caseId`
- Menu lateral atualizado com submenu proprio para `Processos`.
- Tela `Consultas Processuais` com:
  - busca por CNJ
  - drawer lateral de filtros
  - tabela com favoritos, menu de acoes e paginacao
  - acionamento de monitoramento pela listagem
- Tela `Consultas Historicas` com:
  - busca por CPF, CNPJ e OAB
  - filtros combinaveis
  - tabela consolidada de resultados
- Tela `Monitoramentos` com:
  - monitoramento processual por processo
  - monitoramento de novas acoes por documento
  - feed de alertas
- Tela `Consumo API` com cards e historico de consumo.
- Pagina de detalhe do processo com:
  - breadcrumb
  - botao voltar
  - destaque de informacoes principais
  - abas de movimentacao, informacoes, anexos, processos relacionados e E7 Agente Processual
- Camada de contratos e adapter inicial para futura troca do provider mock pela integracao Judit.

## Arquivos principais

- `src/App.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/pages/documents/Cases.tsx`
- `src/features/processes/types.ts`
- `src/features/processes/constants.ts`
- `src/features/processes/hooks/useProcesses.ts`
- `src/features/processes/services/processesService.ts`
- `src/features/processes/adapters/processProvider.ts`
- `src/features/processes/mocks/processesMockData.ts`
- `src/features/processes/pages/*`
- `src/features/processes/components/*`

## Decisoes tecnicas

- Uso de `react-query` para leitura e mutacoes da feature.
- Uso de mocks e `localStorage` para simular favoritos, exclusoes e monitoramentos sem bloquear a entrega do frontend.
- Separacao de contratos para facilitar a substituicao posterior pela API Judit.
- Manutencao da rota original `src/pages/documents/Cases.tsx` como wrapper fino para a nova feature.

## Validacao realizada

- `npm install`
- `npm run build`

## Observacoes

- A tentativa de validacao no navegador local desta worktree foi limitada por erro preexistente de ambiente: `Missing Supabase URL - check your .env file`.
- Os documentos da Judit citados no planejamento nao estavam acessiveis nesta worktree no momento da implementacao, entao a preparacao foi feita via contratos e adapters, sem acoplamento ao payload real da API.
