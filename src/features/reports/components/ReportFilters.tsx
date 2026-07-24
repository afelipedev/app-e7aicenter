import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompanyService } from "@/services/companyService";
import type { ReportFiltersState } from "../types";

type PeriodPreset = "3m" | "6m" | "12m" | "ytd" | "all" | "custom";

const PRESET_LABEL: Record<PeriodPreset, string> = {
  "3m": "Últimos 3 meses",
  "6m": "Últimos 6 meses",
  "12m": "Últimos 12 meses",
  ytd: "Ano atual",
  all: "Todo o período",
  custom: "Personalizado",
};

function presetToRange(preset: PeriodPreset): { from: string | null; to: string | null } {
  const today = new Date();
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  switch (preset) {
    case "3m":
      return { from: iso(new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())), to: iso(today) };
    case "6m":
      return { from: iso(new Date(today.getFullYear(), today.getMonth() - 6, today.getDate())), to: iso(today) };
    case "12m":
      return { from: iso(new Date(today.getFullYear(), today.getMonth() - 12, today.getDate())), to: iso(today) };
    case "ytd":
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
    case "all":
      return { from: null, to: null };
    default:
      return { from: null, to: null };
  }
}

interface ReportFiltersProps {
  value: ReportFiltersState;
  onChange: (next: ReportFiltersState) => void;
  /** Exibir seletor de empresa (só para relatórios com company_id). */
  showCompany?: boolean;
}

export function ReportFilters({ value, onChange, showCompany }: ReportFiltersProps) {
  const [preset, setPreset] = useState<PeriodPreset>("12m");
  const [range, setRange] = useState<DateRange | undefined>();

  const { data: companies } = useQuery({
    queryKey: ["companies", "for-reports"],
    queryFn: () => CompanyService.getAll(),
    enabled: !!showCompany,
    staleTime: 5 * 60 * 1000,
  });

  const handlePreset = (next: PeriodPreset) => {
    setPreset(next);
    if (next !== "custom") {
      const { from, to } = presetToRange(next);
      onChange({ ...value, from, to });
    }
  };

  const handleRange = (r: DateRange | undefined) => {
    setRange(r);
    if (r?.from && r?.to) {
      onChange({ ...value, from: format(r.from, "yyyy-MM-dd"), to: format(r.to, "yyyy-MM-dd") });
    }
  };

  const customLabel = useMemo(() => {
    if (range?.from && range?.to) {
      return `${format(range.from, "dd/MM/yy", { locale: ptBR })} – ${format(range.to, "dd/MM/yy", { locale: ptBR })}`;
    }
    return "Selecionar datas";
  }, [range]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={preset} onValueChange={(v) => handlePreset(v as PeriodPreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PRESET_LABEL) as PeriodPreset[]).map((p) => (
            <SelectItem key={p} value={p}>
              {PRESET_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {customLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={range}
              onSelect={handleRange}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      )}

      {showCompany && (
        <Select
          value={value.companyId ?? "all"}
          onValueChange={(v) => onChange({ ...value, companyId: v === "all" ? null : v })}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {(companies ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
