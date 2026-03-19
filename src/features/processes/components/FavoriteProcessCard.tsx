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
    <Card className="group flex h-full flex-col overflow-hidden rounded-[24px] border-border/70 bg-card/95 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.5)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-34px_rgba(15,23,42,0.58)]">
      <div className="shrink-0 border-b border-emerald-100/70 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,rgba(236,253,245,0.95),rgba(255,255,255,0.98))] px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700/80">Processo favorito</p>
            <h3 className="mt-2 break-all text-base font-semibold leading-6 tracking-[-0.02em] text-slate-900">{process.cnj}</h3>
          </div>
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-200/80 bg-white/90 shadow-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="min-w-0 space-y-3">
          <div className="space-y-2">
            <p className="line-clamp-2 text-lg font-semibold leading-7 tracking-[-0.02em] text-foreground">{process.title}</p>
            <ProcessStatusBadge status={process.status} />
          </div>

          <div className="grid gap-3 rounded-[20px] border border-border/70 bg-muted/[0.16] p-4 text-sm text-muted-foreground">
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

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/75">
            Abrir detalhe
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-border/80 bg-background/80 shadow-sm transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                aria-label="Visualizar processo"
                onClick={() => onOpen(process.id)}
              >
                <Eye className="h-4 w-4 transition-transform duration-200 group-hover:scale-105" />
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
