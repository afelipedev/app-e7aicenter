// Dicionários pt-BR e formatadores compartilhados pelos relatórios.
// As RPCs devolvem as chaves cruas do banco (para preservar o mapa de cores);
// a tradução acontece só na exibição, via prop `labelMap` dos gráficos.

/** Status de processamento (folha/SPED/consultas) e de cards do kanban. */
export const STATUS_LABELS: Record<string, string> = {
  // payroll_processing / sped_processing / process_query_requests
  completed: "Concluído",
  error: "Erro",
  pending: "Pendente",
  processing: "Processando",
  success: "Concluído",
  // legal_kanban_cards
  ativo: "Ativo",
  bloqueado: "Bloqueado",
  aguardando_aprovacao: "Aguardando aprovação",
  concluido: "Concluído",
  arquivado: "Arquivado",
  // agente_execucoes
  sucesso: "Sucesso",
  erro: "Erro",
};

/** legal_kanban_cards.priority */
export const PRIORITY_LABELS: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

/** legal_kanban_boards.domain */
export const DOMAIN_LABELS: Record<string, string> = {
  legal: "Jurídico",
  operational: "Gestão Operacional",
};

/** process_query_requests.request_kind */
export const REQUEST_KIND_LABELS: Record<string, string> = {
  cnj: "Busca por nº CNJ",
  advanced: "Busca avançada",
  detail_refresh: "Atualização de detalhes",
};

/** agente_execucoes.origem */
export const ORIGEM_LABELS: Record<string, string> = {
  agente: "Agente",
  gerador_agente: "Gerador de agente",
  gerador_prompt: "Gerador de prompt",
};

/** users.role */
export const ROLE_LABELS: Record<string, string> = {
  administrator: "Administrador",
  it: "TI",
  advogado_adm: "Advogado ADM",
  advogado: "Advogado",
  contabil: "Contábil",
  financeiro: "Financeiro",
};

/** Traduz uma chave mantendo o valor original quando não há entrada no mapa. */
export function translate(map: Record<string, string>, key: unknown): string {
  const raw = String(key ?? "");
  return map[raw] ?? raw;
}

/** Aplica um labelMap a uma coluna de linhas exportadas para Excel. */
export function translateRows<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T,
  map: Record<string, string>,
): T[] {
  return rows.map((row) => ({ ...row, [key]: translate(map, row[key]) }));
}

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata valores monetários em R$ (2 casas). */
export function brl(value: number): string {
  return BRL_FORMATTER.format(Number(value) || 0);
}

const COMPACT_FORMATTER = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Abrevia números grandes nos eixos (1.500 -> "1,5 mil") mantendo <1000 inteiro. */
export function compactNumber(value: number): string {
  const n = Number(value) || 0;
  return Math.abs(n) < 1000 ? String(n) : COMPACT_FORMATTER.format(n);
}

/** Trunca rótulos longos de eixo, preservando o valor completo no tooltip. */
export function truncateLabel(value: string, max = 18): string {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
