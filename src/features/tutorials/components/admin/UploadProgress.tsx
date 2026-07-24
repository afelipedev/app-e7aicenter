import { Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { UploadState } from "../../types";
import { formatBytes, formatRemaining, formatSpeed } from "../../utils/format";

interface UploadProgressProps {
  state: UploadState;
  fileName: string;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

/** Barra de envio com velocidade, tempo restante e controles de pausa. */
export function UploadProgress({ state, fileName, onPause, onResume, onCancel }: UploadProgressProps) {
  const isActive = state.status === "uploading" || state.status === "paused";

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{fileName}</p>
        <div className="flex items-center gap-1">
          {state.status === "uploading" && (
            <Button type="button" variant="ghost" size="sm" onClick={onPause} aria-label="Pausar envio">
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {state.status === "paused" && (
            <Button type="button" variant="ghost" size="sm" onClick={onResume} aria-label="Retomar envio">
              <Play className="h-4 w-4" />
            </Button>
          )}
          {isActive && (
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} aria-label="Cancelar envio">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Progress value={state.progress} aria-label="Progresso do envio" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-muted-foreground">
        <span>
          {formatBytes(state.bytesUploaded)} de {formatBytes(state.bytesTotal)} ·{" "}
          {Math.round(state.progress)}%
        </span>
        <span>
          {state.status === "paused"
            ? "Envio pausado"
            : state.status === "success"
              ? "Envio concluído"
              : `${formatSpeed(state.speed)} · ${formatRemaining(state.remainingSeconds)}`}
        </span>
      </div>

      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  );
}
