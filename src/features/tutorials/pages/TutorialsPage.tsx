import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ContinueWatching } from "../components/ContinueWatching";
import { ModuleTrail } from "../components/ModuleTrail";
import { buildModuleStats } from "../utils/moduleStats";
import { TutorialCard } from "../components/TutorialCard";
import { TutorialGridSkeleton } from "../components/TutorialCardSkeleton";
import { TutorialEmptyState, TutorialErrorState } from "../components/TutorialEmptyState";
import { TutorialFilters } from "../components/TutorialFilters";
import { TutorialSearch } from "../components/TutorialSearch";
import { useToggleFavorite } from "../hooks/useTutorialFavorites";
import {
  useContinueWatching,
  useModuleIndex,
  useMyProgress,
  useTutorialCategories,
  useTutorials,
} from "../hooks/useTutorials";
import type { TutorialFilters as Filters } from "../types";

const INITIAL_FILTERS: Filters = {
  search: "",
  categoryId: null,
  moduleKey: null,
  duration: null,
  sort: "recent",
  onlyFavorites: false,
};

export default function TutorialsPage() {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  const { data: categories = [] } = useTutorialCategories();
  const { data: progress } = useMyProgress();
  const { data: moduleIndex = [] } = useModuleIndex();
  const toggleFavorite = useToggleFavorite();

  const {
    items,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTutorials(filters);

  const moduleStats = useMemo(() => buildModuleStats(moduleIndex, progress), [moduleIndex, progress]);

  // O filtro de favoritos é local: a lista de ids já está em cache.
  const visibleItems = useMemo(
    () => (filters.onlyFavorites ? items.filter((item) => item.is_favorite) : items),
    [items, filters.onlyFavorites]
  );

  const continueWatching = useContinueWatching();

  const sentinelRef = useInfiniteScroll(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  });

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tutoriais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aprenda a utilizar o AI Center E7 através de vídeos rápidos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TutorialSearch
            value={filters.search ?? ""}
            onChange={(search) => setFilters((current) => ({ ...current, search }))}
          />
          {hasPermission("admin") && (
            <Button asChild variant="outline">
              <NavLink to="/admin/tutoriais">
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                Gerenciar
              </NavLink>
            </Button>
          )}
        </div>
      </header>

      <ModuleTrail
        countsByModule={moduleStats.counts}
        completedByModule={moduleStats.completed}
        selectedModule={filters.moduleKey ?? null}
        onSelect={(moduleKey) => setFilters((current) => ({ ...current, moduleKey }))}
      />

      <TutorialFilters filters={filters} categories={categories} onChange={setFilters} />

      {continueWatching.length > 0 && <ContinueWatching tutorials={continueWatching} />}

      {isError ? (
        <TutorialErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <TutorialGridSkeleton />
      ) : visibleItems.length === 0 ? (
        <EmptyCatalog filters={filters} onClear={() => setFilters(INITIAL_FILTERS)} isAdmin={hasPermission("admin")} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {visibleItems.map((tutorial) => (
              <TutorialCard
                key={tutorial.id}
                tutorial={tutorial}
                onToggleFavorite={(item) =>
                  toggleFavorite.mutate({ tutorialId: item.id, favorite: !item.is_favorite })
                }
              />
            ))}
          </div>

          {isFetchingNextPage && <TutorialGridSkeleton count={4} />}
          <div ref={sentinelRef} aria-hidden className="h-px" />
        </>
      )}
    </div>
  );
}

function EmptyCatalog({
  filters,
  onClear,
  isAdmin,
}: {
  filters: Filters;
  onClear: () => void;
  isAdmin: boolean;
}) {
  const hasFilters =
    Boolean(filters.search) ||
    Boolean(filters.categoryId) ||
    Boolean(filters.moduleKey) ||
    Boolean(filters.duration) ||
    Boolean(filters.onlyFavorites);

  if (hasFilters) {
    return (
      <TutorialEmptyState
        title="Nenhum vídeo com esses filtros"
        description="Ajuste a pesquisa ou volte para a lista completa."
        actionLabel="Limpar filtros"
        onAction={onClear}
      />
    );
  }

  return (
    <TutorialEmptyState
      title="Ainda não há tutoriais publicados"
      description={
        isAdmin
          ? "Envie o primeiro vídeo para que a equipe comece a aprender pela plataforma."
          : "Assim que a equipe publicar os primeiros vídeos, eles aparecem aqui."
      }
      actionLabel={isAdmin ? "Enviar tutorial" : undefined}
      actionTo={isAdmin ? "/admin/tutoriais" : undefined}
    />
  );
}

/** Observa o fim da lista para carregar a próxima página. */
function useInfiniteScroll(onReachEnd: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onReachEnd);
  callbackRef.current = onReachEnd;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) callbackRef.current();
      },
      // Antecipa o carregamento antes de o usuário chegar no fim.
      { rootMargin: "400px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}
