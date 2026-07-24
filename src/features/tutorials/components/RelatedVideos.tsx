import { Link } from "react-router-dom";
import { Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tutorial } from "../types";
import { formatDuration, formatViews } from "../utils/format";

interface RelatedVideosProps {
  tutorials: Tutorial[];
  currentId: string;
}

export function RelatedVideos({ tutorials, currentId }: RelatedVideosProps) {
  const items = tutorials.filter((tutorial) => tutorial.id !== currentId);

  if (!items.length) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        Este é o único vídeo do módulo por enquanto.
      </p>
    );
  }

  return (
    <section aria-labelledby="videos-relacionados">
      <h2 id="videos-relacionados" className="mb-3 text-sm font-medium">
        Vídeos relacionados
      </h2>
      <ul className="space-y-2">
        {items.map((tutorial) => (
          <li key={tutorial.id}>
            <Link
              to={`/tutoriais/${tutorial.slug}`}
              className={cn(
                "flex gap-3 rounded-lg border border-transparent p-2 transition-colors",
                "hover:border-border hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded bg-muted">
                {tutorial.thumbnail_url ? (
                  <img src={tutorial.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Video className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </div>
                )}
                <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] tabular-nums text-white">
                  {formatDuration(tutorial.duration_seconds)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium leading-snug">{tutorial.title}</p>
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {formatViews(tutorial.views_count)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
