import type {
  AdvancedSearchParams,
  AdvancedSearchResult,
  DashboardData,
  PaginatedProcesses,
  ProcessAgentSummary,
  ProcessDetail,
  ProcessFilterOptions,
  ProcessListParams,
  ProcessSearchResult,
} from "../types";

// Contrato que desacopla a UI da fonte de dados de processos.
// Implementação atual: API Pública do DataJud/CNJ via Edge Function.
export interface ProcessProvider {
  getDashboardData(): Promise<DashboardData>;
  listQueries(params: ProcessListParams): Promise<PaginatedProcesses>;
  getProcessDetails(caseId: string, forceRefresh?: boolean): Promise<ProcessDetail | null>;
  getFilterOptions(): Promise<ProcessFilterOptions>;
  searchProcessByCnj(cnj: string): Promise<ProcessSearchResult>;
  advancedSearch(params: AdvancedSearchParams): Promise<AdvancedSearchResult>;
  getProcessAgentSummary(caseId: string, forceRefresh?: boolean): Promise<ProcessAgentSummary>;
  toggleFavorite(processId: string): Promise<void>;
  deleteProcess(processId: string): Promise<void>;
}
