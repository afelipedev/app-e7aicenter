import { useQuery } from "@tanstack/react-query";
import { ReportsService } from "../services/reportsService";
import type { KanbanDomainFilter, ReportFiltersState } from "../types";

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

export function useKanbanReport(filters: ReportFiltersState, domain: KanbanDomainFilter = "all") {
  return useQuery({
    queryKey: ["report", "kanban", filters.from, filters.to, domain],
    queryFn: () => ReportsService.getKanban(filters, domain),
  });
}

export function useAiCenterReport(filters: ReportFiltersState) {
  return useQuery({
    queryKey: ["report", "ai-center", filters.from, filters.to],
    queryFn: () => ReportsService.getAiCenter(filters),
  });
}

export function useProcessesReport(filters: ReportFiltersState) {
  return useQuery({
    queryKey: ["report", "processes", filters.from, filters.to],
    queryFn: () => ReportsService.getProcesses(filters),
  });
}
