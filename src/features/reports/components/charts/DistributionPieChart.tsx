import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colorAt, STATUS_COLORS } from "../chartTheme";
import { translate } from "../../labels";

interface DistributionPieChartProps {
  data: Array<Record<string, string | number>>;
  nameKey: string;
  valueKey?: string;
  colorByStatus?: boolean;
  /** Tradução pt-BR das categorias (só exibição; a cor continua pela chave crua). */
  labelMap?: Record<string, string>;
  /** Cores fixas por categoria (ex.: tipos de SPED). Tem prioridade sobre a paleta. */
  colorMap?: Record<string, string>;
  height?: number;
}

/** Gráfico donut para distribuição proporcional, com animação. */
export function DistributionPieChart({
  data,
  nameKey,
  valueKey = "count",
  colorByStatus = false,
  labelMap,
  colorMap,
  height = 288,
}: DistributionPieChartProps) {
  const label = (value: unknown) => (labelMap ? translate(labelMap, value) : String(value ?? ""));

  const cellColor = (row: Record<string, string | number>, i: number) => {
    const key = String(row[nameKey]);
    if (colorMap?.[key]) return colorMap[key];
    if (colorByStatus) return STATUS_COLORS[key] ?? colorAt(i);
    return colorAt(i);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={95}
          paddingAngle={2}
          stroke="hsl(var(--card))"
          strokeWidth={2}
          isAnimationActive
          animationDuration={800}
        >
          {data.map((row, i) => (
            <Cell key={i} fill={cellColor(row, i)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            color: "hsl(var(--popover-foreground))",
          }}
          formatter={(value, name) => [value as number, label(name)]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => label(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
