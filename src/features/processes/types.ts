export type ProcessStatus = "Concluída" | "Em andamento" | "Aguardando" | "Monitorado" | "Ativo";

export type ProcessGrade = "1ª instância" | "2ª instância" | "Tribunal superior";

export type ProcessPartySide = "Ativo" | "Passivo" | "Interessado";

export type DocumentSearchType = "CPF" | "CNPJ" | "OAB";

export type ProcessTag = "Ação Civil Pública" | "Precatório";

export interface ProcessParty {
  name: string;
  side: ProcessPartySide;
  document: string;
  documentType: DocumentSearchType | "OUTRO";
  role?: string;
  counsel?: string;
  groupLabel?: "Polo ativo" | "Polo passivo" | "Outras partes";
}

export interface ProcessMovement {
  id: string;
  date: string;
  title: string;
  description: string;
}

export interface ProcessAttachment {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  size: string;
}

export interface RelatedProcess {
  id: string;
  cnj: string;
  title: string;
  relationship: string;
  grade?: string;
  classProcessual?: string;
}

export interface AgentInsight {
  title: string;
  description: string;
}

export interface ProcessSummary {
  id: string;
  cnj: string;
  title: string;
  activeParty: string;
  passiveParty: string;
  tribunal: string;
  grade: ProcessGrade;
  createdAt: string;
  distributedAt: string;
  status: ProcessStatus;
  orgaoJulgador: string;
  classProcessual: string;
  assuntos: string[];
  tags: ProcessTag[];
  parties: ProcessParty[];
  value: string;
  lastMovement: string;
  favorite: boolean;
  monitored: boolean;
  historyContext?: {
    type: DocumentSearchType;
    value: string;
  };
}

export interface ProcessDetail extends ProcessSummary {
  summary: string;
  movements: ProcessMovement[];
  attachments: ProcessAttachment[];
  relatedProcesses: RelatedProcess[];
  agentInsights: AgentInsight[];
  originTribunal?: string;
  comarca?: string;
  city?: string;
  state?: string;
  justiceSegment?: string;
  phase?: string;
  judgeRelator?: string;
  aiDisclaimer?: string;
}

export interface ProcessFilters {
  tags: ProcessTag[];
  tribunals: string[];
  partyNames: string[];
  partySides: ProcessPartySide[];
  partyDocuments: string[];
  distributedFrom: string;
  distributedTo: string;
  classesProcessuais: string[];
  assuntos: string[];
}

/** Opções de filtro extraídas dos processos consultados (base de dados). */
export interface ProcessFilterOptions {
  tribunals: string[];
  partyNames: string[];
  classesProcessuais: string[];
  assuntos: string[];
  partyDocuments: string[];
}

export interface ProcessListParams {
  page: number;
  pageSize: number;
  search: string;
  filters: ProcessFilters;
}

export interface HistoricalListParams extends ProcessListParams {
  documentType: DocumentSearchType;
  documentValue: string;
}

export interface PaginatedProcesses {
  items: ProcessSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProcessDashboardStats {
  queriedProcesses: number;
  historicalQueries: number;
  monitorings: number;
}

export interface DashboardData {
  stats: ProcessDashboardStats;
  favorites: ProcessSummary[];
}

export interface DocumentMonitoringItem {
  id: string;
  documentType: DocumentSearchType;
  documentValue: string;
  label: string;
  scope: string;
  status: "Ativo" | "Pausado";
}

export interface MonitoringFeedItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

export interface MonitoringData {
  monitoredProcesses: ProcessSummary[];
  monitoredDocuments: DocumentMonitoringItem[];
  feed: MonitoringFeedItem[];
}

export type ApiConsumptionBillingStatus = "within_plan" | "additional_billing" | "threshold_reached";

export type ApiConsumptionCostConfidence = "exact" | "estimated" | "pending_enrichment" | "unknown";

export type ApiConsumptionCostType = "included" | "overage" | "mixed" | "estimated";

export type ApiConsumptionSyncStatus = "running" | "completed" | "error";

export interface ApiConsumptionFilterState {
  origin: string[];
  status: string[];
  searchType: string[];
  productName: string[];
  withAttachments: boolean | null;
  onDemand: boolean | null;
}

export interface ApiConsumptionQueryParams {
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
  forceSync?: boolean;
  filters: ApiConsumptionFilterState;
}

export interface ApiConsumptionEntry {
  id: string;
  requestId: string;
  createdAt: string;
  updatedAt: string | null;
  origin: string;
  status: string;
  searchType: string | null;
  responseType: string | null;
  searchKeyMasked: string | null;
  withAttachments: boolean;
  onDemand: boolean;
  publicSearch: boolean;
  planConfigType: string | null;
  productName: string;
  costBrl: number;
  costType: ApiConsumptionCostType;
  costConfidence: ApiConsumptionCostConfidence;
  hasOverage: boolean;
  returnedItemsCount: number | null;
  pricingMetadata: Record<string, unknown>;
}

export interface ApiConsumptionSummary {
  totalRequests: number;
  completedRequests: number;
  pendingRequests: number;
  attachmentRequests: number;
  apiRequests: number;
  trackingRequests: number;
  consumedAmountBrl: number;
  includedPlanBrl: number;
  remainingIncludedAmountBrl: number;
  overageAmountBrl: number;
  remainingUntilBlockAmountBrl: number;
  maxMonthlyAmountBrl: number;
  billingStatus: ApiConsumptionBillingStatus;
}

export interface ApiConsumptionBreakdownItem {
  label: string;
  totalCostBrl: number;
  totalRequests: number;
  averageCostBrl?: number;
  key?: string;
}

export interface ApiConsumptionSeriesItem {
  date: string;
  totalRequests: number;
  totalCostBrl: number;
}

export interface ApiConsumptionMonthlySeriesItem {
  billing_reference_month: string;
  total_requests: number;
  completed_requests: number;
  non_completed_requests: number;
  api_requests: number;
  tracking_requests: number;
  attachment_requests: number;
  consumed_amount_brl: number;
  included_amount_brl: number;
  max_monthly_amount_brl: number;
  remaining_included_amount_brl: number;
  overage_amount_brl: number;
  remaining_until_block_amount_brl: number;
}

export interface ApiConsumptionPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiConsumptionSyncInfo {
  id: string;
  status: ApiConsumptionSyncStatus;
  started_at: string;
  finished_at: string | null;
  request_start_date: string;
  request_end_date: string;
  requests_imported: number;
  pages_fetched: number;
  force_sync: boolean;
  error_message: string | null;
}

export interface ApiConsumptionData {
  summary: ApiConsumptionSummary;
  breakdownByProduct: ApiConsumptionBreakdownItem[];
  breakdownByOrigin: ApiConsumptionBreakdownItem[];
  dailySeries: ApiConsumptionSeriesItem[];
  monthlySeries: ApiConsumptionMonthlySeriesItem[];
  entries: ApiConsumptionEntry[];
  pagination: ApiConsumptionPagination;
  filtersApplied: ApiConsumptionFilterState;
  sync: ApiConsumptionSyncInfo | null;
  period: {
    startDate: string;
    endDate: string;
  };
  pricingVersion: string;
}

export const emptyProcessFilters: ProcessFilters = {
  tags: [],
  tribunals: [],
  partyNames: [],
  partySides: [],
  partyDocuments: [],
  distributedFrom: "",
  distributedTo: "",
  classesProcessuais: [],
  assuntos: [],
};

export const emptyApiConsumptionFilters: ApiConsumptionFilterState = {
  origin: [],
  status: [],
  searchType: [],
  productName: [],
  withAttachments: null,
  onDemand: null,
};
