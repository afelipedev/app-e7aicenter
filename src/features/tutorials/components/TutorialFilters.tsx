import { Bookmark, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DURATION_BUCKETS,
  SORT_OPTIONS,
  SYSTEM_MODULES,
  type DurationBucket,
  type TutorialSort,
} from "../constants";
import type { TutorialCategory, TutorialFilters as Filters } from "../types";

const ALL = "__all__";

interface TutorialFiltersProps {
  filters: Filters;
  categories: TutorialCategory[];
  onChange: (filters: Filters) => void;
}

export function TutorialFilters({ filters, categories, onChange }: TutorialFiltersProps) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  const hasActiveFilters =
    Boolean(filters.categoryId) ||
    Boolean(filters.moduleKey) ||
    Boolean(filters.duration) ||
    Boolean(filters.onlyFavorites) ||
    Boolean(filters.search);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SlidersHorizontal className="h-4 w-4 text-muted-foreground" aria-hidden />

      <Select
        value={filters.categoryId ?? ALL}
        onValueChange={(value) => update({ categoryId: value === ALL ? null : value })}
      >
        <SelectTrigger className="h-9 w-[170px]" aria-label="Filtrar por categoria">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as categorias</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.moduleKey ?? ALL}
        onValueChange={(value) => update({ moduleKey: value === ALL ? null : value })}
      >
        <SelectTrigger className="h-9 w-[190px]" aria-label="Filtrar por módulo do sistema">
          <SelectValue placeholder="Módulo do sistema" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os módulos</SelectItem>
          {SYSTEM_MODULES.map((module) => (
            <SelectItem key={module.key} value={module.key}>
              {module.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.duration ?? ALL}
        onValueChange={(value) => update({ duration: value === ALL ? null : (value as DurationBucket) })}
      >
        <SelectTrigger className="h-9 w-[150px]" aria-label="Filtrar por duração">
          <SelectValue placeholder="Duração" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Qualquer duração</SelectItem>
          {DURATION_BUCKETS.map((bucket) => (
            <SelectItem key={bucket.value} value={bucket.value}>
              {bucket.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.sort ?? "recent"} onValueChange={(value) => update({ sort: value as TutorialSort })}>
        <SelectTrigger className="h-9 w-[170px]" aria-label="Ordenar tutoriais">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={filters.onlyFavorites ? "default" : "outline"}
        size="sm"
        className="h-9"
        aria-pressed={Boolean(filters.onlyFavorites)}
        onClick={() => update({ onlyFavorites: !filters.onlyFavorites })}
      >
        <Bookmark className={cn("mr-1.5 h-3.5 w-3.5", filters.onlyFavorites && "fill-current")} aria-hidden />
        Favoritos
      </Button>

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground"
          onClick={() =>
            onChange({ search: "", categoryId: null, moduleKey: null, duration: null, sort: "recent", onlyFavorites: false })
          }
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
