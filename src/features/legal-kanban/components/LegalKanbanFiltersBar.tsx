import { Filter, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEGAL_KANBAN_STATUS_META } from "../constants";
import type { LegalKanbanFiltersState, LegalKanbanLabel, LegalKanbanUser } from "../types";
import { cn } from "@/lib/utils";

interface LegalKanbanFiltersBarProps {
  members: LegalKanbanUser[];
  labels: LegalKanbanLabel[];
  filters: LegalKanbanFiltersState;
  filteredCardsCount: number;
  totalCardsCount: number;
  onChange: (next: LegalKanbanFiltersState) => void;
  onReset: () => void;
}

export function LegalKanbanFiltersBar({
  members,
  labels,
  filters,
  filteredCardsCount,
  totalCardsCount,
  onChange,
  onReset,
}: LegalKanbanFiltersBarProps) {
  const activeFiltersCount =
    Number(Boolean(filters.search)) +
    Number(filters.memberMode !== "all") +
    Number(filters.memberIds.length > 0) +
    Number(filters.statuses.length > 0) +
    Number(filters.labelIds.length > 0) +
    Number(filters.dueFilter !== "all");

  return (
    <div className="min-w-0 space-y-4 rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filtros do board
          </div>
          <p className="text-sm text-muted-foreground">
            Exibindo <span className="font-semibold text-foreground">{filteredCardsCount}</span> de{" "}
            <span className="font-semibold text-foreground">{totalCardsCount}</span> cards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
            {activeFiltersCount} filtros ativos
          </Badge>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onReset}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_200px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Buscar por título, descrição ou número do card"
            className="h-11 rounded-full border-border/70 pl-11"
          />
        </div>

        <Select
          value={filters.memberMode}
          onValueChange={(value: LegalKanbanFiltersState["memberMode"]) =>
            onChange({
              ...filters,
              memberMode: value,
              memberIds: value === "specificMembers" ? filters.memberIds : [],
            })
          }
        >
          <SelectTrigger className="h-11 rounded-full border-border/70">
            <SelectValue placeholder="Filtrar membros" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os membros</SelectItem>
            <SelectItem value="unassigned">Sem membros</SelectItem>
            <SelectItem value="assignedToMe">Atribuídos a mim</SelectItem>
            <SelectItem value="specificMembers">Membros específicos</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.dueFilter}
          onValueChange={(value: LegalKanbanFiltersState["dueFilter"]) =>
            onChange({ ...filters, dueFilter: value })
          }
        >
          <SelectTrigger className="h-11 rounded-full border-border/70">
            <SelectValue placeholder="Prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os prazos</SelectItem>
            <SelectItem value="none">Sem datas</SelectItem>
            <SelectItem value="overdue">Em atraso</SelectItem>
            <SelectItem value="day">Entrega em 1 dia</SelectItem>
            <SelectItem value="week">Entrega em 1 semana</SelectItem>
            <SelectItem value="month">Entrega em 1 mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filters.memberMode === "specificMembers" ? (
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-3">
            {members.map((member) => {
              const selected = filters.memberIds.includes(member.id);
              return (
                <Button
                  key={member.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn("rounded-full", selected && "border-primary bg-primary/10 text-primary")}
                  onClick={() =>
                    onChange({
                      ...filters,
                      memberIds: selected
                        ? filters.memberIds.filter((item) => item !== member.id)
                        : [...filters.memberIds, member.id],
                    })
                  }
                >
                  {member.name}
                </Button>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : null}

      <div className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Status</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LEGAL_KANBAN_STATUS_META).map(([status, meta]) => {
              const selected = filters.statuses.includes(status as LegalKanbanFiltersState["statuses"][number]);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      statuses: selected
                        ? filters.statuses.filter((item) => item !== status)
                        : [...filters.statuses, status as LegalKanbanFiltersState["statuses"][number]],
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    selected ? meta.chip : "border-border/70 bg-background text-muted-foreground",
                  )}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Etiquetas</p>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-3">
              {labels.length === 0 ? (
                <div className="rounded-full border border-dashed border-border/70 px-4 py-2 text-sm text-muted-foreground">
                  Nenhuma etiqueta criada ainda
                </div>
              ) : (
                labels.map((label) => {
                  const selected = filters.labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...filters,
                          labelIds: selected
                            ? filters.labelIds.filter((item) => item !== label.id)
                            : [...filters.labelIds, label.id],
                        })
                      }
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-transform hover:-translate-y-0.5",
                        selected ? "border-transparent text-white shadow-sm" : "border-border/70 bg-background",
                      )}
                      style={{
                        backgroundColor: selected ? label.color : undefined,
                      }}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      {label.name}
                    </button>
                  );
                })
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>

      {activeFiltersCount > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filters.search ? <Badge variant="secondary">Busca: {filters.search}</Badge> : null}
          {filters.dueFilter !== "all" ? <Badge variant="secondary">Prazo: {filters.dueFilter}</Badge> : null}
          {filters.memberMode !== "all" ? <Badge variant="secondary">Membros: {filters.memberMode}</Badge> : null}
          {filters.statuses.map((status) => (
            <Badge key={status} variant="secondary" className="gap-1">
              {LEGAL_KANBAN_STATUS_META[status].label}
              <button
                type="button"
                onClick={() =>
                  onChange({ ...filters, statuses: filters.statuses.filter((item) => item !== status) })
                }
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
