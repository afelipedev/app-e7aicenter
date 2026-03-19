import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ProcessMetricCardProps {
  title: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  onViewAll: () => void;
}

export function ProcessMetricCard({ title, value, helper, icon: Icon, onViewAll }: ProcessMetricCardProps) {
  return (
    <Card className="group rounded-[24px] border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-6 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-34px_rgba(15,23,42,0.55)]">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200/80 bg-emerald-50/80 text-emerald-700 shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/80">{title}</p>
              <p className="text-4xl font-semibold leading-none tracking-[-0.04em] text-foreground">{value}</p>
            </div>
          </div>
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground shadow-sm">
            Visão rápida
          </div>
        </div>

        <p className="max-w-[24rem] text-sm leading-6 text-muted-foreground">{helper}</p>

        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
            Navegação contextual
          </span>
          <Button
            variant="ghost"
            className="h-auto gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/5 hover:text-primary"
            onClick={onViewAll}
          >
            Ver módulo
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
