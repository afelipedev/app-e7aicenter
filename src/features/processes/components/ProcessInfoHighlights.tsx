import {
  Building2,
  CalendarDays,
  BriefcaseBusiness,
  Scale,
  Landmark,
  Users,
  CircleDollarSign,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ProcessDetail } from "../types";
import { ProcessStatusBadge } from "./ProcessStatusBadge";

const items = [
  { key: "tribunal", label: "Tribunal", icon: Building2 },
  { key: "value", label: "Valor da causa", icon: CircleDollarSign },
  { key: "distributedAt", label: "Data da distribuição", icon: CalendarDays },
  { key: "parties", label: "Partes do processo", icon: Users },
  { key: "status", label: "Status do processo", icon: BriefcaseBusiness },
  { key: "orgaoJulgador", label: "Órgão julgador", icon: Landmark },
  { key: "classProcessual", label: "Classe processual", icon: Scale },
] as const;

export function ProcessInfoHighlights({ process }: { process: ProcessDetail }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y md:grid-cols-2 xl:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className="flex min-w-0 items-start gap-3 p-4 xl:min-h-[108px]"
            >
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="h-5 w-5 text-primary" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
                {item.key === "parties" ? (
                  <p className="break-words text-sm font-medium">
                    {process.activeParty} x {process.passiveParty}
                  </p>
                ) : item.key === "status" ? (
                  <ProcessStatusBadge status={process.status} />
                ) : (
                  <p className="break-words text-sm font-medium">{String(process[item.key])}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
