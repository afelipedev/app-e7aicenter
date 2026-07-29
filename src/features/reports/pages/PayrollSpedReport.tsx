import { useState } from "react";
import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { ReportFilters } from "../components/ReportFilters";
import { ReportKpiCards } from "../components/ReportKpiCards";
import { ExportMenu } from "../components/ExportMenu";
import { ChartCard } from "../components/charts/ChartCard";
import { TrendAreaChart } from "../components/charts/TrendAreaChart";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { DistributionPieChart } from "../components/charts/DistributionPieChart";
import { usePayrollSpedReport } from "../hooks/useReportData";
import { formatMonthLabel, SPED_TYPE_COLORS } from "../components/chartTheme";
import { STATUS_LABELS, translate } from "../labels";
import type { ReportFiltersState } from "../types";
import type { XlsxSheet } from "../services/xlsxExport";

const INITIAL: ReportFiltersState = { from: null, to: null, companyId: null };

export function PayrollSpedReport() {
  const [filters, setFilters] = useState<ReportFiltersState>(INITIAL);
  const { data, isLoading } = usePayrollSpedReport(filters);

  const k = data?.kpis;

  const buildSheets = (): XlsxSheet[] => {
    if (!data) return [];
    return [
      {
        name: "Resumo",
        rows: [
          { Indicador: "Total de processamentos", Valor: k?.total ?? 0 },
          { Indicador: "Concluídos", Valor: k?.completed ?? 0 },
          { Indicador: "Erros", Valor: k?.errors ?? 0 },
          { Indicador: "Em andamento", Valor: k?.in_progress ?? 0 },
          { Indicador: "Taxa de conclusão sem erro (%)", Valor: k?.success_rate ?? 0 },
          { Indicador: "Tempo médio de processamento (min)", Valor: k?.avg_minutes ?? 0 },
          { Indicador: "Lotes considerados no tempo médio", Valor: k?.avg_sample ?? 0 },
        ],
      },
      {
        name: "Por mês",
        rows: (data.by_month ?? []).map((r) => ({
          Mês: formatMonthLabel(r.month),
          Folha: r.folha,
          SPED: r.sped,
          Concluídos: r.concluidos,
          Erros: r.erros,
        })),
      },
      {
        name: "Por empresa",
        rows: (data.by_company ?? []).map((r) => ({
          Empresa: r.company,
          Total: r.total,
          Concluídos: r.concluidos,
          Erros: r.erros,
        })),
      },
      {
        name: "Por status",
        rows: (data.by_status ?? []).map((r) => ({
          Status: translate(STATUS_LABELS, r.status),
          Quantidade: r.count,
        })),
      },
      {
        name: "SPED por tipo",
        rows: (data.sped_by_type ?? []).map((r) => ({ Tipo: r.sped_type, Quantidade: r.count })),
      },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportFilters value={filters} onChange={setFilters} showCompany />
        <ExportMenu filename="relatorio_folha_sped" buildSheets={buildSheets} disabled={isLoading || !data} />
      </div>

      <ReportKpiCards
        loading={isLoading}
        items={[
          {
            label: "Processamentos",
            value: k?.total ?? 0,
            icon: FileText,
            accent: "text-ai-blue",
            hint: "Lotes de folha de pagamento e SPED criados no período selecionado.",
          },
          {
            label: "Taxa de conclusão sem erro",
            value: k?.success_rate ?? 0,
            suffix: "%",
            decimals: 1,
            icon: CheckCircle2,
            accent: "text-ai-green",
            hint: "Lotes concluídos ÷ (concluídos + com erro) × 100. Lotes ainda pendentes ou em processamento ficam fora do denominador.",
          },
          {
            label: "Erros",
            value: k?.errors ?? 0,
            icon: XCircle,
            accent: "text-destructive",
            hint: "Lotes que terminaram com status de erro.",
          },
          {
            label: "Tempo médio de processamento",
            value: k?.avg_minutes ?? 0,
            suffix: "min",
            decimals: 1,
            icon: Clock,
            accent: "text-ai-orange",
            hint: `Média de minutos entre o início e a conclusão do processamento. Calculado sobre ${k?.avg_sample ?? 0} lote(s) concluído(s).`,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Volume processado por mês"
          description="Folha vs SPED ao longo do tempo"
          loading={isLoading}
          empty={!data?.by_month?.length}
        >
          <TrendAreaChart
            data={data?.by_month ?? []}
            series={[
              { key: "folha", label: "Folha" },
              { key: "sped", label: "SPED" },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Distribuição por status"
          loading={isLoading}
          empty={!data?.by_status?.length}
        >
          <DistributionPieChart
            data={data?.by_status ?? []}
            nameKey="status"
            colorByStatus
            labelMap={STATUS_LABELS}
          />
        </ChartCard>

        <ChartCard
          title="Processamentos por empresa"
          description="Top 20 empresas"
          loading={isLoading}
          empty={!data?.by_company?.length}
        >
          <CategoryBarChart
            data={data?.by_company ?? []}
            categoryKey="company"
            valueKey="total"
            layout="horizontal"
            valueLabel="Processamentos"
          />
        </ChartCard>

        <ChartCard
          title="SPED por tipo"
          description="ICMS/IPI vs Contribuições"
          loading={isLoading}
          empty={!data?.sped_by_type?.length}
        >
          <DistributionPieChart
            data={data?.sped_by_type ?? []}
            nameKey="sped_type"
            colorMap={SPED_TYPE_COLORS}
          />
        </ChartCard>
      </div>
    </div>
  );
}
