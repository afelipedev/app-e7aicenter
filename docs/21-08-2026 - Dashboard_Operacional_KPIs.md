# 21/08/2026 - Dashboard operacional com KPIs reais

## Objetivo

Trocar o home de `/` (cinco contagens totais e atalhos iguais) por um painel operacional: fila de atenção, KPIs por papel, tendência do recorte e listas de trabalho. Fontes alinhadas às RPCs de Relatórios.

## O que mudou

### Dados

Nova RPC `report_dashboard_home(p_from, p_to)` em `supabase/migrations/20260821220000_report_dashboard_home.sql`.

- Período com comparação contra a janela anterior da mesma duração.
- IA: `agente_conversas` / `agente_execucoes` (AI Center E7, não `chats` legado).
- Folha e SPED: lotes em `payroll_processing` / `sped_processing` (não arquivos avulsos).
- Processos: snapshots e consultas DataJud, rótulo “consultados” (não “ativos”).
- Kanban: atrasados, concluídos, cards do usuário.
- Atenção pessoal: cards atrasados/bloqueados, lotes com erro, falhas DataJud, ingestão RAG, menções não lidas.

### Interface (`src/features/dashboard/`)

- Recorte Hoje / 7 dias / 30 dias (padrão 7 dias).
- Faixa “Precisa de atenção” como primeiro conteúdo.
- Faixa de KPIs clicável, filtrada por papel (`advogado`, `contabil`, `financeiro`, admin).
- Gráfico diário reusando `TrendAreaChart`.
- Listas: meus cards, processos favoritos ou últimos processamentos.
- Atalhos compactos no lugar da grade de cards.

`src/pages/Dashboard.tsx` passou a reexportar a página da feature.

## Como aplicar a migration

O MCP Supabase desta sessão apontou para outro projeto. Aplicar no projeto E7 (`huswezdozhadkegnptsa`):

```bash
supabase db push
# ou colar o SQL da migration no SQL Editor do projeto correto
```

Sem a função, o home mostra o estado de erro com “Tentar de novo”.

## Como validar

1. Aplicar a migration no projeto certo.
2. Abrir `/` autenticado.
3. Trocar Hoje / 7 dias / 30 dias e conferir recálculo.
4. Conferir KPIs diferentes por papel.
5. Clicar num item de atenção e num KPI e cair no módulo correspondente.
6. Confirmar que “Conversas de IA” não conta `/assistants/*`.
