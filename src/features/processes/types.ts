export type ProcessStatus = "Concluída" | "Em andamento" | "Aguardando" | "Monitorado";

export type ProcessGrade = "1ª instância" | "2ª instância" | "Tribunal superior";

export type ProcessPartySide = "Ativo" | "Passivo" | "Interessado";

export type DocumentSearchType = "CPF" | "CNPJ" | "OAB";

export type ProcessTag = "Ação Civil Pública" | "Precatório";

export interface ProcessParty {
  name: string;
  side: ProcessPartySide;
  document: string;
  documentType: DocumentSearchType | "OUTRO";
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

export interface ApiConsumptionMetric {
  label: string;
  value: string;
  helper: string;
}

export interface ApiConsumptionEntry {
  id: string;
  endpoint: string;
  createdAt: string;
  status: "Sucesso" | "Processando" | "Falha";
  credits: number;
}

export interface ApiConsumptionData {
  metrics: ApiConsumptionMetric[];
  entries: ApiConsumptionEntry[];
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
