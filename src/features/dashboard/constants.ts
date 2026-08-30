import type { UserRole } from "@/lib/supabase";
import type { DashboardKpiId, DashboardPeriodId } from "./types";

export const DASHBOARD_PERIODS: Array<{ id: DashboardPeriodId; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriodId = "7d";

export const KPI_COPY: Record<
  DashboardKpiId,
  { label: string; hint: string; href: string }
> = {
  ai_conversations: {
    label: "Conversas de IA",
    hint: "Threads criadas no AI Center E7 no período. Não inclui assistentes legados.",
    href: "/ai-center-e7",
  },
  ai_executions: {
    label: "Execuções de IA",
    hint: "Chamadas concluídas ou com erro no período.",
    href: "/documents/reports",
  },
  ai_error_rate: {
    label: "Erro nas execuções",
    hint: "Percentual de execuções com status de erro.",
    href: "/documents/reports",
  },
  ai_cost: {
    label: "Custo de IA",
    hint: "Soma estimada em reais das execuções no período.",
    href: "/documents/reports",
  },
  ai_active_users: {
    label: "Usuários em IA",
    hint: "Pessoas distintas que executaram um agente no período.",
    href: "/ai-center-e7",
  },
  payroll_completed: {
    label: "Folhas concluídas",
    hint: "Lotes de holerite concluídos no período, não arquivos avulsos.",
    href: "/documents/payroll",
  },
  payroll_errors: {
    label: "Erros de folha",
    hint: "Lotes de holerite que terminaram com erro.",
    href: "/documents/payroll",
  },
  payroll_in_progress: {
    label: "Folha em andamento",
    hint: "Lotes pendentes ou em processamento agora, independente do período.",
    href: "/documents/payroll",
  },
  payroll_success_rate: {
    label: "Conclusão da folha",
    hint: "Concluídos ÷ (concluídos + erros) no período.",
    href: "/documents/reports",
  },
  sped_completed: {
    label: "SPEDs concluídos",
    hint: "Lotes SPED concluídos no período.",
    href: "/documents/sped",
  },
  sped_errors: {
    label: "Erros de SPED",
    hint: "Lotes SPED que terminaram com erro.",
    href: "/documents/sped",
  },
  sped_in_progress: {
    label: "SPED em andamento",
    hint: "Lotes SPED pendentes ou em processamento agora.",
    href: "/documents/sped",
  },
  processes_consulted: {
    label: "Processos consultados",
    hint: "Snapshots DataJud gravados no período. Não é carteira de processos ativos.",
    href: "/documents/cases/queries",
  },
  process_queries: {
    label: "Consultas processuais",
    hint: "Requisições enviadas ao DataJud no período.",
    href: "/documents/cases/queries",
  },
  process_success_rate: {
    label: "Sucesso nas consultas",
    hint: "Consultas concluídas ÷ (concluídas + erros) no período.",
    href: "/documents/cases/queries",
  },
  kanban_active: {
    label: "Cards em aberto",
    hint: "Cards que não estão concluídos nem arquivados.",
    href: "/documents/cases/quadros",
  },
  kanban_overdue: {
    label: "Cards atrasados",
    hint: "Cards com prazo vencido e ainda em aberto.",
    href: "/documents/cases/quadros",
  },
  kanban_completed: {
    label: "Cards concluídos",
    hint: "Cards marcados como concluídos no período.",
    href: "/documents/cases/quadros",
  },
  companies: {
    label: "Empresas",
    hint: "Empresas cadastradas. A variação compara o total atual com o total no início do período.",
    href: "/companies",
  },
  leads_active: {
    label: "Leads ativos",
    hint: "Cadastros ativos de clientes e fornecedores.",
    href: "/leads",
  },
  unread_notifications: {
    label: "Não lidas",
    hint: "Notificações de Equipes ainda sem leitura.",
    href: "/teams",
  },
};

const ADMIN_KPIS: DashboardKpiId[] = [
  "kanban_overdue",
  "payroll_errors",
  "ai_cost",
  "ai_conversations",
  "process_success_rate",
  "payroll_in_progress",
];

const ROLE_KPIS: Record<UserRole, DashboardKpiId[]> = {
  administrator: ADMIN_KPIS,
  it: ADMIN_KPIS,
  advogado_adm: ADMIN_KPIS,
  advogado: [
    "kanban_overdue",
    "processes_consulted",
    "ai_conversations",
    "kanban_completed",
    "process_success_rate",
  ],
  contabil: [
    "payroll_in_progress",
    "payroll_errors",
    "payroll_success_rate",
    "sped_completed",
    "companies",
  ],
  financeiro: ["ai_cost", "ai_executions", "ai_error_rate", "ai_conversations", "ai_active_users"],
};

export function kpisForRole(role: UserRole | null | undefined): DashboardKpiId[] {
  if (!role) return ROLE_KPIS.advogado;
  return ROLE_KPIS[role] ?? ROLE_KPIS.advogado;
}

export type DashboardTrendId = "ai" | "docs" | "kanban";

export function trendForRole(role: UserRole | null | undefined): DashboardTrendId {
  if (role === "contabil") return "docs";
  if (role === "advogado") return "kanban";
  return "ai";
}

export const TREND_COPY: Record<
  DashboardTrendId,
  { title: string; description: string; href: string }
> = {
  ai: {
    title: "Execuções de IA por dia",
    description: "Volume e custo estimado no recorte. Série diária no fuso de Brasília.",
    href: "/documents/reports",
  },
  docs: {
    title: "Lotes de folha e SPED por dia",
    description: "Processamentos criados no recorte, por tipo.",
    href: "/documents/reports",
  },
  kanban: {
    title: "Cards criados e concluídos por dia",
    description: "Entrada e saída dos quadros no recorte.",
    href: "/documents/cases/quadros",
  },
};

export const ATTENTION_KIND_LABEL: Record<string, string> = {
  kanban_overdue: "Atrasado",
  kanban_blocked: "Bloqueado",
  post_mention: "Menção",
  message_mention: "Menção",
  kanban_comment_mention: "Menção",
  card_member_added: "Card",
  card_pending_approval: "Aprovação",
  board_member_added: "Quadro",
  post_reply: "Resposta",
};

/** Itens pessoais. Descarta kinds globais/legado (unread_mention, erros de lote). */
export const ATTENTION_PERSONAL_KINDS = new Set(Object.keys(ATTENTION_KIND_LABEL));
