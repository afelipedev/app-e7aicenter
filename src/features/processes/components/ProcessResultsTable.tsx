import { MoreHorizontal, Star, Eye, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ProcessSummary } from "../types";
import { ProcessStatusBadge } from "./ProcessStatusBadge";

interface ProcessResultsTableProps {
  title: string;
  helper: string;
  items: ProcessSummary[];
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpenDetails: (processId: string) => void;
  onToggleFavorite: (processId: string) => void;
  onDelete: (processId: string) => void;
  onToggleMonitoring?: (processId: string) => void;
  emptyMessage: string;
}

export function ProcessResultsTable({
  title,
  helper,
  items,
  page,
  totalPages,
  total,
  onPageChange,
  onOpenDetails,
  onToggleFavorite,
  onDelete,
  onToggleMonitoring,
  emptyMessage,
}: ProcessResultsTableProps) {
  const paginationRange = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, page - 2),
    Math.max(0, page - 2) + 5,
  );

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{helper}</p>
        </div>
        <Badge variant="outline">{total} processos</Badge>
      </div>

      <div className="block sm:hidden">
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted-foreground">{emptyMessage}</div>
        ) : (
          <div className="space-y-3 p-4">
            {items.map((process) => (
              <Card key={process.id} className="p-4 shadow-none">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Button
                      variant="link"
                      className="h-auto p-0 text-left text-base font-semibold text-foreground whitespace-normal"
                      onClick={() => onOpenDetails(process.id)}
                    >
                      {process.activeParty} x {process.passiveParty}
                    </Button>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="break-all font-mono">{process.cnj}</span>
                      <span>{process.tribunal}</span>
                      {process.historyContext ? (
                        <Badge variant="secondary" className="max-w-full whitespace-normal">
                          {process.historyContext.type}: {process.historyContext.value}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Grau</p>
                      <p className="mt-1 font-medium">{process.grade}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Criado em</p>
                      <p className="mt-1 font-medium">{process.createdAt}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Status</p>
                      <div className="mt-1">
                        <ProcessStatusBadge status={process.status} />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Favoritar processo"
                      onClick={() => onToggleFavorite(process.id)}
                    >
                      <Star
                        className={`h-4 w-4 ${process.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                      />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Mais ações">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOpenDetails(process.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver consulta
                        </DropdownMenuItem>
                        {onToggleMonitoring ? (
                          <DropdownMenuItem onClick={() => onToggleMonitoring(process.id)}>
                            <Bell className="mr-2 h-4 w-4" />
                            {process.monitored ? "Desativar monitoramento" : "Ativar monitoramento"}
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(process.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir consulta
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identificação</TableHead>
              <TableHead>Grau do processo</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((process) => (
                <TableRow key={process.id}>
                  <TableCell className="min-w-[320px]">
                    <div className="space-y-2">
                      <Button
                        variant="link"
                        className="h-auto whitespace-normal p-0 text-left text-base font-semibold text-foreground"
                        onClick={() => onOpenDetails(process.id)}
                      >
                        {process.activeParty} x {process.passiveParty}
                      </Button>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{process.cnj}</span>
                        <span>{process.tribunal}</span>
                        {process.historyContext ? (
                          <Badge variant="secondary">
                            {process.historyContext.type}: {process.historyContext.value}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{process.grade}</TableCell>
                  <TableCell>{process.createdAt}</TableCell>
                  <TableCell>
                    <ProcessStatusBadge status={process.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Favoritar processo"
                        onClick={() => onToggleFavorite(process.id)}
                      >
                        <Star
                          className={`h-4 w-4 ${process.favorite ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                        />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Mais ações">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenDetails(process.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver consulta
                          </DropdownMenuItem>
                          {onToggleMonitoring ? (
                            <DropdownMenuItem onClick={() => onToggleMonitoring(process.id)}>
                              <Bell className="mr-2 h-4 w-4" />
                              {process.monitored ? "Desativar monitoramento" : "Ativar monitoramento"}
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem className="text-red-600" onClick={() => onDelete(process.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir consulta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {items.length > 0 ? (
        <div className="border-t px-5 py-4">
          <Pagination className="justify-center sm:justify-between">
            <PaginationContent className="flex-wrap justify-center gap-y-2">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  className="text-xs sm:text-sm"
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) {
                      onPageChange(page - 1);
                    }
                  }}
                />
              </PaginationItem>

              {paginationRange.map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === page}
                    className="h-8 w-8 text-xs sm:h-9 sm:w-9 sm:text-sm"
                    onClick={(event) => {
                      event.preventDefault();
                      onPageChange(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  className="text-xs sm:text-sm"
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < totalPages) {
                      onPageChange(page + 1);
                    }
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </Card>
  );
}
