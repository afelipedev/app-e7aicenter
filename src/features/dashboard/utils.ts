import type { DashboardKpiUnit, DashboardMetric, DashboardPeriodId } from "./types";

export function isoDateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function periodRange(period: DashboardPeriodId): { from: string; to: string } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  const from = new Date(to);
  if (period === "7d") from.setDate(from.getDate() - 6);
  if (period === "30d") from.setDate(from.getDate() - 29);
  return { from: isoDateLocal(from), to: isoDateLocal(to) };
}

export function greetingFor(name: string | null | undefined): string {
  const first = (name || "").trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return first ? `${hello}, ${first}` : hello;
}

export function formatKpiValue(metric: DashboardMetric): string {
  const value = Number(metric.value) || 0;
  if (metric.unit === "currency") {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  if (metric.unit === "percent") {
    return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
  }
  return value.toLocaleString("pt-BR");
}

export function formatDelta(metric: DashboardMetric): { label: string; direction: "up" | "down" | "flat" } {
  const value = Number(metric.value) || 0;
  const prev = Number(metric.prev) || 0;
  if (prev === 0 && value === 0) return { label: "sem variação", direction: "flat" };
  if (prev === 0 && value > 0) return { label: "novo no período", direction: "up" };

  if (metric.unit === "percent" || metric.unit === "currency") {
    const diff = value - prev;
    if (Math.abs(diff) < 0.05) return { label: "estável vs período anterior", direction: "flat" };
    const formatted =
      metric.unit === "currency"
        ? diff.toLocaleString("pt-BR", { style: "currency", currency: "BRL", signDisplay: "exceptZero" })
        : `${diff > 0 ? "+" : ""}${diff.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} pp`;
    return { label: `${formatted} vs período anterior`, direction: diff > 0 ? "up" : "down" };
  }

  const pct = ((value - prev) / prev) * 100;
  if (Math.abs(pct) < 0.5) return { label: "estável vs período anterior", direction: "flat" };
  const label = `${pct > 0 ? "+" : ""}${pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% vs período anterior`;
  return { label, direction: pct > 0 ? "up" : "down" };
}

export function formatDayLabel(isoDay: string): string {
  const [y, m, d] = (isoDay || "").split("-");
  if (!y || !m || !d) return isoDay;
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  }).replace(".", "");
}

export function formatDue(iso: string | null): string {
  if (!iso) return "Sem prazo";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

export function isDuePast(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export function emptyMetric(unit: DashboardKpiUnit = "count"): DashboardMetric {
  return { value: 0, prev: 0, unit };
}
