import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { colorAt, STATUS_COLORS } from "../chartTheme";

interface CategoryBarChartProps {
  data: Array<Record<string, string | number>>;
  /** Chave da categoria (eixo). */
  categoryKey: string;
  /** Chave do valor numérico (default "count"). */
  valueKey?: string;
  /** Orientação: horizontal (barras deitadas) é melhor para rótulos longos. */
  layout?: "vertical" | "horizontal";
  /** Colore cada barra por status conhecido (sobrepõe o degradê por volume). */
  colorByStatus?: boolean;
  height?: number;
}

const axisStyle = { fill: "hsl(var(--muted-foreground))", fontSize: 12 };

// Cor única por tema (--ai-blue já muda entre light/dark).
// A barra de maior volume fica na cor cheia (destaque) e as menores num
// tom mais claro, misturando a base com branco via color-mix (funciona
// em ambos os temas).
const BAR_BASE = "hsl(var(--ai-blue))";

function intensityColor(value: number, maxValue: number): string {
  const ratio = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;
  const pct = Math.round(45 + 55 * ratio); // 45% (menor) → 100% (maior)
  return `color-mix(in srgb, ${BAR_BASE} ${pct}%, #ffffff)`;
}

/** Gráfico de barras para distribuições categóricas, com animação. */
export function CategoryBarChart({
  data,
  categoryKey,
  valueKey = "count",
  layout = "horizontal",
  colorByStatus = false,
  height = 288,
}: CategoryBarChartProps) {
  const tooltip = {
    contentStyle: {
      background: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 8,
      color: "hsl(var(--popover-foreground))",
    },
  };

  const maxValue = Math.max(0, ...data.map((row) => Number(row[valueKey]) || 0));

  const cellColor = (row: Record<string, string | number>, i: number) =>
    colorByStatus
      ? STATUS_COLORS[String(row[categoryKey])] ?? colorAt(i)
      : intensityColor(Number(row[valueKey]) || 0, maxValue);

  if (layout === "horizontal") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey={categoryKey}
            tick={axisStyle}
            tickLine={false}
            axisLine={false}
            width={130}
          />
          <Tooltip {...tooltip} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
          <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} isAnimationActive animationDuration={800}>
            {data.map((row, i) => (
              <Cell key={i} fill={cellColor(row, i)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey={categoryKey} tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
        <Tooltip {...tooltip} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
        <Bar dataKey={valueKey} radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800}>
          {data.map((row, i) => (
            <Cell key={i} fill={cellColor(row, i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
