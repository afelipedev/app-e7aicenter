import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { KPI_COPY } from "../constants";
import type { DashboardHomeData, DashboardKpiId } from "../types";
import { emptyMetric, formatDelta, formatKpiValue } from "../utils";

const WORSE_WHEN_UP = new Set<DashboardKpiId>([
  "ai_error_rate",
  "payroll_errors",
  "sped_errors",
  "kanban_overdue",
]);

export function DashboardKpiStrip({
  data,
  ids,
}: {
  data: DashboardHomeData;
  ids: DashboardKpiId[];
}) {
  const navigate = useNavigate();

  return (
    <TooltipProvider delayDuration={200}>
      <div
        role="list"
        className={cn(
          "grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-card lg:grid-cols-3",
          ids.length >= 6 ? "xl:grid-cols-6 xl:divide-y-0" : "xl:grid-cols-5 xl:divide-y-0",
        )}
      >
        {ids.map((id) => {
          const metric = data.kpis?.[id] ?? emptyMetric();
          const copy = KPI_COPY[id];
          const delta = formatDelta(metric);
          const tone = WORSE_WHEN_UP.has(id)
            ? delta.direction === "up"
              ? "down"
              : delta.direction === "down"
                ? "up"
                : "flat"
            : delta.direction;
          const DeltaIcon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : Minus;

          return (
            <button
              key={id}
              type="button"
              role="listitem"
              onClick={() => navigate(copy.href)}
              className="min-h-[108px] p-4 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block text-sm text-muted-foreground">{copy.label}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                  {copy.hint}
                </TooltipContent>
              </Tooltip>
              <p className="mt-2 font-semibold tabular-nums text-[1.65rem] leading-none tracking-[-0.03em] text-foreground">
                {formatKpiValue(metric)}
              </p>
              <p
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs",
                  tone === "up" && "text-success",
                  tone === "down" && "text-destructive",
                  tone === "flat" && "text-muted-foreground",
                )}
              >
                <DeltaIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{delta.label}</span>
              </p>
            </button>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
