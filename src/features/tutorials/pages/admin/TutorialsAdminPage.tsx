import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABELS, SYSTEM_MODULES } from "../../constants";
import { TutorialSearch } from "../../components/TutorialSearch";
import { TutorialForm } from "../../components/admin/TutorialForm";
import { TutorialTable } from "../../components/admin/TutorialTable";
import { useAdminTutorials, useTutorialAuthors } from "../../hooks/useTutorialAdmin";
import { useTutorialCategories } from "../../hooks/useTutorials";
import type { AdminTutorialFilters, Tutorial, TutorialStatus } from "../../types";

const ALL = "__all__";
const PAGE_SIZE = 10;

export default function TutorialsAdminPage() {
  const [filters, setFilters] = useState<AdminTutorialFilters>({
    search: "",
    categoryId: null,
    moduleKey: null,
    status: null,
    authorId: null,
    page: 0,
    pageSize: PAGE_SIZE,
    sortBy: "created_at",
    sortDir: "desc",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Tutorial | null>(null);

  const { data: categories = [] } = useTutorialCategories();
  const { data: authors = [] } = useTutorialAuthors();
  const { data, isLoading } = useAdminTutorials(filters);

  const tutorials = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  // Trocar de filtro sempre volta para a primeira página.
  useEffect(() => {
    setFilters((current) => (current.page === 0 ? current : { ...current, page: 0 }));
  }, [filters.search, filters.categoryId, filters.moduleKey, filters.status, filters.authorId]);

  const update = (patch: Partial<AdminTutorialFilters>) =>
    setFilters((current) => ({ ...current, ...patch }));

  const handleSort = (column: NonNullable<AdminTutorialFilters["sortBy"]>) =>
    setFilters((current) => ({
      ...current,
      sortBy: column,
      sortDir: current.sortBy === column && current.sortDir === "desc" ? "asc" : "desc",
    }));

  const range = useMemo(() => {
    if (!total) return "0 tutoriais";
    const start = filters.page * filters.pageSize + 1;
    const end = Math.min((filters.page + 1) * filters.pageSize, total);
    return `${start}–${end} de ${total}`;
  }, [filters.page, filters.pageSize, total]);

  return (
    <div className="w-full space-y-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tutoriais">Tutoriais</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Upload</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gestão de tutoriais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie vídeos, edite os dados do catálogo e controle o que está publicado.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Novo tutorial
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <TutorialSearch
          value={filters.search ?? ""}
          onChange={(search) => update({ search })}
          placeholder="Pesquisar por título ou tag..."
        />

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
          <SelectTrigger className="h-9 w-[190px]" aria-label="Filtrar por módulo">
            <SelectValue placeholder="Módulo" />
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
          value={filters.status ?? ALL}
          onValueChange={(value) => update({ status: value === ALL ? null : (value as TutorialStatus) })}
        >
          <SelectTrigger className="h-9 w-[150px]" aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.authorId ?? ALL}
          onValueChange={(value) => update({ authorId: value === ALL ? null : value })}
        >
          <SelectTrigger className="h-9 w-[180px]" aria-label="Filtrar por autor">
            <SelectValue placeholder="Autor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os autores</SelectItem>
            {authors.map((author) => (
              <SelectItem key={author.id} value={author.id}>
                {author.name || "Sem nome"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <TutorialTable
        tutorials={tutorials}
        isLoading={isLoading}
        sortBy={filters.sortBy ?? "created_at"}
        sortDir={filters.sortDir ?? "desc"}
        onSortChange={handleSort}
        onEdit={(tutorial) => {
          setEditing(tutorial);
          setFormOpen(true);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs tabular-nums text-muted-foreground">{range}</p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={filters.page === 0}
                className={filters.page === 0 ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  update({ page: Math.max(0, filters.page - 1) });
                }}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="px-3 text-sm tabular-nums text-muted-foreground">
                {filters.page + 1} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={filters.page + 1 >= totalPages}
                className={filters.page + 1 >= totalPages ? "pointer-events-none opacity-50" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  update({ page: Math.min(totalPages - 1, filters.page + 1) });
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <TutorialForm open={formOpen} onOpenChange={setFormOpen} tutorial={editing} />
    </div>
  );
}
