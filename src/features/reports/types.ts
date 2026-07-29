// Tipos do módulo de Relatórios.
// As RPCs Supabase retornam jsonb já agregado; tipamos o shape esperado.
// Fonte de verdade do SQL: supabase/migrations/20260729121000_reports_rpc_v2.sql

export type ReportId = "payroll-sped" | "kanban" | "ai-center" | "processes";

/** Domínio dos quadros de kanban (legal_kanban_boards.domain). */
export type KanbanDomainFilter = "all" | "legal" | "operational";

/** Filtros compartilhados entre gráficos e exportação. */
export interface ReportFiltersState {
  /** Data inicial (ISO yyyy-mm-dd) ou null para "últimos 12 meses". */
  from: string | null;
  /** Data final (ISO yyyy-mm-dd) ou null para hoje. */
  to: string | null;
  /** Empresa (uuid) ou null para todas. Só aplica em relatórios com company_id. */
  companyId: string | null;
}

/** Ponto genérico de série categórica {label, count}. */
export interface CategoryPoint {
  count: number;
  [key: string]: string | number;
}

// ---- Folha & SPED ----
export interface PayrollSpedReport {
  kpis: {
    total: number;
    completed: number;
    errors: number;
    in_progress: number;
    /** Concluídos ÷ (concluídos + com erro) × 100. Em andamento fica fora. */
    success_rate: number;
    /** Média de minutos entre started_at e completed_at dos lotes concluídos. */
    avg_minutes: number;
    /** Nº de lotes que entraram no cálculo de avg_minutes. */
    avg_sample: number;
  };
  by_month: Array<{ month: string; folha: number; sped: number; concluidos: number; erros: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_company: Array<{ company: string; total: number; concluidos: number; erros: number }>;
  sped_by_type: Array<{ sped_type: string; count: number }>;
}

// ---- Quadros (kanban jurídico + gestão operacional) ----
export interface KanbanReport {
  kpis: {
    total: number;
    completed: number;
    active: number;
    overdue: number;
    /** Quadros distintos no recorte. */
    boards: number;
    /** Média de dias entre created_at e completed_at dos cards concluídos. */
    avg_lead_days: number;
    /** Nº de cards que entraram no cálculo de avg_lead_days. */
    lead_sample: number;
  };
  by_month: Array<{ month: string; criados: number; concluidos: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_priority: Array<{ priority: string; count: number }>;
  by_domain: Array<{ domain: string; count: number }>;
  by_board: Array<{ board: string; domain: string; count: number; concluidos: number }>;
  by_assignee: Array<{ assignee: string; count: number }>;
}

// ---- AI Center E7 ----
export interface AiCenterReport {
  kpis: {
    /** Soma de agente_execucoes.custo_reais no período (R$). */
    total_cost: number;
    total_executions: number;
    /** tokens_entrada + tokens_saida. */
    total_tokens: number;
    avg_cost: number;
    /** Agentes distintos com ao menos uma execução no período. */
    active_agents: number;
    active_users: number;
    /** Agentes cadastrados (não excluídos), independente do período. */
    total_agents: number;
    total_conversations: number;
    total_messages: number;
    /** % de execuções com status 'erro'. */
    error_rate: number;
  };
  by_month: Array<{ month: string; execucoes: number; custo: number; tokens: number }>;
  conversations_by_month: Array<{ month: string; count: number }>;
  by_agent: Array<{ agent: string; execucoes: number; conversas: number; custo: number; tokens: number }>;
  by_model: Array<{ model: string; execucoes: number; custo: number; tokens: number }>;
  by_user: Array<{ usuario: string; execucoes: number; custo: number; tokens: number }>;
  by_origem: Array<{ origem: string; count: number; custo: number }>;
  users_by_role: Array<{ role: string; count: number }>;
  knowledge: { bases: number; documentos: number; fragmentos: number };
}

// ---- Processos (DataJud) ----
export interface ProcessesReport {
  kpis: {
    total_snapshots: number;
    total_queries: number;
    /** Segundos entre o envio da requisição ao DataJud e o retorno. */
    avg_response_seconds: number;
    /** Nº de consultas com duração válida (> 0) no cálculo acima. */
    response_sample: number;
    success_queries: number;
    error_queries: number;
    success_rate: number;
    distinct_tribunals: number;
  };
  queries_by_month: Array<{ month: string; count: number }>;
  queries_by_kind: Array<{ request_kind: string; count: number }>;
  queries_by_status: Array<{ status: string; count: number }>;
  by_tribunal: Array<{ tribunal: string; count: number }>;
  by_class: Array<{ class_processual: string; count: number }>;
  by_segment: Array<{ justice_segment: string; count: number }>;
  by_grade: Array<{ grade: string; count: number }>;
  by_court: Array<{ orgao_julgador: string; count: number }>;
}
