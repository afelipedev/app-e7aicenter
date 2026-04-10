import type { KanbanPriority, KanbanStatus, LegalKanbanFiltersState } from "./types";

export const LEGAL_KANBAN_BOARD_SLUG = "setor-juridico";
export const LEGAL_KANBAN_STORAGE_BUCKET = "legal-kanban-attachments";
export const LEGAL_KANBAN_INLINE_IMAGE_BUCKET = "legal-kanban-inline-images";

export const LEGAL_KANBAN_PRIORITY_META: Record<
  KanbanPriority,
  { label: string; color: string; chip: string }
> = {
  baixa: { label: "Baixa", color: "#94a3b8", chip: "bg-slate-100 text-slate-700 border-slate-200" },
  media: { label: "Média", color: "#2563eb", chip: "bg-blue-100 text-blue-700 border-blue-200" },
  alta: { label: "Alta", color: "#f97316", chip: "bg-orange-100 text-orange-700 border-orange-200" },
  urgente: { label: "Urgente", color: "#dc2626", chip: "bg-red-100 text-red-700 border-red-200" },
};

export const LEGAL_KANBAN_STATUS_META: Record<
  KanbanStatus,
  { label: string; chip: string }
> = {
  ativo: { label: "Ativo", chip: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  bloqueado: { label: "Bloqueado", chip: "bg-amber-100 text-amber-700 border-amber-200" },
  concluido: { label: "Concluído", chip: "bg-violet-100 text-violet-700 border-violet-200" },
  arquivado: { label: "Arquivado", chip: "bg-slate-100 text-slate-700 border-slate-200" },
};

export const LEGAL_KANBAN_FILTERS_INITIAL_STATE: LegalKanbanFiltersState = {
  search: "",
  memberMode: "all",
  memberIds: [],
  statuses: [],
  dueFilter: "all",
  labelIds: [],
};

export const LEGAL_KANBAN_RECURRENCE_OPTIONS = [
  { value: "none", label: "Sem recorrência" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

export const LEGAL_KANBAN_COLOR_PRESETS = [
  "#2563eb",
  "#7c3aed",
  "#ea580c",
  "#16a34a",
  "#dc2626",
  "#0f766e",
  "#c026d3",
  "#475569",
];

export const LEGAL_KANBAN_DEFAULT_COLUMNS = [
  { title: "Caixa de Entrada", color: "#2563eb", position: 100, kind: "inbox" },
  { title: "Audiencias", color: "#7c3aed", position: 200, kind: "event" },
  { title: "Holding", color: "#ea580c", position: 300, kind: "team" },
  { title: "Concluídos", color: "#16a34a", position: 400, kind: "done" },
  { title: "Arquivados", color: "#64748b", position: 500, kind: "archived" },
] as const;
