import type {
  ApiConsumptionData,
  ApiConsumptionQueryParams,
  DashboardData,
  DocumentSearchType,
  HistoricalListParams,
  MonitoringData,
  PaginatedProcesses,
  ProcessDetail,
  ProcessFilterOptions,
  ProcessListParams,
} from "../types";

export interface ProcessProvider {
  getDashboardData(): Promise<DashboardData>;
  listQueries(params: ProcessListParams): Promise<PaginatedProcesses>;
  listHistoricalQueries(params: HistoricalListParams): Promise<PaginatedProcesses>;
  getProcessDetails(caseId: string): Promise<ProcessDetail | null>;
  getMonitoringData(): Promise<MonitoringData>;
  getApiConsumptionData(params: ApiConsumptionQueryParams): Promise<ApiConsumptionData>;
  getFilterOptions(): Promise<ProcessFilterOptions>;
  toggleFavorite(processId: string): Promise<void>;
  deleteProcess(processId: string): Promise<void>;
  toggleProcessMonitoring(processId: string): Promise<void>;
  toggleDocumentMonitoring(monitoringId: string): Promise<void>;
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
