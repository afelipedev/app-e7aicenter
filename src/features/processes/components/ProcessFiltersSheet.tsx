import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { processTags } from "../constants";
import type { ProcessFilterOptions, ProcessFilters, ProcessPartySide, ProcessTag } from "../types";

interface ProcessFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ProcessFilters;
  onFiltersChange: (filters: ProcessFilters) => void;
  onApply: () => void;
  onClear: () => void;
  filterOptions: ProcessFilterOptions;
}

const partySides: Array<ProcessPartySide> = ["Ativo", "Passivo", "Interessado"];

interface FilterTagMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

function FilterTagMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Selecione...",
}: FilterTagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const add = (value: string) => {
    if (!selected.includes(value)) {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  const available = options.filter((o) => !selected.includes(o));

  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {selected.map((value) => (
          <Badge
            key={value}
            variant="secondary"
            className="max-w-full shrink-0 cursor-pointer gap-1 pr-1 hover:bg-secondary/80"
            onClick={() => remove(value)}
            title={value}
          >
            <span className="block max-w-[120px] truncate sm:max-w-[180px]">{value}</span>
            <X className="h-3 w-3 shrink-0" />
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1 border-dashed"
            >
              Adicionar
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="flex min-w-[200px] w-[min(calc(100vw-2rem),320px)] max-w-[320px] flex-col overflow-hidden p-0"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <Command className="max-h-[min(360px,60vh)]">
              <CommandInput placeholder={placeholder} />
              <CommandList className="min-h-0 max-h-[min(280px,45vh)] overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y">
                <CommandEmpty>Nenhuma opção disponível.</CommandEmpty>
                <CommandGroup>
                  {available.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => {
                        add(opt);
                      }}
                      className="break-words"
                    >
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function ProcessFiltersSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  filterOptions,
}: ProcessFiltersSheetProps) {
  const updateFilters = <K extends keyof ProcessFilters>(key: K, value: ProcessFilters[K]) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const toggleTag = (tag: ProcessTag) => {
    const nextTags = filters.tags.includes(tag)
      ? filters.tags.filter((currentTag) => currentTag !== tag)
      : [...filters.tags, tag];

    updateFilters("tags", nextTags);
  };

  const togglePartySide = (side: ProcessPartySide) => {
    const next = filters.partySides.includes(side)
      ? filters.partySides.filter((s) => s !== side)
      : [...filters.partySides, side];

    updateFilters("partySides", next);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-[100vw] flex-col overflow-y-auto px-4 pb-6 pt-6 sm:max-w-xl sm:px-6"
      >
        <SheetHeader>
          <SheetTitle>Filtros da consulta</SheetTitle>
          <SheetDescription>
            Combine os filtros para segmentar a listagem e encontrar processos com mais precisão em qualquer tamanho de tela.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 min-w-0 space-y-6">
          <div className="space-y-3">
            <Label>Tags</Label>
            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {processTags.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant={filters.tags.includes(tag) ? "default" : "outline"}
                  className="w-full justify-start whitespace-normal text-left sm:w-auto"
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          <FilterTagMultiSelect
            label="Tribunal"
            options={filterOptions.tribunals}
            selected={filters.tribunals}
            onChange={(selected) => updateFilters("tribunals", selected)}
            placeholder="Buscar tribunal..."
          />

          <FilterTagMultiSelect
            label="Classe processual"
            options={filterOptions.classesProcessuais}
            selected={filters.classesProcessuais}
            onChange={(selected) => updateFilters("classesProcessuais", selected)}
            placeholder="Buscar classe..."
          />

          <FilterTagMultiSelect
            label="Nome da parte"
            options={filterOptions.partyNames}
            selected={filters.partyNames}
            onChange={(selected) => updateFilters("partyNames", selected)}
            placeholder="Buscar nome..."
          />

          <div className="min-w-0 space-y-2">
            <Label>Lado da parte</Label>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {partySides.map((side) => (
                <Button
                  key={side}
                  type="button"
                  variant={filters.partySides.includes(side) ? "default" : "outline"}
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => togglePartySide(side)}
                >
                  {side}
                </Button>
              ))}
            </div>
          </div>

          <FilterTagMultiSelect
            label="Documento da parte"
            options={filterOptions.partyDocuments}
            selected={filters.partyDocuments}
            onChange={(selected) => updateFilters("partyDocuments", selected)}
            placeholder="Buscar documento..."
          />

          <FilterTagMultiSelect
            label="Assuntos"
            options={filterOptions.assuntos}
            selected={filters.assuntos}
            onChange={(selected) => updateFilters("assuntos", selected)}
            placeholder="Buscar assunto..."
          />

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <Label htmlFor="distributedFrom">Data da distribuição inicial</Label>
              <Input
                id="distributedFrom"
                type="date"
                className="min-w-0"
                value={filters.distributedFrom}
                onChange={(event) => updateFilters("distributedFrom", event.target.value)}
              />
            </div>
            <div className="min-w-0 space-y-2">
              <Label htmlFor="distributedTo">Data da distribuição final</Label>
              <Input
                id="distributedTo"
                type="date"
                className="min-w-0"
                value={filters.distributedTo}
                onChange={(event) => updateFilters("distributedTo", event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" type="button" variant="outline" onClick={onClear}>
              Limpar filtros
            </Button>
            <Button
              className="w-full sm:w-auto"
              type="button"
              onClick={() => {
                onApply();
                onOpenChange(false);
              }}
            >
              Filtrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
