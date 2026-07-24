import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { SYSTEM_MODULES } from "../constants";

interface ModuleTrailProps {
  /** Total de vídeos publicados por módulo. */
  countsByModule: Record<string, number>;
  /** Vídeos concluídos por módulo. */
  completedByModule: Record<string, number>;
  selectedModule: string | null;
  onSelect: (moduleKey: string | null) => void;
}

/**
 * Trilha de módulos: filtro rápido e mapa de progresso ao mesmo tempo. Cada chip
 * traz um anel que mostra quanto daquele módulo o usuário já concluiu.
 * Só aparecem módulos que têm vídeo publicado.
 */
export function ModuleTrail({
  countsByModule,
  completedByModule,
  selectedModule,
  onSelect,
}: ModuleTrailProps) {
  const modules = useMemo(
    () => SYSTEM_MODULES.filter((module) => (countsByModule[module.key] ?? 0) > 0),
    [countsByModule]
  );

  if (!modules.length) return null;

  return (
    <nav aria-label="Trilha por módulo do sistema">
      <ul className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
        <li>
          <ChipButton active={selectedModule === null} onClick={() => onSelect(null)} label="Todos" />
        </li>
        {modules.map((module) => {
          const total = countsByModule[module.key] ?? 0;
          const done = completedByModule[module.key] ?? 0;
          const percent = total ? (done / total) * 100 : 0;

          return (
            <li key={module.key}>
              <ChipButton
                active={selectedModule === module.key}
                onClick={() => onSelect(selectedModule === module.key ? null : module.key)}
                label={module.label}
                percent={percent}
                detail={`${done}/${total}`}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface ChipButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  percent?: number;
  detail?: string;
}

function ChipButton({ label, active, onClick, percent, detail }: ChipButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      {percent !== undefined && <ProgressRing percent={percent} active={active} />}
      <span className="whitespace-nowrap">{label}</span>
      {detail && <span className="text-xs tabular-nums opacity-70">{detail}</span>}
    </button>
  );
}

function ProgressRing({ percent, active }: { percent: number; active: boolean }) {
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(percent, 100) / 100);

  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 -rotate-90" aria-hidden focusable="false">
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        className={active ? "stroke-primary-foreground/30" : "stroke-border"}
      />
      <circle
        cx="8"
        cy="8"
        r={radius}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className={active ? "stroke-primary-foreground" : "stroke-[hsl(var(--brown))]"}
      />
    </svg>
  );
}
