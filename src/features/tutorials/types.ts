import type { DurationBucket, TutorialSort } from "./constants";

export type TutorialStatus = "rascunho" | "publicado" | "arquivado";
export type TranscodeStatus = "none" | "pending" | "ready" | "failed";

export interface TutorialCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface TutorialAuthor {
  id: string;
  name: string | null;
  avatar_url: string | null;
}

export interface Tutorial {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  category_id: string | null;
  module_key: string | null;
  tags: string[];

  thumbnail_path: string | null;
  video_path: string | null;
  hls_path: string | null;
  transcode_status: TranscodeStatus;

  mime_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;

  status: TutorialStatus;
  published_at: string | null;
  is_featured: boolean;
  sort_order: number;

  views_count: number;
  unique_views_count: number;

  author_user_id: string | null;
  created_at: string;
  updated_at: string;

  /** Relações resolvidas no select. */
  category?: TutorialCategory | null;
  author?: TutorialAuthor | null;

  /** Derivados no cliente. */
  thumbnail_url: string | null;
  is_new: boolean;
}

/** Item do catálogo já combinado com o progresso do usuário. */
export interface TutorialWithProgress extends Tutorial {
  progress_percent: number;
  progress_seconds: number;
  completed: boolean;
  is_favorite: boolean;
}

export interface TutorialProgress {
  tutorial_id: string;
  position_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  last_watched_at: string;
}

export interface TutorialFilters {
  search?: string;
  categoryId?: string | null;
  moduleKey?: string | null;
  duration?: DurationBucket | null;
  sort?: TutorialSort;
  onlyFavorites?: boolean;
}

export interface AdminTutorialFilters {
  search?: string;
  categoryId?: string | null;
  moduleKey?: string | null;
  status?: TutorialStatus | null;
  authorId?: string | null;
  page: number;
  pageSize: number;
  sortBy?: "created_at" | "title" | "views_count" | "published_at";
  sortDir?: "asc" | "desc";
}

export interface TutorialInput {
  title: string;
  short_description: string | null;
  full_description: string | null;
  category_id: string | null;
  module_key: string | null;
  tags: string[];
  thumbnail_path: string | null;
  video_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  status: TutorialStatus;
  is_featured: boolean;
  sort_order: number;
}

/** Estado exibido pela barra de progresso do upload. */
export interface UploadState {
  status: "idle" | "uploading" | "paused" | "success" | "error";
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  /** Bytes por segundo, média móvel. */
  speed: number;
  /** Segundos restantes estimados. */
  remainingSeconds: number | null;
  error: string | null;
}

export const EMPTY_UPLOAD_STATE: UploadState = {
  status: "idle",
  progress: 0,
  bytesUploaded: 0,
  bytesTotal: 0,
  speed: 0,
  remainingSeconds: null,
  error: null,
};
