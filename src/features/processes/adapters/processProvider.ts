import type {
  ApiConsumptionData,
  ApiConsumptionQueryParams,
  DashboardData,
  DocumentSearchType,
  HistoricalListParams,
  MonitoringData,
  PaginatedProcesses,
  ProcessAgentSummary,
  ProcessDetail,
  ProcessFilterOptions,
  ProcessListParams,
  ProcessSearchResult,
} from "../types";

export interface ProcessProvider {
  getDashboardData(): Promise<DashboardData>;
  listQueries(params: ProcessListParams): Promise<PaginatedProcesses>;
  listHistoricalQueries(params: HistoricalListParams): Promise<PaginatedProcesses>;
  getProcessDetails(caseId: string): Promise<ProcessDetail | null>;
  getMonitoringData(): Promise<MonitoringData>;
  getApiConsumptionData(params: ApiConsumptionQueryParams): Promise<ApiConsumptionData>;
  getFilterOptions(): Promise<ProcessFilterOptions>;
  searchProcessByCnj(cnj: string): Promise<ProcessSearchResult>;
  searchHistoricalProcesses(documentType: DocumentSearchType, documentValue: string): Promise<ProcessSearchResult>;
  getProcessAgentSummary(caseId: string, forceRefresh?: boolean): Promise<ProcessAgentSummary>;
  toggleFavorite(processId: string): Promise<void>;
  deleteProcess(processId: string): Promise<void>;
  toggleProcessMonitoring(processId: string): Promise<void>;
  toggleDocumentMonitoring(monitoringId: string): Promise<void>;
  toggleDocumentSearchMonitoring(documentType: DocumentSearchType, documentValue: string): Promise<void>;
}

export interface ProviderQueryPayload {
  cnj?: string;
  documentType?: DocumentSearchType;
  documentValue?: string;
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
}

// Mapeadores declarativos deixam a integração com a Judit plugável
// sem contaminar os componentes com o formato bruto da API.
export interface ProviderMapper<TInput, TOutput> {
  map(input: TInput): TOutput;
}
