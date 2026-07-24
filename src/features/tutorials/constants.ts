/**
 * Constantes do módulo de Tutoriais.
 * A lista de módulos do sistema é a fonte de verdade do filtro/trilha e espelha
 * o menu em src/components/layout/AppSidebar.tsx.
 */

export const TUTORIALS_VIDEO_BUCKET = "tutorials";
export const TUTORIALS_THUMBNAIL_BUCKET = "tutorial-thumbnails";

/** Validade da URL assinada do vídeo (bucket privado). */
export const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

/** Itens por página no catálogo (infinite scroll). */
export const CATALOG_PAGE_SIZE = 24;

/** Um vídeo publicado há menos de 15 dias recebe a tag "Novo". */
export const NEW_BADGE_DAYS = 15;

export const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
export const MAX_THUMBNAIL_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ACCEPTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
] as const;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
] as const;

export interface SystemModule {
  key: string;
  label: string;
}

export const SYSTEM_MODULES: SystemModule[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "leads", label: "Leads" },
  { key: "gestao-operacional", label: "Gestão Operacional" },
  { key: "empresas", label: "Gestão de Empresas" },
  { key: "ai-center", label: "AI Center" },
  { key: "processos", label: "Processos" },
  { key: "quadros-juridicos", label: "Quadros Jurídicos" },
  { key: "consultas-processuais", label: "Consultas Processuais" },
  { key: "holerites", label: "Gestão de Holerites" },
  { key: "speds", label: "Gestão de SPEDs" },
  { key: "relatorios", label: "Relatórios" },
  { key: "equipes", label: "Equipes" },
  { key: "administracao", label: "Administração" },
  { key: "perfil", label: "Perfil" },
  { key: "tutoriais", label: "Tutoriais" },
];

export const MODULE_LABEL_BY_KEY = new Map(SYSTEM_MODULES.map((m) => [m.key, m.label]));

export const getModuleLabel = (key?: string | null): string =>
  (key && MODULE_LABEL_BY_KEY.get(key)) || "Geral";

export const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "views", label: "Mais assistidos" },
  { value: "alphabetical", label: "Ordem alfabética" },
] as const;

export type TutorialSort = (typeof SORT_OPTIONS)[number]["value"];

/** Faixas de duração usadas no filtro (em segundos). */
export const DURATION_BUCKETS = [
  { value: "short", label: "Até 5 min", min: 0, max: 300 },
  { value: "medium", label: "5 a 15 min", min: 300, max: 900 },
  { value: "long", label: "Mais de 15 min", min: 900, max: null },
] as const;

export type DurationBucket = (typeof DURATION_BUCKETS)[number]["value"];

export const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  arquivado: "Arquivado",
};
