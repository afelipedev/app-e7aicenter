# Revisao do consumo Judit

## Problema identificado

O painel de consumo da Judit nao refletia imediatamente as consultas realizadas em `Consultas processuais` e `Consultas historicas`.

## Diagnostico

- O consumo era abastecido principalmente pela Edge Function `judit-consumption-report`.
- Essa function sincroniza o historico via `GET /requests` da Judit e persiste em `public.judit_requests`.
- As consultas do modulo de processos gravavam `process_query_requests`, mas nao escreviam nada em `judit_requests` no momento da execucao.
- Como resultado, o painel dependia de uma sincronizacao posterior para refletir o uso real.

## Evidencias observadas

- Havia requisicoes recentes em `process_query_requests`.
- O conjunto de dados em `judit_requests` permanecia atrasado.
- O ultimo sync executado nao refletia as consultas mais recentes do modulo de processos.

## Correcao implementada

- A Edge Function `judit-processes` agora faz upsert em `public.judit_requests` assim que recebe o `request_id` da Judit.
- O mesmo registro e atualizado novamente quando a requisicao muda de status.
- O registro inclui:
  - `request_id`
  - `origin = api`
  - `search_type`
  - `response_type`
  - `with_attachments`
  - `product_name`
  - `cost_brl`
  - `cost_confidence`
  - `pricing_metadata`

## Beneficios

- O painel de consumo passa a refletir as consultas processuais e historicas sem depender exclusivamente do sync posterior.
- O sync de `judit-consumption-report` continua util para reconciliacao e enriquecimento.
- O upsert por `request_id` evita duplicidades e permite correcao posterior com dados mais ricos.

## Melhorias recomendadas

- Fazer o botao `Atualizar` da pagina de consumo enviar `forceSync=true`.
- Reconciliar automaticamente linhas locais com o `GET /requests` em job agendado.
- Registrar tambem eventos de consumo ligados a monitoramentos quando houver confirmacao de cobranca na API da Judit.
- Extrair a logica de classificacao/preco para um modulo compartilhado entre `judit-processes` e `judit-consumption-report`.
