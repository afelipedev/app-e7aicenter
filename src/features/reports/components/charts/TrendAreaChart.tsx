import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt, formatMonthLabel } from "../chartTheme";
import { compactNumber } from "../../labels";

export interface TrendSeries {
  key: string;
  label: string;
  color?: string;
}

interface TrendAreaChartProps {
  data: Array<Record<string, string | number>>;
  /** Chave do eixo X (default "month", formatada como mmm/aa). */
  xKey?: string;
  series: TrendSeries[];
  /** Formatação do valor no tooltip (ex.: moeda). */
  valueFormatter?: (value: number) => string;
  height?: number;
}

const axisStyle = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };

/** Gráfico de área para séries temporais mensais, com animação nativa. */
export function TrendAreaChart({
  data,
  xKey = "month",
  series,
  valueFormatter,
  height = 288,
}: TrendAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      {/* left: 0 + YAxis width fixo evitam que os rótulos do eixo Y fiquem cortados. */}
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => {
            const color = s.color ?? colorAt(i);
            return (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={xKey === "month" ? formatMonthLabel : undefined}
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={56}
          tickFormatter={valueFormatter ?? compactNumber}
        />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 8,
            color: "hsl(var(--popover-foreground))",
          }}
          labelFormatter={(l) => (xKey === "month" ? formatMonthLabel(String(l)) : String(l))}
          formatter={(value: number, name) => [valueFormatter ? valueFormatter(value) : value, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => {
          const color = s.color ?? colorAt(i);
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
              isAnimationActive
              animationDuration={900}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}
