# Ajuste de page size da Judit

## Data
- 18-03-2026

## Objetivo
- Corrigir a Edge Function `judit-consumption-report` para respeitar o limite máximo de paginação aceito pela API da Judit.

## Problema identificado
- A API da Judit retornava `400 BAD_REQUEST` com a mensagem:
- `The 'page_size' field must be less than or equal to 100.`
- A Edge Function estava enviando `page_size=1000` ao consultar `GET /requests`.

## Ajuste implementado
- Atualização da constante `DEFAULT_SYNC_PAGE_SIZE` de `1000` para `100`.
- Nova publicação da Edge Function `judit-consumption-report` no Supabase via MCP.

## Resultado esperado
- A sincronização do relatório deixa de falhar por paginação inválida.
- A função continua buscando múltiplas páginas normalmente, agora dentro da regra da API da Judit.

## Observação
- O teste informado via Postman com `page_size=100` confirma o comportamento esperado do endpoint da Judit, e o backend foi alinhado a essa limitação.
