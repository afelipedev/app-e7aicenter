import { useState } from "react";
import { AlarmClock, CheckCircle2, LayoutGrid, Timer } from "lucide-react";
import { ReportFilters } from "../components/ReportFilters";
import { ReportKpiCards } from "../components/ReportKpiCards";
import { ExportMenu } from "../components/ExportMenu";
import { ChartCard } from "../components/charts/ChartCard";
import { TrendAreaChart } from "../components/charts/TrendAreaChart";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { DistributionPieChart } from "../components/charts/DistributionPieChart";
import { useKanbanReport } from "../hooks/useReportData";
import { formatMonthLabel } from "../components/chartTheme";
import type { ReportFiltersState } from "../types";
import type { XlsxSheet } from "../services/xlsxExport";

const INITIAL: ReportFiltersState = { from: null, to: null, companyId: null };

export function KanbanReport() {
  const [filters, setFilters] = useState<ReportFiltersState>(INITIAL);
  const { data, isLoading } = useKanbanReport(filters);
  const k = data?.kpis;

  const buildSheets = (): XlsxSheet[] => {
    if (!data) return [];
    return [
      {
        name: "Resumo",
        rows: [
          { Indicador: "Total de cards", Valor: k?.total ?? 0 },
          { Indicador: "Concluídos", Valor: k?.completed ?? 0 },
          { Indicador: "Ativos", Valor: k?.active ?? 0 },
          { Indicador: "Atrasados", Valor: k?.overdue ?? 0 },
          { Indicador: "Lead time médio (dias)", Valor: k?.avg_lead_days ?? 0 },
        ],
      },
      {
        name: "Por mês",
        rows: (data.by_month ?? []).map((r) => ({
          Mês: formatMonthLabel(r.month),
          Criados: r.criados,
          Concluídos: r.concluidos,
        })),
      },
      { name: "Por status", rows: (data.by_status ?? []).map((r) => ({ Status: r.status, Quantidade: r.count })) },
      { name: "Por prioridade", rows: (data.by_priority ?? []).map((r) => ({ Prioridade: r.priority, Quantidade: r.count })) },
      { name: "Por responsável", rows: (data.by_assignee ?? []).map((r) => ({ Responsável: r.assignee, Cards: r.count })) },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportFilters value={filters} onChange={setFilters} />
        <ExportMenu filename="relatorio_kanban_juridico" buildSheets={buildSheets} disabled={isLoading || !data} />
      </div>

      <ReportKpiCards
        loading={isLoading}
        items={[
          { label: "Total de cards", value: k?.total ?? 0, icon: LayoutGrid, accent: "text-ai-blue" },
          { label: "Concluídos", value: k?.completed ?? 0, icon: CheckCircle2, accent: "text-ai-green" },
          { label: "Atrasados", value: k?.overdue ?? 0, icon: AlarmClock, accent: "text-destructive" },
          { label: "Lead time médio", value: k?.avg_lead_days ?? 0, suffix: "dias", decimals: 1, icon: Timer, accent: "text-ai-orange" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Criados vs Concluídos por mês"
          description="Throughput ao longo do tempo"
          loading={isLoading}
          empty={!data?.by_month?.length}
        >
          <TrendAreaChart
            data={data?.by_month ?? []}
            series={[
              { key: "criados", label: "Criados" },
              { key: "concluidos", label: "Concluídos" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Distribuição por status" loading={isLoading} empty={!data?.by_status?.length}>
          <DistributionPieChart data={data?.by_status ?? []} nameKey="status" colorByStatus />
        </ChartCard>

        <ChartCard title="Cards por prioridade" loading={isLoading} empty={!data?.by_priority?.length}>
          <CategoryBarChart data={data?.by_priority ?? []} categoryKey="priority" layout="horizontal" />
        </ChartCard>

        <ChartCard title="Carga por responsável" description="Top 20 responsáveis" loading={isLoading} empty={!data?.by_assignee?.length}>
          <CategoryBarChart data={data?.by_assignee ?? []} categoryKey="assignee" layout="horizontal" />
        </ChartCard>
      </div>
    </div>
  );
}
