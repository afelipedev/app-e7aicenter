export type DashboardPeriodId = "today" | "7d" | "30d";

export type DashboardKpiUnit = "count" | "percent" | "currency";

export type DashboardKpiId =
  | "ai_conversations"
  | "ai_executions"
  | "ai_error_rate"
  | "ai_cost"
  | "ai_active_users"
  | "payroll_completed"
  | "payroll_errors"
  | "payroll_in_progress"
  | "payroll_success_rate"
  | "sped_completed"
  | "sped_errors"
  | "sped_in_progress"
  | "processes_consulted"
  | "process_queries"
  | "process_success_rate"
  | "kanban_active"
  | "kanban_overdue"
  | "kanban_completed"
  | "companies"
  | "leads_active"
  | "unread_notifications";

export interface DashboardMetric {
  value: number;
  prev: number;
  unit: DashboardKpiUnit;
}

export type DashboardAttentionKind =
  | "kanban_overdue"
  | "kanban_blocked"
  | "post_mention"
  | "message_mention"
  | "kanban_comment_mention"
  | "card_member_added"
  | "card_pending_approval"
  | "board_member_added"
  | "post_reply"
  | string;

export type DashboardSeverity = "critical" | "warning" | "info";

export interface DashboardAttentionItem {
  kind: DashboardAttentionKind;
  id: string;
  title: string;
  subtitle: string;
  href: string;
  severity: DashboardSeverity;
  at: string;
}

export interface DashboardSeriesPoint {
  day: string;
  [key: string]: string | number;
}

export interface DashboardCardItem {
  id: string;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  board: string;
  href: string;
}

export interface DashboardFavoriteProcess {
  id: string;
  cnj: string;
  title: string;
  tribunal: string;
  last_movement: string;
  href: string;
}

export interface DashboardProcessingItem {
  id: string;
  kind: "folha" | "sped";
  title: string;
  company: string;
  status: string;
  href: string;
  at: string;
}

export interface DashboardHomeData {
  period: {
    from: string;
    to: string;
    prev_from: string;
    prev_to: string;
  };
  kpis: Record<DashboardKpiId, DashboardMetric>;
  attention: DashboardAttentionItem[];
  series: {
    ai: DashboardSeriesPoint[];
    docs: DashboardSeriesPoint[];
    kanban: DashboardSeriesPoint[];
  };
  my_cards: DashboardCardItem[];
  favorite_processes: DashboardFavoriteProcess[];
  recent_processings: DashboardProcessingItem[];
}
