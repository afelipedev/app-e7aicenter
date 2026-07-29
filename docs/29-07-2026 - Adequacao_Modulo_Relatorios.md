# 29/07/2026 — Adequação do Módulo de Relatórios

Revisão do módulo `/documents/reports` (`src/features/reports/`), entregue em 24/07/2026. Corrige métricas quebradas, realinha a aba de IA ao **AI Center E7**, consolida os quadros de kanban dos dois domínios e traduz os rótulos para pt-BR.

---

## 1. Diagnóstico das métricas questionadas

| Métrica | Onde | Cálculo | Situação anterior |
|---|---|---|---|
| **Tempo médio** (Folha/SPED) | `payroll_processing` + `sped_processing` | `avg(completed_at − started_at)` em minutos, apenas `status='completed'` | Cálculo correto, rótulo não dizia "de quê" |
| **Taxa de sucesso** (Folha/SPED) | idem | `completed ÷ (completed + error) × 100` | Correto; pendentes/em processamento ficam fora do denominador — não estava explícito |
| **Lead time médio** (Quadros) | `legal_kanban_cards` | `avg(completed_at − created_at)` em dias, apenas `status='concluido'` | Correto, mas a amostra é minúscula: **9 de 1.129 cards**. Os 1.034 arquivados nunca preenchem `completed_at` |
| **Latência média** (Processos) | `process_query_requests` | `avg(finished_at − started_at)` | **Quebrado na origem** — durações negativas (−0,013s a −0,029s) |
| **Com sucesso** (Processos) | idem | `count(*) where status='success'` | **Sempre 0** — `'success'` não existe na base; os valores reais são `completed`/`pending` |
| **Consultas por tipo** (Processos) | idem | `count(*) by request_kind` | Rótulos técnicos em inglês, sem explicação |

Todos os KPIs agora expõem o cálculo num tooltip (`hint`) no próprio card, incluindo o tamanho da amostra quando a média depende de um subconjunto.

---

## 2. Limpeza dos registros legados do Judit

Migration `supabase/migrations/20260729120000_purge_judit_legacy_process_data.sql`.

Discriminador: o edge function `datajud-search` grava `search_type ∈ ('numeroProcesso','advanced')`; a integração Judit gravava `('lawsuit_cnj','cpf','oab')`.

| Tabela | Antes | Depois |
|---|---|---|
| `process_query_requests` | 12 | **4** |
| `process_snapshots` | 455 | **22** |
| `process_agent_summaries` | 8 | **3** |
| `process_user_state` | 4 | **0** |
| `process_request_results` | 459 | **24** |

**Backups** (rede de segurança, remover em migration futura assim que validado):
`public._backup_judit_query_requests_20260729` (8 linhas) e `public._backup_judit_snapshots_20260729` (433 linhas).

> ⚠️ A limpeza afeta também a tela `/documents/cases/queries`, que passa a listar 22 processos em vez de 455.

Ainda na mesma migration:
- `process_snapshots.source_kind` passa a aceitar `'advanced'` (o CHECK legado obrigava o remap `advanced → history` em `mappers.ts`); as 21 linhas com `'history'` foram normalizadas.
- Consultas presas em `'pending'` (o edge function nunca gravava o desfecho) viraram `'error'`. A partir de agora só existem `completed` e `error`.

---

## 3. Correções na Edge Function `datajud-search` (deploy v5)

**`created_at`/`started_at` (`index.ts`)** — `createProcessQueryRequest` fazia um único `INSERT` **depois** da chamada HTTP, com `started_at` caindo no `DEFAULT NOW()` e `finished_at` capturado antes: `finished_at − started_at` dava valor **negativo**. Agora o instante é capturado antes do `fetch` e passado explicitamente.

**Persistência de falhas** — nenhuma falha do DataJud era registrada, então qualquer taxa de sucesso era 100% por construção. Novo helper `timedDatajudSearch` envolve os 3 pontos de chamada (`search-cnj`, `advanced-search`, `process-details` com `forceRefresh`), mede o tempo e grava `status='error'` + `error_message` quando a API falha. O registro do erro é best-effort e nunca mascara a exceção original. Erros de validação (CNJ inválido, filtros ausentes) continuam fora da tabela — não houve chamada à API.

**`mappers.ts`** — removido o remap `source_kind: 'advanced' → 'history'`.

---

## 4. Camada compartilhada

**Novo `src/features/reports/labels.ts`** — dicionários pt-BR (`STATUS_LABELS`, `PRIORITY_LABELS`, `DOMAIN_LABELS`, `REQUEST_KIND_LABELS`, `ORIGEM_LABELS`, `ROLE_LABELS`) e formatadores (`brl`, `compactNumber`, `truncateLabel`, `translate`, `translateRows`).

