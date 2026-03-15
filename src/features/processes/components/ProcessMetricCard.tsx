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
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Icon className="h-5 w-5 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-semibold tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground">{helper}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-between gap-2 px-0 text-sm sm:w-auto sm:justify-start"
          onClick={onViewAll}
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
