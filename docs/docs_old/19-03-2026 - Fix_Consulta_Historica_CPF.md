# Fix consulta historica por CPF

## Problema

Ao consultar historico por `CPF`, a Edge Function `judit-processes` retornava erro `500` com a mensagem:

`duplicate key value violates unique constraint "process_query_requests_judit_request_id_key"`

A causa raiz era a constraint `UNIQUE NULLS NOT DISTINCT` em `process_query_requests.judit_request_id`, que tratava multiplos `NULL` como duplicados durante a criacao da requisicao local.

## O que foi implementado

- Criada migration corretiva `20260319103000_fix_process_query_requests_nullable_judit_request_id.sql`.
- Removida a constraint antiga baseada em `UNIQUE NULLS NOT DISTINCT`.
- Criado indice unico parcial para `judit_request_id` apenas quando o valor nao for `NULL`.
- Ajustada a Edge Function `judit-processes` para criar o registro local somente apos receber o `request_id` da Judit.
- Publicada nova versao da Edge Function no Supabase.

## Resultado esperado

- Consultas historicas por `CPF`, `CNPJ` e `OAB` nao devem mais falhar na criacao de `process_query_requests`.
- O banco continua impedindo duplicidade real de `judit_request_id` quando esse valor existir.
