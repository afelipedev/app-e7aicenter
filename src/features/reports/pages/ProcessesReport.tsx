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
import { REQUEST_KIND_LABELS, STATUS_LABELS, translate } from "../labels";
import type { ReportFiltersState } from "../types";
import type { XlsxSheet } from "../services/xlsxExport";

const INITIAL: ReportFiltersState = { from: null, to: null, companyId: null };

/**
 * Relatório de Processos — mede exclusivamente as consultas feitas à API
 * Pública do DataJud (CNJ). Fontes: `process_query_requests` (log de cada
 * chamada) e `process_snapshots` (um registro por processo consultado).
 */
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
          { Indicador: "Processos consultados", Valor: k?.total_snapshots ?? 0 },
          { Indicador: "Consultas realizadas", Valor: k?.total_queries ?? 0 },
          { Indicador: "Consultas concluídas", Valor: k?.success_queries ?? 0 },
          { Indicador: "Consultas com erro", Valor: k?.error_queries ?? 0 },
          { Indicador: "Taxa de sucesso (%)", Valor: k?.success_rate ?? 0 },
          { Indicador: "Tempo médio de resposta (s)", Valor: k?.avg_response_seconds ?? 0 },
          { Indicador: "Consultas com duração válida", Valor: k?.response_sample ?? 0 },
          { Indicador: "Tribunais distintos", Valor: k?.distinct_tribunals ?? 0 },
        ],
      },
      {
        name: "Consultas por mês",
        rows: (data.queries_by_month ?? []).map((r) => ({
          Mês: formatMonthLabel(r.month),
          Consultas: r.count,
        })),
      },
      {
        name: "Consultas por tipo",
        rows: (data.queries_by_kind ?? []).map((r) => ({
          Tipo: translate(REQUEST_KIND_LABELS, r.request_kind),
          Quantidade: r.count,
        })),
      },
      {
        name: "Consultas por status",
        rows: (data.queries_by_status ?? []).map((r) => ({
          Status: translate(STATUS_LABELS, r.status),
          Quantidade: r.count,
        })),
      },
      {
        name: "Por tribunal",
        rows: (data.by_tribunal ?? []).map((r) => ({ Tribunal: r.tribunal, Quantidade: r.count })),
      },
      {
        name: "Por classe",
        rows: (data.by_class ?? []).map((r) => ({ Classe: r.class_processual, Quantidade: r.count })),
      },
      {
        name: "Por segmento",
        rows: (data.by_segment ?? []).map((r) => ({ Segmento: r.justice_segment, Quantidade: r.count })),
      },
      {
        name: "Por grau",
        rows: (data.by_grade ?? []).map((r) => ({ Grau: r.grade, Quantidade: r.count })),
      },
      {
        name: "Por órgão julgador",
        rows: (data.by_court ?? []).map((r) => ({ "Órgão julgador": r.orgao_julgador, Quantidade: r.count })),
      },
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
          {
            label: "Processos",
            value: k?.total_snapshots ?? 0,
            icon: FileSearch,
            accent: "text-ai-blue",
            hint: `Processos distintos retornados pelo DataJud e salvos no período, em ${k?.distinct_tribunals ?? 0} tribunal(is).`,
          },
          {
            label: "Consultas",
            value: k?.total_queries ?? 0,
            icon: Search,
            accent: "text-ai-purple",
            hint: "Chamadas à API do DataJud registradas em process_query_requests (busca por CNJ, busca avançada e atualização de detalhes).",
          },
          {
            label: "Taxa de sucesso",
            value: k?.success_rate ?? 0,
            suffix: "%",
            decimals: 1,
            icon: Scale,
            accent: "text-ai-green",
            hint: `Consultas concluídas ÷ (concluídas + com erro) × 100. ${k?.success_queries ?? 0} concluída(s) e ${k?.error_queries ?? 0} com erro.`,
          },
          {
            label: "Tempo médio de resposta",
            value: k?.avg_response_seconds ?? 0,
            suffix: "s",
            decimals: 1,
            icon: Clock,
            accent: "text-ai-orange",
            hint: `Segundos entre o envio da requisição ao DataJud e o recebimento da resposta. Calculado sobre ${k?.response_sample ?? 0} consulta(s) com duração válida.`,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Consultas por mês"
          description="Volume de chamadas à API do DataJud"
          loading={isLoading}
          empty={!data?.queries_by_month?.length}
        >
          <TrendAreaChart data={data?.queries_by_month ?? []} series={[{ key: "count", label: "Consultas" }]} />
        </ChartCard>

        <ChartCard
          title="Consultas por tipo"
          description="Busca por CNJ, avançada e atualização de detalhes"
          loading={isLoading}
          empty={!data?.queries_by_kind?.length}
        >
          <DistributionPieChart
            data={data?.queries_by_kind ?? []}
            nameKey="request_kind"
            labelMap={REQUEST_KIND_LABELS}
          />
        </ChartCard>

        <ChartCard title="Consultas por status" loading={isLoading} empty={!data?.queries_by_status?.length}>
          <DistributionPieChart
            data={data?.queries_by_status ?? []}
            nameKey="status"
            colorByStatus
            labelMap={STATUS_LABELS}
          />
        </ChartCard>

        <ChartCard
          title="Processos por tribunal"
          description="Top 15"
          loading={isLoading}
          empty={!data?.by_tribunal?.length}
        >
          <CategoryBarChart
            data={data?.by_tribunal ?? []}
            categoryKey="tribunal"
            layout="horizontal"
            valueLabel="Processos"
          />
        </ChartCard>

        <ChartCard
          title="Processos por classe"
          description="Top 15"
          loading={isLoading}
          empty={!data?.by_class?.length}
        >
          <CategoryBarChart
            data={data?.by_class ?? []}
            categoryKey="class_processual"
            layout="horizontal"
            valueLabel="Processos"
          />
        </ChartCard>

        <ChartCard
          title="Distribuição por segmento"
          description="Derivado do tribunal de origem"
          loading={isLoading}
          empty={!data?.by_segment?.length}
        >
          <DistributionPieChart data={data?.by_segment ?? []} nameKey="justice_segment" />
        </ChartCard>

        <ChartCard title="Processos por grau" loading={isLoading} empty={!data?.by_grade?.length}>
          <DistributionPieChart data={data?.by_grade ?? []} nameKey="grade" />
        </ChartCard>

        <ChartCard
          title="Processos por órgão julgador"
          description="Top 15"
          loading={isLoading}
          empty={!data?.by_court?.length}
        >
          <CategoryBarChart
            data={data?.by_court ?? []}
            categoryKey="orgao_julgador"
            layout="horizontal"
            valueLabel="Processos"
          />
        </ChartCard>
      </div>

      <p className="text-xs text-muted-foreground">
        Dados provenientes exclusivamente da API Pública do DataJud (CNJ).
      </p>
    </div>
  );
}