As RPCs continuam devolvendo as **chaves cruas** do banco; a tradução acontece só na exibição, o que preserva o mapa de cores por status (`STATUS_COLORS`).

**Componentes de gráfico:**

| Componente | Mudança |
|---|---|
| `CategoryBarChart` | Novas props `labelMap`, `valueFormatter`, `valueLabel`. Modo `vertical` ganhou rótulos inclinados (`angle=-30`), `interval={0}`, `height={72}` e truncagem em 16 caracteres — resolve a sobreposição de textos. Tooltip mostra o rótulo completo |
| `DistributionPieChart` | Novas props `labelMap` e `colorMap` (cores fixas por categoria) |
| `TrendAreaChart` | **Correção do eixo Y cortado**: `margin.left` de `-12` para `0` e `YAxis width` de `40` para `56`, com `tickFormatter` compacto pt-BR. Nova prop `valueFormatter` |
| `ReportKpiCards` | Novo campo `hint` renderizado como tooltip (ícone ℹ️) ao lado do rótulo |
| `chartTheme.ts` | Novo `SPED_TYPE_COLORS` (ICMS/IPI = azul, Contribuições = laranja) |

---

## 5. Aba "Folha & SPED"

- **SPED por Tipo**: barras → **pizza (donut)** com duas cores fixas.
- **Distribuição por status**: rótulos em pt-BR (tela e Excel).
- KPIs renomeados: "Taxa de sucesso" → **"Taxa de conclusão sem erro"**; "Tempo médio" → **"Tempo médio de processamento"**, ambos com `hint`.
- RPC: `ORDER BY count DESC` movido para **dentro** da subquery de `by_company` — o `LIMIT 20` cortava antes de ordenar, então o "Top 20 empresas" era um recorte arbitrário. Novo campo `avg_sample`.

## 6. Aba "Quadros" (ex-"Kanban Jurídico")

- Aba renomeada para **Quadros**; `KanbanReport.tsx` → `QuadrosReport.tsx`.
- Passa a cobrir os dois domínios (`legal_kanban_boards.domain`), com **filtro Todos / Jurídico / Gestão Operacional** repassado como `p_domain` para a RPC.
- **Cards por prioridade**: barras → **pizza**, com rótulos em pt-BR.
- Novo gráfico **"Cards por quadro"** e novos agregados `by_board` / `by_domain`.
- KPI **Lead time médio** exibe a amostra no `hint` (`lead_sample`).
- Export: `relatorio_quadros_<data>.xlsx`, com nova aba "Por quadro".

## 7. Aba "Adoção & IA" → AI Center E7

Substituição total: as tabelas `chats`/`chat_messages` (assistentes fixos legados) saíram do relatório. A fonte agora é `agente_execucoes`, que registra custo em R$, tokens, modelo, usuário, agente e origem.

`AiAdoptionReport.tsx` → **`AiCenterReport.tsx`**; RPC `report_ai_adoption` → **`report_ai_center_e7`**.

**8 KPIs**: Custo total (R$) · Execuções · Tokens · Custo médio/execução · Agentes ativos · Usuários com IA · Conversas · Taxa de erro.

**Gráficos:**

| Gráfico | Tipo | Observação |
|---|---|---|
| **Chat por Agentes** | Barras **verticais** | Era pizza com textos sobrepostos. Top 10 por execuções |
| Chats criados por mês | Área | Descrição agora diz "Evolução do uso dos **agentes**"; dado vem de `agente_conversas` |
| Custo por mês | Área | Novo |
| Custo por agente / modelo / usuário | Barras horizontais | Novos |
| Execuções por origem | Donut | Novo — agente vs geradores automáticos |
| **Usuários por papel** | **Pizza** | Era barras |

A agregação passou a ser feita **no banco**, o que remove o teto de 5.000 linhas do `aiCostsService.resumo` (soma client-side, `aiCostsService.ts:41`).

**Baseline em 29/07/2026:** R$ 7,16 · 473.175 tokens · 31 execuções · 5 agentes ativos.

## 8. Aba "Processos"

