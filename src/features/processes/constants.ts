import type { DocumentSearchType, ProcessTag } from "./types";

export const processRoutes = {
  dashboard: "/documents/cases",
  quadros: "/documents/cases/quadros",
  boardDetail: (boardSlug: string) => `/documents/cases/quadros/${boardSlug}`,
  queries: "/documents/cases/queries",
  detail: (caseId: string) => `/documents/cases/${caseId}`,
};

export const processTags: ProcessTag[] = ["Ação Civil Pública", "Precatório"];

export const documentSearchOptions: DocumentSearchType[] = ["CPF", "CNPJ", "OAB"];
