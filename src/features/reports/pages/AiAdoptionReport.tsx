import { useState } from "react";
import { MessageSquare, Sparkles, UserCheck, Users } from "lucide-react";
import { ReportFilters } from "../components/ReportFilters";
import { ReportKpiCards } from "../components/ReportKpiCards";
import { ExportMenu } from "../components/ExportMenu";
import { ChartCard } from "../components/charts/ChartCard";
import { TrendAreaChart } from "../components/charts/TrendAreaChart";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { DistributionPieChart } from "../components/charts/DistributionPieChart";
import { useAiAdoptionReport } from "../hooks/useReportData";
import { formatMonthLabel } from "../components/chartTheme";
import type { ReportFiltersState } from "../types";
import type { XlsxSheet } from "../services/xlsxExport";

const INITIAL: ReportFiltersState = { from: null, to: null, companyId: null };

export function AiAdoptionReport() {
  const [filters, setFilters] = useState<ReportFiltersState>(INITIAL);
  const { data, isLoading } = useAiAdoptionReport(filters);
  const k = data?.kpis;
  const te = data?.teams_engagement;

  const buildSheets = (): XlsxSheet[] => {
    if (!data) return [];
    return [
      {
        name: "Resumo",
        rows: [
          { Indicador: "Total de usuários", Valor: k?.total_users ?? 0 },
          { Indicador: "Usuários ativos no período", Valor: k?.active_users ?? 0 },
          { Indicador: "Usuários com 1º acesso concluído", Valor: k?.adopted_users ?? 0 },
          { Indicador: "Chats criados", Valor: k?.total_chats ?? 0 },
          { Indicador: "Mensagens trocadas", Valor: k?.total_messages ?? 0 },
          { Indicador: "Teams — posts", Valor: te?.posts ?? 0 },
          { Indicador: "Teams — mensagens", Valor: te?.messages ?? 0 },
          { Indicador: "Teams — reações", Valor: te?.reactions ?? 0 },
        ],
      },
      { name: "Usuários por papel", rows: (data.users_by_role ?? []).map((r) => ({ Papel: r.role, Quantidade: r.count })) },
      { name: "Chats por assistente", rows: (data.chats_by_assistant ?? []).map((r) => ({ Assistente: r.assistant_type, Quantidade: r.count })) },
      { name: "Chats por modelo", rows: (data.chats_by_model ?? []).map((r) => ({ Modelo: r.llm_model, Quantidade: r.count })) },
      { name: "Chats por mês", rows: (data.chats_by_month ?? []).map((r) => ({ Mês: formatMonthLabel(r.month), Chats: r.count })) },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportFilters value={filters} onChange={setFilters} />
        <ExportMenu filename="relatorio_adocao_ia" buildSheets={buildSheets} disabled={isLoading || !data} />
      </div>

      <ReportKpiCards
        loading={isLoading}
        items={[
          { label: "Usuários ativos", value: k?.active_users ?? 0, icon: Users, accent: "text-ai-blue" },
          { label: "1º acesso concluído", value: k?.adopted_users ?? 0, icon: UserCheck, accent: "text-ai-green" },
          { label: "Chats criados", value: k?.total_chats ?? 0, icon: Sparkles, accent: "text-ai-purple" },
          { label: "Mensagens", value: k?.total_messages ?? 0, icon: MessageSquare, accent: "text-ai-orange" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Chats criados por mês" description="Evolução do uso dos assistentes" loading={isLoading} empty={!data?.chats_by_month?.length}>
          <TrendAreaChart data={data?.chats_by_month ?? []} series={[{ key: "count", label: "Chats" }]} />
        </ChartCard>

        <ChartCard title="Chats por assistente" loading={isLoading} empty={!data?.chats_by_assistant?.length}>
          <DistributionPieChart data={data?.chats_by_assistant ?? []} nameKey="assistant_type" />
        </ChartCard>

        <ChartCard title="Uso por modelo LLM" loading={isLoading} empty={!data?.chats_by_model?.length}>
          <CategoryBarChart data={data?.chats_by_model ?? []} categoryKey="llm_model" layout="horizontal" />
        </ChartCard>

        <ChartCard title="Usuários por papel" loading={isLoading} empty={!data?.users_by_role?.length}>
          <CategoryBarChart data={data?.users_by_role ?? []} categoryKey="role" layout="horizontal" />
        </ChartCard>
      </div>
    </div>
  );
}
