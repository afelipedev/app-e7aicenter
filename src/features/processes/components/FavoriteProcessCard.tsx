import { Star, Scale, Building2, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ProcessSummary } from "../types";
import { ProcessStatusBadge } from "./ProcessStatusBadge";

interface FavoriteProcessCardProps {
  process: ProcessSummary;
  onOpen: (processId: string) => void;
}

export function FavoriteProcessCard({ process, onOpen }: FavoriteProcessCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="h-24 shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-4 text-white">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">Capa do processo</p>
            <h3 className="mt-1.5 truncate text-lg font-semibold">{process.cnj}</h3>
          </div>
          <Star className="h-5 w-5 shrink-0 fill-amber-400 text-amber-400" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="min-w-0 space-y-2">
          <p className="line-clamp-2 text-base font-semibold leading-snug">{process.title}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 shrink-0" />
              {process.tribunal}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Scale className="h-4 w-4 shrink-0" />
              {process.classProcessual}
            </span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3">
          <ProcessStatusBadge status={process.status} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Visualizar processo"
                onClick={() => onOpen(process.id)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Visualizar processo</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
