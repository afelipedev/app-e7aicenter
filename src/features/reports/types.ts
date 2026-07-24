// Tipos do módulo de Relatórios.
// As RPCs Supabase retornam jsonb já agregado; tipamos o shape esperado.

export type ReportId = "payroll-sped" | "kanban" | "ai-adoption" | "processes";

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
    success_rate: number;
    avg_minutes: number;
  };
  by_month: Array<{ month: string; folha: number; sped: number; concluidos: number; erros: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_company: Array<{ company: string; total: number; concluidos: number; erros: number }>;
  sped_by_type: Array<{ sped_type: string; count: number }>;
}

// ---- Kanban Jurídico ----
export interface KanbanReport {
  kpis: {
    total: number;
    completed: number;
    active: number;
    overdue: number;
    avg_lead_days: number;
  };
  by_month: Array<{ month: string; criados: number; concluidos: number }>;
  by_status: Array<{ status: string; count: number }>;
  by_priority: Array<{ priority: string; count: number }>;
  by_assignee: Array<{ assignee: string; count: number }>;
}

// ---- Adoção & Uso de IA ----
export interface AiAdoptionReport {
  kpis: {
    total_users: number;
    active_users: number;
    adopted_users: number;
    total_chats: number;
    total_messages: number;
  };
  users_by_role: Array<{ role: string; count: number }>;
  chats_by_assistant: Array<{ assistant_type: string; count: number }>;
  chats_by_model: Array<{ llm_model: string; count: number }>;
  chats_by_month: Array<{ month: string; count: number }>;
  teams_engagement: { posts: number; messages: number; reactions: number };
}

// ---- Processos (DataJud) ----
export interface ProcessesReport {
  kpis: {
    total_snapshots: number;
    total_queries: number;
    avg_query_seconds: number;
    success_queries: number;
  };
  queries_by_month: Array<{ month: string; count: number }>;
  queries_by_kind: Array<{ request_kind: string; count: number }>;
  queries_by_status: Array<{ status: string; count: number }>;
  by_tribunal: Array<{ tribunal: string; count: number }>;
  by_class: Array<{ class_processual: string; count: number }>;
  by_segment: Array<{ justice_segment: string; count: number }>;
  by_state: Array<{ state: string; count: number }>;
}
