import { Link } from "react-router-dom";
import { Play, Video } from "lucide-react";
import type { TutorialWithProgress } from "../types";
import { formatDuration } from "../utils/format";

/** Faixa com os vídeos começados e ainda não concluídos, do mais recente. */
export function ContinueWatching({ tutorials }: { tutorials: TutorialWithProgress[] }) {
  if (!tutorials.length) return null;

  return (
    <section aria-labelledby="continuar-assistindo">
      <h2 id="continuar-assistindo" className="mb-3 text-sm font-medium text-muted-foreground">
        Continuar assistindo
      </h2>
      <ul className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {tutorials.map((tutorial) => (
          <li key={tutorial.id} className="w-64 shrink-0">
            <Link
              to={`/tutoriais/${tutorial.slug}`}
              className="group flex gap-3 rounded-lg border border-border bg-card p-2 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded bg-muted">
                {tutorial.thumbnail_url ? (
                  <img src={tutorial.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Video className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                )}
                <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                  <span
                    className="block h-full bg-[hsl(var(--brown))]"
                    style={{ width: `${tutorial.progress_percent}%` }}
                  />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-medium leading-snug">{tutorial.title}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground">
                  <Play className="h-3 w-3" aria-hidden />
                  Retomar em {formatDuration(tutorial.progress_seconds)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
