import {
  LEGAL_KANBAN_DEFAULT_COLUMNS,
  OPERATIONAL_KANBAN_DEFAULT_COLUMNS,
} from "@/features/legal-kanban/constants";

export type KanbanDomain = "legal" | "operational";

export type KanbanModuleConfig = {
  domain: KanbanDomain;
  basePath: string;
  queryKeyPrefix: string;
  sectionLabel: string;
  pageTitle: string;
  pageDescription: string;
  defaultBoardSlug: string;
  defaultBoardTitle: string;
  defaultBoardDescription: string;
  defaultBoardIcon: string;
  defaultColumns: readonly { title: string; color: string; position: number; kind: string }[];
  canShareToLegal: boolean;
  shareTargetDomain: KanbanDomain;
};

export const KANBAN_MODULE_CONFIG: Record<KanbanDomain, KanbanModuleConfig> = {
  legal: {
    domain: "legal",
    basePath: "/documents/cases/quadros",
    queryKeyPrefix: "legal-kanban",
    sectionLabel: "Documentos e Processos",
    pageTitle: "Quadros",
    pageDescription: "Visualize seus quadros jurídicos e acesse rapidamente seus favoritos.",
    defaultBoardSlug: "setor-juridico",
    defaultBoardTitle: "Quadro Jurídico",
    defaultBoardDescription: "Quadro compartilhado do setor jurídico.",
    defaultBoardIcon: "briefcase",
    defaultColumns: LEGAL_KANBAN_DEFAULT_COLUMNS,
    canShareToLegal: false,
    shareTargetDomain: "legal",
  },
  operational: {
    domain: "operational",
    basePath: "/gestao-operacional/quadros",
    queryKeyPrefix: "operational-kanban",
    sectionLabel: "Gestão Operacional",
    pageTitle: "Quadros",
    pageDescription: "Gerencie quadros operacionais do escritório com raias, etiquetas e compartilhamento jurídico.",
    defaultBoardSlug: "operacional",
    defaultBoardTitle: "Quadro Operacional",
    defaultBoardDescription: "Quadro padrão da gestão operacional.",
    defaultBoardIcon: "layout-grid",
    defaultColumns: OPERATIONAL_KANBAN_DEFAULT_COLUMNS,
    canShareToLegal: true,
    shareTargetDomain: "legal",
  },
};

export function kanbanBoardDetailPath(config: KanbanModuleConfig, boardSlug: string) {
  return `${config.basePath}/${boardSlug}`;
}
