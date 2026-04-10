# Melhorias consulta historica por OAB

## Problemas identificados

- Lentidao elevada na busca historica por `OAB`.
- Erros `500` em sequencia apos a requisicao concluir.
- Falha observada ao carregar `process_snapshots` com volume alto de IDs.

## Causa raiz

### 1. Espera dupla desnecessaria

- A Edge Function `judit-processes` aguardava a Judit por ate `45s` antes de responder.
- Depois disso, o frontend ainda iniciava novo polling via `request-status`.
- Em buscas pesadas, como `OAB`, isso aumentava a latencia percebida.

### 2. Consultas grandes demais no PostgREST

- A listagem historica carregava muitos `snapshotIds` e fazia consultas `.in(...)` muito extensas.
- Em cenarios com retorno volumoso, a URL para o PostgREST ficava grande demais e podia falhar com erro de protocolo `http2`.

### 3. Refetch excessivo no frontend

- A busca historica invalidava toda a arvore `processes`.
- Isso disparava varias consultas paralelas, ampliando a pressao sobre o backend logo apos a conclusao da busca.

## Correcoes implementadas

- Reducao da espera inicial da Edge Function para `8s`.
- Manutencao do polling posterior pelo frontend para concluir de forma assíncrona.
- Fatiamento em lotes das consultas de:
  - `process_request_results`
  - `process_snapshots`
  - `process_user_state`
  - `process_monitorings`
- Reducao das invalidacoes do React Query para apenas as chaves relevantes apos a busca.

## Beneficios esperados

- Menor tempo de resposta inicial para consultas historicas pesadas.
- Menor risco de erro `500` em consultas por `OAB` com muitos processos.
- Menos chamadas redundantes em paralelo no frontend.

## Melhorias futuras recomendadas

- Migrar `list-history` para paginacao server-side real com filtros no banco, evitando montar grandes colecoes em memoria.
- Criar endpoint dedicado para carregar resultados de uma requisicao historica especifica, em vez de recalcular toda a listagem do usuario.
- Adicionar limite operacional e feedback visual quando a consulta historica retornar volume excepcionalmente alto.
