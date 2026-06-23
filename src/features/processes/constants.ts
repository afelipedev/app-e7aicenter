import type { ProcessGrade } from "./types";

export const processRoutes = {
  dashboard: "/documents/cases",
  quadros: "/documents/cases/quadros",
  boardDetail: (boardSlug: string) => `/documents/cases/quadros/${boardSlug}`,
  queries: "/documents/cases/queries",
  detail: (caseId: string) => `/documents/cases/${caseId}`,
};

/** Graus de jurisdição usados nos filtros da busca avançada (DataJud). */
export const grauOptions: Array<{ value: string; label: string }> = [
  { value: "G1", label: "1º Grau (G1)" },
  { value: "G2", label: "2º Grau (G2)" },
  { value: "JE", label: "Juizado Especial (JE)" },
];

export const processGrades: ProcessGrade[] = ["1ª instância", "2ª instância", "Tribunal superior"];

/**
 * Tribunais com endpoint na API Pública do DataJud (alias -> rótulo).
 * Usado na busca avançada, onde o tribunal é obrigatório (cada tribunal
 * possui um índice/endpoint próprio). Lista enxuta dos mais utilizados;
 * a relação completa está em docs/api-datajud-cnj/API_DataJud_Endpoints.md.
 */
export const datajudTribunals: Array<{ alias: string; label: string }> = [
  // Estaduais
  { alias: "tjsp", label: "TJSP — São Paulo" },
  { alias: "tjrj", label: "TJRJ — Rio de Janeiro" },
  { alias: "tjmg", label: "TJMG — Minas Gerais" },
  { alias: "tjgo", label: "TJGO — Goiás" },
  { alias: "tjdft", label: "TJDFT — Distrito Federal" },
  { alias: "tjrs", label: "TJRS — Rio Grande do Sul" },
  { alias: "tjpr", label: "TJPR — Paraná" },
  { alias: "tjsc", label: "TJSC — Santa Catarina" },
  { alias: "tjba", label: "TJBA — Bahia" },
  { alias: "tjpe", label: "TJPE — Pernambuco" },
  { alias: "tjce", label: "TJCE — Ceará" },
  { alias: "tjpa", label: "TJPA — Pará" },
  { alias: "tjes", label: "TJES — Espírito Santo" },
  { alias: "tjma", label: "TJMA — Maranhão" },
  { alias: "tjmt", label: "TJMT — Mato Grosso" },
  { alias: "tjms", label: "TJMS — Mato Grosso do Sul" },
  // Federais
  { alias: "trf1", label: "TRF1 — 1ª Região" },
  { alias: "trf2", label: "TRF2 — 2ª Região" },
  { alias: "trf3", label: "TRF3 — 3ª Região" },
  { alias: "trf4", label: "TRF4 — 4ª Região" },
  { alias: "trf5", label: "TRF5 — 5ª Região" },
  { alias: "trf6", label: "TRF6 — 6ª Região" },
  // Superiores
  { alias: "stj", label: "STJ — Superior Tribunal de Justiça" },
  { alias: "tst", label: "TST — Tribunal Superior do Trabalho" },
];
