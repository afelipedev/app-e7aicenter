import { Link } from "react-router-dom";
import { Bookmark, Check, Play, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getModuleLabel } from "../constants";
import type { TutorialWithProgress } from "../types";
import { formatDate, formatDuration, formatViews } from "../utils/format";

interface TutorialCardProps {
  tutorial: TutorialWithProgress;
  onToggleFavorite?: (tutorial: TutorialWithProgress) => void;
}

export function TutorialCard({ tutorial, onToggleFavorite }: TutorialCardProps) {
  const watchUrl = `/tutoriais/${tutorial.slug}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card ring-1 ring-transparent transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:ring-primary/15 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transform-none motion-reduce:transition-none">
      <Link
        to={watchUrl}
        className="relative block aspect-video overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {tutorial.thumbnail_url ? (
          <img
            src={tutorial.thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary">
            <Video className="h-8 w-8 text-muted-foreground" aria-hidden />
          </div>
        )}

        <span className="pointer-events-none absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/10" />

        <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white">
          {formatDuration(tutorial.duration_seconds)}
        </span>

        {tutorial.is_new && (
          <Badge className="absolute left-2 top-2 border-transparent bg-[hsl(var(--brown))] text-white hover:bg-[hsl(var(--brown))]">
            Novo
          </Badge>
        )}

        {tutorial.completed && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-[hsl(var(--success))] px-1.5 py-0.5 text-[11px] font-medium text-white">
            <Check className="h-3 w-3" aria-hidden /> Concluído
          </span>
        )}

        {tutorial.progress_percent > 0 && !tutorial.completed && (
          <span
            className="absolute inset-x-0 bottom-0 h-1 bg-black/40"
            role="progressbar"
            aria-label="Progresso assistido"
            aria-valuenow={Math.round(tutorial.progress_percent)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span
              className="block h-full bg-[hsl(var(--brown))]"
              style={{ width: `${tutorial.progress_percent}%` }}
            />
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-medium leading-snug">
            <Link to={watchUrl} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {tutorial.title}
            </Link>
          </h3>
          {onToggleFavorite && (
            <button
              type="button"
              onClick={() => onToggleFavorite(tutorial)}
              aria-label={tutorial.is_favorite ? "Remover dos favoritos" : "Salvar nos favoritos"}
              aria-pressed={tutorial.is_favorite}
              className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bookmark className={cn("h-4 w-4", tutorial.is_favorite && "fill-current text-primary")} />
            </button>
          )}
        </div>

        {tutorial.short_description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{tutorial.short_description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {tutorial.category && (
            <Badge variant="secondary" className="font-normal">
              {tutorial.category.name}
            </Badge>
          )}
          <Badge variant="outline" className="font-normal">
            {getModuleLabel(tutorial.module_key)}
          </Badge>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatViews(tutorial.views_count)} · {formatDate(tutorial.published_at)}
          </span>
          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
            <Link to={watchUrl}>
              <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
              Assistir
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
