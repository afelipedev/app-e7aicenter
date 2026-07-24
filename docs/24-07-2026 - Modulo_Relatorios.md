# 24/07/2026 - Módulo de Relatórios (real, com gráficos e exportação Excel)

## Contexto

A página `/documents/reports` era **100% mockada** (array fixo, sem dados, sem gráficos, sem exportação). Esta implementação transforma a tela num **hub de relatórios funcional**, consumindo dados reais do Supabase via funções agregadoras (RPC), com gráficos animados, filtros e exportação `.xlsx`.

## Decisões

- **Exportação:** `.xlsx` nativo via **SheetJS** (`xlsx@0.18.5`), multi-aba.
- **Agregações:** **RPC/SQL server-side** (migration `create_reports_rpc_functions`), `SECURITY DEFINER` com `search_path=public` e `grant execute ... to authenticated`.
- **Judit descartada** (integração descontinuada). Processos usam dados **DataJud** (`process_snapshots`, `process_query_requests`).

## Domínios de relatório (4 abas)

| Aba | RPC | Métricas principais |
|-----|-----|---------------------|
| **Folha & SPED** | `report_payroll_sped_summary(p_from,p_to,p_company_id)` | Volume, taxa de sucesso, tempo médio, por mês/empresa/status, SPED por tipo |
| **Kanban Jurídico** | `report_kanban_throughput(p_from,p_to)` | Lead time, atrasados, criados vs concluídos, por status/prioridade/responsável |
| **Adoção & IA** | `report_ai_adoption(p_from,p_to)` | Usuários ativos, 1º acesso, chats por assistente/modelo, engajamento Teams |
| **Processos (DataJud)** | `report_processes_overview(p_from,p_to)` | Consultas por mês/tipo/status, distribuição por tribunal/classe/segmento/UF |

## Estrutura (feature-based)

```
src/features/reports/
  types.ts
  services/reportsService.ts   # chama as RPCs (padrão withTimeout)
  services/xlsxExport.ts        # helper genérico .xlsx (SheetJS)
  hooks/useReportData.ts        # React Query por relatório+filtros
  components/
    ReportFilters.tsx           # período (presets + range custom) + empresa
    ReportKpiCards.tsx          # KPI cards com count-up animado
    ExportMenu.tsx              # botão "Exportar Excel"
    chartTheme.ts               # paleta via design tokens + labels
    charts/ChartCard.tsx        # wrapper com loading/empty
    charts/TrendAreaChart.tsx   # série temporal (área)
    charts/CategoryBarChart.tsx # barras categóricas
    charts/DistributionPieChart.tsx # donut
  pages/ReportsHub.tsx          # tabs
  pages/{PayrollSped,Kanban,AiAdoption,Processes}Report.tsx
```

`src/pages/documents/Reports.tsx` agora apenas renderiza `<ReportsHub />` (rota inalterada).

## Reuso

- Wrapper `recharts` do design system (antes código morto).
- Padrão `withTimeout` (dashboardService/companyService).
- Padrão de download por Blob (módulo de Leads) reaplicado no `xlsxExport`.
- Tokens de cor `--ai-*`, `--success`, `--warning`, `--destructive` (dark/light).

## Filtros

- Presets: 3/6/12 meses, ano atual, todo o período, personalizado (range com 2 meses, pt-BR).
- Empresa: só na aba Folha & SPED (demais tabelas não têm `company_id`).
- Filtros entram na `queryKey` do React Query → refetch automático e exportação respeita o período ativo.

## Exportação

Cada relatório gera um `.xlsx` com aba **Resumo (KPIs)** + abas detalhadas por dimensão. Nome do arquivo com data (ex.: `relatorio_folha_sped_2026-07-24.xlsx`).

## Verificação

- `npx tsc` — sem novos erros nos arquivos de `features/reports` (erros restantes são pré-existentes do projeto).
- `npm run build` — OK.
- `npx eslint src/features/reports` — limpo.
- RPCs testadas com dados reais (ex.: 3011 processamentos de folha, 1129 cards, 124 chats, 455 snapshots).
- `get_advisors(security)` — nenhum alerta para as novas funções.

## Observações / próximos passos

- `process_monitorings` não existe no schema atual — omitido do relatório de processos.
- Kanban não possui `company_id`; o filtro de empresa não se aplica a essa aba.
- Possível evolução: agendar exportações, PDF, e cache das RPCs se o volume crescer.
