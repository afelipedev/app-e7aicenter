// Modelo unificado do módulo de Consultas Processuais.
// Fonte de dados: API Pública do DataJud/CNJ (metadados processuais).
// Limitações da fonte: não há partes, advogados, anexos, valor da causa,
// monitoramento ou billing — apenas metadados de capa e movimentações.

export type ProcessStatus = "Em andamento" | "Concluída" | "Aguardando";

export type ProcessGrade = "1ª instância" | "2ª instância" | "Tribunal superior";

export interface CodedItem {
  codigo: number | null;
  nome: string;
}

export interface ProcessMovement {
  id: string;
  codigo: number | null;
  date: string;
  dataHora: string | null;
  title: string;
  description: string;
}

export interface ProcessAgentSummarySections {
  summary: string;
  parties: string;
  classification: string;
  subjects: string;
  movements: string;
  disclaimer: string;
}

export interface ProcessAgentSummary {
  cached: boolean;
  model: string;
  sections: ProcessAgentSummarySections;
  generatedAt: string;
}

export interface ProcessSummary {
  id: string;
  cnj: string;
  numeroProcessoRaw: string;
  title: string;
  tribunal: string;
  grade: ProcessGrade;
  grau: string;
  classProcessual: string;
  orgaoJulgador: string;
  assuntos: string[];
  distributedAt: string;
  status: ProcessStatus;
  lastMovement: string;
  favorite: boolean;
}

export interface ProcessDetail extends ProcessSummary {
  summary: string;
  movements: ProcessMovement[];
  assuntosDetalhados: CodedItem[];
  classeCodigo: number | null;
  orgaoJulgadorCodigo: number | null;
  codigoMunicipioIBGE: number | null;
  formato: CodedItem | null;
  sistema: CodedItem | null;
  nivelSigilo: number | null;
  dataAjuizamento: string | null;
  aiDisclaimer: string;
  source: "datajud";
  completeness: "summary" | "full";
  agentSummary?: ProcessAgentSummarySections;
}

/** Resultado da busca síncrona por CNJ. */
export interface ProcessSearchResult {
  status: "completed" | "not_found" | "error";
  requestId?: string;
  process?: ProcessSummary | null;
}

/** Parâmetros da busca avançada (Query DSL do DataJud por códigos TPU). */
export interface AdvancedSearchParams {
  tribunalAlias: string;
  classeCodigo?: number | null;
  orgaoJulgadorCodigo?: number | null;
  assuntoCodigo?: number | null;
  grau?: string;
  dataAjuizamentoFrom?: string;
  dataAjuizamentoTo?: string;
  size?: number;
  searchAfter?: unknown[];
}

export interface AdvancedSearchResult {
  status: "completed";
  requestId?: string;
  count: number;
  nextSearchAfter: unknown[];
}

/** Filtros aplicados sobre os processos persistidos (listagem). */
export interface ProcessFilters {
  tribunals: string[];
  classesProcessuais: string[];
  assuntos: string[];
  grades: string[];
  orgaosJulgadores: string[];
  distributedFrom: string;
  distributedTo: string;
}

/** Opções de filtro derivadas dos processos já consultados. */
export interface ProcessFilterOptions {
  tribunals: string[];
  classesProcessuais: string[];
  assuntos: string[];
  grades: string[];
  orgaosJulgadores: string[];
}

export interface ProcessListParams {
  page: number;
  pageSize: number;
  search: string;
  filters: ProcessFilters;
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
}

export interface DashboardData {
  stats: ProcessDashboardStats;
  favorites: ProcessSummary[];
}

export const emptyProcessFilters: ProcessFilters = {
  tribunals: [],
  classesProcessuais: [],
  assuntos: [],
  grades: [],
  orgaosJulgadores: [],
  distributedFrom: "",
  distributedTo: "",
};
