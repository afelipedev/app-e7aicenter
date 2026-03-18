# Integração Judit Consumo

## Data
- 17-03-2026

## Objetivo
- Integrar a API da Judit à rota `documents/cases/api-consumption`.
- Persistir histórico, sincronizações e regras de cobrança no Supabase.
- Exibir no frontend o consumo financeiro, saldo da franquia, excedente, limite até bloqueio, gráficos e histórico detalhado.

## O que foi implementado

### Supabase
- Migration `20260317183000_create_judit_consumption_reporting.sql`.
- Tabela `judit_billing_settings` com seed do contrato:
  - franquia: `R$ 1.000,00`
  - teto operacional: `R$ 5.000,00`
  - regras de preço versionadas em `pricing_rules`.
- Tabela `judit_sync_runs` para rastrear sincronizações da Judit.
- Tabela `judit_requests` para persistir o histórico normalizado das requisições.
- View `judit_consumption_monthly_view` para agregação mensal.
- Índices e políticas de leitura autenticada via RLS.

### Edge Function
- Nova função `judit-consumption-report`.
- Autenticação via JWT do usuário.
- Consumo do endpoint `GET /requests` da Judit com paginação.
- Classificação do produto a partir de:
  - `origin`
  - `search.search_type`
  - `search.response_type`
  - `search.on_demand`
  - `with_attachments`
  - `plan_config_type`
- Cálculo do custo por requisição.
- Cálculo de franquia, excedente e limite até bloqueio.
- Upsert em `judit_requests` e rastreio em `judit_sync_runs`.
- Retorno consolidado já preparado para o frontend.

### Frontend
- Evolução dos tipos de consumo em `src/features/processes/types.ts`.
- Novo serviço `src/features/processes/services/juditConsumptionService.ts`.
- `processesService` passou a consultar a Edge Function real.
- `useProcessApiConsumption` agora aceita parâmetros de consulta.
- Página `ProcessApiConsumptionPage` remodelada com:
  - filtros por período, origem, status, tipo, produto, anexos e on-demand
  - cards financeiros
  - barra de progresso da janela contratual
  - gráfico de evolução diária
  - gráfico de custo por produto
  - tabela detalhada com confiança do custo e classificação

## Variáveis de ambiente criadas/ajustadas
- `.env`
  - `JUDIT_API_KEY`
  - `JUDIT_BASE_URL`
- `supabase/functions/.env`
  - `JUDIT_API_KEY`
  - `JUDIT_BASE_URL`
- `.env.example`
  - placeholders da Judit adicionados

## Deploy e validações realizadas
- Migration aplicada via MCP do Supabase.
- Edge Function publicada via MCP do Supabase.
- `npm run build`: concluído com sucesso.
- `npx eslint` nos arquivos alterados: concluído com sucesso.

## Ponto pendente operacional
- Não foi possível publicar os secrets remotos da Edge Function com `supabase secrets set` porque o CLI local não estava autenticado (`SUPABASE_ACCESS_TOKEN` ausente).
- A função já foi publicada, mas para sincronizar dados reais no ambiente remoto ela precisa que os secrets abaixo existam no projeto Supabase:
  - `JUDIT_API_KEY`
  - `JUDIT_BASE_URL=https://requests.prod.judit.io`

## Ajuste aplicado após deploy
- Foi adicionada a migration `20260318002000_add_judit_provider_secrets.sql`.
- Ela cria a tabela `judit_provider_secrets` com RLS bloqueando acesso direto.
- A Edge Function `judit-consumption-report` foi atualizada para:
  - usar `JUDIT_API_KEY` e `JUDIT_BASE_URL` do ambiente quando existirem;
  - usar fallback seguro via `judit_provider_secrets` quando os secrets remotos não estiverem configurados.
- A nova versão da função foi publicada no Supabase como `version 2`.
- Isso corrige especificamente o erro:
  - `JUDIT_API_KEY não configurada na Edge Function.`

## Estado atual no Supabase
- `judit-consumption-report`: publicada e ativa.
- `judit_billing_settings`: criada.
- `judit_sync_runs`: criada.
- `judit_requests`: criada.
- `judit_provider_secrets`: criada com 1 registro ativo.

## Arquivos principais alterados
- `supabase/migrations/20260317183000_create_judit_consumption_reporting.sql`
- `supabase/functions/judit-consumption-report/index.ts`
- `supabase/functions/judit-consumption-report/deno.json`
- `src/features/processes/types.ts`
- `src/features/processes/adapters/processProvider.ts`
- `src/features/processes/hooks/useProcesses.ts`
- `src/features/processes/services/processesService.ts`
- `src/features/processes/services/juditConsumptionService.ts`
- `src/features/processes/pages/ProcessApiConsumptionPage.tsx`
- `.env.example`
- `.env`
- `supabase/functions/.env`
