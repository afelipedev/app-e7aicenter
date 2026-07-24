import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
  Video,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS, getModuleLabel } from "../../constants";
import { useDeleteTutorial, useDuplicateTutorial, useSetTutorialStatus } from "../../hooks/useTutorialAdmin";
import type { Tutorial } from "../../types";
import { formatDate } from "../../utils/format";

interface TutorialTableProps {
  tutorials: Tutorial[];
  isLoading: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  onSortChange: (column: "created_at" | "title" | "views_count" | "published_at") => void;
  onEdit: (tutorial: Tutorial) => void;
}

export function TutorialTable({
  tutorials,
  isLoading,
  sortBy,
  sortDir,
  onSortChange,
  onEdit,
}: TutorialTableProps) {
  const [pendingDeletion, setPendingDeletion] = useState<Tutorial | null>(null);
  const setStatus = useSetTutorialStatus();
  const duplicate = useDuplicateTutorial();
  const remove = useDeleteTutorial();

  const columns = useMemo<ColumnDef<Tutorial>[]>(
    () => [
      {
        id: "thumbnail",
        header: () => <span className="sr-only">Capa</span>,
        cell: ({ row }) => (
          <div className="h-10 w-16 overflow-hidden rounded bg-muted">
            {row.original.thumbnail_url ? (
              <img src={row.original.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Video className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "title",
        header: () => <SortableHeader label="Título" column="title" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{row.original.title}</p>
            {row.original.short_description && (
              <p className="truncate text-xs text-muted-foreground">{row.original.short_description}</p>
            )}
          </div>
        ),
      },
      {
        id: "category",
        header: "Categoria",
        cell: ({ row }) => row.original.category?.name ?? "—",
      },
      {
        id: "module",
        header: "Módulo",
        cell: ({ row }) => getModuleLabel(row.original.module_key),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.status === "publicado" ? "default" : "secondary"} className="font-normal">
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "published_at",
        header: () => (
          <SortableHeader label="Publicado" column="published_at" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
        ),
        cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.published_at)}</span>,
      },
      {
        accessorKey: "views_count",
        header: () => (
          <SortableHeader label="Visualizações" column="views_count" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.views_count}
            <span className="text-muted-foreground"> ({row.original.unique_views_count} únicas)</span>
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: () => (
          <SortableHeader label="Data upload" column="created_at" sortBy={sortBy} sortDir={sortDir} onSort={onSortChange} />
        ),
        cell: ({ row }) => <span className="tabular-nums">{formatDate(row.original.created_at)}</span>,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Ações</span>,
        cell: ({ row }) => {
          const tutorial = row.original;
          const isPublished = tutorial.status === "publicado";

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Ações para ${tutorial.title}`}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/tutoriais/${tutorial.slug}`}>
                    <Eye className="mr-2 h-4 w-4" aria-hidden />
                    Visualizar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(tutorial)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => duplicate.mutate(tutorial.id)}>
                  <Copy className="mr-2 h-4 w-4" aria-hidden />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    setStatus.mutate({ id: tutorial.id, status: isPublished ? "rascunho" : "publicado" })
                  }
                >
                  {isPublished ? (
                    <>
                      <EyeOff className="mr-2 h-4 w-4" aria-hidden />
                      Despublicar
                    </>
                  ) : (
                    <>
                      <Eye className="mr-2 h-4 w-4" aria-hidden />
                      Publicar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setPendingDeletion(tutorial)}>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [duplicate, onEdit, onSortChange, setStatus, sortBy, sortDir]
  );

  const table = useReactTable({
    data: tutorials,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
  });

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((_column, columnIndex) => (
                    <TableCell key={columnIndex}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-muted-foreground">
                  Nenhum tutorial encontrado com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="max-w-[280px]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={Boolean(pendingDeletion)} onOpenChange={(open) => !open && setPendingDeletion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{pendingDeletion?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              O vídeo e a capa saem do Storage e o histórico de visualizações é perdido. Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeletion) remove.mutate(pendingDeletion);
                setPendingDeletion(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortDir,
  onSort,
}: {
  label: string;
  column: "created_at" | "title" | "views_count" | "published_at";
  sortBy: string;
  sortDir: "asc" | "desc";
  onSort: (column: "created_at" | "title" | "views_count" | "published_at") => void;
}) {
  const isActive = sortBy === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-left font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Ordenar por ${label}`}
      aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      {label}
      <ArrowUpDown className={isActive ? "h-3 w-3 text-foreground" : "h-3 w-3 opacity-40"} aria-hidden />
    </button>
  );
}
