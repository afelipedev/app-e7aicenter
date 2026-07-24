import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bookmark, ChevronLeft, ChevronRight, Eye, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RelatedVideos } from "../components/RelatedVideos";
import { TutorialPlayer } from "../components/TutorialPlayer";
import { getModuleLabel } from "../constants";
import { useRelatedTutorials, useTutorial, useTutorialProgress, useTutorialVideoUrl } from "../hooks/useTutorial";
import { useToggleFavorite } from "../hooks/useTutorialFavorites";
import { useMyFavorites } from "../hooks/useTutorials";
import { tutorialProgressService } from "../services/tutorialProgressService";
import { formatDate, formatDuration, formatViews } from "../utils/format";

/** Intervalo entre gravações de progresso durante a reprodução. */
const PROGRESS_SAVE_INTERVAL_MS = 10000;

export default function TutorialWatchPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: tutorial, isLoading, isError } = useTutorial(slug);
  const { data: videoUrl } = useTutorialVideoUrl(tutorial);
  const { data: progress } = useTutorialProgress(tutorial?.id);
  const { data: related = [] } = useRelatedTutorials(tutorial);
  const { data: favorites = [] } = useMyFavorites();
  const toggleFavorite = useToggleFavorite();

  const lastSavedRef = useRef(0);
  const [resumeApplied, setResumeApplied] = useState(false);

  const isFavorite = tutorial ? favorites.includes(tutorial.id) : false;

  const { previous, next } = useMemo(() => {
    if (!tutorial) return { previous: null, next: null };
    const index = related.findIndex((item) => item.id === tutorial.id);
    return {
      previous: index > 0 ? related[index - 1] : null,
      next: index >= 0 && index < related.length - 1 ? related[index + 1] : null,
    };
  }, [related, tutorial]);

  const saveProgress = useCallback(
    (position: number, duration: number) => {
      if (!tutorial?.id || position <= 0) return;
      tutorialProgressService
        .saveProgress(tutorial.id, position, duration)
        .catch(() => {
          /* progresso é acessório: falha silenciosa não interrompe a aula */
        });
    },
    [tutorial?.id]
  );

  const handleTimeUpdate = useCallback(
    (current: number, duration: number) => {
      const now = Date.now();
      if (now - lastSavedRef.current < PROGRESS_SAVE_INTERVAL_MS) return;
      lastSavedRef.current = now;
      saveProgress(current, duration);
    },
    [saveProgress]
  );

  const handleWatchThreshold = useCallback(() => {
    if (!tutorial?.id) return;
    tutorialProgressService.registerView(tutorial.id).catch(() => {
      /* contador é acessório */
    });
  }, [tutorial?.id]);

  // Avisa que a reprodução vai retomar, com saída para começar do início.
  useEffect(() => {
    if (!progress || resumeApplied || !progress.position_seconds) return;
    setResumeApplied(true);
    if (progress.position_seconds > 5 && !progress.completed) {
      toast(`Retomando de ${formatDuration(progress.position_seconds)}`, {
        action: {
          label: "Começar do início",
          onClick: () => {
            if (tutorial?.id) tutorialProgressService.saveProgress(tutorial.id, 0, tutorial.duration_seconds);
            navigate(0);
          },
        },
      });
    }
  }, [progress, resumeApplied, tutorial, navigate]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link. Copie da barra de endereços.");
    }
  };

  const shareLink = async () => {
    if (!navigator.share) {
      copyLink();
      return;
    }
    try {
      await navigator.share({ title: tutorial?.title, url: window.location.href });
    } catch {
      /* usuário cancelou o compartilhamento */
    }
  };

  if (isLoading) return <WatchSkeleton />;

  if (isError || !tutorial) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-dashed border-border p-10 text-center">
        <h1 className="text-lg font-medium">Tutorial não encontrado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O vídeo pode ter sido despublicado ou o link está incorreto.
        </p>
        <Button asChild className="mt-4">
          <Link to="/tutoriais">Voltar para Tutoriais</Link>
        </Button>
      </div>
    );
  }

  const startAt = progress && !progress.completed ? progress.position_seconds : 0;

  return (
    <div className="w-full space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tutoriais">Tutoriais</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {tutorial.category && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/tutoriais">{tutorial.category.name}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="line-clamp-1">{tutorial.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {videoUrl ? (
            <TutorialPlayer
              src={videoUrl}
              isHls={Boolean(tutorial.hls_path)}
              poster={tutorial.thumbnail_url}
              title={tutorial.title}
              startAt={startAt}
              onTimeUpdate={handleTimeUpdate}
              onPause={saveProgress}
              onEnded={(duration) => saveProgress(duration, duration)}
              onWatchThreshold={handleWatchThreshold}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground">
              Este tutorial ainda não tem vídeo disponível.
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-semibold leading-snug">{tutorial.title}</h1>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  aria-pressed={isFavorite}
                  onClick={() => toggleFavorite.mutate({ tutorialId: tutorial.id, favorite: !isFavorite })}
                >
                  <Bookmark className={isFavorite ? "mr-1.5 h-4 w-4 fill-current" : "mr-1.5 h-4 w-4"} aria-hidden />
                  {isFavorite ? "Salvo" : "Salvar"}
                </Button>
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Link2 className="mr-1.5 h-4 w-4" aria-hidden />
                  Copiar URL
                </Button>
                <Button variant="outline" size="sm" onClick={shareLink}>
                  <Share2 className="mr-1.5 h-4 w-4" aria-hidden />
                  Compartilhar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {tutorial.category && <Badge variant="secondary" className="font-normal">{tutorial.category.name}</Badge>}
              <Badge variant="outline" className="font-normal">{getModuleLabel(tutorial.module_key)}</Badge>
              <span className="tabular-nums">{formatDuration(tutorial.duration_seconds)}</span>
              <span aria-hidden>·</span>
              <span className="flex items-center gap-1 tabular-nums">
                <Eye className="h-3.5 w-3.5" aria-hidden />
                {formatViews(tutorial.views_count)}
              </span>
              <span aria-hidden>·</span>
              <span>{formatDate(tutorial.published_at)}</span>
              {tutorial.author?.name && (
                <>
                  <span aria-hidden>·</span>
                  <span>por {tutorial.author.name}</span>
                </>
              )}
            </div>

            {tutorial.full_description && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {tutorial.full_description}
              </p>
            )}

            {tutorial.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tutorial.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="font-normal text-muted-foreground">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={!previous}
                onClick={() => previous && navigate(`/tutoriais/${previous.slug}`)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={!next}
                onClick={() => next && navigate(`/tutoriais/${next.slug}`)}
              >
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <RelatedVideos tutorials={related} currentId={tutorial.id} />
        </aside>
      </div>
    </div>
  );
}

function WatchSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
