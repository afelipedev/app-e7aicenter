import { Link } from "react-router-dom";
import { AlertTriangle, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTo?: string;
}

export function TutorialEmptyState({ title, description, actionLabel, onAction, actionTo }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <Video className="mb-3 h-9 w-9 text-muted-foreground" aria-hidden />
      <h3 className="text-base font-medium">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && actionTo && (
        <Button asChild className="mt-4">
          <Link to={actionTo}>{actionLabel}</Link>
        </Button>
      )}
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function TutorialErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-16 text-center">
      <AlertTriangle className="mb-3 h-9 w-9 text-destructive" aria-hidden />
      <h3 className="text-base font-medium">Não foi possível carregar os tutoriais</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        A conexão com o servidor falhou. Verifique sua rede e tente de novo.
      </p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
        Tentar novamente
      </Button>
    </div>
  );
}
