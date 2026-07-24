import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { tutorialsService } from "../services/tutorialsService";
import { tutorialProgressService } from "../services/tutorialProgressService";
import type { Tutorial, TutorialFilters, TutorialWithProgress } from "../types";

export const tutorialKeys = {
  all: ["tutorials"] as const,
  catalog: (filters: TutorialFilters) => ["tutorials", "catalog", filters] as const,
  detail: (slug: string) => ["tutorials", "detail", slug] as const,
  siblings: (moduleKey: string | null, categoryId: string | null) =>
    ["tutorials", "siblings", moduleKey, categoryId] as const,
  categories: ["tutorials", "categories"] as const,
  progress: ["tutorials", "progress"] as const,
  favorites: ["tutorials", "favorites"] as const,
  videoUrl: (id: string) => ["tutorials", "video-url", id] as const,
  admin: (filters: unknown) => ["tutorials", "admin", filters] as const,
  authors: ["tutorials", "authors"] as const,
};

export const useTutorialCategories = () =>
  useQuery({
    queryKey: tutorialKeys.categories,
    queryFn: () => tutorialsService.listCategories(),
    staleTime: 30 * 60 * 1000,
  });

/** Progresso do usuário em todos os vídeos — base da trilha e do "continuar". */
export const useMyProgress = () =>
  useQuery({
    queryKey: tutorialKeys.progress,
    queryFn: () => tutorialProgressService.listMyProgress(),
    staleTime: 60 * 1000,
  });

export const useModuleIndex = () =>
  useQuery({
    queryKey: [...tutorialKeys.all, "module-index"],
    queryFn: () => tutorialsService.listModuleIndex(),
    staleTime: 5 * 60 * 1000,
  });

export const useMyFavorites = () =>
  useQuery({
    queryKey: tutorialKeys.favorites,
    queryFn: () => tutorialProgressService.listMyFavorites(),
    staleTime: 60 * 1000,
  });

/**
 * Catálogo paginado com infinite scroll. O progresso e os favoritos vêm de
 * queries próprias e são combinados aqui, evitando N+1 por card.
 */
export const useTutorials = (filters: TutorialFilters) => {
  const query = useInfiniteQuery({
    queryKey: tutorialKeys.catalog(filters),
    queryFn: ({ pageParam = 0 }) => tutorialsService.listPublished(filters, pageParam as number),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const { data: progress } = useMyProgress();
  const { data: favorites } = useMyFavorites();

  const items = useMemo<TutorialWithProgress[]>(() => {
    const flat = query.data?.pages.flatMap((page) => page.items) ?? [];
    return decorate(flat, progress, favorites);
  }, [query.data, progress, favorites]);

  return {
    ...query,
    items,
    total: query.data?.pages[0]?.total ?? 0,
  };
};

/**
 * Vídeos começados e não concluídos, independentes dos filtros do catálogo.
 * Os ids vêm do progresso; os metadados são buscados em uma consulta só.
 */
export const useContinueWatching = () => {
  const { data: progress } = useMyProgress();

  const started = useMemo(
    () => (progress ?? []).filter((entry) => !entry.completed && entry.position_seconds > 5).slice(0, 8),
    [progress]
  );
  const ids = started.map((entry) => entry.tutorial_id);

  const query = useQuery({
    queryKey: [...tutorialKeys.all, "continue", ids],
    queryFn: () => tutorialsService.listByIds(ids),
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });

  const items = useMemo<TutorialWithProgress[]>(() => {
    const byId = new Map((query.data ?? []).map((tutorial) => [tutorial.id, tutorial]));
    // Mantém a ordem do progresso (mais recente primeiro).
    const ordered = started
      .map((entry) => byId.get(entry.tutorial_id))
      .filter((tutorial): tutorial is Tutorial => Boolean(tutorial));
    return decorate(ordered, progress, undefined);
  }, [query.data, started, progress]);

  return items;
};

export function decorate(
  tutorials: Tutorial[],
  progress: { tutorial_id: string; position_seconds: number; duration_seconds: number | null; completed: boolean }[] | undefined,
  favorites: string[] | undefined
): TutorialWithProgress[] {
  const progressById = new Map((progress ?? []).map((p) => [p.tutorial_id, p]));
  const favoriteIds = new Set(favorites ?? []);

  return tutorials.map((tutorial) => {
    const entry = progressById.get(tutorial.id);
    const duration = entry?.duration_seconds || tutorial.duration_seconds || 0;
    const percent = entry && duration > 0 ? Math.min(100, (entry.position_seconds / duration) * 100) : 0;

    return {
      ...tutorial,
      progress_seconds: entry?.position_seconds ?? 0,
      progress_percent: entry?.completed ? 100 : percent,
      completed: entry?.completed ?? false,
      is_favorite: favoriteIds.has(tutorial.id),
    };
  });
}