- `success_queries`: `status='success'` → **`status='completed'`** (origem do card sempre-zero). Novos `error_queries` e `success_rate`.
- `avg_query_seconds` → **`avg_response_seconds`**, com `filter (finished_at > started_at)` para descartar as durações negativas legadas, mais `response_sample`.
- **Segmento de justiça derivado do tribunal** — o mapper do DataJud grava `justice_segment` e `state` sempre como `null` (`mappers.ts:144-145`), então após a purga esses gráficos ficariam 100% vazios. A RPC agora deriva o segmento do alias (`TJxx` → Estadual, `TRT` → Trabalho, `TRF` → Federal, `TRE` → Eleitoral, `STM`/`TJM` → Militar, `STF`/`STJ`/`TST`/`TSE` → Superiores).
- **"Processos por UF" removido** (campo sempre nulo) e substituído por **"Processos por grau"** + **"Processos por órgão julgador"**, ambos populados.
- **"Consultas por status"** promovido do Excel para gráfico donut.
- Rótulos em pt-BR: `cnj` → "Busca por nº CNJ", `advanced` → "Busca avançada", `detail_refresh` → "Atualização de detalhes".
- Rodapé: "Dados provenientes exclusivamente da API Pública do DataJud (CNJ)."

**Tabelas e campos metrificados:**
- `process_query_requests` — `request_kind`, `status`, `search_type`, `started_at`, `finished_at`, `created_at`
- `process_snapshots` — `tribunal`, `class_processual`, `grade`, `orgao_julgador`, `justice_segment`, `created_at`

---

## 9. Versionamento das RPCs

As 4 funções originais existiam **apenas no banco remoto**, sem arquivo em `supabase/migrations/`. A migration `20260729121000_reports_rpc_v2.sql` passa a ser a fonte de verdade das 4 funções ativas:

| Função | Assinatura |
|---|---|
| `report_payroll_sped_summary` | `(p_from date, p_to date, p_company_id uuid)` |
| `report_kanban_throughput` | `(p_from date, p_to date, p_domain text)` — assinatura nova, a antiga de 2 args foi dropada |
| `report_ai_center_e7` | `(p_from date, p_to date)` — nova |
| `report_processes_overview` | `(p_from date, p_to date)` |

`report_ai_adoption` foi removida.

Também corrigido em todas: `ORDER BY` dentro das subqueries com `LIMIT` (`by_company`, `by_assignee`, `by_tribunal`, `by_class`, `by_court`), que antes cortavam antes de ordenar.

---

## 10. Pendências conhecidas (não bloqueiam)

1. **`agente-gerar` registra custo R$ 0,00.** `agente-gerar/index.ts:19` passa o id versionado devolvido pela API (`gpt-4o-2024-08-06`) para `estimarCustoReais`, que faz match exato em `precos_modelos` — nunca casa. Vale para as 6 execuções de `gerador_agente`.
2. **Modelos sem preço cadastrado** (ex.: `gemini-3.5-flash`) também custam 0 silenciosamente: `precos_modelos` tem 8 linhas contra 13 modelos em `MODEL_PROVIDER_MAP` (`_shared/llm.ts:42-56`).
3. **Embeddings, OCR e `extrair-texto` não são contabilizados** em `agente_execucoes`.
4. **`lead_sample` = 9 cards.** Cards arquivados nunca preenchem `completed_at`, então o lead time cobre menos de 1% da base. Popular `completed_at` no arquivamento (ou derivar de `legal_kanban_activities`) melhoraria a métrica.
5. **`ORIGEM_LABELS` existe em dois lugares** (`reports/labels.ts` e `system-settings/services/aiCostsService.ts`) com textos propositalmente diferentes — curto para legenda de gráfico, longo para linha de tabela. Não unificado para não acoplar as duas features nem alterar a UI de Configurações.
6. **`process_snapshots` sem `company_id`**, então a aba Processos continua sem filtro por empresa.

---

## Arquivos alterados

**Novos**
- `supabase/migrations/20260729120000_purge_judit_legacy_process_data.sql`
- `supabase/migrations/20260729121000_reports_rpc_v2.sql`
- `src/features/reports/labels.ts`
- `src/features/reports/pages/QuadrosReport.tsx`
- `src/features/reports/pages/AiCenterReport.tsx`

**Removidos**
- `src/features/reports/pages/KanbanReport.tsx`
- `src/features/reports/pages/AiAdoptionReport.tsx`

**Modificados**
- `src/features/reports/types.ts`, `services/reportsService.ts`, `hooks/useReportData.ts`
- `src/features/reports/components/ReportKpiCards.tsx`, `chartTheme.ts`
- `src/features/reports/components/charts/{CategoryBarChart,DistributionPieChart,TrendAreaChart}.tsx`
- `src/features/reports/pages/{ReportsHub,PayrollSpedReport,ProcessesReport}.tsx`
- `supabase/functions/datajud-search/{index.ts,mappers.ts}`
