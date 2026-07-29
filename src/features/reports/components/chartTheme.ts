// Paleta de gráficos baseada nos design tokens do projeto (tailwind.config.ts).
// Usar variáveis CSS mantém coerência entre dark/light mode.

export const CHART_COLORS = [
  "hsl(var(--ai-blue))",
  "hsl(var(--ai-green))",
  "hsl(var(--ai-orange))",
  "hsl(var(--ai-purple))",
  "hsl(var(--ai-pink))",
  "hsl(var(--ai-cyan))",
];

export const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(var(--success))",
  concluido: "hsl(var(--success))",
  error: "hsl(var(--destructive))",
  erros: "hsl(var(--destructive))",
  pending: "hsl(var(--warning))",
  processing: "hsl(var(--ai-blue))",
  ativo: "hsl(var(--ai-blue))",
  bloqueado: "hsl(var(--destructive))",
  aguardando_aprovacao: "hsl(var(--warning))",
  arquivado: "hsl(var(--muted-foreground))",
  success: "hsl(var(--success))",
};

/** Cores fixas por tipo de SPED — duas famílias bem distintas no gráfico. */
export const SPED_TYPE_COLORS: Record<string, string> = {
  "SPED ICMS IPI": "hsl(var(--ai-blue))",
  "SPED Contribuições": "hsl(var(--ai-orange))",
};

export function colorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Formata "YYYY-MM" para "mmm/aa" em pt-BR (ex.: 2026-07 -> jul/26). */
export function formatMonthLabel(month: string): string {
  const [y, m] = (month || "").split("-");
  if (!y || !m) return month;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
}
