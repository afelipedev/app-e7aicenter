import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface KpiItem {
  label: string;
  value: number;
  /** Sufixo (ex.: "%", "min", "dias") ou prefixo via `format`. */
  suffix?: string;
  /** Formatação custom do número (ex.: moeda). Sobrepõe suffix. */
  format?: (value: number) => string;
  icon?: LucideIcon;
  /** Classe de cor do ícone/realce (ex.: "text-ai-blue"). */
  accent?: string;
  decimals?: number;
}

/** Contador animado (count-up) com requestAnimationFrame. */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function KpiValue({ item }: { item: KpiItem }) {
  const animated = useCountUp(item.value || 0);
  if (item.format) return <>{item.format(animated)}</>;
  const decimals = item.decimals ?? 0;
  const text = animated.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <>
      {text}
      {item.suffix ? <span className="text-lg font-medium text-muted-foreground ml-1">{item.suffix}</span> : null}
    </>
  );
}

export function ReportKpiCards({ items, loading }: { items: KpiItem[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: items.length || 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <Card
            key={i}
            className="p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              {Icon ? <Icon className={cn("w-5 h-5", item.accent ?? "text-muted-foreground")} /> : null}
            </div>
            <div className={cn("text-3xl font-bold tabular-nums", item.accent)}>
              <KpiValue item={item} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
