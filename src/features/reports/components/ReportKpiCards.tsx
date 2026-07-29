import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  /** Explicação do cálculo, exibida num tooltip ao lado do rótulo. */
  hint?: string;
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
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Card
              key={i}
              className="p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="text-sm text-muted-foreground truncate">{item.label}</p>
                  {item.hint ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Como ${item.label} é calculado`}
                          className="text-muted-foreground/70 hover:text-foreground transition-colors shrink-0"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
                        {item.hint}
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                {Icon ? (
                  <Icon className={cn("w-5 h-5 shrink-0", item.accent ?? "text-muted-foreground")} />
                ) : null}
              </div>
              <div className={cn("text-3xl font-bold tabular-nums", item.accent)}>
                <KpiValue item={item} />
              </div>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
