import { useQuery } from "@tanstack/react-query";
import { ReportsService } from "../services/reportsService";
import type { ReportFiltersState } from "../types";

/**
 * Hooks de dados por relatório. A chave inclui os filtros, então trocar
 * período/empresa dispara refetch automático (React Query).
 */

export function usePayrollSpedReport(filters: ReportFiltersState) {
  return useQuery({
    queryKey: ["report", "payroll-sped", filters],
    queryFn: () => ReportsService.getPayrollSped(filters),
  });
}

export function useKanbanReport(filters: ReportFiltersState) {
  return useQuery({
    queryKey: ["report", "kanban", filters.from, filters.to],
    queryFn: () => ReportsService.getKanban(filters),
  });
}

export function useAiAdoptionReport(filters: ReportFiltersState) {
  return useQuery({
    queryKey: ["report", "ai-adoption", filters.from, filters.to],
    queryFn: () => ReportsService.getAiAdoption(filters),
  });
}

export function useProcessesReport(filters: ReportFiltersState) {
  return useQuery({
    queryKey: ["report", "processes", filters.from, filters.to],
    queryFn: () => ReportsService.getProcesses(filters),
  });
}
