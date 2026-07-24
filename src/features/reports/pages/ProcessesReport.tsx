import { useState } from "react";
import { Clock, FileSearch, Scale, Search } from "lucide-react";
import { ReportFilters } from "../components/ReportFilters";
import { ReportKpiCards } from "../components/ReportKpiCards";
import { ExportMenu } from "../components/ExportMenu";
import { ChartCard } from "../components/charts/ChartCard";
import { TrendAreaChart } from "../components/charts/TrendAreaChart";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { DistributionPieChart } from "../components/charts/DistributionPieChart";
import { useProcessesReport } from "../hooks/useReportData";
import { formatMonthLabel } from "../components/chartTheme";
import type { ReportFiltersState } from "../types";
import type { XlsxSheet } from "../services/xlsxExport";

const INITIAL: ReportFiltersState = { from: null, to: null, companyId: null };

export function ProcessesReport() {
  const [filters, setFilters] = useState<ReportFiltersState>(INITIAL);
  const { data, isLoading } = useProcessesReport(filters);
  const k = data?.kpis;

  const buildSheets = (): XlsxSheet[] => {
    if (!data) return [];
    return [
      {
        name: "Resumo",
        rows: [
          { Indicador: "Processos (snapshots)", Valor: k?.total_snapshots ?? 0 },
          { Indicador: "Consultas realizadas", Valor: k?.total_queries ?? 0 },
          { Indicador: "Consultas com sucesso", Valor: k?.success_queries ?? 0 },
          { Indicador: "Latência média (s)", Valor: k?.avg_query_seconds ?? 0 },
        ],
      },
      { name: "Consultas por mês", rows: (data.queries_by_month ?? []).map((r) => ({ Mês: formatMonthLabel(r.month), Consultas: r.count })) },
      { name: "Consultas por tipo", rows: (data.queries_by_kind ?? []).map((r) => ({ Tipo: r.request_kind, Quantidade: r.count })) },
      { name: "Consultas por status", rows: (data.queries_by_status ?? []).map((r) => ({ Status: r.status, Quantidade: r.count })) },
      { name: "Por tribunal", rows: (data.by_tribunal ?? []).map((r) => ({ Tribunal: r.tribunal, Quantidade: r.count })) },
      { name: "Por classe", rows: (data.by_class ?? []).map((r) => ({ Classe: r.class_processual, Quantidade: r.count })) },
      { name: "Por segmento", rows: (data.by_segment ?? []).map((r) => ({ Segmento: r.justice_segment, Quantidade: r.count })) },
      { name: "Por UF", rows: (data.by_state ?? []).map((r) => ({ UF: r.state, Quantidade: r.count })) },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportFilters value={filters} onChange={setFilters} />
        <ExportMenu filename="relatorio_processos_datajud" buildSheets={buildSheets} disabled={isLoading || !data} />
      </div>

      <ReportKpiCards
        loading={isLoading}
        items={[
          { label: "Processos", value: k?.total_snapshots ?? 0, icon: FileSearch, accent: "text-ai-blue" },
          { label: "Consultas", value: k?.total_queries ?? 0, icon: Search, accent: "text-ai-purple" },
          { label: "Com sucesso", value: k?.success_queries ?? 0, icon: Scale, accent: "text-ai-green" },
          { label: "Latência média", value: k?.avg_query_seconds ?? 0, suffix: "s", decimals: 1, icon: Clock, accent: "text-ai-orange" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Consultas por mês" description="Volume de consultas processuais" loading={isLoading} empty={!data?.queries_by_month?.length}>
          <TrendAreaChart data={data?.queries_by_month ?? []} series={[{ key: "count", label: "Consultas" }]} />
        </ChartCard>

        <ChartCard title="Consultas por tipo" loading={isLoading} empty={!data?.queries_by_kind?.length}>
          <DistributionPieChart data={data?.queries_by_kind ?? []} nameKey="request_kind" />
        </ChartCard>

        <ChartCard title="Processos por tribunal" description="Top 15" loading={isLoading} empty={!data?.by_tribunal?.length}>
          <CategoryBarChart data={data?.by_tribunal ?? []} categoryKey="tribunal" layout="horizontal" />
        </ChartCard>

        <ChartCard title="Processos por classe" description="Top 15" loading={isLoading} empty={!data?.by_class?.length}>
          <CategoryBarChart data={data?.by_class ?? []} categoryKey="class_processual" layout="horizontal" />
        </ChartCard>

        <ChartCard title="Distribuição por segmento" loading={isLoading} empty={!data?.by_segment?.length}>
          <DistributionPieChart data={data?.by_segment ?? []} nameKey="justice_segment" />
        </ChartCard>

        <ChartCard title="Processos por UF" loading={isLoading} empty={!data?.by_state?.length}>
          <CategoryBarChart data={data?.by_state ?? []} categoryKey="state" layout="horizontal" />
        </ChartCard>
      </div>
    </div>
  );
}
