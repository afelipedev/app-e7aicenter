# 22/06/2026 — Migração do módulo de Consultas Processuais: Judit → DataJud (CNJ)

## Contexto

O módulo de Consultas Processuais (`src/features/processes/`) era 100% acoplado à API **Judit** (3 Edge Functions, polling assíncrono, monitoramento/tracking e relatório de consumo/billing). Esta entrega **remove integralmente a Judit** e a substitui pela **API Pública do DataJud/CNJ** — um índice Elasticsearch, síncrono e gratuito, contendo **apenas metadados** de capa e movimentações.

### Limitações da DataJud que guiaram o redesenho
- **Síncrona** (POST `_search`) → eliminado o mecanismo de polling.
- Cada tribunal tem **endpoint/alias próprio** (`api_publica_tjsp`, …); para CNJ o alias é **derivado** dos segmentos `J.TR` da numeração única.
- Autenticação por header `Authorization: APIKey <chave pública>`.
- Paginação por `size` + `sort @timestamp` + `search_after`.
- **Não há** partes, advogados, OAB, anexos, valor da causa, monitoramento ou billing.

### Decisões (alinhadas com o solicitante)
1. Buscas por OAB/CPF/CNPJ/parte **removidas** (sem suporte na fonte).
2. Backend via **nova Edge Function `datajud-search`**.
3. Monitoramento e Relatório de Consumo **removidos** por completo.
4. **Persistência simplificada mantida** (favoritos, histórico, dashboard).

## O que foi implementado

### Banco de dados
- Migration `supabase/migrations/20260622120000_migrate_processes_to_datajud.sql`:
  - Recria a policy de SELECT de `process_snapshots` sem a referência a `process_monitorings`.
  - **DROP**: `process_monitorings`, `judit_requests`, `judit_sync_runs`, `judit_billing_settings`, view `judit_consumption_monthly_view`, `judit_provider_secrets`.
  - `process_query_requests`: `request_kind` passa a `('cnj','advanced','detail_refresh')`; removidas as colunas `judit_request_id` e `requested_with_attachments`.
  - **Mantidas**: `process_snapshots`, `process_query_requests`, `process_user_state`, `process_agent_summaries`.

### Edge Functions (`supabase/functions/`)
- **Nova** `datajud-search/`:
  - `aliases.ts` — `resolveTribunalAlias(cnj)` (parse `NNNNNNN-DD.AAAA.J.TR.OOOO` → alias do tribunal) e `buildTribunalSearchUrl`.
  - `mappers.ts` — `buildSnapshotPayload` (hit `_source` → `process_snapshots`), `snapshotToSummary`/`snapshotToDetail`, formatadores de CNJ/data/grau.
  - `index.ts` — ações `dashboard`, `list-queries`, `filter-options`, `search-cnj`, `advanced-search`, `process-details`, `toggle-favorite`, `delete-process`. Auth `APIKey`, retry 429/5xx, timeout 30s.
- **Renomeada** `judit-process-agent/` → `datajud-process-agent/`: contexto/prompt adaptados aos metadados DataJud (sem partes/anexos/valor); removida a leitura de `process_monitorings`.
- **Removidas** `judit-processes/` e `judit-consumption-report/`.

### Frontend (`src/features/processes/`)
- `types.ts` — modelo unificado (sem partes/anexos/valor/monitoramento/consumo); novos `AdvancedSearchParams`, `ProcessFilters`/`ProcessFilterOptions` por metadados.
- `adapters/processProvider.ts` — interface enxuta + `advancedSearch`.
- `services/processesService.ts` — chama `datajud-search`/`datajud-process-agent`; **sem polling**. (Removido `juditConsumptionService.ts`.)
- `hooks/useProcesses.ts` — removidos hooks de monitoramento/consumo/busca histórica; adicionado `useAdvancedSearch`.
- `constants.ts` — `datajudTribunals`, `grauOptions` (busca avançada).
- UI: `ProcessQueriesPage` (CNJ + busca avançada por tribunal), `ProcessDetailsPage` (abas Movimentações/Informações/Agente), `ProcessFiltersSheet` (filtros DataJud), `ProcessResultsTable` (sem monitoramento), `ProcessStatusBadge` (status enxuto). Removidos órfãos `ProcessInfoHighlights` e `mocks/`.

### Configuração
- `.env.example` — `DATAJUD_API_KEY` (+ `OPENAI_API_KEY`); removidas variáveis `JUDIT_*`.
- Secret a configurar no Supabase: **`DATAJUD_API_KEY`** (chave pública vigente em `docs/api-datajud-cnj/API_DataJud_Acessos.md`).

## Fluxos
- **CNJ**: usuário digita CNJ → `search-cnj` resolve alias → POST `_search` (`match numeroProcesso`) → normaliza → persiste snapshot → retorno síncrono.
- **Busca avançada**: tribunal (obrigatório) + códigos TPU (classe/assunto/órgão/grau/período) → `bool.must` + `size`/`sort`/`search_after` → snapshots persistidos.
- **Detalhe**: `process-details` lê o snapshot persistido (re-busca opcional via `forceRefresh`).

## Verificação
- `npm run build` ✅ e `npm run lint` (sem novos erros nos arquivos do módulo).
- `grep -rni judit src/` → nenhuma referência em código (restam apenas migrations históricas, imutáveis).
- Resolver validado contra os exemplos da doc (CNJ `00008323520184013202` → `trf1`; `07223914020178070001` → `tjdft`).

### Pendências de ambiente (fora do código)
1. Aplicar a migration no Supabase.
2. Configurar o secret `DATAJUD_API_KEY` (e `OPENAI_API_KEY`) nas Edge Functions.
3. Deploy de `datajud-search` e `datajud-process-agent`; remover deploys de `judit-processes`/`judit-consumption-report`.
4. Teste E2E: consulta por CNJ real (ex.: TJSP/TJGO), busca avançada com paginação, favoritar/detalhe.
