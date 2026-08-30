import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DASHBOARD_PERIODS } from "../constants";
import type { DashboardPeriodId } from "../types";

export function DashboardPeriodToggle({
  value,
  onChange,
}: {
  value: DashboardPeriodId;
  onChange: (period: DashboardPeriodId) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as DashboardPeriodId);
      }}
      variant="outline"
      size="sm"
      className="justify-start"
      aria-label="Período do painel"
    >
      {DASHBOARD_PERIODS.map((period) => (
        <ToggleGroupItem
          key={period.id}
          value={period.id}
          className="min-h-9 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {period.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
