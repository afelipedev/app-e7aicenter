import { useState } from "react";
import { AlarmClock, CheckCircle2, LayoutGrid, Timer } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReportFilters } from "../components/ReportFilters";
import { ReportKpiCards } from "../components/ReportKpiCards";
import { ExportMenu } from "../components/ExportMenu";
import { ChartCard } from "../components/charts/ChartCard";
import { TrendAreaChart } from "../components/charts/TrendAreaChart";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { DistributionPieChart } from "../components/charts/DistributionPieChart";
import { useKanbanReport } from "../hooks/useReportData";
import { formatMonthLabel } from "../components/chartTheme";
import { DOMAIN_LABELS, PRIORITY_LABELS, STATUS_LABELS, translate } from "../labels";
import type { KanbanDomainFilter, ReportFiltersState } from "../types";
import type { XlsxSheet } from "../services/xlsxExport";

const INITIAL: ReportFiltersState = { from: null, to: null, companyId: null };

const DOMAIN_OPTIONS: Array<{ value: KanbanDomainFilter; label: string }> = [
  { value: "all", label: "Todos os quadros" },
  { value: "legal", label: DOMAIN_LABELS.legal },
  { value: "operational", label: DOMAIN_LABELS.operational },
];

/**
 * Relatório de Quadros — consolida os quadros de kanban de todos os domínios
 * (Jurídico e Gestão Operacional), com filtro opcional por domínio.
 */
export function QuadrosReport() {
  const [filters, setFilters] = useState<ReportFiltersState>(INITIAL);
  const [domain, setDomain] = useState<KanbanDomainFilter>("all");
  const { data, isLoading } = useKanbanReport(filters, domain);
  const k = data?.kpis;

  const buildSheets = (): XlsxSheet[] => {
    if (!data) return [];
    return [
      {
        name: "Resumo",
        rows: [
          { Indicador: "Total de cards", Valor: k?.total ?? 0 },
          { Indicador: "Quadros no recorte", Valor: k?.boards ?? 0 },
          { Indicador: "Concluídos", Valor: k?.completed ?? 0 },
          { Indicador: "Ativos", Valor: k?.active ?? 0 },
          { Indicador: "Atrasados", Valor: k?.overdue ?? 0 },
          { Indicador: "Lead time médio (dias)", Valor: k?.avg_lead_days ?? 0 },
          { Indicador: "Cards considerados no lead time", Valor: k?.lead_sample ?? 0 },
        ],
      },
      {
        name: "Por quadro",
        rows: (data.by_board ?? []).map((r) => ({
          Quadro: r.board,
          Módulo: translate(DOMAIN_LABELS, r.domain),
          Cards: r.count,
          Concluídos: r.concluidos,
        })),
      },
      {
        name: "Por mês",
        rows: (data.by_month ?? []).map((r) => ({
          Mês: formatMonthLabel(r.month),
          Criados: r.criados,
          Concluídos: r.concluidos,
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
        name: "Por prioridade",
        rows: (data.by_priority ?? []).map((r) => ({
          Prioridade: translate(PRIORITY_LABELS, r.priority),
          Quantidade: r.count,
        })),
      },
      {
        name: "Por responsável",
        rows: (data.by_assignee ?? []).map((r) => ({ Responsável: r.assignee, Cards: r.count })),
      },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ReportFilters value={filters} onChange={setFilters} />
          <Select value={domain} onValueChange={(v) => setDomain(v as KanbanDomainFilter)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOMAIN_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ExportMenu filename="relatorio_quadros" buildSheets={buildSheets} disabled={isLoading || !data} />
      </div>

      <ReportKpiCards
        loading={isLoading}
        items={[
          {
            label: "Total de cards",
            value: k?.total ?? 0,
            icon: LayoutGrid,
            accent: "text-ai-blue",
            hint: `Cards criados no período, somando ${k?.boards ?? 0} quadro(s) do recorte selecionado.`,
          },
          {
            label: "Concluídos",
            value: k?.completed ?? 0,
            icon: CheckCircle2,
            accent: "text-ai-green",
            hint: "Cards com status 'Concluído'.",
          },
          {
            label: "Atrasados",
            value: k?.overdue ?? 0,
            icon: AlarmClock,
            accent: "text-destructive",
            hint: "Cards com data de vencimento no passado que ainda não foram concluídos nem arquivados.",
          },
          {
            label: "Lead time médio",
            value: k?.avg_lead_days ?? 0,
            suffix: "dias",
            decimals: 1,
            icon: Timer,
            accent: "text-ai-orange",
            hint: `Média de dias entre a criação e a conclusão do card. Calculado sobre ${k?.lead_sample ?? 0} card(s) concluído(s) — cards arquivados sem data de conclusão não entram.`,
          },
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

        <ChartCard
          title="Cards por quadro"
          description="Jurídico e Gestão Operacional"
          loading={isLoading}
          empty={!data?.by_board?.length}
        >
          <CategoryBarChart
            data={data?.by_board ?? []}
            categoryKey="board"
            layout="horizontal"
            valueLabel="Cards"
          />
        </ChartCard>

        <ChartCard title="Distribuição por status" loading={isLoading} empty={!data?.by_status?.length}>
          <DistributionPieChart
            data={data?.by_status ?? []}
            nameKey="status"
            colorByStatus
            labelMap={STATUS_LABELS}
          />
        </ChartCard>

        <ChartCard title="Cards por prioridade" loading={isLoading} empty={!data?.by_priority?.length}>
          <DistributionPieChart
            data={data?.by_priority ?? []}
            nameKey="priority"
            labelMap={PRIORITY_LABELS}
          />
        </ChartCard>

        <ChartCard
          title="Carga por responsável"
          description="Top 20 responsáveis"
          loading={isLoading}
          empty={!data?.by_assignee?.length}
        >
          <CategoryBarChart
            data={data?.by_assignee ?? []}
            categoryKey="assignee"
            layout="horizontal"
            valueLabel="Cards"
          />
        </ChartCard>
      </div>
    </div>
  );
}
