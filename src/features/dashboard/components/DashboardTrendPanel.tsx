import { Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChartCard } from "@/features/reports/components/charts/ChartCard";
import { TrendAreaChart } from "@/features/reports/components/charts/TrendAreaChart";
import { TREND_COPY, type DashboardTrendId } from "../constants";
import type { DashboardHomeData } from "../types";
import { formatDayLabel } from "../utils";

const SERIES = {
  ai: [{ key: "execucoes", label: "Execuções", color: "hsl(var(--primary))" }],
  docs: [
    { key: "folha", label: "Folha", color: "hsl(var(--primary))" },
    { key: "sped", label: "SPED", color: "hsl(var(--brown))" },
  ],
  kanban: [
    { key: "criados", label: "Criados", color: "hsl(var(--primary))" },
    { key: "concluidos", label: "Concluídos", color: "hsl(var(--success))" },
  ],
};

function hasValues(points: Array<Record<string, string | number>>, keys: string[]): boolean {
  return points.some((point) => keys.some((key) => Number(point[key]) > 0));
}

export function DashboardTrendPanel({
  data,
  trend,
}: {
  data: DashboardHomeData;
  trend: DashboardTrendId;
}) {
  const navigate = useNavigate();
  const copy = TREND_COPY[trend];
  const points = data.series?.[trend] ?? [];
  const series = SERIES[trend];
  const empty = !hasValues(points, series.map((s) => s.key));

  return (
    <div className="min-w-0">
      <ChartCard
        title={copy.title}
        description={copy.description}
        empty={empty}
        compactEmpty
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(copy.href)}>
            Relatório completo
            <Eye />
          </Button>
        }
      >
        <TrendAreaChart
          data={points}
          xKey="day"
          series={series}
          tickFormatter={formatDayLabel}
          valueFormatter={trend === "ai" ? (v) => v.toLocaleString("pt-BR") : undefined}
          height={220}
        />
      </ChartCard>
    </div>
  );
}
