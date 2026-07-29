import { useState } from "react";
import {
  Bot,
  Coins,
  MessageSquare,
  Sparkles,
  TriangleAlert,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { ReportFilters } from "../components/ReportFilters";
import { ReportKpiCards } from "../components/ReportKpiCards";
import { ExportMenu } from "../components/ExportMenu";
import { ChartCard } from "../components/charts/ChartCard";
import { TrendAreaChart } from "../components/charts/TrendAreaChart";
import { CategoryBarChart } from "../components/charts/CategoryBarChart";
import { DistributionPieChart } from "../components/charts/DistributionPieChart";
import { useAiCenterReport } from "../hooks/useReportData";
import { formatMonthLabel } from "../components/chartTheme";
import { brl, ORIGEM_LABELS, ROLE_LABELS, translate } from "../labels";
import type { ReportFiltersState } from "../types";
import type { XlsxSheet } from "../services/xlsxExport";

const INITIAL: ReportFiltersState = { from: null, to: null, companyId: null };

/**
 * Relatório de Adoção & IA — mede o módulo AI Center E7 (agentes criáveis pelo
 * usuário). A fonte é `agente_execucoes`, que registra custo em R$, tokens,
 * modelo, usuário, agente e origem de cada execução.
 */
export function AiCenterReport() {
  const [filters, setFilters] = useState<ReportFiltersState>(INITIAL);
  const { data, isLoading } = useAiCenterReport(filters);
  const k = data?.kpis;
  const kb = data?.knowledge;

  const buildSheets = (): XlsxSheet[] => {
    if (!data) return [];
    return [
      {
        name: "Resumo",
        rows: [
          { Indicador: "Custo total (R$)", Valor: k?.total_cost ?? 0 },
          { Indicador: "Execuções", Valor: k?.total_executions ?? 0 },
          { Indicador: "Tokens totais", Valor: k?.total_tokens ?? 0 },
          { Indicador: "Custo médio por execução (R$)", Valor: k?.avg_cost ?? 0 },
          { Indicador: "Agentes com uso no período", Valor: k?.active_agents ?? 0 },
          { Indicador: "Agentes cadastrados", Valor: k?.total_agents ?? 0 },
          { Indicador: "Usuários que usaram IA", Valor: k?.active_users ?? 0 },
          { Indicador: "Conversas criadas", Valor: k?.total_conversations ?? 0 },
          { Indicador: "Mensagens trocadas", Valor: k?.total_messages ?? 0 },
          { Indicador: "Taxa de erro (%)", Valor: k?.error_rate ?? 0 },
          { Indicador: "Bases de conhecimento", Valor: kb?.bases ?? 0 },
          { Indicador: "Documentos ingeridos", Valor: kb?.documentos ?? 0 },
          { Indicador: "Fragmentos indexados", Valor: kb?.fragmentos ?? 0 },
        ],
      },
      {
        name: "Por agente",
        rows: (data.by_agent ?? []).map((r) => ({
          Agente: r.agent,
          Execuções: r.execucoes,
          Conversas: r.conversas,
          "Custo (R$)": r.custo,
          Tokens: r.tokens,
        })),
      },
      {
        name: "Por modelo",
        rows: (data.by_model ?? []).map((r) => ({
          Modelo: r.model,
          Execuções: r.execucoes,
          "Custo (R$)": r.custo,
          Tokens: r.tokens,
        })),
      },
      {
        name: "Por usuário",
        rows: (data.by_user ?? []).map((r) => ({
          Usuário: r.usuario,
          Execuções: r.execucoes,
          "Custo (R$)": r.custo,
          Tokens: r.tokens,
        })),
      },
      {
        name: "Por origem",
        rows: (data.by_origem ?? []).map((r) => ({
          Origem: translate(ORIGEM_LABELS, r.origem),
          Execuções: r.count,
          "Custo (R$)": r.custo,
        })),
      },
      {
        name: "Por mês",
        rows: (data.by_month ?? []).map((r) => ({
          Mês: formatMonthLabel(r.month),
          Execuções: r.execucoes,
          "Custo (R$)": r.custo,
          Tokens: r.tokens,
        })),
      },
      {
        name: "Conversas por mês",
        rows: (data.conversations_by_month ?? []).map((r) => ({
          Mês: formatMonthLabel(r.month),
          Conversas: r.count,
        })),
      },
      {
        name: "Usuários por papel",
        rows: (data.users_by_role ?? []).map((r) => ({
          Papel: translate(ROLE_LABELS, r.role),
          Quantidade: r.count,
        })),
      },
    ];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ReportFilters value={filters} onChange={setFilters} />
        <ExportMenu filename="relatorio_ai_center_e7" buildSheets={buildSheets} disabled={isLoading || !data} />
      </div>

      <ReportKpiCards
        loading={isLoading}
        items={[
          {
            label: "Custo total",
            value: k?.total_cost ?? 0,
            format: brl,
            icon: Wallet,
            accent: "text-ai-green",
            hint: "Soma do custo de todas as execuções do AI Center no período, convertido para reais pelo câmbio registrado na tabela de preços dos modelos.",
          },
          {
            label: "Execuções",
            value: k?.total_executions ?? 0,
            icon: Zap,
            accent: "text-ai-blue",
            hint: "Chamadas a modelos de IA registradas em agente_execucoes — inclui execuções de agentes e dos geradores automáticos.",
          },
          {
            label: "Tokens",
            value: k?.total_tokens ?? 0,
            icon: Sparkles,
            accent: "text-ai-purple",
            hint: "Tokens de entrada + saída consumidos no período.",
          },
          {
            label: "Custo médio / execução",
            value: k?.avg_cost ?? 0,
            format: brl,
            icon: Coins,
            accent: "text-ai-orange",
            hint: "Custo total ÷ número de execuções.",
          },
          {
            label: "Agentes ativos",
            value: k?.active_agents ?? 0,
            icon: Bot,
            accent: "text-ai-cyan",
            hint: `Agentes com pelo menos uma execução no período, de ${k?.total_agents ?? 0} agente(s) cadastrado(s).`,
          },
          {
            label: "Usuários com IA",
            value: k?.active_users ?? 0,
            icon: Users,
            accent: "text-ai-blue",
            hint: "Usuários distintos que executaram algum agente no período.",
          },
          {
            label: "Conversas",
            value: k?.total_conversations ?? 0,
            icon: MessageSquare,
            accent: "text-ai-pink",
            hint: `Conversas abertas com agentes no período, com ${k?.total_messages ?? 0} mensagem(ns) trocada(s).`,
          },
          {
            label: "Taxa de erro",
            value: k?.error_rate ?? 0,
            suffix: "%",
            decimals: 1,
            icon: TriangleAlert,
            accent: "text-destructive",
            hint: "Execuções que terminaram com erro ÷ total de execuções × 100.",
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Chat por Agentes"
          description="Interações registradas por agente (Top 10)"
          loading={isLoading}
          empty={!data?.by_agent?.length}
        >
          <CategoryBarChart
            data={data?.by_agent ?? []}
            categoryKey="agent"
            valueKey="execucoes"
            layout="vertical"
            valueLabel="Execuções"
          />
        </ChartCard>

        <ChartCard
          title="Chats criados por mês"
          description="Evolução do uso dos agentes"
          loading={isLoading}
          empty={!data?.conversations_by_month?.length}
        >
          <TrendAreaChart
            data={data?.conversations_by_month ?? []}
            series={[{ key: "count", label: "Conversas" }]}
          />
        </ChartCard>

        <ChartCard
          title="Custo por mês"
          description="Gasto com modelos de IA (R$)"
          loading={isLoading}
          empty={!data?.by_month?.length}
        >
          <TrendAreaChart
            data={data?.by_month ?? []}
            series={[{ key: "custo", label: "Custo (R$)" }]}
            valueFormatter={brl}
          />
        </ChartCard>

        <ChartCard
          title="Custo por agente"
          description="Top 10 agentes por gasto"
          loading={isLoading}
          empty={!data?.by_agent?.length}
        >
          <CategoryBarChart
            data={data?.by_agent ?? []}
            categoryKey="agent"
            valueKey="custo"
            layout="horizontal"
            valueFormatter={brl}
            valueLabel="Custo"
          />
        </ChartCard>

        <ChartCard
          title="Custo por modelo LLM"
          description="Gasto acumulado por modelo"
          loading={isLoading}
          empty={!data?.by_model?.length}
        >
          <CategoryBarChart
            data={data?.by_model ?? []}
            categoryKey="model"
            valueKey="custo"
            layout="horizontal"
            valueFormatter={brl}
            valueLabel="Custo"
          />
        </ChartCard>

        <ChartCard
          title="Custo por usuário"
          description="Top 10 usuários por gasto"
          loading={isLoading}
          empty={!data?.by_user?.length}
        >
          <CategoryBarChart
            data={data?.by_user ?? []}
            categoryKey="usuario"
            valueKey="custo"
            layout="horizontal"
            valueFormatter={brl}
            valueLabel="Custo"
          />
        </ChartCard>

        <ChartCard
          title="Execuções por origem"
          description="Agentes vs geradores automáticos"
          loading={isLoading}
          empty={!data?.by_origem?.length}
        >
          <DistributionPieChart
            data={data?.by_origem ?? []}
            nameKey="origem"
            labelMap={ORIGEM_LABELS}
          />
        </ChartCard>

        <ChartCard title="Usuários por papel" loading={isLoading} empty={!data?.users_by_role?.length}>
          <DistributionPieChart
            data={data?.users_by_role ?? []}
            nameKey="role"
            labelMap={ROLE_LABELS}
          />
        </ChartCard>
      </div>
    </div>
  );
}
