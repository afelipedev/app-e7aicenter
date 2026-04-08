import type { DocumentSearchType, ProcessTag } from "./types";

export const processRoutes = {
  dashboard: "/documents/cases",
  kanban: "/documents/cases/kanban",
  queries: "/documents/cases/queries",
  history: "/documents/cases/history",
  monitoring: "/documents/cases/monitoring",
  apiConsumption: "/documents/cases/api-consumption",
  detail: (caseId: string) => `/documents/cases/${caseId}`,
};

export const processTags: ProcessTag[] = ["Ação Civil Pública", "Precatório"];

export const documentSearchOptions: DocumentSearchType[] = ["CPF", "CNPJ", "OAB"];
