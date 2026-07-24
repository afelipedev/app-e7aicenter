import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { colorAt, STATUS_COLORS } from "../chartTheme";

interface DistributionPieChartProps {
  data: Array<Record<string, string | number>>;
  nameKey: string;
  valueKey?: string;
  colorByStatus?: boolean;
  height?: number;
}

/** Gráfico donut para distribuição proporcional, com animação. */
export function DistributionPieChart({
  data,
  nameKey,
  valueKey = "count",
  colorByStatus = false,
  height = 288,
}: DistributionPieChartProps) {
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
            <Cell
              key={i}
              fill={colorByStatus ? STATUS_COLORS[String(row[nameKey])] ?? colorAt(i) : colorAt(i)}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            color: "hsl(var(--popover-foreground))",
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
